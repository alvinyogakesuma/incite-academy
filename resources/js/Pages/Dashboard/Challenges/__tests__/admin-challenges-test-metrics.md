# Admin Challenges Index Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin Challenges management page — a verbatim
twin of the admin Courses management page. The page had no extracted
module and no tests; following the **reuse-first** design, the page's
own pipeline was extracted and everything shared was rewired onto the
covered `courseTable.js` helpers:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `challengeTable.js` | The page-specific filter (search over title + description, both null-safe — the field-name difference from the courses' `short_description`) and the page's sort label set (title, duration, points) and category gradient theme map |

Reused from `@/Pages/Dashboard/Courses/courseTable.js` (already covered,
**not double-counted here**): `paginateCourses` (the length-based
pagination with the live clamp), `categoryThemeFor` (parameterized theme
lookup — the page passes its own gradient map, and the null-category
fallback is live-capable), `categoryBadgeFor`, `hasDeletableId`, and
`formatDuration` (a **fourth verbatim duplicate** of that function was
eliminated from this page).

**One covered helper was generalized:** `courseTable.sortCourses`
(originally label-based over the courses' own option list) now accepts an
optional options set — `sortCourses(courses, sortLabel, sortOptions)` — so
the challenges page can pass its title/duration/points labels through the
same comparator. Backward compatible (the default keeps the courses'
options); the Courses suite gained a custom-options arm test pinning the
generalization.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `challengeTable.test.js` (this page) | 18 | 274 |
| `courseTable.test.js` (Courses suite, +1 generalization arm) | 39 | 334 |
| **Total for this page's scope** | **18** | **274** |

Result: **both suites passed** (`vitest run` scoped to both folders).

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
| D1 | `filterChallenges` search guard | empty query → all / query → filter |
| D2 | searchable fields | title / description / no match → dropped |
| D3 | `?? ''` guards | **both arms**: null description reached when the title misses, null title reached when the description matches |
| D4–D5 | category filter + AND composition | All / match / mismatch; search + category together |
| D6–D7 | `shouldShowReset` | each of the three dirty conditions, all-defaults false |
| D8 | `sortCourses` (generalized) | custom labels sort; unknown label → first of the passed options |
| D9 | `paginateCourses` reuse | the live clamp on this page's data |
| D10–D12 | theme/badge/guard/format reuse | null category → Reading gradient; 'Uncategorized' badge; both `?.` arms; duration format |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `challengeTable.js` | 14 | 14 (100%) |

One coverage iteration was needed: the reuse-pin probe for the null-title
arm initially used the wrong filter key (`searchQuery` instead of the
module's `query`), which left the empty-query short-circuit active on
both assertions — fixed, and both `??` arms now covered.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `challengeTable.js` | 83 | 7 | 37 | 39 |

- **KLOC (physical, primary): 83 / 1000 = 0.083**
- KLOC (code-only): 39 / 1000 = 0.039
- Istanbul executable lines: 11

## 5. Defect log

Defects discovered while building this suite. Admin-challenges count: **0**.

Three findings worth recording:

- **The title-guard contrast.** The backend's `store()` seeds draft rows
  `'title' => 'Untitled Challenge'`, so unlike the Courses pipeline's
  truly blank drafts, this page's title `?? ''` guard is *purely
  defensive* — pinned by the null-title test as the current contract.
  The description `?? ''` guard, by contrast, ships raw and nullable,
  making its fallback live-capable.
- **Nullable category.** The payload ships `category?->value`, so the
  gradient fallback (→ Reading Comprehension) and the 'Uncategorized'
  badge are live-capable — the same finding the challenge Detail page
  contributed, now test-enforced here too.
- **The navigation-duplicate hazard inherited.** The page's inline
  pagination and sort logic matched the article room's DD-01 family
  (boundary math written inline); rewiring onto the covered
  `paginateCourses` and the generalized `sortCourses` removed the
  possibility before it could ever bite.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. The reuse-first design reduced the page's own decision
surface to its filter and options, while the covered helpers carried the
null-guard lessons forward.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.083 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% with genuine
edge probing, and the reused helpers' coverage (the courses suite's 39
cases) applies to this page's payload — the effective tested surface
exceeds the page's own KLOC, which is precisely the value of reuse-first
extraction.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Admin challenges suite only
npx vitest run resources/js/Pages/Dashboard/Challenges/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
