# Admin Badges Listing Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin Badges management listing — the
challenges and learning paths twins' listing with its own twists. The
page had no extracted module and no tests; its search pipeline, its
hand-rolled pagination, its condition chip, its pluralized meta, and its
inline delete flow were extracted onto the covered homes:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `badgeTable.js` | The search-only pipeline (title + description, both `?? ''`-guarded — **no category filter and no sort**: the deprecated page's structural shape), the condition chip's humanized lookup, the pluralized condition count, the family gold gradient, and the delete flow's guard-composed URL + dialog copy |

Reused from `@/Pages/Dashboard/Courses/courseTable.js` (covered, **not
double-counted here**): `paginateCourses` — replacing the page's
hand-rolled `totalPages`/`safePage`/`slice` math (the inline-boundary
family the challenges and learning-paths rounds eliminated) — and
`PAGE_SIZE_OPTIONS`, `hasDeletableId` (composed into the delete URL).

**The verified nullability map** (from the badges migration): `title`
NOT NULL and drafts seed it `'Untitled Badge'` (the `?? ''` guard
defensive); `description` **nullable** (the guard **live-capable**) —
the same split the admin challenges page documented; `icon_url`
nullable (the passthrough family).

**The verified payload contract** (from `BadgeController::index`):
`condition_type` ships `requirements.conditions[0].type ?? null` — so a
condition-less badge (a fresh draft, feature 9's product) renders **no
chip at all**, the card's `badgeText &&` guard catching the undefined.
`conditions_count` counts the requirement conditions; `recipients_count`
casts int.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `badgeTable.test.js` (this page) | 17 | 248 |
| **Total for this page's scope** | **17** | **248** |

Result: **17 tests passed** (`vitest run` scoped to this folder).

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
| D1–D2 | `filterBadges` search guard + fields | empty query → all / query → filter; title / description / no match |
| D3 | the `?? ''` guards | **the split**: a null description is live-capable (nullable column); a null title is defensive (NOT NULL + seeded) — both arms pinned |
| D4 | `conditionsLabel` | one condition reads singular; zero and many read plural |
| D5 | `conditionLabelFor` | the five known types humanize |
| D6 | the live null arm | a condition-less badge (a fresh draft) yields **undefined**, so the card renders no chip — no invented fallback |
| D7 | `paginateCourses` reuse | the live clamp on this page's data |
| D8 | `badgeDeleteUrl` | a deletable pending badge → `/dashboard/badges/9` (the destroy route pinned literally); null → null; an id-less row → null |
| D9 | `badgeDeleteDescription` | titled arm; the null closed-state arm ("delete undefined…") |
| D10 | `paginateCourses` (delete semantics) | deleting the only item on the last page → `safePage` falls back |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `badgeTable.js` | 11 | 11 (100%) |

One lint iteration was needed: the page's `CONDITION_LABELS` import
became surplus after the chip rewired onto `conditionLabelFor` — the
unused-import error was caught by ESLint and removed.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `badgeTable.js` | 91 | 9 | 54 | 28 |

- **KLOC (physical, primary): 91 / 1000 = 0.091**
- KLOC (code-only): 28 / 1000 = 0.028
- Istanbul executable lines: 15

*Attribution note:* the page shrank from 211 to 205 physical lines (the
chip palette, the pluralization ternary, and the pagination math moved
to the covered homes) under the established convention.

## 5. Defect log

Defects discovered while building this suite. Badges-listing count:
**0**.

Findings documented instead of fixed:

- **The search-only shape.** The listing carries no category filter and
  no sort — the deprecated page's design preserved verbatim; the
  structural difference from the courses/challenges/learning-paths
  twins is documented and the module stays smaller for it.
- **The condition-less badge renders no chip.** The cover chip's
  lookup yields `undefined` for the nullable `condition_type` (a fresh
  draft's payload), and the card's guard renders nothing — the
  live-capable arm is pinned without inventing a fallback.
- **The guard split.** Title defensive (NOT NULL, seeded),
  description live (nullable) — the same split the admin challenges
  page documented.
- **The hand-rolled pagination eliminated.** The inline boundary math
  rode the DD-01-family hazard; `paginateCourses`' live clamp replaces
  it, and the post-delete probe (D10) pins the inheritance.
- **The destroy contract's cleanup.** The server deletes the stored
  icon only under the `badges/` storage prefix (the family's guard) —
  the cascading pivots take the awards; verified in the controller.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The pipeline was extracted verbatim onto already-covered
helpers, and the delete flow's pattern was proven by the prior flow
rounds.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.091 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% with genuine
edge probing (both null-guard arms, the undefined chip arm, the plural
boundaries), and the reused helpers' coverage applies to this page's
payload.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Badges listing suite only
npx vitest run resources/js/Pages/Dashboard/Badges/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Dashboard/Badges/badgeTable.js | Measure-Object -Line
```
