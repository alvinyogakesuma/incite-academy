# Student Profile Course Progress Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the sixth of the iteration-4 features: the
profile settings page's course progress tab — the enrolled courses'
item cards with their completion meters. The honest scope is thin, and
the report says so plainly: the payload ships `progress` **backend-
computed** (`round(completed/total×100)`, 0 when a course carries no
lessons — verified in `ProfileController::edit`), so the frontend
renders rather than derives. The tab's one decision moved to the
module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `profileProgress.js` | The course progress chip's style lookup — a known category's outlined pair, anything else the page's default, with the fallback live-capable |

Reused (covered, **not double-counted here**): the shared
`ProgressMeter` component — branch-free (the `translateX(−(100−value)%)`
fill is pure arithmetic on Radix), rendered by both progress tabs, so
feature 8 inherits it unchanged.

Out of scope: the `description &&` render guard (`short_description`
nullable — the family's render guards stay wiring), the empty state,
the Resume link, and the meter label template — render wiring.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `profileProgress.test.js` (this page) | 3 | 42 |
| **Total for this feature's scope** | **3** | **42** |

Result: **3 tests passed** (`vitest run` scoped to this folder).

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
| D1 | `courseCategoryChipClasses` | each known category resolves its own outlined pair |
| D2 | the fallback | **live-capable**: a null category (`category?->value`) reaches the default — the empty-chip contract |
| D3 | the fallback | an unknown category falls back defensively |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `profileProgress.js` | 2 | 2 (100%) |

The suite passed on its first run — the lookup was extracted verbatim
from the tab's chip.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `profileProgress.js` | 32 | 3 | 18 | 11 |

- **KLOC (physical, primary): 32 / 1000 = 0.032**
- KLOC (code-only): 11 / 1000 = 0.011
- Istanbul executable lines: 4

*Attribution note:* the chip palette moved out of the tab (85 physical
lines, was 98) to the covered module; the palette belongs to this
report's scope.

## 5. Defect log

Defects discovered while building this suite. Course-progress count:
**0**.

Findings documented instead of fixed:

- **The empty-chip contract.** A course without a category renders an
  empty chip wearing the default style — the payload's `category?->value`
  makes the fallback live-capable, and the chip's label renders the
  null as nothing. The same family finding the Learning Path Detail's
  unguarded pill documented, on this chip's own terms.
- **The meter is shared wiring.** `ProgressMeter` carries no branches
  (its fill is arithmetic), so it stays untested by the project's
  convention — feature 8's paths tab renders the same component.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The lookup was extracted verbatim.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.032 KLOC = 0 defects/KLOC
```

*Reading note:* the feature's thin scope is honest — the progress
derivation lives server-side, so the frontend's tested surface is the
chip lookup and the family contract.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The profile tabs' suites
npx vitest run resources/js/Pages/Profile/Edit/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Profile/Edit/profileProgress.js | Measure-Object -Line
```
