# Admin Badge Delete Flow — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the **delete flow** of the admin badge management
— the feature-12 increment, measured as its own unit. The flow's
extraction and coverage shipped with feature 10's listing round (the
challenge-delete pattern applied directly); this report carves the flow
out as its own measured unit — the no-double-counting attribution
mirrors the shared-module convention:

| # | Helper | Responsibility |
| --- | --- | --- |
| 1 | `badgeDeleteUrl` (`badgeTable.js`) | The delete flow's guard-composed URL — a deletable pending badge resolves to the destroy route (`DELETE /dashboard/badges/{badge}`), anything else (a null pending object, an id-less row) to `null`, which the page treats as the early-return arm |
| 2 | `badgeDeleteDescription` (`badgeTable.js`) | The delete dialog's copy keyed to the pending badge's title, null-safe on the object itself |

Reused from `@/Pages/Dashboard/Courses/courseTable.js` (covered, **not
double-counted here**): `hasDeletableId` — the guard itself
(`Boolean(item?.id)`), composed by the URL builder — and
`paginateCourses`' live clamp, which owns the post-delete pagination.

Out of scope (same convention as the other flow reports): the Radix
`DeleteConfirmationDialog` component and the `router.delete` callbacks;
and the listing pipeline, which feature 10's report already measures.

**The verified destroy contract** (`Admin\BadgeController::destroy`):

- A gate, then the stored icon deleted **only under the `badges/`
  storage prefix** — the `(string)` cast turns a seeded null icon into
  an empty string that never matches the prefix, so seeded nulls pass
  through unharmed (the family's defensive shape).
- The model deletes — **the cascading pivot rows take the awards**
  (`user_badges`), so an equipped badge's rows go with it; only the
  icon needs manual cleanup.
- The redirect lands on the listing (`dashboard.badges`), whose props
  refresh.
- The dialog copy "This will permanently remove this achievement
  badge." is accurate against exactly that contract.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `badgeTable.test.js` (the page's suite; the flow owns 6) | 17 | 248 |
| **Total for this flow's scope** | **6** | **~68** |

Result: **17 tests passed** (`vitest run` scoped to this folder); full
suite **52 files, 811 tests, 679/679 branches (100%)** — the flow's
coverage shipped with feature 10's round, so no totals changed since.

## 3. Decision coverage

**Method.** Istanbul *branch* coverage, as reported by
`vitest run --coverage`. An istanbul branch is one outcome of a decision
point (`if/else`, ternary, `&&`/`||` short-circuit, `??`, `?.`), which is
exactly the definition of decision coverage. `vitest.config.js` enforces
`thresholds: { branches: 100, functions: 100 }`, so the metric is a hard
gate, not just a report.

**Decision inventory** (one case per outcome):

| Decision | Location | Outcomes covered |
| --- | --- | --- |
| D8 | `badgeDeleteUrl` | a deletable pending badge → `/dashboard/badges/9` (the destroy route pinned literally); a null pending → `null`; an id-less row → `null` (the early-return arm) |
| D9 | `badgeDeleteDescription` | a titled pending → the full copy; a null pending → the closed-state copy ("delete undefined…") |
| D10 | `paginateCourses` (reuse pin, delete semantics) | deleting the only item on the last page → `safePage` falls back to the clamped page |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `badgeTable.js` | 11 | 11 (100%) — the flow owns the guard-composed ternary's two paths |

The suite passed on its first run — the composition mirrored the
challenge-delete and learning-path-delete patterns, whose outcomes were
already proven; only the copy and the route base differed.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `badgeTable.js` (whole module, post-flow) | 91 | 9 | 54 | 28 |
| **Delete-flow delta (this report's scope)** | **+~34** | — | — | **~+10** |

The delta is the flow's own footprint: the guard-composed URL and the
dialog copy with their JSDocs (plus the shared `hasDeletableId` import
the composition brought in). Feature 10's 0.091 KLOC covered the whole
module including this delta — its scope tables and totals stay as
measured; no double-counting in either direction.

- **KLOC (physical, primary): ~34 / 1000 = 0.034**
- KLOC (code-only): ~10 / 1000 = 0.010
- Istanbul executable lines: 15 module-wide (the flow owns the URL's
  and the copy's bodies)

## 5. Defect log

Defects discovered while building this flow's coverage. Delete-flow
count: **0**.

Findings documented instead of fixed:

- **The guard's false arms are defensive-only.** The dialog opens
  exclusively through `startDelete(badge)` with a full row, so
  `badgeDeleteUrl(null)` and the id-less row are unreachable through
  the UI. Pinned as the current contract rather than fixed — the same
  convention as the other unreachable-arm pages. The URL builder is
  the *guarded* variant of the delete-URL family: the courses editor's
  outline deletes with `moduleToDelete?.id` interpolated directly (the
  unguarded `/modules/undefined` shape documented earlier), while this
  flow refuses the request entirely when the id is missing.
- **The closed-state copy is computed every render.** Before any
  delete is pending, `badgeDeleteDescription(null)` produces "Are you
  sure you want to delete undefined?…" — but the Radix portal is
  unmounted while the dialog is closed, so the string is never
  displayed. Twin-consistent with the challenges/courses/users
  listings; pinned as-is.
- **No error feedback on a failed delete.** A failed `destroy` (a gate
  denial, a server error) leaves the dialog open with the confirm
  button re-enabled and no message — the challenges, courses, and
  learning paths listings behave identically, while the Users page is
  the toast outlier ("Failed to delete user."). Twin-consistent
  contract, recorded as a potential future UX gap if raised app-wide.
- **Cancel leaves the pending badge in state.** Closing via
  `onOpenChange` does not clear `badgeToDelete`; the next `startDelete`
  overwrites it and the successful delete clears both. No user-visible
  staleness is reachable — wiring nuance, documented.
- **The post-delete pagination hazard is eliminated by construction.**
  The page's hand-rolled clamp is gone; `paginateCourses`' live clamp
  handles the shrunken list — deleting the last item on the last page
  falls the page back automatically (the `pageAfterDelete` family the
  Users page needed). The D10 probe pins that inheritance.
- **The storage prefix guard.** The server deletes the stored icon only
  under the `badges/` prefix; the `(string)` cast means a seeded null
  icon can never trigger a deletion attempt — the family's defensive
  shape, verified here on the destroy path, with the cascading pivot
  rows taking the awards.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this flow, so there is nothing
to classify. The three-decision surface was extracted onto
already-covered helpers — the guard's semantics were fixed by the
shared `hasDeletableId`, the URL was verified against the route table,
and the copy was moved verbatim — leaving no injected defect to
discover.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.034 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% for the
module as a whole (11/11 branches), with the flow's outcomes each
owning a dedicated case. The flow's value is its pinned contracts — the
guard-composed URL against the destroy route, the cascade-verified
server behavior behind the dialog copy, and the clamp inheritance.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The badges listing suite
npx vitest run resources/js/Pages/Dashboard/Badges/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Dashboard/Badges/badgeTable.js | Measure-Object -Line
```
