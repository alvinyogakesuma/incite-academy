# Admin Learning Paths Index Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin Learning Paths management page — the
admin Challenges listing's architectural twin, measured here **with its
delete flow merged in** (the challenge-delete pattern applied directly
rather than as a later round). The page had no extracted module and no
tests; following the **reuse-first** design, the page's own pipeline was
extracted and everything shared was rewired onto the covered
`courseTable.js` helpers:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `learningPathTable.js` | The page-specific filter (search over title + description, both `?? ''`-guarded — NOT NULL columns, so the guards are purely defensive), the level filter, the page's sort label set (title, total duration, courses), the level theme map (icon + gradient per `LearningPath::LEVELS`), the badge copy fallback, and the delete flow's guarded URL + dialog copy |

Reused from `@/Pages/Dashboard/Courses/courseTable.js` (already covered,
**not double-counted here**): `sortCourses` (generalized in an earlier
round to accept an option set — this page passes its own labels),
`paginateCourses` (the length-based pagination with the live clamp — it
replaces the page's hand-rolled `totalPages`/`safePage` math),
`hasDeletableId` (composed into the delete URL), `formatDuration` (a
**ninth verbatim duplicate** of that function was eliminated from this
page — the worst of the family, recreated inside the component on every
render), and `PAGE_SIZE_OPTIONS`.

**One covered helper was generalized:** `courseTable.categoryThemeFor`
gained an optional `fallbackKey` parameter (defaulting to the courses'
`DEFAULT_CATEGORY`, fully backward compatible). The learning paths'
theme map falls back to `'All Levels'` — the map's *last* entry, not
its first — so the default key would miss. The Courses suite gained a
custom-fallback arm pinning the generalization (the same convention the
`sortCourses` option-set generalization followed).

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `learningPathTable.test.js` (this page) | 27 | 410 |
| `courseTable.test.js` (Courses suite, +1 generalization arm) | 40 | 437 |
| **Total for this page's scope** | **27** | **410** |

Result: **both suites passed** (`vitest run` scoped to both folders).

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
| D1–D2 | `filterLearningPaths` search guard + fields | empty query → all / query → filter; title / description / no match |
| D3 | `?? ''` guards | **both arms**: null description reached when the title misses, null title reached when the description matches — defensive-only (NOT NULL columns) |
| D4–D5 | level filter + AND composition | All / match / mismatch; search + level together |
| D6–D7 | `shouldShowReset` | each of the three dirty conditions, all-defaults false |
| D8 | `sortCourses` (generalized) | the page's labels sort numerically and case-insensitively; an unknown label → the first option |
| D9 | `paginateCourses` reuse | the live clamp on this page's data |
| D10 | `categoryThemeFor` (custom fallback key) | null and unknown level → the 'All Levels' config; a known level → its own |
| D11 | `formatDuration` reuse | the eliminated duplicate's contract over the int-cast payload |
| D12 | `levelBadgeText` | a present level is its own copy; null and empty → 'All Levels' (defensive) |
| D13 | `learningPathDeleteUrl` | a deletable pending path → `/dashboard/learning-paths/9` (the destroy route pinned literally); null → null; an id-less row → null |
| D14 | `learningPathDeleteDescription` | titled arm; the null closed-state arm ("delete undefined…") |
| D15 | `paginateCourses` (delete semantics) | deleting the only item on the last page → `safePage` falls back |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `learningPathTable.js` | 18 | 18 (100%) |
| `courseTable.js` (the fallbackKey delta) | 26 | 26 (100%) — the generalization adds one default-arg path |

The suite passed on its first run. The delete-flow extraction was a
verbatim application of the challenge-delete round's pattern, whose
outcomes were already proven — only the copy and the route base
differed.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `learningPathTable.js` | 152 | 11 | 77 | 64 |

- **KLOC (physical, primary): 152 / 1000 = 0.152**
- KLOC (code-only): 64 / 1000 = 0.064
- Istanbul executable lines: 16

*Attribution note:* the page shrank from 308 to 253 physical lines (−55:
the ninth duplicate, the theme map, the sort options, and the pipeline
moved to the covered homes); the elimination and the module deltas are
attributed to their homes under the established convention. The
`categoryThemeFor` generalization's delta on `courseTable.js` (~7
physical lines, one default-arg path) is the shared-home accounting,
mirroring the `sortCourses` generalization's treatment.

## 5. Defect log

Defects discovered while building this suite. Admin-learning-paths
count: **0**.

Findings documented instead of fixed:

- **Both search guards are defensive-only.** The migration ships
  `title` and `description` as NOT NULL columns, so the `?? ''` guards
  fall back on values the payload always carries. Pinned by the
  null-arm tests as the current contract — the third shape in the
  family (the course catalog searches its title unguarded; the *admin*
  challenges page's description ships genuinely nullable).
- **The level fallbacks are defensive-only.** The level column is a
  NOT NULL enum, so both the theme fallback (now the generalized
  `fallbackKey`) and the badge fallback ('All Levels') can never fire
  while the enum and the maps stay in sync. Pinned as the contract.
- **The ninth `formatDuration` duplicate eliminated.** This one was
  recreated inside the component on every render — the family's worst
  shape. Both consumers now ride the covered `courseTable` home.
- **The guarded delete URL.** The guard composition
  (`hasDeletableId` → URL or null) is the challenge-delete family
  applied directly; the courses editor's outline remains the family's
  unguarded variant (`moduleToDelete?.id` interpolated directly).
- **The closed-state copy.** The delete dialog's description computes
  "Are you sure you want to delete undefined?…" on every render before
  a delete starts — the Radix portal is unmounted while closed, so the
  string is never displayed. Twin-consistent with the other admin
  listings; pinned as-is.
- **The post-delete pagination hazard is eliminated by construction.**
  The page's hand-rolled clamp is gone; `paginateCourses`' live clamp
  handles the shrunken list (the `pageAfterDelete` family the Users
  page needed). The D15 probe pins the inheritance.
- **The Add flow's store-blank chain.** `POST /dashboard/learning-paths`
  seeds `'Untitled Learning Path'` and redirects to the editor — the
  blank-draft flow the course, lesson, and challenge editors share.
  Wiring; documented with the route.
- **The image passthrough.** The payload ships the Storage URL only
  when the stored path starts with `learning-paths/`, otherwise the
  raw value — the family contract documented on the student side too.
- **The sort comparator swap.** The page's inline comparator was the
  users-table shape (lodash `orderBy` with a case-insensitive
  iteratee) — now the covered `sortCourses` comparator. Behavior
  equivalent on this payload, verified by the numeric and
  case-insensitive pins (D8).

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The pipeline's decisions were extracted verbatim onto
already-covered helpers, the one duplication that existed (the sort
comparator's shape and `formatDuration`) was eliminated rather than
tested into permanence, and the delete flow's pattern was proven by the
challenge-delete round.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.152 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% with genuine
edge probing, and the reused helpers' coverage (the Courses suite's
catalog cases) applies to this page's payload — the effective tested
surface exceeds the page's own KLOC, which is precisely the value of
reuse-first extraction.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Admin learning paths suite and the shared helper's home
npx vitest run resources/js/Pages/Dashboard/LearningPaths/__tests__ resources/js/Pages/Dashboard/Courses/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Dashboard/LearningPaths/learningPathTable.js | Measure-Object -Line
```
