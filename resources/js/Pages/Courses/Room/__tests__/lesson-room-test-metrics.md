# Lesson Room (Article) Page — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the student article room — the lesson viewer for
article lessons. The page itself is thin; its real decisions live in the
shared room shell (`StudentCourseRoomLayout`, also rendered by the quiz
and exam rooms, so they inherit this coverage) and its actions bar. None
had an extracted module or tests. Following the established pattern, the
decisions were pulled into a pure module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `lessonRoom.js` | The article body with its prepared-content placeholder, the null-guarded flat lesson list, the active lesson's derived navigation context (index, lesson, both boundaries), the previous-lesson id, the Next-vs-Finish destination, the room title, and the actions bar's labels |

Out of scope (by decision, same convention as the other pages):

- `Room/index.jsx`, `StudentCourseRoomLayout.jsx`,
  `StudentCourseRoomActions.jsx` — component wiring (router dispatch,
  object rendering); their decisions were extracted into the module above
  and all three files were rewired to consume it.
- `StudentCourseContentAccordion` — already covered by the course detail
  suite, and its formatDuration duplicate was deduped there earlier.
- The quiz and exam rooms — separate pages sharing this shell; they
  inherit the navigation coverage and carry their own payload logic.

A backend note that shapes the tests: the article room's `lesson` payload
carries `article_content` raw and it is nullable for unprepared lessons —
the `||` placeholder fallback is load-bearing, not decorative.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `lessonRoom.test.js` | 17 | 183 |

Result: **1 file, 17 tests, 17 passed** (`vitest run` scoped to this folder).

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
| D1 | `articleBodyFor` | content renders as-is; empty and null content show the placeholder |
| D2 | `flatLessonsIn` | full sections flatten; null sections / null lesson arrays → empty |
| D3 | `activeLessonContext` | the active lesson resolves to its index and itself, mid-band boundaries |
| D4 | `activeLessonContext` unknown id | an inactive context — index −1, lesson null, **both boundaries inert (DD-01)** |
| D5 | boundaries | the first row has no previous; the last has no next; a single lesson has neither |
| D6 | `previousLessonId` | the previous row's id, or null on the first |
| D7 | `nextVisitUrl` | the next lesson's room, or the course page on the last (Finish Course) |
| D8 | `roomTitleFor` | the lesson title, or the 'Lesson' fallback for an unknown row |
| D9 | `nextButtonLabel` | 'Next' / 'Finish Course' |
| D10 | `reviewedLabel` | 'Reviewed' / 'Mark as Reviewed' |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `lessonRoom.js` | 20 | 20 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `lessonRoom.js` | 114 | 11 | 68 | 35 |

- **KLOC (physical, primary): 114 / 1000 = 0.114**
- KLOC (code-only): 35 / 1000 = 0.035
- Istanbul executable lines: 23

## 5. Defect log

Defects discovered while building this suite. Article-room count: **1**.

| ID | Defect | Discovery & resolution | Guarding tests |
| --- | --- | --- | --- |
| DD-01 | For a lesson id not present in the outline, the navigation context computed `hasNext` as `activeIndex < length - 1`, which is true at index −1 — an inactive context claiming a next row, so the Next button would navigate to the first lesson of the course. Unreachable through the lesson room routes (model binding guarantees a real lesson), but a genuine logic fault in the expression. | Found by the D4 probe — the case asserted "everything inert" and the original expression disagreed. **Fixed** by making the inactive arm inert on both boundaries (`activeIndex >= 0 && activeIndex < length - 1`), behavior-identical on all reachable paths. | `lessonRoom.test.js` — the D4 inactive-context case |

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy:

| # | PSP type | Inject phase | Remove phase | Description |
| --- | --- | --- | --- | --- |
| 1 | 80 — Function (logic) | Code | Test | The navigation context's `hasNext` boundary ignored the unknown-id case (activeIndex −1), leaving an inactive context with a live Next button; the inactive arm is now inert on both boundaries |

Rationale: **Type 80 (Function).** The comparison logic itself was
incomplete — the boundary needed to also exclude the not-found state.
Injected in **Code** (the original inline expression) and removed in
**Test** (the probe asserted inertness and the expression disagreed).

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 1 defect ÷ 0.114 KLOC ≈ 8.8 defects/KLOC
```

Alternative basis (code-only LOC): 1 ÷ 0.035 ≈ 28.6 defects/KLOC.

*Reading note:* the module is the smallest base yet measured (0.114
KLOC), so a single defect produces the project's largest density — the
report repeats the standing caution that densities at sub-KLOC scale are
inflated and only comparable within a page family. The defect itself is
a textbook catch: the probe asked what happens when the lesson is *not
in the outline* and the boundary answered "there is a next" — the exact
fault class decision coverage is designed to expose.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Article room suite only
npx vitest run resources/js/Pages/Courses/Room/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
