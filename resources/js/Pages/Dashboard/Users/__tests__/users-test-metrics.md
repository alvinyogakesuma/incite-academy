# Users Management Page — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin Users management page's decision logic:
the two pure modules extracted from the page's components so every
decision point is unit-testable in the `node` environment (no DOM).

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `userTable.js` | The index page's client-side pipeline: search, role/department filters, sorting, pagination, reset visibility, dropdown options, sort-state transitions, delete page-clamping, toast copy |
| 2 | `userForm.js` | The add/edit dialog logic: blank/hydrated form values, validation schema, PUT-vs-POST dispatch, server-error mapping, dialog title/submit copy, points input coercion |

Out of scope (by decision, same convention as the Register and Login
reports):

- `index.jsx` and `UserFormDialog.jsx` — component wiring (react-hook-form,
  Inertia router, Radix dialogs). The dialog's remaining pure decisions
  (title/submit copy, points coercion) were extracted into `userForm.js`;
  the React glue — hydration guard, pending gate, router dispatch — stays
  in the component by convention, as the test header documents.
- Register helpers reused by the dialog (`majorDepartementOptionsFor`,
  `staffEmailDomainsFor`, the zod refines) — covered by the Register
  suite and excluded here to avoid double counting.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `userTable.test.js` | 39 | 450 |
| `userForm.test.js` | 27 | 372 |
| **Total** | **66** | **822** |

Result: **2 files, 66 tests, 66 passed** (`vitest run` scoped to this folder).

## 3. Decision coverage

**Method.** Istanbul *branch* coverage, as reported by
`vitest run --coverage`. An istanbul branch is one outcome of a decision
point (`if/else`, ternary, `&&`/`||` short-circuit, `??`), which is exactly
the definition of decision coverage. `vitest.config.js` enforces
`thresholds: { branches: 100, functions: 100 }`, so the metric is a hard
gate, not just a report.

**Decision inventory.** Each test file documents its decisions with a
one-case-per-outcome principle:

*`userTable.js` (D1–D26):*

| Decision | Location | Outcomes covered |
| --- | --- | --- |
| D1 | `filterUsers` empty-query short-circuit | empty → all / non-empty |
| D2 | searchable fields | name / email / nim_nip / major_department match, none → dropped |
| D3 | case-insensitive search | both directions |
| D4–D5 | null `nim_nip` / `major_department` safety | null fields never crash the search |
| D6–D7 | role and department filters | All / match / mismatch |
| D8 | AND composition | search + role + department together |
| D9–D11 | `sortUsers` | case-insensitive strings, numeric passthrough, asc/desc |
| D12–D14 | `paginateUsers` | first/middle/partial windows, beyond-range empty, totalPages floors at 1 |
| D15–D16 | `shouldShowReset` | each of the five dirty conditions, all-defaults false |
| D17–D18 | `departmentOptions` | dedupe, nulls filtered out |
| D19–D21 | `nextSortState` | asc→desc flip, desc→asc flip, new field → asc |
| D22–D24 | `pageAfterDelete` | clamps after last-item delete, keeps valid page, floors at 1 |
| D25–D26 | `formSuccessMessage` | edit → updated / add → added |

*`userForm.js` (D1–D21):*

| Decision | Location | Outcomes covered |
| --- | --- | --- |
| D1 | `EMPTY_FORM` | the blank add-user shape |
| D2–D4 | `initialFormValues` | no user → blank form, full user copied, bare user → all seven nullish fallbacks |
| D5–D6 | `buildUserSchema` arms | consistent Mahasiswa / consistent staff pass |
| D7–D8 | rule splits | email per status, NIM vs NIP per status |
| D9 | points guards | negative trips min, 1.5 trips int, `''` trips the number type |
| D10–D11 | enums | role (student/admin), academic status (three values) |
| D12–D15 | refines | name, NIM, program studi, staff-domain — one case each |
| D16–D18 | `submitUserRequest` | id → PUT, null user → POST, missing id → POST |
| D19–D21 | `mapServerErrors` | null → no pairs, bag → pairs, empty bag → no pairs |
| D22 | `dialogCopy` | edit → Edit User Information / Update User, add → Add New User / Save User |
| D23 | `coercePointsInput` | `''` stays `''` (the number rule reports it), anything else becomes a Number; decimals and negatives pass through for the schema to reject |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `userTable.js` | 31 | 31 (100%) |
| `userForm.js` | 28 | 28 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only (comments/blanks excluded) and
istanbul executable lines are listed for transparency; the physical count
is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `userTable.js` | 117 | 16 | 27 | 74 |
| `userForm.js` | 118 | 7 | 29 | 82 |
| **Total** | **235** | **24** | **56** | **156** |

