# Login Page — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the Login page's decision logic: the two pure
modules extracted from `Login/index.jsx` so every decision point is
unit-testable in the `node` environment (no DOM).

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `loginSchema.js` | Zod schema composition (deliberately permissive login rules) |
| 2 | `authToast.js` | Toast state derivation from the `error` / `status` page props |

Out of scope (by decision, same convention as the Register report):

- `Login/index.jsx` — component wiring (react-hook-form + Inertia router);
  its branching logic was extracted into the modules above.
- `zodRules.js` — shared with the Register page. Its login rules
  (`emailLoginRule`, `passwordLoginRule`) are behavior-pinned by
  `loginRules.test.js`, but the file is excluded from the KLOC denominator
  (see § 4).

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `loginRules.test.js` | 15 | 112 |
| `authToast.test.js` | 7 | 78 |
| `loginSchema.test.js` | 5 | 75 |
| **Total** | **27** | **265** |

Result: **3 files, 27 tests, 27 passed** (`vitest run` scoped to this folder).

## 3. Decision coverage

**Method.** Istanbul *branch* coverage, as reported by
`vitest run --coverage`. An istanbul branch is one outcome of a decision
point (`if/else`, ternary, `&&`/`||` short-circuit, `??`), which is exactly
the definition of decision coverage. `vitest.config.js` enforces
`thresholds: { branches: 100, functions: 100 }`, so the metric is a hard
gate, not just a report.

**Decision inventory.** Each test file documents its decisions with a
one-case-per-outcome principle:

| Decision | Location | Outcomes covered |
| --- | --- | --- |
| D1 | `toastFrom` `error \|\| status` — description priority | error / status / neither |
| D2 | `toastFrom` `if (!description)` | null return (effect keeps the prior toast) |
| D3–D4 | type & title ternaries | error / success sides, kept in sync |
| D1 | `emailLoginRule` local part `[a-z0-9.-]+` | lowercase-only, mirroring registration |
| D2 | `emailLoginRule` domain pattern | bare domain, any subdomain depth, hyphenated labels |
| D3 | `emailLoginRule` rejections | foreign domain, empty local part, trailing host, whitespace, empty string, uppercase local part or domain |
| D4 | `passwordLoginRule` min(1) boundary | non-empty / empty |
| D1–D5 | `loginSchema` composition contract | exact 3 fields, rule wiring, remember boolean, full pipeline |

**Regex caveat.** Istanbul sees no branches inside a regex literal — it
"covers" a rule on import. `loginRules.test.js` therefore pins the
pass/fail *behavior* of every login rule instead of relying on branch
counting; the table above is the decision evidence for those rules.

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `authToast.js` | 8 | 8 (100%) |
| `loginSchema.js` | 0 | — (flat schema, contract pinned by tests) |
| `zodRules.js` (shared, exercised by this suite) | 14 | 14 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only (comments/blanks excluded) and
istanbul executable lines are listed for transparency; the physical count
is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `loginSchema.js` | 16 | 1 | 8 | 7 |
| `authToast.js` | 27 | 2 | 13 | 12 |
| **Total** | **43** | **3** | **21** | **19** |

- **KLOC (physical, primary): 43 / 1000 = 0.043**
- KLOC (code-only): 19 / 1000 = 0.019
- Istanbul executable lines: 6

## 5. Defect log

Defects discovered while building this suite, documented inline as `DD`
annotations in the test files. Login-scope count: **0**.

One finding was investigated and reclassified rather than kept as a defect:

- **DD #1 (reclassified as intended behavior).** While decision-covering the
  domain pattern, the login email rule appeared asymmetric: its domain part
  rejected uppercase (`budi@STUDENT.itera.ac.id`) while its local part
  accepted it (`Alvin@itera.ac.id`). The clarified requirement — **emails
  must be lowercase** — makes the domain case-sensitivity intended behavior,
  not a defect. The permissive local part was the actual deviation, and it
  was resolved by tightening `emailLoginRule`'s local part to
  `[a-z0-9.-]+`, mirroring the registration rules. The behavior is pinned
  by tests rather than left as a surprise.

Not counted: the Register page's two defects (DD #2 and the
`resetIdentityFields` note) are documented in `register-test-metrics.md`.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this module, so there is nothing
to classify. The single candidate (DD #1) was reclassified as intended
behavior once the requirement was clarified — emails must be lowercase —
and the rule was aligned with it (see § 5).

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.043 KLOC = 0 defects/KLOC
```

*Reading notes:*

- The count is zero after reclassification: the one candidate finding
  (DD #1) is intended behavior under the requirement that emails must be
  lowercase, and the rule was tightened to align with it (see § 5).
- With no defects, the small KLOC base no longer inflates anything — the
  metric simply reports that testing found no genuine defects in this
  module.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Login suite only
npx vitest run resources/js/Pages/Auth/Login/__tests__

# physical line count of the two modules
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
