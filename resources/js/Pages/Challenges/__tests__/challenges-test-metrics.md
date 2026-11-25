# Student Challenges Catalog Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the student-facing Explore Challenges catalog. The
page is a near-verbatim sibling of the Explore Courses catalog — same
deep-link seed, same category toggle, same field-direction sort comparator
(over title, duration, and **points** instead of the courses'
`lessons_count`). Because the shared helpers are already covered by the
Courses catalog suite, the design was **reuse-first**: the page-specific
logic alone was extracted, and everything else rewired onto the covered
module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `challengeCatalog.js` | The challenges-specific filter — search over title and description (both null-safe), the category filter, and **no progress filter** (the structural difference from the course catalog's pipeline); plus the page's `SORT_OPTIONS` export |

Reused from `@/Pages/Courses/courseCatalog.js` (already covered by the
Courses catalog suite, **not double-counted** here): `seedCategories` (the
`?category=` deep-link seed), `toggleCategory` (the sidebar toggle), and
`sortCourses` (the field-agnostic comparator).

Out of scope (by decision, same convention as the other pages):

- `index.jsx` — component wiring; its decisions were extracted or rewired
  onto the covered modules, with behavior identical.
- `StudentChallengeCard` / `StudentFiltersSidebar` — presentational
  components.
- The challenge Detail and Room pages — separate scopes.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `challengeCatalog.test.js` | 14 | 238 |

Result: **1 file, 14 tests, 14 passed** (`vitest run` scoped to this folder).

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
| D1 (catalog) | `seedCategories` / `toggleCategory` reuse | deep-link both arms; toggle append/remove — identical behavior pinned on this page |
| D1 | `filterChallenges` search guard | empty query → all / query → filter |
| D2 | searchable fields | title / description / no match → dropped |
| D3 | `?? ''` guards | **both arms**: null description reached when the title misses, null title reached when the description matches (the short-circuit lesson from the Courses index applied) |
| D4 | category filter | none → all / selection → includes |
| D5 | AND composition | search + category together |
| D6–D7 | `sortCourses` reuse on this page's fields | points asc/desc, duration asc — numerically; unknown sort value → order preserved |
| — | `SORT_OPTIONS` | the page's six sort pairs pinned |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `challengeCatalog.js` | 10 | 10 (100%) |

One coverage iteration was needed: the first null-probe covered the
description's `??` arm but short-circuited past the title's — the same
lesson the Courses index taught, applied here with both mirror arms
covered.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `challengeCatalog.js` | 54 | 5 | 21 | 28 |

- **KLOC (physical, primary): 54 / 1000 = 0.054**
- KLOC (code-only): 28 / 1000 = 0.028
- Istanbul executable lines: 11

## 5. Defect log

Defects discovered while building this suite. Challenges-page count: **0**.

Two findings are worth noting. First, the reused helpers carried their
coverage over unchanged — the comparator needed no modification to sort
this page's fields, which is the reuse design paying off. Second, the
null-guards here are even further from live hazards than the courses
index's: the admin's challenge draft rows are seeded `'Untitled
Challenge'` (never null titles, unlike the courses' blank drafts), so
both `?? ''` guards are purely defensive — probed and pinned anyway,
following the short-circuit lesson.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. The page inherited its guards from the Courses index's
short-circuit lesson, and the reuse-first design meant the only new logic
was the challenges-specific filter.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.054 KLOC = 0 defects/KLOC
```

*Reading note:* the module is the smallest yet measured, but the reused
helpers' coverage (18 catalog-suite cases) applies to it — the effective
tested surface is larger than the page's own KLOC suggests, which is
precisely the value of reuse-first extraction.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Challenges suite only
npx vitest run resources/js/Pages/Challenges/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
