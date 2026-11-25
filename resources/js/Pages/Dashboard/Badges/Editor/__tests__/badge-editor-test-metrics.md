# Badge Editor Page (Update) — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin badge editor — the whole badge: its
metadata, its **optional** icon, and its earning requirements (the
feature-11 increment; the create story's round is prose-honest and
cross-references here). The editor's two logic modules existed but had
**no tests**, and the shared `ConditionsBuilder` component carried its
row decisions inline. The work: test the two modules, extract the
inline hydration, extract the conditions module, and rewire:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `badgeSchema.js` | The whole-payload schema — the metadata rules, the **optional** icon chain (the family's first editor without the image-required 3-way), the AND/OR logic, and the **conditions-required** rule (the badge's defining contrast with the challenge editor's optional questions) |
| 2 | `buildBadgeFormData.js` | The multipart wire (bracket-notation condition rows, files as-is, booleans '1'/'0') plus `initialBadgeValues` — the inline hydration extracted, serving both the stored badge and the blank draft's state |
| 3 | `conditionsLogic.js` (the shared `ConditionsBuilder`'s module — the `paginationPages.js` components-folder precedent) | The three-way access classification's cousin: the numeric-vs-entity type split, the type-switch's operator reset, the header chip's summary with its passthrough, the entity options chain, the empty-catalog fallback, the Add factory, and the generic delete copy |

Reused (covered, **not double-counted here**): `questionMovePair` and
`newlyAddedQuestionId` from the shared `questionTree` — the drag triple
and growth detection's **third and fourth consumers**, imported by the
component directly.

**The verified mirror contract** (`BadgeUpdateRequest`): title required
max:255; description required; icon nullable mimes/2MB; remove_icon
boolean; logic in AND/OR; **conditions required array min:1** with
`type`/`operator` in their five-element lists and `value` required
string. The schema mirrors every rule, and all five operators pass for
any condition type — the numeric/entity operator lock is **UI-only**
(the locked 'Is (=)' select), pinned as the design decision.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `badgeSchema.test.js` | 13 | 205 |
| `buildBadgeFormData.test.js` | 9 | 130 |
| `conditionsLogic.test.js` (components) | 11 | 130 |
| **Total for this feature's scope** | **33** | **465** |

Result: **44 tests passed across the badges editor's suites** (`vitest
run` scoped to this folder and the components folder — the
feature-10 listing suite shares the folder).

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
| D1–D2 | metadata | title trim/min/max; description min |
| D3–D5 | the icon chain | File/non-File; the 2 MB boundary; the MIME whitelist |
| D6 | the optional icon | **null passes with no stored-state argument** — the family's first editor without the image-required 3-way |
| D7 | `remove_icon` | booleans only (the wire-time strings never reach the schema) |
| D8 | the logic | AND and OR pass; anything else fails |
| D9 | conditions REQUIRED | an empty list → 'At least one earning condition must be added' |
| D10–D12 | the condition rows | the five types; all five operators for any type (the UI-lock note); the required string value |
| D13 | the whole schema | a fully valid payload passes |
| D1–D6 (payload) | `buildBadgeFormData` | the spoofed PUT; metadata; File-only icon; '1'/'0'; the bracket rows; tolerant inputs |
| D7–D9 (hydration) | `initialBadgeValues` | full hydration; the blank draft's defaults; the bare rows |
| D1–D11 (builder) | `conditionsLogic.js` | the five labels + the undefined lookup; the numeric split; the pair reset; the summary's placeholder, glance, and passthrough; the entity chain; the empty-catalog arm; the factory; the delete copy; the drag and growth reuses |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `badgeSchema.js` | 0 branches (declarative chains) | 9/9 lines |
| `buildBadgeFormData.js` | 20 | 20 (100%) |
| `conditionsLogic.js` | 24 | 24 (100%) |
| (shared `questionTree.js` reuses) | — | attributed to the Lesson module |

One test iteration was needed: the first `conditionTypeLabel` case
conflated the raw lookup (undefined for unknown types) with the
summary's passthrough — the two were re-pinned on their own layers.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `badgeSchema.js` | 69 | 7 | 10 | 52 |
| `buildBadgeFormData.js` | 56 | 7 | 17 | 32 |
| `conditionsLogic.js` | 117 | 11 | 64 | 42 |
| **Total** | **242** | **25** | **91** | **126** |

- **KLOC (physical, primary): 242 / 1000 = 0.242**
- KLOC (code-only): 126 / 1000 = 0.126
- Istanbul executable lines: 42

*Attribution note:* the shared `ConditionsBuilder`'s extracted logic
(117 lines) is attributed here under the first-consumer convention (the
`questionTree` precedent — the avatar editor will import it and its
future metrics reports will cross-reference).

## 5. Defect log

Defects discovered while building this suite. Badge-editor count: **0**.

Findings documented instead of fixed:

- **The optional icon is the family's first.** No image-required
  3-way, no `hasExistingImage` parameter — the schema's nullable icon
  chain ends where the challenge and learning-path schemas add their
  cover rule. The structural contrast is pinned by the D6 case.
- **Conditions REQUIRED is the defining rule.** The badge must earn
  somehow — the exact opposite of the challenge editor's optional
  questions, both now test-enforced on their own layers.
- **The operator lock is UI-only.** All five operators pass the schema
  for any condition type (mirroring the server's `Rule::in`), so the
  locked 'Is (=)' select is a design decision, not a validation
  boundary — pinned so a future editor cannot mistake it for one.
- **The two verbatim duplicates eliminated.** The component's
  `LOGIC_OPTIONS` (duplicating `badgeSchema.js`'s) and `SUMMARY_TYPES`
  (duplicating the badges listing's chip labels) collapsed onto single
  homes.
- **The empty-catalog fallback is live-capable.** An entity pick whose
  catalog emptied keeps its stored value visible — the mirror of the
  badge listing's undefined chip arm.
- **The reuse consumers multiply.** The drag triple and growth
  detection now serve their third and fourth field arrays (the lesson,
  challenge, and learning-path outlines were the first two), with the
  challenge suite's pins applying to condition rows.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for these modules, so there is
nothing to classify. The schema mirrored the server's validation, the
components' logic was extracted verbatim, and the two duplicates were
eliminated rather than tested into permanence.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.242 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% across the
three modules, with the two structural contrasts and the UI-lock note
now on record for both requirements-driven editors.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The badge editor suites
npx vitest run resources/js/Pages/Dashboard/Badges/Editor/__tests__ resources/js/components/__tests__

# physical line count of the modules
Get-Content resources/js/Pages/Dashboard/Badges/Editor/badgeSchema.js | Measure-Object -Line
```
