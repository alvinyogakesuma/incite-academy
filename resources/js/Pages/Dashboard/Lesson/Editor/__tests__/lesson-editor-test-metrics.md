# Lesson Editor Page — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the Lesson editor's decision logic. Two modules were
already covered by the original suite (`lessonSchema.js`,
`buildLessonFormData.js`); this pass extracted the remaining inline
decisions from the four components into two new modules and extended the
existing two, so the page's full tested set is:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `lessonSchema.js` | The branch-aware whole-payload schema (article body vs question tree, exam time limit), plus `schemaForType`'s stale-type fallback |
| 2 | `buildLessonFormData.js` | The multipart wire format (bracket notation, booleans as '1'/'0', audio as-is), plus `initialLessonValues` — the stored lesson's null-safe hydration with the exam-only time limit |
| 3 | `lessonPreview.js` | The duration/points preview mirroring the backend's derivations (LessonController::deriveDuration/derivePoints), the preview labels, and the exam time-limit input coercion |
| 4 | `questionTree.js` | The question/answer tree's decisions: the 3-arm audio preview, the filename switch, the removal split, the exactly-one-correct patch, seeded labels, the Add Question factory, the drag triple, growth detection, and the delete copy |

Out of scope (by decision, same convention as the other pages):

- `index.jsx`, `LessonInformation.jsx`, `LessonContent.jsx`,
  `QuestionCard.jsx` — component wiring (react-hook-form, dnd-kit, object-URL
  lifecycle); their decisions were extracted into the modules above and all
  four components were rewired to consume them, with behavior identical
  (except the DD-01 fix below).
- `countWords` — the shared word counter, already covered by its own suite.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `lessonSchema.test.js` | 12 | 235 |
| `buildLessonFormData.test.js` | 18 | 333 |
| `lessonPreview.test.js` | 15 | 171 |
| `questionTree.test.js` | 14 | 218 |
| **Total** | **59** | **957** |

Result: **4 files, 59 tests, 59 passed** (`vitest run` scoped to this folder).

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
| D1–D8 (schema) | `lessonSchema.js` | article body vs stale question rows, question/answer rules, answer-choice 2–6 limits, listening audio, exam time limit, full pipelines |
| D9 | `schemaForType` | known type / stale type → article fallback |
| D1–D9 (payload) | `buildLessonFormData.js` | method-spoofed PUT, branch-only payloads, bracket nesting, stored ids, '1'/'0' booleans, audio + duration, tolerant missing keys |
| D10–D13 (hydration) | `initialLessonValues` | blank lesson, exam-only time limit (both arms), full-tree hydration, bare rows hitting every fallback arm |
| D1–D5 (preview) | `previewStatsFor` | article words/150 + words/10 with floor-at-1, exam limit passthrough incl. null, quiz reading time + audio/60 with null audio, questions × 10 incl. the empty arm (DD-01) |
| D6–D7 | `durationLabelFor` | '—' unfilled, '1 minute' singular, plural |
| D8–D10 | `timeLimitFromInput` | '' → null, non-numeric → 1, floor at 1, passthrough |
| D1–D3 (tree) | `audioPreviewFor` / `audioFilenameFor` / `removalPatchFor` | fresh object URL / removal hidden / stored kept; File name / URL basename / null; fresh clears audio vs stored flags remove_audio + duration |
| D4–D6 | `correctChoiceRows` / `nextChoiceLabel` / `blankQuestionRow` | exactly-one-correct with preserved fields and bare-row fallbacks; next-position label; the saves-as-is two-choice minimum |
| D7 | `questionMovePair` | no target / self-drop / unknown ids → null; forward and backward index pairs |
| D8–D9 | `newlyAddedQuestionId` / `questionDeleteDescription` | growth / no growth / shrink; position-keyed copy and null |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `lessonSchema.js` | 8 | 8 (100%) |
| `buildLessonFormData.js` | 48 | 48 (100%) |
| `lessonPreview.js` | 14 | 14 (100%) |
| `questionTree.js` | 26 | 26 (100%) |

One coverage iteration was needed: the first hydration fixture was too
complete — every `??` fallback needs a *missing* field to exercise its
right arm, so a bare-rows case (D13) was added.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `lessonSchema.js` | 98 | 10 | 23 | 65 |
| `buildLessonFormData.js` | 108 | 16 | 22 | 70 |
| `lessonPreview.js` | 88 | 10 | 38 | 40 |
| `questionTree.js` | 147 | 13 | 77 | 57 |
| **Total** | **441** | **49** | **160** | **232** |

- **KLOC (physical, primary): 441 / 1000 = 0.441**
- KLOC (code-only): 232 / 1000 = 0.232
- Istanbul executable lines: 89

## 5. Defect log

Defects discovered while building this suite. Lesson-editor count: **1**.

| ID | Defect | Discovery & resolution | Guarding tests |
| --- | --- | --- | --- |
| DD-01 | The duration/points preview diverged from the backend on the empty-question arm: `LessonController::derivePoints` saves `count(questions) * 10` = **0** for an empty quiz/exam, while the preview showed **null ('—')** — despite the preview's stated contract to "mirror the backend derivations exactly". | Found while verifying the preview formulas against `LessonController::deriveDuration`/`derivePoints` during test design; **fixed** by aligning `previewStatsFor` so quiz/exam points mirror the backend, empty list included. The mirror contract is now test-enforced: the preview cases assert against the backend formulas. | `lessonPreview.test.js` — the D5 empty-arm cases |

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy:

| # | PSP type | Inject phase | Remove phase | Description |
| --- | --- | --- | --- | --- |
| 1 | 80 — Function (logic) | Code | Test | The preview's quiz/exam points used a `length ? ×10 : null` expression where the backend saves `count × 10` unconditionally — the empty arm rendered '—' while the save stored 0, breaking the stated mirror contract |

Rationale: **Type 80 (Function).** The preview's logic disagreed with the
backend derivation it claims to mirror — not a missing check (the value
was computed, just wrongly on one arm) but a logic divergence. Injected
in **Code** (the conditional was written that way) and removed in
**Test** (caught by verifying the formulas against the controller).

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 1 defect ÷ 0.441 KLOC ≈ 2.3 defects/KLOC
```

Alternative basis (code-only LOC): 1 ÷ 0.232 ≈ 4.3 defects/KLOC.

*Reading note:* one defect on the largest module base measured so far
(0.441 KLOC across four tested modules) — and a valuable one: DD-01 is
the first defect found by *cross-checking a frontend contract against its
backend counterpart*, a probe technique the earlier pages' intra-module
testing could not surface.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Lesson editor suites only
npx vitest run resources/js/Pages/Dashboard/Lesson/Editor/__tests__

# physical line count of the four modules
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
