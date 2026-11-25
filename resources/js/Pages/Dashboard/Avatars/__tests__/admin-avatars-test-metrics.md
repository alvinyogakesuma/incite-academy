# Admin Avatars Listing Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin Avatars management listing — the badges
listing's verbatim twin with its own identity (the character violet, the
UserCircle icon, the route base, and the copy's noun). The page had no
extracted module and no tests; its search pipeline, hand-rolled
pagination, condition chip, pluralized meta, and inline delete flow were
extracted onto the covered homes:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `avatarTable.js` | The search-only pipeline (title + description, both `?? ''`-guarded — **no category filter and no sort**: the twins' shared structural shape), the character violet gradient, and the delete flow's guard-composed URL + dialog copy |

Reused (covered, **not double-counted here**): `paginateCourses` and
`PAGE_SIZE_OPTIONS` from `courseTable.js` (replacing the page's
hand-rolled boundary math — the fourth listing to eliminate it);
`conditionTypeLabel` and `conditionsLabel` from the shared
`conditionsLogic.js` module — **the labels' single home now serving
three consumers** (the badges listing, the conditions builder, and this
listing), with this round completing the consolidation.

**The verified nullability map** (from the avatars migration — the
badges table's verbatim structure): `title` NOT NULL and drafts seed it
`'Untitled Avatar'` (the `?? ''` guard defensive); `description`
**nullable** (the guard **live-capable**).

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `avatarTable.test.js` (this page) | 15 | 253 |
| **Total for this page's scope** | **15** | **253** |

Result: **34 tests passed across both listing suites** (`vitest run`
scoped to this folder and the badges folder — the shared helper's
consolidated home is covered by both).

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
| D1–D2 | `filterAvatars` search guard + fields | empty query → all / query → filter; title / description / no match |
| D3 | the `?? ''` guards | **the split**: a null description is live-capable (nullable column); a null title is defensive (NOT NULL + seeded) — both arms pinned |
| D4 | `conditionTypeLabel` | the five known types humanize |
| D5 | the live undefined arm | a condition-less avatar (a fresh draft — feature 13's product) yields **undefined**, so the card renders no chip — no invented fallback |
| D6 | `conditionsLabel` | one condition reads singular; zero and many read plural — pinned on its consolidated home |
| D7 | `paginateCourses` reuse | the live clamp on this page's data |
| D8 | `avatarDeleteUrl` | a deletable pending avatar → `/dashboard/avatars/9` (the destroy route pinned literally); null → null; an id-less row → null |
| D9 | `avatarDeleteDescription` | titled arm; the null closed-state arm ("delete undefined…") |
| D10 | `paginateCourses` (delete semantics) | deleting the only item on the last page → `safePage` falls back |
| D11 | `AVATAR_GRADIENT` | the family violet cover ships |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `avatarTable.js` | 9 | 9 (100%) |
| `badgeTable.js` (the consolidation's re-home) | 9 | 9 (100%) — the pluralization now re-exports from the conditions home |

The suite passed on its first run — the twin's extraction mirrored the
badges round, and the consolidation edit's one duplicated export was
caught by the coverage gate immediately and removed.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `avatarTable.js` | 58 | 6 | 35 | 17 |

- **KLOC (physical, primary): 58 / 1000 = 0.058**
- KLOC (code-only): 17 / 1000 = 0.017
- Istanbul executable lines: 10

*Attribution note:* the page shrank from 213 to 207 physical lines (the
palette, the chip map, the pluralization, and the pagination math moved
to the covered homes) under the established convention.

## 5. Defect log

Defects discovered while building this suite. Avatars-listing count:
**0**.

Findings documented instead of fixed:

- **The consolidation completed.** The condition labels' single home
  now serves three consumers — the badges listing's chip, the
  conditions builder's row summary, and this listing's chip. The third
  verbatim map copy is eliminated, and `conditionsLabel` moved to the
  conditions domain home with `badgeTable.js` re-exporting it (its
  existing tests untouched).
- **The search-only shape.** No category filter and no sort — the
  deprecated page's design preserved verbatim across both avatars and
  badges twins.
- **The guard split.** Title defensive (NOT NULL, seeded), description
  live (nullable) — the badges table's verbatim structure.
- **The condition-less avatar renders no chip.** The cover chip's
  lookup yields `undefined` for the nullable `condition_type` (a fresh
  draft's payload), and the card's guard renders nothing — the
  live-capable arm is pinned without inventing a fallback.
- **The destroy contract's cleanup.** The server deletes the stored
  icon only under the `avatars/` storage prefix (the family's guard) —
  the cascading pivots take the awards; verified in the controller.
- **The hand-rolled pagination eliminated.** The fourth listing to
  retire the inline boundary math.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The twin's extraction mirrored the badges round verbatim,
with the consolidation completing the labels' single home.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.058 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% on the
module, and the consolidated labels' coverage is shared across the
three consumers by construction.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Avatars listing suite only
npx vitest run resources/js/Pages/Dashboard/Avatars/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Dashboard/Avatars/avatarTable.js | Measure-Object -Line
```
