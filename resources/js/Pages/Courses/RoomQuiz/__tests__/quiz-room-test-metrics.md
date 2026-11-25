# Quiz Room Pages — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the student quiz room — the boarding screen (stat
cards, past attempts, Start Exercise) and the take screen (the
instant-feedback wizard with its completion card). Neither had an
extracted module or tests; the boarding screen additionally re-implemented
the article room's navigation logic inline — including the article room's
DD-01 hazard (an inactive context claiming a next row), now inherited
fixed via the shared helper. Following the established pattern, the
decisions were pulled into a pure module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `quizRoom.js` | The take screen's wizard decisions: the payload→option mapping (A/B/C/D letters, correctness flags), the score's per-question share with its div-zero guard, the progress bar's value, the completion headline, the three-state check button, the finished-attempt payload, and the Previous-vs-exit-confirm action |

Out of scope (by decision, same convention as the other pages):

- `RoomQuiz/index.jsx` and `RoomQuizStart/index.jsx` — component wiring
  (Radix dialogs/progress, state, router dispatch); the boarding screen's
  navigation decisions were rewired onto the **already-covered**
  `lessonRoom.js` helpers (inheriting the article room's DD-01 fix), the
  take screen's onto `quizRoom.js`.
- `StudentCourseRoomLayout` / `StudentCourseRoomActions` — covered by the
  article room suite.
- The exam room (`RoomExamStart`) — same wizard shape, only the answer
  key (kept server-side) and the time limit differ; it inherits this
  coverage and carries its own payload logic.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `quizRoom.test.js` | 16 | 199 |

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
| D1 | `pointsPerQuestion` | the lesson points split per question; empty quiz → zero (the div-by-zero guard mirrors the backend's submit scoring) |
| D2 | `progressPercentFor` | the current row's bar value; empty quiz → zero |
| D3–D4 | `optionLetter` / `mapQuizQuestions` | A/B/C/D letters; the payload mapped into lettered rows (payload fields ride along under options); null-safe over missing payloads and bare answers |
| D5 | `resultHeadline` | 100 → 'Perfect Score!'; anything else → 'Great Effort!' |
| D6 | `checkAnswerLabel` | unchecked → 'Check Answer'; checked mid-quiz → 'Next Question'; checked last → 'Finish Exercise' |
| D7 | `submitPayload` | every question id → its selected answer id; a skipped row maps undefined (documented: the backend requires each entry as an integer, unreachable behind the checked-gate) |
| D8 | `exitActionFor` | ordinary row → previous; first row → exit confirm |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `quizRoom.js` | 16 | 16 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `quizRoom.js` | 104 | 9 | 62 | 33 |

- **KLOC (physical, primary): 104 / 1000 = 0.104**
- KLOC (code-only): 33 / 1000 = 0.033
- Istanbul executable lines: 18

## 5. Defect log

Defects discovered while building this suite. Quiz-room count: **0**.

One contract was verified against the backend and pinned rather than
changed: `submitLesson` validates every answer as `required|integer`, so a
null would 422 — unreachable, because the wizard's checked-gate prevents
advancing past an unchecked row (checking requires a selection, and the
last row's check submits). The payload keeps its exact current shape and
the guarantee is documented in the module and pinned by the skipped-row
case. The boarding screen's navigation rewired onto the covered
`lessonRoom` helpers, inheriting the article room's DD-01 fix — the quiz
boarding's own inline copy of that same hazard never had to be fixed at
all.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. The probing verified the wizard's submission contract against
the backend's validation and confirmed the checked-gate closes the only
gap.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.104 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% with genuine
edge probing (div-zero, three wizard states, skipped-row payloads, empty
payloads). The most interesting finding was preventive — the boarding
screen's inline navigation carried the same unknown-id hazard the article
room's DD-01 exposed, and rewiring onto the covered helper removed it
before it could ever bite.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Quiz room suite only
npx vitest run resources/js/Pages/Courses/RoomQuiz/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
