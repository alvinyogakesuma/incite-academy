# Admin Challenge Delete Flow — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the **delete flow** of the admin Challenges
management page, measured as its own unit (the create/update editor got
the same treatment). The flow's decisions lived inline in the page
component (`index.jsx`): the confirmation guard, the destroy URL, and
the dialog copy. Following the project's extract-then-test pattern, they
now live in the covered `challengeTable.js` module:

| # | Helper | Responsibility |
| --- | --- | --- |
| 1 | `challengeDeleteUrl` | The delete flow's guard-composed URL — a deletable pending challenge resolves to the destroy route (`DELETE /dashboard/challenges/{challenge}`), anything else (a null pending object, an id-less draft) to `null`, which the page treats as the early-return arm |
| 2 | `challengeDeleteDescription` | The delete dialog's copy keyed to the pending challenge's title, null-safe on the object itself |

Reused from `@/Pages/Dashboard/Courses/courseTable.js` (already covered,
**not double-counted here**):

- `hasDeletableId` — the guard itself (`Boolean(item?.id)`), composed by
  `challengeDeleteUrl`. Its home suite covers both `?.` arms, and this
  page's suite pins it on the challenge payload (the index report's D11).
- `paginateCourses` — the live clamp that owns the post-delete pagination
  (the index report's D8 pins it on this page's data).

Out of scope (same convention as the other pages): the Radix
`DeleteConfirmationDialog` component and the `router.delete` callbacks
(`onStart`/`onFinish`/`onSuccess` state wiring) — wiring, not decisions;
and the listing pipeline (search/filter/sort/pagination), which the index
report already measures.

Verified contract for the wire format: `routes/web.php` maps `DELETE
/dashboard/challenges/{challenge}` to `Admin\ChallengeController::destroy`,
which authorizes via `Gate::authorize('delete', $challenge)`, deletes the
stored cover image, deletes each question's stored audio, deletes the
model, and redirects back to the index — the frontend URL builder and the
early-return guard are the frontend face of exactly that route.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `challengeTable.test.js` (the page's suite; the flow adds 6) | 24 | 346 |
| **Total for this flow's scope** | **6** | **72** |

Result: **both scoped suites passed** — 2 files, 62 tests (`vitest run`
on this folder and the Courses folder for the shared guard's home).

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
| D13 | `challengeDeleteUrl` | an id-bearing pending challenge → `/dashboard/challenges/9` (the destroy route pinned literally); a null pending → `null`; an id-less draft → `null` (the early-return arm) |
| D14 | `challengeDeleteDescription` | a titled pending → the full copy; a null pending → the closed-state copy ("delete undefined…") |
| D15 | `paginateCourses` (reuse pin, delete semantics) | deleting the only item on the last page → `safePage` falls back to the clamped page |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `challengeTable.js` (post-flow) | 16 | 16 (100%) — the index report measured this module at 14 before the delete flow landed |

The two new decisions add two istanbul branch paths net — the
guard-composed ternary's arms; the description's optional-chaining arms
are covered by D14 at runtime. One extraction iteration was needed: the
guard was originally left inline in `confirmDelete` (its false arm then
untestable without DOM tests), and composing it into the URL builder
moved both outcomes into the covered module while keeping the page's
behavior byte-identical.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `challengeTable.js` (whole module, post-flow) | 116 | 10 | 62 | 44 |
| **Delete-flow delta (this report's scope)** | **+33** | **+3** | **+25** | **+5** |

The delta is the flow's own footprint in the module: the import of the
shared guard, the two helpers (each two physical lines after formatting),
and their documentation. The index report's 0.083 KLOC remains the
historical measurement of the pre-flow module — no double-counting.

- **KLOC (physical, primary): 33 / 1000 = 0.033**
- KLOC (code-only): 5 / 1000 = 0.005
- Istanbul executable lines: 15 module-wide (the index measurement's
  baseline was 11; the flow adds the import and the two helper bodies)

## 5. Defect log

Defects discovered while building this suite. Delete-flow count: **0**.

Five contract findings documented instead of fixed:

- **The guard's false arms are defensive-only.** The dialog opens
  exclusively through `startDelete(challenge)` with a full row, so
  `challengeDeleteUrl(null)` and the id-less draft are unreachable
  through the UI. Pinned as the current contract rather than fixed — the
  same convention as the other unreachable-arm pages. The URL builder is
  the *guarded* variant of the delete-URL family: the courses editor's
  outline deletes with `moduleToDelete?.id` interpolated directly (the
  unguarded `/modules/undefined` shape documented earlier), while this
  flow refuses the request entirely when the id is missing.
- **The closed-state copy is computed every render.** Before any delete
  is pending, `challengeDeleteDescription(null)` produces
  "Are you sure you want to delete undefined?…" — but the Radix portal
  is unmounted while the dialog is closed, so the string is never
  displayed. The twin pages (users, courses) compute the same shape;
  pinned as-is per the pin-unreachable-contracts convention.
- **Cancel leaves the pending challenge in state.** Closing via
  `onOpenChange` does not clear `challengeToDelete`; the next
  `startDelete` overwrites it and the successful delete clears both.
  No user-visible staleness is reachable — wiring nuance, documented.
- **No error feedback on a failed delete.** A failed `destroy` (a gate
  denial, a server error) leaves the dialog open with the confirm button
  re-enabled and no message — the courses index twin behaves
  identically, while the Users page is the toast outlier ("Failed to
  delete user."). Twin-consistent contract, recorded as a potential
  future UX gap if raised app-wide.
- **The post-delete pagination hazard is eliminated by construction.**
  The Users page needed an explicit `pageAfterDelete` helper (and
  documented a stale-list assumption defect there); this page's
  `paginateCourses` live-clamps `safePage` on every render, so deleting
  the last item on the last page falls the page back automatically —
  the D15 probe pins that inheritance.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this flow, so there is nothing
to classify. The three-decision surface was extracted onto already-covered
helpers — the guard's semantics were fixed by the shared
`hasDeletableId`, the URL was verified against the route table, and the
copy was moved verbatim — leaving no injected defect to discover.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.033 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% for the
module as a whole (16/16 branches), with the flow's outcomes each owning
a dedicated case. The flow's value is structural: the guard composition,
the route-pinned URL, and the delete-shaped pagination probe now make
the destructive path's behavior explicit and regression-proof.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The delete-flow suite and the shared guard's home
npx vitest run resources/js/Pages/Dashboard/Challenges/__tests__ resources/js/Pages/Dashboard/Courses/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Dashboard/Challenges/challengeTable.js | Measure-Object -Line
```
