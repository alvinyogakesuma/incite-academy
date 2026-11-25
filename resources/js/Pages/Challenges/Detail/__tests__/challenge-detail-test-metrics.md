# Challenge Detail Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the challenge detail page — the challenge's
boarding screen (the quiz/exam rooms' twin): the centered challenge card
with its stat tiles (minutes, questions, points, difficulty), the past
attempts with their percentage coloring, and the Start Challenge action
opening the timed take screen (already covered by the challenge room
suite). The page had no extracted module and no tests; its decisions were
pulled into a pure module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `challengeDetail.js` | The difficulty tile's style map and its fallback decision, and the past-attempts percentage color threshold |

Out of scope (by decision, same convention as the other pages):

- `index.jsx` — layout and router wiring; its decisions were extracted
  into the module above and the component was rewired to consume it, with
  behavior identical.
- The stat tiles' non-difficulty colors and the past-attempts rows —
  presentational data assembly.
- The challenge **Room** — covered by its own suite (the take screen).

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `challengeDetail.test.js` | 5 | 55 |

Result: **1 file, 5 tests, 5 passed** (`vitest run` scoped to this folder).

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
| D1 | `difficultyStyleFor` known arms | Easy / Medium / Hard → their own styles |
| D2 | `difficultyStyleFor` fallback arm | unknown difficulty → Easy; null/missing → Easy (live-capable) |
| D3–D4 | `attemptPercentageColor` | the 80% threshold both sides (exactly 80 green, 79 brand tone); the extremes (100 green, 0 brand tone) |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `challengeDetail.js` | 6 | 6 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `challengeDetail.js` | 40 | 3 | 28 | 9 |

- **KLOC (physical, primary): 40 / 1000 = 0.04**
- KLOC (code-only): 9 / 1000 = 0.009
- Istanbul executable lines: 6

## 5. Defect log

Defects discovered while building this suite. Challenge-detail count: **0**.

One probe is the page's notable finding: the difficulty fallback is
**live-capable**, not merely defensive. The backend ships
`'difficulty' => $challenge->difficulty?->value` — a nullable cast — so a
challenge carrying no difficulty renders the Easy style through the
fallback, exactly as designed. The badge-free payload claim from the room
work also holds here: this boarding page ships `attempts` but no badge,
matching the room's dormant-gate note. All other fields arrive int-cast or
formatted, leaving nothing to crash.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. The page's only real decisions (two ternary/fallback pairs)
passed on first execution.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.04 KLOC = 0 defects/KLOC
```

*Reading note:* the smallest KLOC base measured so far — the module owns
two styling decisions, both trivially covered. The finding worth carrying
is the nullable-difficulty payload note: the Easy fallback is reachable
through the backend, which is the kind of state knowledge that prevented
null-crash defects on earlier pages.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Challenge detail suite only
npx vitest run resources/js/Pages/Challenges/Detail/__tests__

# physical line count of the module
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
