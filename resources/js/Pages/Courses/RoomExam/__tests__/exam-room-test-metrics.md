# Exam Room Pages — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the student exam room — the boarding screen (stat
cards with the timed condition's minutes, past attempts, Start Exam) and
the timed take screen (a free-navigation wizard with a countdown that
auto-submits at zero, a navigator grid, and the authoritative-score result
card). Neither had an extracted module or tests. Following the
established pattern, the decisions were pulled into a pure module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `examRoom.js` | The countdown's initial value with its 60-minute fallback, the payload→option mapping (ids and texts — the answer key stays server-side), the answered counter, the finished attempt's answers (answered rows only — skipped rows omitted), the countdown tick with its auto-submit signal, the clock format, the progress bar's value, and the navigator grid's cell state |

Out of scope (by decision, same convention as the other pages):

- `RoomExam/index.jsx` and `RoomExamStart/index.jsx` — component wiring
  (Radix dialogs/progress, state, timer interval, router dispatch); the
  boarding screen's navigation decisions were rewired onto the
  **already-covered** `lessonRoom.js` helpers (inheriting the article
  room's DD-01 fix), the take screen's onto `examRoom.js`.
- `resultHeadline` — identical to the quiz room's ternary; reused from
  `quizRoom.js` (no duplicate).

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `examRoom.test.js` | 21 | 219 |

Result: **1 file, 21 tests, 21 passed** (`vitest run` scoped to this folder).

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
| D1 | `examDurationSeconds` | stored limit → seconds; falsy limit → 60 minutes (the falsy-zero arm is unreachable via the schema's `min(1)` — documented) |
| D2 | `mapExamQuestions` | id/text option rows; **no letters and no correctness flags** (the answer key stays server-side); null-safe |
| D3 | `answeredCountIn` | selections count; undefined and null rows are skipped; empty → 0 |
| D4 | `examSubmitAnswers` | answered rows ride; skipped rows **omitted, never nulled** — free navigation makes skipped rows reachable, and the backend's per-key required-integer rule tolerates missing keys while nulls would 422 |
| D5 | `tickTimeLeft` | ordinary ticks; one second → zero (the auto-submit signal) |
| D6 | `formatClock` | hours → `Xh MMm SSs`; sub-hour → `MM:SS`; zero → `00:00` |
| D7 | `examProgressPercent` | the answered share; empty exam → zero |
| D8 | `navigatorCellState` | current wins / answered / default |
| D9 | `resultHeadline` (reused from `quizRoom.js`) | 100 → 'Perfect Score!'; else 'Great Effort!' |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `examRoom.js` | 20 | 20 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `examRoom.js` | 130 | 15 | 67 | 48 |

- **KLOC (physical, primary): 130 / 1000 = 0.13**
- KLOC (code-only): 48 / 1000 = 0.048
- Istanbul executable lines: 25

## 5. Defect log

Defects discovered while building this suite. Exam-room count: **0**.

One contract was verified against the backend and pinned as the page's
defining difference from the quiz room: `submitLesson` validates every
present answer as `required|integer`, and the exam's **free navigation**
makes skipped rows genuinely reachable — which the exam honors by
*omitting* unanswered rows from the payload entirely (missing keys pass
the per-key rule; a null would 422). The quiz room's checked-gate makes
that state impossible, so the two rooms hold mirrored-but-different
submission contracts, both now pinned by tests. The boarding screen's
navigation rewired onto the covered `lessonRoom` helpers, inheriting the
article room's DD-01 fix — the exam boarding's own inline copy of that
same hazard never had to be fixed at all.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. The probing verified the exam's submission contract against
the backend's validation and the wizard's free-navigation reachability —
the cross-checking technique first used on the Lesson editor now paying
off again.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.13 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% with genuine
edge probing (countdown zero, falsy duration, omitted rows, navigator
precedence, clock boundaries). The most valuable outcome is the
submission-contract cross-check — the two rooms hold mirrored-but-
different payload contracts, both now test-enforced.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Exam room suite only
npx vitest run resources/js/Pages/Courses/RoomExam/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
