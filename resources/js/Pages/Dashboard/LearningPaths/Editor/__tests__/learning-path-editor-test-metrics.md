# Learning Path Editor Page (Create/Update) — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin learning path editor (create/update) —
the lesson/challenge/course editors' architectural twin. Its two logic
modules existed but had **no tests**, and its components carried the
twin editors' logic inline. The work: test the two modules, extract the
page's two derivations into covered modules, and rewire the components
onto the covered helpers:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `learningPathSchema.js` | The whole-payload schema: metadata rules, the 4-level enum, the image rule chain, the 3-way image-required decision, the answer — and the page's defining contracts: the **courses-required (min 1)** and **duplicate-course** superRefines, the exact mirrors of the server's `courses => min:1` and `courses.* => distinct` |
| 2 | `buildLearningPathFormData.js` | The multipart format with a **flat `courses[]` array of String ids** (vs the challenge editor's bracket-nested rows), method-spoofed PUT, files as-is, booleans as '1'/'0' — plus `initialLearningPathValues`, the stored path's null-safe hydration with the levels chain |
| 3 | `learningPathStats.js` | `sequenceStatsFor` — the live sequence stats: the picked courses' combined duration and count, with every fallback arm (the `lessonPreview.js` precedent for derivations that are neither schema nor wire) |

Reused (covered, **not double-counted here**): `questionMovePair` from
`@/Pages/Dashboard/Lesson/Editor/questionTree.js` — the drag triple is
value-generic over field-array rows, and `CourseSequence` becomes its
third consumer (the lesson and challenge outlines were the first two,
covered by their suites). `formatDuration` from
`@/Pages/Dashboard/Courses/courseTable.js` — the **seventh and eighth
verbatim duplicates** were eliminated from `CourseSequence.jsx` and
`LearningPathInformation.jsx` under the established convention.

Out of scope (by decision, same convention as the twin editors):

- `LearningPathInformation.jsx`'s render wiring — the stored-cover
  preview switch, the un-remove-on-upload, and the levels-options
  fallback (the page always ships `LearningPath::LEVELS`).
- `Editor/index.jsx`'s save wiring — the twin `isSaving` re-entry
  guard, the unguarded PUT URL (the store-then-edit flow guarantees a
  path), and the server-error field mapping.

Verified contracts: `store()` seeds `'Untitled Learning Path'` and
redirects to the editor (the always-PUT flow); `update()` carries the
server twin of the image-required superRefine, the cover 3-way with
the `learning-paths/` prefix delete-guard, the courses sync where
payload positions become `order_index`, and `recalculateStats()`;
`LearningPathUpdateRequest` requires title (max 255), description,
level in `LEVELS`, nullable image (mimes/2MB), boolean `remove_image`,
and `courses` required array `min:1` with `courses.*` integer
`distinct` existing ids — every rule mirrored.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `learningPathSchema.test.js` | 15 | 250 |
| `buildLearningPathFormData.test.js` | 9 | 141 |
| `learningPathStats.test.js` | 5 | 84 |
| **Total for this page's scope** | **29** | **475** |

Result: **3 files, 29 tests, 29 passed** (`vitest run` scoped to this
folder).

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
| D1–D3 | metadata rules + enum | title trim/min/max; description min; the four levels accepted, an unlisted one fails |
| D4–D7 | the image rule chain | File passes / non-File fails; the 2 MB boundary; MIME whitelist; nullable |
| D8–D11 | the image-required decision | fresh-without-upload → error; stored-kept → pass; stored-removed → error; fresh upload → pass |
| D12 | courses REQUIRED | an empty sequence → 'Add at least one course to the sequence' |
| D13 | duplicate detection | duplicates → 'Each course can only appear once in the sequence'; distinct → pass |
| D14 | course_id rules | the blank slot's null → 'Select a course'; non-integer and non-positive ids fail |
| D15 | the whole schema | a fully valid payload passes |
| D1–D6 (payload) | `buildLearningPathFormData` | method-spoofed PUT; metadata strings; File-only image; '1'/'0'; the flat `courses[]` with stringified ids; tolerant inputs |
| D7–D9 (hydration) | `initialLearningPathValues` | full hydration; the blank defaults (defensive); the empty-levels chain |
| D1–D5 (stats) | `sequenceStatsFor` | the happy tally; null slots; bare slots; null ids; missing durations and unknown ids |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `learningPathSchema.js` | 9 | 9 (100%) |
| `buildLearningPathFormData.js` | 15 | 15 (100%) |
| `learningPathStats.js` | 4 | 4 (100%) |
| (shared `questionTree.js` deltas) | — | the `questionMovePair` reuse — covered by the lesson/challenge suites, attributed to the Lesson module |

The suite passed on its first run — the schema's contracts were pinned
from the `LearningPathUpdateRequest` mirror, and the derivations were
extracted verbatim from the component.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `learningPathSchema.js` | 85 | 7 | 14 | 64 |
| `buildLearningPathFormData.js` | 54 | 6 | 21 | 27 |
| `learningPathStats.js` | 36 | 3 | 18 | 15 |
| **Total** | **175** | **16** | **53** | **106** |

- **KLOC (physical, primary): 175 / 1000 = 0.175**
- KLOC (code-only): 106 / 1000 = 0.106
- Istanbul executable lines: 33

*Attribution note:* the components shrank (CourseSequence −9,
LearningPathInformation −5, index −19) — the `formatDuration`
eliminations are attributed to the covered `courseTable.js` home and
the `questionMovePair` reuse to the lesson module, under the
established convention; this page's KLOC is its own three modules only.

## 5. Defect log

Defects discovered while building this suite. Editor count: **0**.

Findings worth recording:

- **The courses sequence is REQUIRED here.** The schema's whole-payload
  rule has no questions-requirement twin in the challenge editor — its
  questions are optional — but this page demands at least one course
  (`min:1` server-side). The structural contrast the twin editors'
  reports documented is now test-enforced on both sides.
- **The duplicate-course detection.** Each course appears once — the
  frontend twin of `courses.* => distinct`, since duplicates would
  collapse silently into the pivot. A decision shape no other editor
  schema carries.
- **The flat wire format.** The course ids ride a flat `courses[]`
  array of stringified ids — the wire contrast with the challenge
  editor's bracket-nested question rows, both pinned against their
  server mirrors.
- **The defensive hydration guards.** `initialLearningPathValues`'s
  `?.` arms are unreachable through the flow (the store seeds the row
  first) — pinned as the current contract; the PUT URL, by contrast,
  reads `learningPath.id` directly, the verified always-present shape.
- **The twin save wiring.** The `isSaving` re-entry guard, the
  server-error field mapping, and the stored-cover preview switch are
  the challenge editor's shapes — documented wiring, not decisions.
- **The drag triple's third consumer.** `CourseSequence`'s inline
  `handleDragEnd` was the lesson outline's pre-rewire copy verbatim;
  the covered `questionMovePair` now serves a third field array, with
  the challenge-suite pins applying to this page's payload.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for these modules, so there is
nothing to classify. The modules mirrored the server's validation (the
schema's stated contract) and the twin editors' proven patterns, which
the extractions preserved — the reuse arms are pinned on all sides.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.175 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% across the
three editor modules. The most valuable outcomes are the
cross-editor contracts now pinned on both twins: the optional-vs-
required sequence contrast, the distinct-course rule, and the flat
wire format — so future edits can't silently diverge the editors.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Learning path editor suites only
npx vitest run resources/js/Pages/Dashboard/LearningPaths/Editor/__tests__

# physical line count of the modules
Get-Content resources/js/Pages/Dashboard/LearningPaths/Editor/learningPathSchema.js | Measure-Object -Line
```
