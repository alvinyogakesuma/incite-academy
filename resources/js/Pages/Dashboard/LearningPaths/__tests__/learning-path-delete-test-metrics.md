# Admin Learning Path Delete Flow — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the **delete flow** of the admin Learning Paths
management page, measured as its own unit. The flow's extraction and
coverage shipped with the index page's round (the challenge-delete
pattern applied directly rather than as a later round); this report
carves the flow out as its own measured unit — the no-double-counting
attribution mirrors the shared-module convention:

| # | Helper | Responsibility |
| --- | --- | --- |
| 1 | `learningPathDeleteUrl` | The delete flow's guard-composed URL — a deletable pending path resolves to the destroy route (`DELETE /dashboard/learning-paths/{learning_path}`), anything else (a null pending object, an id-less row) to `null`, which the page treats as the early-return arm |
| 2 | `learningPathDeleteDescription` | The delete dialog's copy keyed to the pending path's title, null-safe on the object itself |

Reused from `@/Pages/Dashboard/Courses/courseTable.js` (covered, **not
double-counted here**): `hasDeletableId` — the guard itself
(`Boolean(item?.id)`), composed by the URL builder — and
`paginateCourses`' live clamp, which owns the post-delete pagination.

Out of scope (same convention as the other flow reports): the Radix
`DeleteConfirmationDialog` component and the `router.delete` callbacks
(`onStart`/`onFinish`/`onSuccess` state wiring); and the listing
pipeline, which the index report already measures.

Verified contract for the wire format: `routes/web.php` maps `DELETE
/dashboard/learning-paths/{learning_path}` to
`Admin\LearningPathController::destroy`, which authorizes via
`Gate::authorize('delete', $learningPath)`, deletes the stored cover
only when it sits under the `learning-paths/` storage prefix (seeded
nulls pass through unharmed — the `(string)` cast turns null into an
empty string that never matches), deletes the model — the cascading
pivot rows take the course sequence, and `learning_path_enrollments`
**cascades too** (`cascadeOnDelete()` verified in the migration, so no
orphaned enrollment rows remain) — and redirects back to the listing.
The dialog copy "…and its course sequence." is accurate against exactly
that contract.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `learningPathTable.test.js` (the page's suite; the flow owns 6) | 27 | 410 |
| **Total for this flow's scope** | **6** | **60** |

Result: **both scoped suites passed** (`vitest run` on this folder and
the Courses folder for the shared guard's home); full suite **52 files,
811 tests, 679/679 branches (100%)** — the flow's coverage shipped with
the index round, so no totals changed since.

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
| D13 | `learningPathDeleteUrl` | a deletable pending path → `/dashboard/learning-paths/9` (the destroy route pinned literally); a null pending → `null`; an id-less row → `null` (the early-return arm) |
| D14 | `learningPathDeleteDescription` | a titled pending → the full copy; a null pending → the closed-state copy ("delete undefined…") |
| D15 | `paginateCourses` (reuse pin, delete semantics) | deleting the only item on the last page → `safePage` falls back to the clamped page |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `learningPathTable.js` (post-flow) | 18 | 18 (100%) — the flow owns the guard-composed ternary's two paths |

One extraction iteration was needed when the helpers landed: the guard
was originally inline in `confirmDelete` (its false arm then
untestable without DOM tests), and composing it into the URL builder
moved both outcomes into the covered module while keeping the page's
behavior byte-identical — the same iteration the challenge-delete flow
went through.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `learningPathTable.js` (whole module, post-flow) | 152 | 11 | 77 | 64 |
| **Delete-flow delta (this report's scope)** | **+30** | **+2** | **+24** | **+4** |

The delta is the flow's own footprint in the module: the header doc's
two flow bullets, the two helpers with their JSDocs, and their
separating blanks (plus the shared import line the guard composition
brought in). The index report's 0.152 KLOC covered the whole module
including this delta — its scope table and totals stay as measured; no
double-counting in either direction.

- **KLOC (physical, primary): 30 / 1000 = 0.030**
- KLOC (code-only): 4 / 1000 = 0.004
- Istanbul executable lines: 16 module-wide (the flow owns the import
  line and the two helper bodies)

## 5. Defect log

Defects discovered while building this flow's coverage. Delete-flow
count: **0**.

Findings documented instead of fixed:

- **The guard's false arms are defensive-only.** The dialog opens
  exclusively through `startDelete(path)` with a full row, so
  `learningPathDeleteUrl(null)` and the id-less row are unreachable
  through the UI. Pinned as the current contract rather than fixed —
  the same convention as the other unreachable-arm pages. The URL
  builder is the *guarded* variant of the delete-URL family: the
  courses editor's outline deletes with `moduleToDelete?.id`
  interpolated directly (the unguarded `/modules/undefined` shape
  documented earlier), while this flow refuses the request entirely
  when the id is missing.
- **The closed-state copy is computed every render.** Before any
  delete is pending, `learningPathDeleteDescription(null)` produces
  "Are you sure you want to delete undefined?…" — but the Radix portal
  is unmounted while the dialog is closed, so the string is never
  displayed. Twin-consistent with the courses/challenges/users
  listings; pinned as-is.
- **No error feedback on a failed delete.** A failed `destroy` (a gate
  denial, a server error) leaves the dialog open with the confirm
  button re-enabled and no message — the courses and challenges
  indexes behave identically, while the Users page is the toast
  outlier ("Failed to delete user."). Twin-consistent contract,
  recorded as a potential future UX gap if raised app-wide.
- **Cancel leaves the pending path in state.** Closing via
  `onOpenChange` does not clear `pathToDelete`; the next
  `startDelete` overwrites it and the successful delete clears both.
  No user-visible staleness is reachable — wiring nuance, documented.
- **The post-delete pagination hazard is eliminated by construction.**
  The page's hand-rolled clamp is gone; `paginateCourses`' live clamp
  handles the shrunken list — deleting the last item on the last page
  falls the page back automatically (the `pageAfterDelete` family the
  Users page needed). The D15 probe pins that inheritance.
- **The storage prefix guard.** The server deletes the stored cover
  only under the `learning-paths/` prefix; the `(string)` cast means a
  seeded null image can never trigger a deletion attempt — the
  defensive shape the family's reports have pinned, verified here on
  the destroy path.

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
defect density = 0 defects ÷ 0.030 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% for the
module as a whole (18/18 branches), with the flow's outcomes each
owning a dedicated case. The flow's value is the pinned contracts: the
guard-composed URL against the destroy route, the cascade-verified
server behavior behind the dialog copy, and the clamp inheritance —
all regression-proof.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The delete-flow suite and the shared guard's home
npx vitest run resources/js/Pages/Dashboard/LearningPaths/__tests__ resources/js/Pages/Dashboard/Courses/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Dashboard/LearningPaths/learningPathTable.js | Measure-Object -Line
```
