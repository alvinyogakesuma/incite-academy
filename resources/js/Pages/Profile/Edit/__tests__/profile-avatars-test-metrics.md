# Student Profile Avatars Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the third of the iteration-4 features: the
profile settings page's character-avatars tab — the unlockable profile
picture grid with its awarded/equipped/locked presentation. The tab's
decisions lived inline in `AvatarsTab.jsx`; the tab was rewired onto the
extracted module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `profileAvatars.js` | The three-way access classification (equipped wins over awarded — only one character is equipped at a time) and the card's class string keyed on that classification |

Reused from `profileInfo.js` (covered, **not double-counted here**):
`pointsLabel` — the chip's `(auth?.user?.total_points ?? 0)
.toLocaleString()` was a duplicate of the personal info header's covered
formatting, eliminated to an import.

Out of scope (by decision, same convention as the other pages): the
select flow's guard and its equip request — **feature 4's scope** (along
with the shell's guard-error toast plumbing, deferred there since the
personal-info round); the icon-vs-fallback render, the grayscale
dimming, the status badge copy, and the empty state — render wiring
keyed on the covered classification.

**The verified payload contract** (from `ProfileController::edit`,
verified in the personal-info round): `isAwarded` = the `UserAvatar`
row exists; `isEquipped` = the row's `is_equipped` cast; `icon_url` =
the `str_starts_with('avatars/')` storage passthrough (null stays null)
— the image passthrough family's contract.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `profileAvatars.test.js` (this page) | 5 | 71 |
| **Total for this feature's scope** | **5** | **71** |

Result: **5 tests passed** (`vitest run` scoped to this folder).

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
| D1 | `avatarAccessState` | equipped wins over awarded (the precedence probe passes both flags); awarded-but-unequipped → unlocked; neither → locked |
| D2 | `avatarCardClasses` | each state resolves its own class string — the lookup's key is the classification's own closed set, so no fallback arm exists |
| D3 | `pointsLabel` reuse | the eliminated duplicate's structural pin over the chip's payload |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `profileAvatars.js` | 4 | 4 (100%) |

The suite passed on its first run — the classification was extracted
verbatim from the tab's nested ternary chain, split into two early
returns.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `profileAvatars.js` | 48 | 5 | 25 | 18 |

- **KLOC (physical, primary): 48 / 1000 = 0.048**
- KLOC (code-only): 18 / 1000 = 0.018
- Istanbul executable lines: 9

*Attribution note:* the tab's ternary chains and the chip's formatting
moved to the covered homes; the tab's own line count stayed within one
line of its original (the state variable replacing the duplicated flag
checks).

## 5. Defect log

Defects discovered while building this suite. Avatars-page count: **0**.

Findings documented instead of fixed:

- **The equipped-wins precedence.** The classification checks
  `isEquipped` first, so an equipped avatar always renders equipped
  even while its awarded flag is set — the server clears the previous
  pick exclusively, making the combination transient. Pinned as the
  contract.
- **No fallback arm by construction.** The card-class lookup keys on
  the classification's own closed set, unlike the theme lookups whose
  keys are payload data — the map cannot miss, so no defensive arm was
  invented.
- **The locked dimming is wiring.** The grayscale/`brightness`
  treatment and the lock overlay key on the covered state; their
  visual outcomes stay render wiring.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The classification was extracted verbatim and the one
duplicate (the points formatting) was eliminated rather than tested
into permanence.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.048 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% on the
module, and the reused `pointsLabel`'s coverage applies to the chip.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The profile tabs' suites (the chip's helper's home included)
npx vitest run resources/js/Pages/Profile/Edit/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Profile/Edit/profileAvatars.js | Measure-Object -Line
```
