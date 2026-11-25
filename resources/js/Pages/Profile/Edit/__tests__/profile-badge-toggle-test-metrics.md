# Student Profile Badge Toggle Flow — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the **toggle flow** of the profile's badge
showcase — the feature-6 increment, measured as its own unit. The flow's
guard lived inline in the tab's click handler; it now composes the
toggle URL in the covered module:

| # | Helper | Responsibility |
| --- | --- | --- |
| 1 | `badgeToggleUrl` (`profileBadges.js`) | The toggle flow's guard-composed URL — an earned badge resolves to the toggle route, a locked badge to null |

Reused (covered by feature 4's round, **not re-counted here**):
`guardErrorMessageFor` — the shell's toast decision, whose **badge arm**
serves this flow's guard rejection ("You have not earned this badge
yet."), re-summarized per the flow-report convention.

Out of scope: the `router.post` dispatch and `preserveScroll`
(wiring), and the showcase display decisions (feature 5's scope).

**The verified server contract** (`ProfileBadgeController::toggle`,
route-model bound): an un-earned badge rejects with the **`badge` error
key** ("You have not earned this badge yet."), which lands on the page
props and fires the toast; an **already-displayed** badge **un-displays**
(freeing the slot); equipping when three are displayed rejects with "You
can display a maximum of 3 badges. Remove one first." — the `/3` chip's
cap, server-enforced exactly as the tab's docblock claimed (feature 5's
deferred note closed); else the badge joins the showcase through the
pivot's builder UPDATE (no primary key); redirect back refreshes the
props.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `profileBadges.test.js` (the tab's suite; the flow owns 2) | 8 | 123 |
| **Total for this flow's scope** | **2** | **28** |

Result: **31 tests passed across the three profile suites** (`vitest
run` scoped to this folder).

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
| D4 | `badgeToggleUrl` | an earned badge resolves `/profile/badges/9` (the route pinned literally) — **in both display states**, the no-equipped-guard contrast with the equip flow; a locked badge → null |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `profileBadges.js` (post-flow) | 6 | 6 (100%) — the showcase round measured 4 before the flow landed |

The suite passed on its first run — the composition mirrored the equip
flow's pattern with one arm fewer, and the both-directions probe pinned
the defining difference rather than discovering a fault.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `profileBadges.js` (whole module, post-flow) | 76 | 7 | 48 | 21 |
| **Toggle-flow delta (this report's scope)** | **+15** | **+1** | **+12** | **+2** |

The delta is the flow's own footprint: the guard-composed URL with its
JSDoc and the module header's entry. The showcase round's 0.061 KLOC
covered the module pre-flow — no double-counting in either direction.

- **KLOC (physical, primary): 15 / 1000 = 0.015**
- KLOC (code-only): 2 / 1000 = 0.002
- Istanbul executable lines: 13 module-wide (the flow owns the URL's
  one body)

## 5. Defect log

Defects discovered while building this flow's coverage. Toggle-flow
count: **0**.

Findings documented instead of fixed:

- **The no-equipped-guard contrast.** The toggle's guard has one arm
  fewer than the equip flow's: clicking a displayed badge still rides
  the same URL because the server *un-displays* it — the both-states
  probe (D4) pins that difference explicitly against the equip flow's
  equipped no-op arm.
- **The 3-max contract is server-enforced.** The `/3` chip's cap lives
  in the controller's count check ("Remove one first."), closing
  feature 5's deferred note — the chip displays what the server
  guards.
- **The pivot's no-primary-key writes.** Both flows' writes go through
  the builder's own where clauses — the invariant behind the
  exclusive-clear and the free-slot semantics.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this flow, so there is nothing
to classify. The composition mirrored the equip flow's pattern with one
arm fewer, and the both-directions probe pinned the defining
difference.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.015 KLOC = 0 defects/KLOC
```

*Reading note:* the flow's value is its pinned contract — the toggle
route against the guard, the both-directions semantics, and the
server-enforced showcase cap.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The profile tabs' suites
npx vitest run resources/js/Pages/Profile/Edit/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Profile/Edit/profileBadges.js | Measure-Object -Line
```
