# Student Profile Paths Progress Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the seventh of the iteration-4 features: the
profile settings page's learning paths tab — the enrolled paths' item
cards with their level/status chips and completion meters. The tab
carried a **verbatim duplicate** of the learning path detail's covered
level palette plus an inline status decision; both moved to covered
homes:

| # | Helper | Responsibility |
| --- | --- | --- |
| 1 | `pathStatusChip` (`profileProgress.js`) | The paths tab's status chip — a path with any progress reads Active with the primary variant; a freshly enrolled one (backend-computed 0) reads Enrolled with the neutral variant |

Reused from `@/Pages/LearningPaths/Detail/learningPathDetail.js`
(covered by the learning path detail suite, **not double-counted
here**): `levelBadgeFor` — the tab's verbatim duplicate of the covered
`LEVEL_BADGE_COLORS` palette was eliminated to an import, the same move
every `formatDuration` duplicate made.

Out of scope: the `description &&` render guard — **defensive** here,
unlike the course tab's live nullable `short_description` (the paths
payload ships from a NOT NULL column); the empty state; the Details
link; and the shared `ProgressMeter` (branch-free, inherited from the
course progress round).

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `profileProgress.test.js` (the progress tabs' suite; this page owns 3) | 7 | 88 |
| **Total for this feature's scope** | **3** | **46** |

Result: **7 tests passed** (`vitest run` scoped to this folder).

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
| D4 | `pathStatusChip` | progress > 0 → 'Active' with the primary variant; a freshly enrolled path's backend-computed 0 → 'Enrolled' with the neutral variant — the zero arm live-capable |
| D5 | `levelBadgeFor` reuse | the shared lookup over this page's levels; the defensive fallback re-stated (the level is a NOT NULL enum) |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `profileProgress.js` (post-both-tabs) | 4 | 4 (100%) — the course round measured 2 before this page landed |

The suite passed on its first run — the status chip was extracted
verbatim and the duplicate eliminated.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `profileProgress.js` (both progress tabs) | 48 | 4 | 23 | 21 |

- **KLOC (physical, primary): 48 / 1000 = 0.048**
- KLOC (code-only): 21 / 1000 = 0.021
- Istanbul executable lines: 6

*Attribution note:* the eliminated palette (+ its lookup) is attributed
to the covered `learningPathDetail.js` home under the established
convention; the paths tab shrank from 103 to 96 physical lines. This
report's KLOC is the course-and-paths progress module only — the
course round's 0.032 covered it pre-paths.

## 5. Defect log

Defects discovered while building this suite. Paths-progress count:
**0**.

Findings documented instead of fixed:

- **The palette duplicate eliminated.** The tab's `LEVEL_STYLES` was a
  verbatim copy of the learning path detail's covered map — the
  reuse-first payoff: the shared lookup now serves the detail page and
  this tab, with its defensive-only fallback consistent on both
  payloads.
- **The live zero arm.** The status chip's Enrolled state fires on the
  backend-computed 0 (no lessons, or none completed) — genuinely
  reachable for a freshly enrolled path.
- **The description-guard contrast.** The paths payload's `description`
  is NOT NULL, so the render guard is defensive — the mirror of the
  course tab's live nullable guard.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The status chip was extracted verbatim and the one
duplicate was eliminated rather than tested into permanence.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.048 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% on the
progress module, and the reused `levelBadgeFor`'s coverage applies to
this page's payload.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The profile tabs' suites
npx vitest run resources/js/Pages/Profile/Edit/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Profile/Edit/profileProgress.js | Measure-Object -Line
```
