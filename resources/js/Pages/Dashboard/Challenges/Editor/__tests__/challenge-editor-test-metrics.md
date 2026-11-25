# Admin Challenge Editor Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin challenge editor (create/update) — the
lesson editor's architectural twin. Its two logic modules existed but had
**no tests**, and its two components carried the lesson editor's
question-tree logic inline. The work: test the two modules, generalize
the shared `questionTree.js` for the challenge's variations, and rewire
the components onto the covered helpers:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `challengeSchema.js` | The whole-payload schema: metadata rules, dynamic category enum, difficulty enum, points/duration superRefines with their own messages, the image rule chain, the 3-way image-required decision, the answer-choice 2–6 limits — and **questions optional** (a fresh challenge saves its metadata before any question exists) |
| 2 | `buildChallengeFormData.js` | The multipart wire format (bracket notation, booleans as '1'/'0', listening rows, stored ids), plus `initialChallengeValues` — the stored challenge's null-safe hydration with the page's defaults chain |

Reused from `@/Pages/Dashboard/Lesson/Editor/questionTree.js` (covered by
the Lesson suite, **not double-counted here**): `blankQuestionRow`,
`questionMovePair`, `newlyAddedQuestionId`, `questionDeleteDescription`,
`audioPreviewFor`, `audioFilenameFor`, `removalPatchFor`,
`correctChoiceRows`, `nextChoiceLabel` — after generalizing four helpers
with backward-compatible defaults for the challenge's variations.

Out of scope (by decision, same convention as the other pages):

- `index.jsx`, `ChallengeInformation.jsx`, `ChallengeQuestions.jsx`,
  `QuestionCard.jsx` — component wiring (react-hook-form, dnd-kit, Radix
  dialogs); their decisions were extracted or rewired onto the covered
  modules, with behavior identical.
- The student-facing challenge flows — covered by their own suites.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `challengeSchema.test.js` | 21 | 427 |
| `buildChallengeFormData.test.js` | 15 | 374 |
| `challengeQuestions.test.js` (the challenge arms of the shared tree) | 9 | 100 |
| **Total for this page's scope** | **45** | **901** |

Result: **3 files, 45 tests, 45 passed** (`vitest run` scoped to this
folder and the lesson editor's suite for the shared module).

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
| D1–D4 | metadata rules + enums | title trim/min/max; description min; category (dynamic); difficulty (Easy/Medium/Hard) |
| D5–D8 | points/duration | `null` trips each field's own message; points zero valid / negative fails; duration one-minute boundary / zero fails |
| D9–D12 | the image rule chain | File passes / non-File fails; 2 MB boundary; MIME whitelist; nullable |
| D13–D16 | the image-required decision | fresh-without-upload → error; stored-kept → pass; stored-removed → error; fresh upload → pass |
| D17 | questions optional | a fresh challenge saves its metadata with zero questions |
| D18 | answer-choice bounds | below 2 fails; above 6 fails; within passes |
| D19 | row rules | question text and answer choices required |
| D20 | listening audio | nullable; **no audio_duration field exists** |
| D1–D9 (payload) | `buildChallengeFormData` + `initialChallengeValues` | method-spoofed PUT; metadata strings; File-only image; '1'/'0' booleans; bracket nesting; stored/fresh ids; listening rows; tolerant keys; blank defaults with the full fallback chain; full hydration; bare rows; no-audio-key listening rows |
| D1–D9 (tree) | the shared questionTree, challenge arms | no-audio-duration rows and removal patches; `is_correct` radio ownership; the challenge-subject delete copy; drag triple; growth detection; audio preview/filename |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `challengeSchema.js` | 9 | 9 (100%) |
| `buildChallengeFormData.js` | 46 | 46 (100%) |
| (shared `questionTree.js` deltas) | (16) | (16 — attributed to the Lesson module) |

Two test iterations were needed: the first answer-limit probe conflated
question count with per-question choice bounds (the limit is 2–6
*choices*, not questions), and the first hydration fixture was too
complete for the full fallback chain (fixed with the empty-lists and
bare-rows cases).

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `challengeSchema.js` | 126 | 12 | 60 | 54 |
| `buildChallengeFormData.js` | 108 | 12 | 30 | 66 |
| **Total** | **234** | **24** | **90** | **120** |

- **KLOC (physical, primary): 234 / 1000 = 0.234**
- KLOC (code-only): 120 / 1000 = 0.12
- Istanbul executable lines: 49

## 5. Defect log

Defects discovered while building this suite. Challenge-editor count: **0**.

The probing verified the editor's contracts against the backend and
pinned the page's structural contrasts with its twin:

- **Questions optional.** The schema's whole-payload rule has no
  questions-requirement — a fresh blank challenge saves its metadata
  before any question exists, matching the backend's draft-first flow.
  Pinned by D17, the page's defining contrast with the lesson editor.
- **The `is_correct` answer key.** The challenge's answer rows key their
  flag on `is_correct` while the lesson editor's use `is_true` — the
  shared `correctChoiceRows` is now parameterized on the key name, with
  both editors' behaviors pinned.
- **No audio duration.** Challenge rows carry the clip without a
  duration; the shared `blankQuestionRow` and `removalPatchFor` are
  parameterized on the field's presence, with the challenge arms pinned.
- **The delete copy names the editor.** "The challenge is saved…" vs
  "The lesson is saved…" — the shared `questionDeleteDescription` now
  takes the subject, with both editors' copies pinned.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for these modules, so there is
nothing to classify. The modules mirrored the backend validation (the
schema's stated contract) and the lesson editor's twin logic, which the
generalizations preserved — the default-vs-custom arms are pinned on both
sides.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.234 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% across the two
page modules and the shared tree's challenge arms. The most valuable
outcomes are the cross-page contracts: the answer-key parameterization
and the no-audio-duration variant are now pinned on both editors, so
future edits can't silently break either twin.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Challenge editor suites only
npx vitest run resources/js/Pages/Dashboard/Challenges/Editor/__tests__

# physical line count of the two modules
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
