# Avatar Editor Page (Update) — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the admin avatar editor — the whole avatar: its
metadata, its **optional** icon, and its unlock requirements (the
feature-15 increment; the create story's round is prose-honest and
cross-references here). The editor is the badge editor's verbatim twin;
its two logic modules existed but had **no tests**, and the inline
hydration moved to the covered wire module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `avatarSchema.js` | The whole-payload schema — the metadata rules, the **optional** icon chain (confirmed on both requirements-driven editors: no image-required 3-way), the AND/OR logic, and the **conditions-required** rule |
| 2 | `buildAvatarFormData.js` | The multipart wire (bracket-notation condition rows, files as-is, booleans '1'/'0') plus `initialAvatarValues` — the inline hydration extracted, serving both the stored avatar and the blank draft's state |

Reused (covered, **not double-counted here**): the shared
`ConditionsBuilder` and its covered `conditionsLogic.js` module — the
avatar editor is the builder's **second consumer from day one**, riding
feature 11's extraction with zero new coverage debt on its condition
rows.

**The verified mirror contract** (`AvatarUpdateRequest` — the badge
request's verbatim twin): title required max:255; description required;
icon nullable mimes/2MB; remove_icon boolean; logic in AND/OR;
**conditions required array min:1** with `type`/`operator` in their
five-element lists and `value` required string. The schema mirrors
every rule, and all five operators pass for any condition type — the
operator lock is **UI-only**, re-pinned.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `avatarSchema.test.js` | 13 | 222 |
| `buildAvatarFormData.test.js` | 9 | 149 |
| **Total for this feature's scope** | **22** | **371** |

Result: **22 tests passed** (`vitest run` scoped to this folder).

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
| D6 | the optional icon | **null passes with no stored-state argument** — confirmed on both requirements-driven editors |
| D7 | `remove_icon` | booleans only (the wire-time strings never reach the schema) |
| D8 | the logic | AND and OR pass; anything else fails |
| D9 | conditions REQUIRED | an empty list → 'At least one earning condition must be added' |
| D10–D12 | the condition rows | the five types; all five operators for any type (the UI-lock note); the required string value |
| D13 | the whole schema | a fully valid payload passes |
| D1–D6 (payload) | `buildAvatarFormData` | the spoofed PUT; metadata; File-only icon; '1'/'0'; the bracket rows; tolerant inputs |
| D7–D9 (hydration) | `initialAvatarValues` | full hydration; the blank draft's defaults; the bare rows |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `avatarSchema.js` | 0 branches (declarative chains) | 8/8 lines |
| `buildAvatarFormData.js` | 20 | 20 (100%) |
| (shared `conditionsLogic.js`) | 24/24 | inherited from feature 11's round — this editor's second consumer, zero new coverage debt |

The suite passed on its first run — the twin's modules mirrored the
badge editor's, whose suites were the templates.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `avatarSchema.js` | 64 | 6 | 10 | 48 |
| `buildAvatarFormData.js` | 56 | 7 | 17 | 32 |
| **Total** | **120** | **13** | **27** | **80** |

- **KLOC (physical, primary): 120 / 1000 = 0.12**
- KLOC (code-only): 80 / 1000 = 0.08
- Istanbul executable lines: 24

*Attribution note:* the editor's hydration moved to the covered wire
module (113 physical lines, was 122) under the established convention.
The shared conditions module's coverage is attributed to feature 11's
round.

## 5. Defect log

Defects discovered while building this suite. Avatar-editor count: **0**.

Findings documented instead of fixed:

- **The optional icon confirmed on both twins.** No image-required
  3-way exists on either requirements-driven editor — the structural
  contrast is now test-enforced at both layers, and a future editor
  adding a cover rule would stand out immediately.
- **Conditions REQUIRED re-pinned on the twin's layer.** The defining
  rule rides both schemas independently.
- **The operator lock is UI-only on this schema too.** All five
  operators pass for any type, mirroring the server — the same design
  decision as the badge schema, now pinned twice.
- **The twin's debt was zero.** The shared conditions module carried
  this editor's condition rows covered from day one — the
  structuring-twins payoff.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for these modules, so there is
nothing to classify. The modules mirrored the badge editor's proven
templates, and the hydration was extracted verbatim.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.12 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% across both
modules, with the two structural contracts now re-pinned on the twin's
own layer.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The avatar editor suites
npx vitest run resources/js/Pages/Dashboard/Avatars/Editor/__tests__

# physical line count of the modules
Get-Content resources/js/Pages/Dashboard/Avatars/Editor/avatarSchema.js | Measure-Object -Line
```
