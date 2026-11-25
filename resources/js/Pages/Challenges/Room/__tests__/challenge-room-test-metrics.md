# Challenge Room Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the student challenge room — the timed challenge
take screen, a verbatim twin of the exam take screen without the course
outline. Because the two wizards are identical, the design was
**reuse-first**: the page's own logic was reduced to a one-decision module,
and everything else rewired onto the covered exam helpers:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `challengeRoom.js` | The countdown's initial value — the challenge's time limit in seconds with a 15-minute fallback (the exam room's fallback is 60; the falsy-zero arm is unreachable via the admin's duration validation) |

Reused from `@/Pages/Courses/RoomExam/examRoom.js` (covered by the exam
room suite, **not double-counted here**): `mapExamQuestions` — the
challenge payload ships answers without correctness flags, matching the
exam's mapping exactly — plus `answeredCountIn`, `examSubmitAnswers`
(skipped rows omitted; the backend validates the same per-key
required-integer rule), `tickTimeLeft`, `formatClock`,
`examProgressPercent`, and `navigatorCellState`. Reused from
`@/Pages/Courses/RoomQuiz/quizRoom.js`: `resultHeadline`.

Out of scope (by decision, same convention as the other pages):

- `index.jsx` — component wiring (state, timer interval, router
  dispatch, Radix dialogs); its decisions were extracted or rewired onto
  the covered modules, with behavior identical.
- The challenge **Detail** page — a separate scope.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `challengeRoom.test.js` | 14 | 187 |

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
| D1 | `challengeDurationSeconds` | stored limit → seconds; falsy limit → 15 minutes (the falsy-zero arm unreachable via the admin's duration validation — documented) |
| D2 | `mapExamQuestions` reuse on this payload | id/text rows; the challenge answer key never ships; null-safe |
| D3 | `answeredCountIn` reuse | selections count, gaps skipped |
| D4 | `examSubmitAnswers` reuse on this page's submit | answered rows ride; skipped rows omitted, never nulled |
| D5 | `tickTimeLeft` reuse | ordinary tick; one second → zero (auto-submit) |
| D6 | `formatClock` reuse | hour arm, sub-hour padding, zero |
| D7 | `examProgressPercent` reuse | the share; empty → zero |
| D8 | `navigatorCellState` reuse | current / answered / default precedence |
| D9 | `resultHeadline` reuse | 100 → 'Perfect Score!'; else 'Great Effort!' |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `challengeRoom.js` | 1 | 1 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `challengeRoom.js` | 30 | 1 | 28 | 1 |

- **KLOC (physical, primary): 30 / 1000 = 0.03**
- KLOC (code-only): 1 / 1000 = 0.001
- Istanbul executable lines: 1

## 5. Defect log

Defects discovered while building this suite. Challenge-room count: **0**.

The probing pinned the page's own fallback (15 minutes — different from
the exam's 60, a deliberate per-feature choice) and the shared
submission/clock/navigator contracts on this page's payload. The most
important cross-check was the answer key: `ChallengeController::take`
ships answers with ids and texts only (no `is_correct`), which
`mapExamQuestions` maps identically to the exam's — the "answer key never
ships" contract is now test-enforced on both pages.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. The page is a structural twin of the exam room, and the
reuse-first design reduced its own decision surface to the duration
fallback it actually owns.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.03 KLOC = 0 defects/KLOC
```

*Reading note:* the KLOC base is tiny because the module owns a single
decision — the strongest reuse-first result yet. The reused exam suite's
coverage (its 20 branches) applies to this page's payload, which is
exactly the value of structuring twins to share modules.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Challenge room suite only
npx vitest run resources/js/Pages/Challenges/Room/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
