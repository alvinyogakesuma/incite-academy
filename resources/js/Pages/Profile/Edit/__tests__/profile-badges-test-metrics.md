# Student Profile Badges Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the fifth of the iteration-4 features: the
profile settings page's badge showcase tab — every badge with its
displayed/earned/locked presentation. The tab's decisions lived inline
in `BadgesTab.jsx`; the tab was rewired onto the extracted module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `profileBadges.js` | The three-way showcase classification (a displayed badge wins; displaying implies earned, so the chip's equipped-first order and the card's original awarded-first order agree on every reachable payload), the card's class string keyed on that classification, and the displayed tally feeding the page's count chip |

Out of scope (by decision, same convention as the other pages): the
toggle flow's guard and its request — **feature 6's scope** (the toggle
flow has *no* equipped check, because clicking a displayed badge
un-displays it); the icon chain (`isAwarded ? (icon_url ? image :
Trophy) : Lock`) and the empty state — render wiring keyed on the
covered classification.

**The verified payload contract** (from `ProfileController::edit`,
verified in the personal-info round): `isAwarded` = the `UserBadge` row
exists; `isEquipped` = its `is_equipped` cast; `icon_url` = the
`str_starts_with('badges/')` storage passthrough family.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `profileBadges.test.js` (this page) | 6 | 95 |
| **Total for this feature's scope** | **6** | **95** |

Result: **6 tests passed** (`vitest run` scoped to this folder).

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
| D1 | `badgeShowcaseState` | displayed wins over earned; earned-but-undisplayed → earned; neither → locked |
| D1 (probe) | `badgeShowcaseState` | the implication probe — a displayed-not-earned payload shape is impossible (displaying implies earned), and the classification pins its behavior on that unreachable input, the counterpart of the avatar family's equipped-wins probe |
| D2 | `badgeCardClasses` | each state resolves its own class string — the lookup's key is the classification's own closed set, so no fallback arm exists |
| D3 | `equippedBadgeCount` | the tally over none, some, and the all-displayed cap context (the `/3` chip's server-guarded maximum, enforced in feature 6) |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `profileBadges.js` | 4 | 4 (100%) |

The suite passed on its first run — the classification mirrored the
avatar family's extraction, with the implication probe replacing the
precedence probe as this family's distinguishing contract.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `profileBadges.js` | 61 | 6 | 36 | 19 |

- **KLOC (physical, primary): 61 / 1000 = 0.061**
- KLOC (code-only): 19 / 1000 = 0.019
- Istanbul executable lines: 11

*Attribution note:* the tab's ternary chains and the tally moved to the
covered module; the tab's own line count stayed within two lines of its
original.

## 5. Defect log

Defects discovered while building this suite. Badges-page count: **0**.

Findings documented instead of fixed:

- **The chip-and-card order contrast.** The original card ternary
  checked `isAwarded` first while the status chip checked `isEquipped`
  first — two orderings that agree on every reachable payload only
  because displaying implies earned. The extraction collapsed both onto
  one classification, eliminating the possibility of the pair drifting
  apart.
- **No fallback arm by construction.** The card-class lookup keys on
  the classification's own closed set — nothing invented.
- **The icon chain is wiring.** The awarded-icon/fallback and the lock
  render key on the covered state; their visual outcomes stay
  untested render wiring.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The classification mirrored the avatar family's extraction
with the implication probe as the distinguishing contract.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.061 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% on the
module, with the showcase cap's enforcement deferred to feature 6's
round.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The profile tabs' suites
npx vitest run resources/js/Pages/Profile/Edit/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Profile/Edit/profileBadges.js | Measure-Object -Line
```
