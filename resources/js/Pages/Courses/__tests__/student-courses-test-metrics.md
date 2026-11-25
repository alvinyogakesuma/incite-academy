# Student Courses Catalog Page — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the student-facing Explore Courses catalog. The page
had no extracted module and no tests — its search, category, progress, and
sort pipeline lived inline in `index.jsx`. Following the established
extraction pattern, the decisions were pulled into a pure module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `courseCatalog.js` | The catalog's client-side pipeline: the `?category=` deep-link seed, the sidebar's category toggle, search (title + optional-chained description), the category filter, the four-way progress filter with its zero fallback, and the field-direction sort comparator |

Out of scope (by decision, same convention as the other pages):

- `index.jsx` — component wiring (window access stays in the component,
  passing the raw deep-link param to the pure helper); its decisions were
  extracted into the module above and the component was rewired to consume
  it, with behavior identical.
- `StudentFiltersSidebar` / `StudentCourseCard` — presentational components.
- The **admin** courses index — a separate page, already covered by its own
  suite (`Dashboard/Courses/__tests__/courses-test-metrics.md`).

A backend note that shapes the probes: the catalog serves **published**
courses only, and publishing rides the update validation where `title` is
required — so the unguarded `title.toLowerCase()` below is unreachable in
practice (documented, not fixed, mirroring the Login asymmetry).

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `courseCatalog.test.js` | 25 | 311 |

Result: **1 file, 25 tests, 25 passed** (`vitest run` scoped to this folder).

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
| D1 | `seedCategories` | deep link → seeded / none → empty |
| D2 | `toggleCategory` | append / remove |
| D3 | search and progress guards | empty query → all; `'all'` skips the progress filter |
| D4 | searchable fields | title / short_description / no match → dropped |
| D5 | `short_description?.` | null description never crashes either arm |
| D6 | unguarded title | the documented asymmetry — pinned as the current contract (unreachable: publishing requires a title) |
| D7 | category filter | none → all / selection → includes |
| D8 | `progressMatches` | not_started / in_progress band edges / completed / fallthrough |
| D9 | `progress \|\| 0` | null progress counts as not started |
| D10 | sort direction | asc / desc |
| D11 | comparator arms | string case-insensitive / numeric passthrough |
| D12 | equal values | comparator returns 0 |
| D13 | unknown sort value | order preserved |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `courseCatalog.js` | 32 | 32 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `courseCatalog.js` | 125 | 17 | 48 | 60 |

- **KLOC (physical, primary): 125 / 1000 = 0.125**
- KLOC (code-only): 60 / 1000 = 0.060
- Istanbul executable lines: 37

## 5. Defect log

Defects discovered while building this suite. Catalog-page count: **0**.

One candidate was investigated and documented rather than counted:

- **The title/description null-guard asymmetry.** Search calls
  `course.title.toLowerCase()` unguarded while `short_description` is
  optional-chained — a null title would throw. The backend proves it
  unreachable: the catalog serves published courses only, and publishing
  rides the update validation where `title` is required. Mirroring the
  Login page's documented asymmetry, the throw is pinned by a test as the
  current contract and recorded here instead of being fixed.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. The one candidate (the title asymmetry) is unreachable through
the validated publish path — the same class of documented, non-counted
finding as the Courses editor's cleared probes.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.125 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% with genuine
edge probing (null description both arms, progress band edges, unknown sort
values, the title asymmetry). The module inherited the admin catalog's
null-guard discipline everywhere except the one arm the backend makes
unreachable — documented, pinned, and honest.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Student catalog suite only
npx vitest run resources/js/Pages/Courses/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
