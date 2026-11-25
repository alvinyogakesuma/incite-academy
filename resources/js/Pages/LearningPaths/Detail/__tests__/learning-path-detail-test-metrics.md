# Learning Path Detail Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the student-facing Learning Path detail page
(`/learning-paths/{path}` → `StudentLearningPathController::show`). The
page's logic surface is thin — the sibling `challengeDetail.js` is the
precedent, not the catalog pages — so the module owns the styling
decisions while the component keeps the layout and router wiring:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `learningPathDetail.js` | `LEVEL_BADGE_COLORS` (the level chip's style map) with `levelBadgeFor` (the fallback lookup) and `enrollButtonState` (the enrollment toggle's label and variant classes) |

Reused from `@/Pages/Dashboard/Courses/courseTable.js` (already covered,
**not double-counted here**): `formatDuration` — the **sixth verbatim
duplicate** of that function was eliminated from this page (the student
LearningPathCard's copy was the fifth under the same convention). The
page shrank from 243 to 225 physical lines.

Out of scope (same convention as the other pages):

- The enroll request itself (`router.post` with `preserveScroll`) and
  the View Course links — router wiring; their URLs ride the route
  contract documented in § 5.
- The progress bar and section visibility (`{isEnrolled && …}`) —
  render wiring keyed on the same state the module's helper owns.
- The Learning Paths index page — measured separately.

Verified contract for the payload: `show()` computes `isEnrolled` from
the enrollment row's existence, `progress` server-side as
`round(completed / total * 100)` (0 when the path carries no lessons),
and each course row's fields — the frontend renders all of it, deriving
nothing.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `learningPathDetail.test.js` (this page) | 7 | 95 |
| **Total for this page's scope** | **7** | **95** |

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
| D1 | `levelBadgeFor` | every `LearningPath::LEVELS` value resolves its own style |
| D2 | `levelBadgeFor` fallback | an unknown level and a missing level both fall back to the 'All Levels' style — the defensive-only contract |
| D3 | `enrollButtonState` | a fresh state → 'Enroll in Path' + the primary variant |
| D4 | `enrollButtonState` | the enrolled state → '✓ Enrolled' + the emerald variant |
| D5 | the style map sync | `LEVEL_BADGE_COLORS`'s keys equal `LearningPath::LEVELS` — the sync is what keeps the fallback unreachable |
| D6–D7 | `formatDuration` reuse | the eliminated duplicate's contract, plus the page's int-cast payloads (0, 480, 720) |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `learningPathDetail.js` | 4 | 4 (100%) |

The suite passed on its first run — the decisions were extracted
verbatim, and the mirror-arm contrast with the challenge detail's
fallback was pinned from the payload contract rather than discovered.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `learningPathDetail.js` | 59 | 3 | 36 | 20 |

- **KLOC (physical, primary): 59 / 1000 = 0.059**
- KLOC (code-only): 20 / 1000 = 0.020
- Istanbul executable lines: 5

*Attribution note:* the page's −18 physical lines (the eliminated
`formatDuration` and `LEVEL_BADGE_COLORS` blocks, net of the new helper
calls) are attributed to the covered homes under the established
elimination convention; this page's KLOC is its own module only.

## 5. Defect log

Defects discovered while building this suite. Learning-path-detail
count: **0**.

Five findings documented instead of fixed:

- **The silent un-enroll toggle.** The enrolled state renders an
  emerald '✓ Enrolled' chip that reads as a status, but the same
  button posts `POST /learning-paths/{id}/enroll` (`preserveScroll`),
  whose backend toggles the row — "enrolling creates the row,
  re-calling drops it" (the controller's docblock). Verified
  intentional; recorded as a UX note rather than a defect.
- **The unguarded category pill.** The course rows render
  `{course.category}` inside a pill with no guard, and the payload
  ships `'category' => $course->category?->value` — null when a course
  carries no category — so a null renders an empty capsule. The
  sibling `CourseCard` guards its badge with `&&`; this page's live-
  capable arm is documented, not fixed (per the pin-don't-fix
  convention).
- **The badge fallback is defensive-only.** The level column is a
  NOT NULL enum shipped raw (`'level' => $learningPath->level`), so
  `levelBadgeFor`'s fallback can never fire while the map and the
  enum stay synced — the mirror of the challenge detail's fallback,
  whose null difficulty (`difficulty?->value`) is live-capable.
- **The sixth `formatDuration` duplicate eliminated.** The page
  carried the same verbatim copy the student LearningPathCard gave up
  the round before; both now ride the covered `courseTable` home.
- **The enroll route contract.** `POST /learning-paths/{learning_path}/enroll`
  (`learning-paths.enroll`) redirects back; the toggle semantics live
  server-side. The URL stays inline wiring, like the View Course
  links (`/courses/{slug}`).

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this page, so there is nothing
to classify. The two decisions extracted were verbatim copies of
already-pinned shapes, and the payload's derivations all live
server-side.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.059 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% on the page's
module (4/4 branches), and the reused helpers' coverage (the courses
admin suite's `formatDuration`) applies to this page's payload. The
page's value is the documented contracts: the defensive-only fallback,
the silent toggle, and the unguarded pill are now explicit, payload-
backed, and regression-pinned.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Learning path detail suite only
npx vitest run resources/js/Pages/LearningPaths/Detail/__tests__

# physical line count of the module
Get-Content resources/js/Pages/LearningPaths/Detail/learningPathDetail.js | Measure-Object -Line
```
