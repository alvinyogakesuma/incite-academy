# Student Profile Avatar Equip Flow — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the **equip flow** of the profile's character
avatars — the feature-4 increment, measured as its own unit. The flow's
guard lived inline in the tab's click handler, and the shell's
guard-error toast plumbing was deferred here from the personal-info
round. Two helpers now own it:

| # | Helper | Responsibility |
| --- | --- | --- |
| 1 | `avatarEquipUrl` (`profileAvatars.js`) | The equip flow's guard-composed URL — an awarded, unequipped avatar resolves to the equip route, while a locked card and the already-equipped pick resolve to null, the no-op arm |
| 2 | `guardErrorMessageFor` (`profileInfo.js`) | The shell's guard-error toast decision — the equip and toggle flows reject with `avatar` and `badge` error keys that land on the page props; the badge key wins when both arrive |

Out of scope: the `router.post` dispatch and `preserveScroll` (wiring),
and the card's display decisions (feature 3's scope).

**The verified server contract** (`ProfileAvatarController::equip`,
route-model bound): an un-earned avatar rejects with the **`avatar`
error key** ("You have not unlocked this avatar yet."), which lands on
the page props and fires the toast; the exclusive clear runs as two
pivot UPDATEs (the pivot carries no primary key — clear every equipped
row, then set the picked one); redirect back refreshes the props. The
server does **not** guard re-equipping — its clear-all-and-set is
idempotent, so the frontend guard is the only thing preventing the
redundant round trip, and all three guard arms are live-capable (locked
and equipped cards are clickable).

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `profileAvatars.test.js` (the tab's suite; the flow owns 3) | 8 | 104 |
| `profileInfo.test.js` (the shell's suite; the flow owns 3) | 15 | 230 |
| **Total for this flow's scope** | **6** | **78** |

Result: **23 tests passed across both suites** (`vitest run` scoped to
this folder).

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
| D4 | `avatarEquipUrl` | an awarded, unequipped avatar → `/profile/avatars/9` (the route pinned literally); a locked card → null; the already-equipped pick → null |
| D13 | `guardErrorMessageFor` | each key alone carries its message; the badge key wins when both arrive |
| D14 | `guardErrorMessageFor` | no guard error stays null |
| D15 | `guardErrorMessageFor` | the `||`-vs-`??` mismatch probe — a falsy badge with an avatar message fires an empty toast (unreachable via real server messages) |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `profileAvatars.js` (post-flow) | 8 | 8 (100%) — the access round measured 4 before the flow landed |
| `profileInfo.js` (post-flow) | 27 | 27 (100%) — the landing round measured 21 before the plumbing landed |

The suite passed on its first run — the guard's composition mirrored
the delete-flow pattern, and the mismatch probe pinned pre-existing
behavior rather than discovering a fault.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `profileAvatars.js` (whole module, post-flow) | 66 | 6 | 38 | 22 |
| `profileInfo.js` (whole module, post-flow) | 117 | 8 | 61 | 48 |
| **Equip-flow delta (this report's scope)** | **+35** | **+3** | **+19** | **+10** |

The delta is the flow's own footprint: the guard-composed URL in the
avatars module and the toast decision in the shell's module, each with
its documentation. The prior rounds' KLOCs (0.048 and 0.088) covered
their modules pre-flow — no double-counting in either direction.

- **KLOC (physical, primary): 35 / 1000 = 0.035**
- KLOC (code-only): 10 / 1000 = 0.010
- Istanbul executable lines: 11 module-wide (the flow owns the URL's
  and the toast's bodies)

## 5. Defect log

Defects discovered while building this flow's coverage. Equip-flow
count: **0**.

Findings documented instead of fixed:

- **The idempotent redundancy.** The server tolerates re-equipping (its
  clear-all-and-set writes the same state), so the frontend guard's
  already-equipped arm is the only thing preventing the redundant
  round trip — the guard is live-capable on every arm, and the
  no-op outcomes are pinned as the contract.
- **The `||`-vs-`??` mismatch.** The toast decision checks truthiness
  (`?.badge || ?.avatar`) but selects the message nullishly
  (`badge ?? avatar`), so a falsy-yet-nonnullish badge key with an
  avatar message present would fire a toast carrying the empty badge
  string. Unreachable through real server messages (never empty
  strings); probed and pinned as the current contract.
- **The exhaustive-deps warning.** The shell's effect reads the whole
  `pageErrors` object through the covered helper while its dependency
  array stays deliberately narrow (the two error keys), so ESLint
  warns about the missing dependency. Pre-existing wiring style,
  left as-is — widening the array would re-fire the toast on every
  props identity change.
- **The exclusive clear by two UPDATEs.** The pivot carries no primary
  key, so the server clears and sets through its own where clauses —
  the "only one character equipped" invariant the classification's
  precedence relies on.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this flow, so there is nothing
to classify. The guard's composition mirrored the delete-flow pattern
and the toast decision was extracted verbatim.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.035 KLOC = 0 defects/KLOC
```

*Reading note:* the flow's value is its pinned contracts — the guard's
three live-capable arms against the equip route, the idempotency
finding, and the toast decision now shared with the badge flow ahead.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The profile tabs' suites
npx vitest run resources/js/Pages/Profile/Edit/__tests__

# physical line count of the modules
Get-Content resources/js/Pages/Profile/Edit/profileAvatars.js | Measure-Object -Line
Get-Content resources/js/Pages/Profile/Edit/profileInfo.js | Measure-Object -Line
```
