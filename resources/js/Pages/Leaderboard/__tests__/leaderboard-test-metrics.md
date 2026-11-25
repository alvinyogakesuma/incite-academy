# Leaderboard Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the seventeenth and final feature of this round:
the student leaderboard — the top-of-the-board rows with their period
pills and the window that follows the visiting student, plus the
student's public profile card. The pages' derivations lived inline in
both components; the board and its detail card were rewired onto the
extracted module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `leaderboard.js` | The rank's two accent chains (gold, silver, bronze, then plain), the hash-picked avatar background behind both pages, and the window-jump decision — the divider between the top five and the visiting student's neighborhood |

Reused from `profileInfo.js` (covered, **not double-counted here**):
`initialsFor` — **the tenth verbatim duplicate of the covered initials
derivation was eliminated** (both pages carried their own `getInitials`
copies) — and `pointsLabel`, the row chip's formatting.

Out of scope: the period pills' selected state (the backend validates
the `period` query against weekly/monthly/yearly, else allTime), the
current-row styling (`isCurrentUser` from the payload), the hero stat
fallbacks (`'—'`), and the **nullable organization** (`majorDepartement?->name`
— the `?? 'ITERA Student'` fallback is a live-capable arm, the family
finding) — render wiring.

**The verified window contract** (`LeaderboardController::index`): the
backend builds five leaders, then either the literal next five or — for
a student ranked outside the ten — themselves and the four that follow;
`rank` = payload position + 1. The divider fires exactly when the
neighborhood displaced the literal five, which the frontend expresses
as "the rankings grew past five leaders AND the row at index five
carries a rank beyond six".

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `leaderboard.test.js` (both pages) | 8 | 116 |
| **Total for this feature's scope** | **8** | **116** |

Result: **8 tests passed** (`vitest run` scoped to this folder).

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
| D1 | `rankAccentText` / `rankTrophyClasses` | gold (1), silver (2), bronze (3), plain (4 and beyond) — both chains |
| D2–D3 | `avatarBackgroundFor` | the determinism contract (a stable color per name); real names landing on their pinned palette classes |
| D4 | `boardGapIndex` | **the three arms**: a board of five or fewer → null; the literal next five (rank 6 at index 5) → null; the displaced neighborhood (rank 11 at index 5) → the divider at index five |
| D5 | `initialsFor` reuse | the eliminated duplicates' contract over the board's names |
| D6 | `pointsLabel` reuse | the row chip's structural formatting pin |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `leaderboard.js` | 16 | 16 (100%) |

The suite passed on its first run — the derivations were extracted
verbatim, and the window contract's three arms were pinned straight
from the backend's window builder.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `leaderboard.js` | 72 | 7 | 32 | 33 |

- **KLOC (physical, primary): 72 / 1000 = 0.072**
- KLOC (code-only): 33 / 1000 = 0.033
- Istanbul executable lines: 12

*Attribution note:* the board shrank from 273 to 231 physical lines and
the detail card from ~155 to 140 — the duplicated derivations belong to
the covered homes under the established convention.

## 5. Defect log

Defects discovered while building this suite. Leaderboard count: **0**.

Findings documented instead of fixed:

- **The tenth duplicate eliminated — twice over.** Both pages carried
  their own `getInitials` copy of the covered derivation, and both row
  chips formatted points inline. All four duplicates collapsed onto the
  profile info suite's homes.
- **The window contract is frontend-visible.** The divider's condition
  (`length > 5 && rank > 6` at index five) is the frontend face of the
  backend's window builder — the three arms are pinned, so a backend
  window change and this condition can never drift apart silently.
- **The points chip is locale-dependent by design** (the third
  occurrence of the finding — the separator follows the viewer's
  machine locale), re-pinned structurally.
- **The organization fallback is live-capable.** The payload ships
  `majorDepartement?->name`, nullable, so a student without a program
  reads 'ITERA Student' — the family's live-guard finding.
- **The period pills are server-validated.** The `period` query
  validates against weekly/monthly/yearly, else allTime — the pills'
  URLs ride the backend's contract.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The derivations were extracted verbatim, and the four
duplicates were eliminated rather than tested into permanence.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.072 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% on the
module, and the reused homes' coverage applies to both pages' payloads.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Leaderboard suite only
npx vitest run resources/js/Pages/Leaderboard/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Leaderboard/leaderboard.js | Measure-Object -Line
```
