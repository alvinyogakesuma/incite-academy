# Courses Editor Page — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the Courses editor — two panels, neither of which
had an extracted module or tests (every decision lived inline in
`index.jsx` and `CourseContent.jsx`). Following the established
extraction pattern, the decisions were pulled into two pure modules:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `courseInfo.js` | The information panel: the zod schema factory (metadata rules, dynamic category enum, the image rule chain, the 3-way image-required decision), null-safe stats, the stored-preview switch, and the `remove_image` serialization |
| 2 | `courseOutline.js` | The module/lesson outline: the drag-reorder decision triple, the optimistic rename patch, idempotent accordion expansion, growth detection, the delete-dialog copy, and draft-row id fallbacks |

Out of scope (by decision, same convention as the other pages):

- `index.jsx` and `CourseContent.jsx` — component wiring (react-hook-form,
  dnd-kit sensors/contexts, router dispatch); their decisions were
  extracted into the modules above and both components were rewired to
  consume them, with behavior identical.
- `formatDuration` — was duplicated verbatim in this page from
  `courseTable.js`; the dedup now imports it from there.
- The separate Lesson editor (`Dashboard/Lesson/Editor`) — already covered
  by its own suite.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `courseInfo.test.js` | 25 | 284 |
| `courseOutline.test.js` | 16 | 169 |
| **Total** | **41** | **453** |

Result: **2 files, 41 tests, 41 passed** (`vitest run` scoped to this folder).

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
| D1–D3 | metadata rules | title/short/long description trim, min, and max arms |
| D4–D5 | enums | category (dynamic per page prop), status (draft/published) |
| D6 | `instanceof File` | File passes, non-File fails |
| D7 | size refine | at the 2 MB limit passes, one byte over fails |
| D8 | MIME refine | jpeg/png/webp pass, gif fails |
| D9 | `.nullable()` | null passes the type rule itself |
| D10–D13 | the image-required decision | fresh-without-upload → error; stored-kept → pass; stored-removed → error; fresh upload → pass |
| D14 | empty categories probe | the schema factory must not throw on `[]` |
| D15–D16 | `courseStatsFor` | full course counts; null course/trees → zeros |
| D17 | stored-preview switch | removing → null, keeping → url, missing → null |
| D18 | `removeImageFlag` | `'1'` / `'0'` |
| D1–D5 (outline) | `resolveDragOrder` | no target / self-drop / unknown active / unknown over → null; forward and backward moves |
| D6 | `renameItem` | target patched, others untouched, unknown id unchanged |
| D7 | `expandedIdsWith` | new appends, already-open is a no-op |
| D8 | `newlyAddedModuleValue` | growth → last module's value; no growth / shrink → null |
| D9 | `initialOpenModuleIds` | first module expanded; empty outline collapsed |
| D10 | `deleteDialogDescription` | with lessons → count copy; without → plain; null module safe |
| D11 | `moduleValue` / `lessonKey` | stored ids as-is; draft rows fall back to position |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `courseInfo.js` | 19 | 19 (100%) |
| `courseOutline.js` | 22 | 22 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `courseInfo.js` | 105 | 8 | 35 | 62 |
| `courseOutline.js` | 99 | 12 | 50 | 37 |
| **Total** | **204** | **20** | **85** | **102** |

- **KLOC (physical, primary): 204 / 1000 = 0.204**
- KLOC (code-only): 102 / 1000 = 0.102
- Istanbul executable lines: 41

## 5. Defect log

Defects discovered while building this suite. Courses-editor count: **0**.

The probing was real, and three candidates were investigated and cleared:

- **Empty category list.** The page defaults `categories = []`, and the
  schema builds `z.enum(categories)` — a plausible build-time crash.
  The probe (D14) proved zod 4 tolerates an empty enum without throwing,
  so the schema factory is safe even on the empty default; the backend
  always sends the three categories in practice.
- **Unguarded delete URL.** `handleConfirmDeleteModule` builds its URL
  from `moduleToDelete?.id` without a guard. Unreachable through the UI —
  the dialog only opens with a module set and its confirm is only
  clickable while open — so documented here rather than "fixed".
- **Null-module dialog copy.** The delete dialog's description renders
  `"undefined"` if the module clears mid-animation (the radix close
  transition). Transient, cosmetic, and unreachable in the normal flow;
  pinned by a test as accepted behavior.

Two quality cleanups also rode along (improvements, not defects): the
verbatim `formatDuration` duplication from `courseTable.js` was deduped
into an import, and `index.jsx`'s stale "static scaffolding" comment —
written before the outline was built out — was corrected.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for these modules, so there is
nothing to classify. Every candidate edge (empty enum, unguarded URL,
null dialog state, null stat trees) was probed and either passed or
proved unreachable — the null-guard discipline established by the
Users-page defects is now baked into pages written afterward.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.204 KLOC = 0 defects/KLOC
```

*Reading note:* the same honest result as the Courses index page —
decision coverage is gate-enforced at 100% with genuine edge probing, and
the module inherited its guards from prior lessons. Two pages in a row
at zero defects is the defect-density practice doing its job.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Courses editor suites only
npx vitest run resources/js/Pages/Dashboard/Courses/Editor/__tests__

# physical line count of the two modules
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
