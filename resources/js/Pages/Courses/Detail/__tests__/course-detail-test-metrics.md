# Student Course Detail Page — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the student course detail page — the course room
entry with the progress hero, the module/lesson outline, and the
progress-by-type sidebar. The page had no extracted module and no tests;
its decisions lived inline in `index.jsx` and in the shared
`StudentCourseContentAccordion` (which the lesson Room pages also render,
so they inherit this coverage). Following the established extraction
pattern, the decisions were pulled into a pure module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `courseDetail.js` | The completed-lesson tally and per-type progress bars (null-safe over missing sections and lesson arrays), the lesson row's icon dispatch, which accordion section starts open (the active lesson's own, else the first, else none), the section header's lesson-count fallbacks, and the badge reward card's gate |

Out of scope (by decision, same convention as the other pages):

- `index.jsx` and `StudentCourseContentAccordion.jsx` — component wiring
  (Radix accordion, router navigation, hover styling); their decisions
  were extracted into the module above and both files were rewired to
  consume it, with behavior identical.
- `formatDuration` — a **third verbatim copy** lived in this page (one in
  `index.jsx`, one in the accordion); both were deduped into imports from
  `courseTable.js`, the same move the Courses editor made.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `courseDetail.test.js` | 16 | 186 |

Result: **1 file, 16 tests, 16 passed** (`vitest run` scoped to this folder).

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
| D1–D4 | `progressSummaryFor` | full sections tally; null sections; null lesson arrays; empty sections — all zero-safe |
| D5 | `lessonIconTag` completed arm | completed rows check off regardless of type |
| D6 | quiz arm incl. the legacy `'practice'` probe | quiz → pencil; practice shares it (unreachable via current saves — documented) |
| D7–D8 | exam and article arms | exam → hourglass; article/unknown → article glyph |
| D9 | `defaultOpenSection` active arm | the active lesson's section opens; string/number id coercion pinned |
| D10–D12 | fallback arms | no active → first; empty → none; unknown active id → first |
| D13–D15 | `sectionLessonsCount` | explicit count wins; array length fallback; neither → 0 |
| D16 | `shouldShowBadgeCard` | badge data → shown (dormant: the show payload never ships one); absent / null course → hidden |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `courseDetail.js` | 23 | 23 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `courseDetail.js` | 104 | 11 | 50 | 43 |

- **KLOC (physical, primary): 104 / 1000 = 0.104**
- KLOC (code-only): 43 / 1000 = 0.043
- Istanbul executable lines: 25

## 5. Defect log

Defects discovered while building this suite. Detail-page count: **0**.

Two candidates were investigated and documented rather than counted:

- **The legacy `'practice'` lesson type.** The icon dispatch carries an
  arm for `'practice'` — a type current saves cannot produce (the lesson
  schema allows article/quiz/exam only). Rows from the deprecated app
  would render with the quiz glyph harmlessly; unreachable via validated
  saves, documented and pinned by a test.
- **The dormant badge gate.** The reward card renders on
  `course.badge`, but the backend `show()` payload never ships a badge
  key — the card is dead-by-design until badge data starts arriving
  (the code comment says exactly this). The gate was extracted and its
  both arms pinned, so the day the payload grows a badge the card lights
  up without any change here.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. Both candidates are unreachable-or-intentional states, the
same class of documented, non-counted findings as the catalog's title
asymmetry and the Courses editor's cleared probes. The `formatDuration`
triplication was a quality cleanup, not a defect — it predates the
testing pass and moved into an import without any behavior change.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.104 KLOC = 0 defects/KLOC
```

*Reading note:* the ninth page measured in this project and the fifth at
zero defects — the null-guard and unreachable-arm discipline is now the
default, and the probes here document dormant or legacy states rather
than finding live faults.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Course detail suite only
npx vitest run resources/js/Pages/Courses/Detail/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
