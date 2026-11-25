# Student Learning Paths Index Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the student-facing Learning Paths catalog
(`/learning-paths` → `StudentLearningPathController::index`). The page
had no extracted module and no tests — its whole pipeline was inline in
the component, including a verbatim copy of the course catalog's sort
comparator. Following the **reuse-first** design (the sibling
`challengeCatalog.js` precedent), the page's own piece was extracted and
everything shared was rewired onto the covered helpers:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `learningPathCatalog.js` | The page's `SORT_OPTIONS` (title, total duration, course count pairs) and `filterLearningPaths` — search over title and description (both `?? ''`-guarded) plus the level filter over the selected levels |

Reused from `@/Pages/Courses/courseCatalog.js` (covered by the student
Courses suite, **not double-counted here**): `seedCategories` (the
`?level=` deep-link seed — the helpers are value-generic, the level is
this page's filter axis), `toggleCategory` (the sidebar toggle), and
`sortCourses` (the field-direction comparator — field-agnostic, so no
generalization was needed; the page's inline copy was a verbatim
duplicate and is now gone).

Also reused from `@/Pages/Dashboard/Courses/courseTable.js`:
`formatDuration` — the **fifth verbatim duplicate** of that function was
eliminated from `StudentLearningPathCard.jsx` (the card this page
renders; the Accordion component's copy was the fourth under the same
convention). The card shrank from 102 to 97 physical lines.

Out of scope (same convention as the other pages):

- The `LearningPaths/Detail` page — unmeasured, future work.
- The card's render decisions (the gradient fallback, image presence,
  view action), `StudentFiltersSidebar`, and `StudentHero` — component
  wiring; the gradient fallback is noted defensively in § 5.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `learningPathCatalog.test.js` (this page) | 20 | 341 |
| **Total for this page's scope** | **20** | **341** |

Result: **20 tests passed** (`vitest run` scoped to this folder).

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
| D1 | seed/toggle reuse | `?level=Beginner` → `['Beginner']`; no param → `[]`; the toggle adds and removes |
| D2 | `filterLearningPaths` search guard | empty query → all / query → filter |
| D3 | searchable fields | title / description / no match → dropped |
| D4 | `?? ''` guards | **both arms**: null description reached when the title misses, null title reached when the description matches — pinned as the defensive-only contract (the migration ships both columns NOT NULL) |
| D5 | level filter | no selection → all / one level keeps only its paths / a multi-level selection is an OR |
| D6 | AND composition | search + level together (match and mismatch) |
| D7 | `sortCourses` (reuse) | titles case-insensitive asc and desc (the fixture's mixed-case probe) |
| D8 | `sortCourses` (reuse) | `total_duration` and `courses_count` numeric in both directions |
| D9 | `sortCourses` (reuse) | equal values keep their incoming order (the equality arm) |
| D10 | `sortCourses` (reuse) | an unknown sort value preserves the incoming order |
| D11 | `formatDuration` reuse | the eliminated duplicate's contract over the card's payload |
| D12 | `SORT_OPTIONS` | the page ships its six sort pairs |
| D13 | the deep-link contract | a garbage `?level=` seeds a selection that filters everything out — the empty state shows and no sidebar checkbox renders selected |
| D14 | the full pipeline | filter then sort chained (the page's `useMemo` shape) |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `learningPathCatalog.js` | 10 | 10 (100%) |

One test iteration was needed: the first title-sort expectation inverted
the case-insensitive ordering arithmetic (a missed `a < l < t`); the
fixture's lowercase probe caught it immediately, and the corrected
expectation is the one the comparator produces.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `learningPathCatalog.js` | 56 | 5 | 25 | 26 |

- **KLOC (physical, primary): 56 / 1000 = 0.056**
- KLOC (code-only): 26 / 1000 = 0.026
- Istanbul executable lines: 11

*Attribution note:* the card's −5 physical lines (the eliminated
`formatDuration` duplicate, net of the import) are attributed to the
covered `courseTable.js` home, consistent with every earlier
elimination; the page's KLOC is its own module only.

## 5. Defect log

Defects discovered while building this suite. Learning-paths count: **0**.

Five findings worth recording:

- **Both search guards are defensive-only.** The migration ships
  `title` and `description` as NOT NULL columns, so the page's
  `title ?? ''` and `description ?? ''` guards fall back on values the
  payload always carries. Pinned by the null-arm tests as the current
  contract. The contrast family: the course catalog searches its title
  unguarded (documented there), while the *admin* challenges page's
  description ships genuinely nullable — this page is the third shape.
- **The deep link is unvalidated.** `seedCategories(level)` takes any
  `?level=` value; a garbage level seeds a selection no path matches —
  the empty state shows, and no sidebar checkbox renders selected
  because the options come from the `levels` prop
  (`LearningPath::LEVELS`). Twin-consistent with the courses and
  challenges catalogs' deep links; pinned as the contract.
- **The `image_url` passthrough.** The backend ships the Storage URL
  only when the stored path starts with `learning-paths/`; any other
  value passes through raw and `null` stays `null`. The card renders
  whatever non-null string arrives — the payload contract, documented.
- **The card's gradient fallback is unreachable.**
  `LEVEL_GRADIENTS` carries every key of the `LEVELS` enum, so the
  `|| LEVEL_GRADIENTS['All Levels']` fallback can never fire while the
  enum and the map stay in sync. Left in the component (visual
  wiring); noted defensively, like the other theme fallbacks.
- **The sort's mutation became a copy.** The inline comparator sorted
  the page's own copy in place; the shared comparator copies again
  before sorting. Behavior-equivalent for the page (the memo returns a
  fresh array either way) — noted for the rewire's faithfulness.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The pipeline's decisions were extracted verbatim onto
already-covered helpers, and the one duplication that existed (the sort
comparator) was eliminated rather than tested into permanence.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.056 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% on the page's
module, and the reused helpers' coverage (the student Courses suite's
catalog cases plus the courses admin suite's `formatDuration`) applies to
this page's payload — the effective tested surface exceeds the page's own
KLOC, which is precisely the value of reuse-first extraction.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Learning paths suite only
npx vitest run resources/js/Pages/LearningPaths/__tests__

# physical line count of the module
Get-Content resources/js/Pages/LearningPaths/learningPathCatalog.js | Measure-Object -Line
```