- **KLOC (physical, primary): 235 / 1000 = 0.235**
- KLOC (code-only): 156 / 1000 = 0.156
- Istanbul executable lines: 41

## 5. Defect log

Defects discovered while building this suite, documented inline as `DD`
annotations in the test files. Users-page count: **4** — the richest
defect log of the three pages measured so far.

| ID | Defect | Discovery & resolution | Guarding tests |
| --- | --- | --- | --- |
| DD #1 | A null `nim_nip` crashed the search — `filterUsers` called `.toLowerCase()` on a nullable column. | Found while decision-covering the search's fall-through chain; fixed with the `?? ''` null-safe fallbacks. | `userTable.test.js` — D4 null cases |
| DD #2 | A null `major_department` crashed the search the same way. | Same fix, same session. | `userTable.test.js` — D5 null cases |
| DD #3 | `departmentOptions` let null departments into the filter dropdown — the `Set` dedupe keeps null, mirroring the Register page's staff-domain defect. | Found while covering the dedupe decision; fixed with `filter(Boolean)`. | `userTable.test.js` — D18 |
| DD #4 | `pageAfterDelete` assumes the deleted user was in the filtered list — a stale list (user deleted elsewhere) clamps the page one item early. | **Documented, not fixed**: triggering it requires an out-of-band deletion; the assumption is pinned in the source comment and test header as a known limitation. | `userTable.test.js` — D22–D24 |

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy:

| # | PSP type | Inject phase | Remove phase | Description |
| --- | --- | --- | --- | --- |
| 1 | 60 — Checking (inadequate check) | Code | Test | `filterUsers` searched nullable columns without a null check — a null `nim_nip` crashed the search; fixed with `?? ''` fallbacks |
| 2 | 60 — Checking (inadequate check) | Code | Test | The same missing check for a null `major_department`; fixed alongside DD #1 |
| 3 | 60 — Checking (inadequate check) | Code | Test | `departmentOptions` passed null departments into the filter dropdown; fixed with `filter(Boolean)` |
| 4 | 80 — Function (logic) | Code | Test | `pageAfterDelete`'s clamp assumes the deleted user was in the filtered list — a stale list clamps one item early; documented as a known limitation |

Rationale:

- **DD #1–#3 → Type 60 (Checking).** All three are the same defect family:
  nullable columns are legal data, but the code used them without a null
  check. The fixes *are* the checks — `?? ''` and `filter(Boolean)`. This
  mirrors the Register page's staff-domain defect (also Type 60).
- **DD #4 → Type 80 (Function).** Unlike the others, the logic itself
  carries a wrong assumption: the clamp computes the next page from a
  count that only holds if the deleted user was in the filtered list. The
  code runs exactly as written — the premise is the defect.
- All four were injected in **Code** and removed in **Test**, continuing
  the Code → Test profile seen on the other pages.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 4 defects ÷ 0.235 KLOC ≈ 17.0 defects/KLOC
```

Alternative basis (code-only LOC): 4 ÷ 0.156 ≈ 25.6 defects/KLOC.

*Reading notes:*

- The count includes DD #4, which was documented rather than fixed —
  following the convention established on the Login page (defects *found
  by testing* count). Counting only fixed defects gives 3 ÷ 0.235 ≈ 12.8.
- The KLOC base grew from 0.219 to 0.235 when the add/edit dialog's last
  pure decisions (copy + points coercion) were extracted into
  `userForm.js`. The extraction moved correct code, so the density fell
  slightly (≈ 18.3 → ≈ 17.0) without any defect being fixed.
- Three of the four defects share one root pattern — nullable columns
  used without checks — which is exactly the insight defect-density
  logging is meant to surface. The personal-process lesson: guard
  nullable fields at the boundary, every time.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Users suite only
npx vitest run resources/js/Pages/Dashboard/Users/__tests__

# physical line count of the two modules
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
