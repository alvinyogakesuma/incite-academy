# Courses Management Page — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin Courses index page's decision logic. Unlike
the Users page, this page had **no extracted module and no tests** — every
decision lived inline in `index.jsx` (305 lines). Following the
`userTable.js` precedent, the search/filter/sort/pagination pipeline was
extracted into a pure module so every decision is unit-testable:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `courseTable.js` | The index page's client-side pipeline: search (null-safe for blank draft rows), category filter, label-based sort with default fallback, pagination with a live page clamp, reset visibility, duration formatting, category theme/badge fallbacks, delete guard |

Out of scope (by decision, same convention as the other pages):

- `index.jsx` — component wiring (router dispatch, dialogs, state); its
  decisions were extracted into the module above and the component was
  rewired to consume it, with behavior identical.
- The course **Editor** pages (module/lesson outline management) — a separate
  scope.
- `Pagination`/`paginationPages.js`, reused from the shared component suite,
  already covered there.

A backend note that shapes the tests: `store()` creates blank draft courses
(`Course::create()` with no attributes), so the list genuinely contains rows
with `title: null`, `short_description: null`, and `category: null`. The
null guards in this pipeline are load-bearing, not defensive paranoia.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `courseTable.test.js` | 37 | 440 |

Result: **1 file, 37 tests, 37 passed** (`vitest run` scoped to this folder).

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
| D1 | `filterCourses` empty-query short-circuit | empty → all / non-empty |
| D2 | searchable fields | title / short_description match, none → dropped |
| D3 | case-insensitive search | both directions |
| D4–D5 | null `title` / `short_description` safety | blank draft rows never crash the search; the null-description arm is reached even when the title misses |
| D6 | category filter | All / match / mismatch |
| D7 | AND composition | search + category together |
| D8 | `?? DEFAULT_SORT` label fallback | known / unknown label |
| D9–D11 | `sortCourses` | case-insensitive strings, numeric passthrough, asc/desc |
| D12–D15 | `paginateCourses` | first/middle/partial windows, beyond-range clamp, totalPages floors at 1, valid page kept |
| D16–D17 | `shouldShowReset` | each of the three dirty conditions, all-defaults false |
| D18–D19 | `formatDuration` | hours > 0 → `Xh Ym`, sub-hour → `Ym`, full-hour boundary `1h 0m` |
| D20–D21 | `categoryThemeFor` | known / unknown / null (draft row) → default theme |
| D22–D23 | `categoryBadgeFor` | present / null / empty → `Uncategorized` |
| D24–D25 | `hasDeletableId` | with id / null course / missing id (both `?.` arms) |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `courseTable.js` | 24 | 24 (100%) |

One coverage iteration was needed: the first run missed one branch because
the initial null-description case matched on the title first, so the `||`
chain short-circuited before reaching the null arm — an instructive
reminder that `??` arms under a short-circuit need their own targeted case.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `courseTable.js` | 121 | 17 | 28 | 76 |

- **KLOC (physical, primary): 121 / 1000 = 0.121**
- KLOC (code-only): 76 / 1000 = 0.076
- Istanbul executable lines: 29

## 5. Defect log

Defects discovered while building this suite. Courses-page count: **0**.

The probing was real — blank draft rows (null title, null description, null
category), unknown sort labels, out-of-range pages, full-hour boundaries,
and null delete targets were all exercised — and every case passed on the
first run. The pipeline's null guards predate the tests because this page
was written after the Users-page null-safety defects (DD #1–#3 there) had
already taught the lesson; the extraction moved correct code. The draft-row
finding above (that the guards are load-bearing, not decorative) is the
process insight this page contributes.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. All candidate edge cases passed on first execution — the
personal-process payoff of the earlier pages' defect logs (guard nullable
fields at the boundary) is visible here as a defect-free first pass.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.121 KLOC = 0 defects/KLOC
```

*Reading note:* zero does not mean the tests are weak — decision coverage
is gate-enforced at 100% and the edge cases are genuinely exercised. It
means the module inherited its guards from prior lessons, which is exactly
the improvement a defect-density practice is meant to produce.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Courses suite only
npx vitest run resources/js/Pages/Dashboard/Courses/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
