# Register Page — Frontend Unit Test Metrics

Measurement date: 2026-11-23. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the Register page's decision logic: the four pure
modules extracted from `Register/index.jsx` so every decision point is
unit-testable in the `node` environment (no DOM).

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `majorDepartementOptions.js` | Department dropdown options per academic status |
| 2 | `registerSchema.js` | Zod schema composition (per-status rule wiring) |
| 3 | `resetIdentityFields.js` | Whether a status switch resets `nim_nip` / `major_departement` |
| 4 | `staffEmailDomains.js` | Staff email domain whitelist |

Out of scope (by decision):

- `Register/index.jsx` — component wiring (react-hook-form + Inertia router);
  its branching logic was extracted into the modules above.
- `zodRules.js` / `zodFieldErrors.js` — shared with the Login page. They are
  exercised and covered at 100% by this suite, but excluded from the KLOC
  denominator (see § 3).

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `register.test.js` | 42 | 531 |
| `registerSchema.test.js` | 13 | 176 |
| `majorDepartementOptions.test.js` | 5 | 97 |
| `staffEmailDomains.test.js` | 5 | 87 |
| `resetIdentityFields.test.js` | 5 | 34 |
| **Total** | **70** | **925** |

Result: **5 files, 70 tests, 70 passed** (`vitest run` scoped to this folder).

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
| D1–D3 | `nameRefine` / `prodiMahasiswaRefine` / `departementStaffRefine` `isMahasiswa` guards | true / false |
| D4 | `nimRefine` `\|\|` short-circuit | left true / right true / right false |
| D5–D6 | `Boolean(selected) && …` chains | null / match / mismatch |
| D7 | `passwordRefine` equality | equal / not equal |
| D8 | `?? ''` nullish fallbacks | fallback / defined |
| D9 | `zodFieldErrors` first-issue `if` | skip / set |
| D1–D6 | `registerSchema` email / NIM-NIP ternaries, department enum | both sides each |
| D1–D2 | `majorDepartementOptions` filter + ternary | kept / filtered, both lists |
| D1–D3 | `staffEmailDomains` prepend, dedupe, falsy guard | each path |
| — | `resetIdentityFields` XOR | full 4-cell truth table |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `majorDepartementOptions.js` | 2 | 2 (100%) |
| `registerSchema.js` | 4 | 4 (100%) |
| `resetIdentityFields.js` | 0 | — (branch-free; truth-table tested) |
| `staffEmailDomains.js` | 0 | — (branch-free data flow) |
| `zodRules.js` (shared, exercised by this suite) | 14 | 14 (100%) |
| `zodFieldErrors.js` (shared, exercised by this suite) | 2 | 2 (100%) |

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only (comments/blanks excluded) and
istanbul executable lines are listed for transparency; the physical count is
the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `majorDepartementOptions.js` | 15 | 0 | 9 | 6 |
| `registerSchema.js` | 53 | 2 | 9 | 42 |
| `resetIdentityFields.js` | 15 | 0 | 13 | 2 |
| `staffEmailDomains.js` | 18 | 0 | 10 | 8 |
| **Total** | **101** | **2** | **41** | **58** |

- **KLOC (physical, primary): 101 / 1000 = 0.101**
- KLOC (code-only): 58 / 1000 = 0.058
- Istanbul executable lines: 13

## 5. Defect log

Defects discovered while building this suite, documented inline as `DD`
annotations in the test files. Register-scope count: **2**.

| ID | Defect | Discovery & fix | Guarding tests |
| --- | --- | --- | --- |
| DD (reset) | The original inline expression in `Register/index.jsx` compared the *current* form value against the next value, so switching academic status reset `nim_nip` / `major_departement` on the wrong transitions. | Found during test design; fixed by extracting `shouldResetIdentityFields(previousStatus, nextStatus)` as a pure function taking both statuses explicitly. | `resetIdentityFields.test.js` — full 4-cell truth table |
| DD #2 | A `null` `major_departement_domain` (UPA units) survived the `Set` dedupe in the staff email whitelist and crashed `emailStaffRule`'s `domain.replace(...)` with a `TypeError` the first time a UPA unit was seeded. | Found while decision-covering the dedupe; fixed with the `.filter(Boolean)` guard. | `staffEmailDomains.test.js` — D3 guard cases |

Not counted: the Login email rule's lowercase-only behavior (formerly
documented as DD #1) is intended behavior under the lowercase-email
requirement — see `login-test-metrics.md`.

### 5.1 PSP defect classification

Both defects classified per the standard PSP (Personal Software Process,
Watts Humphrey) defect type taxonomy:

| # | PSP type | Inject phase | Remove phase | Description |
| --- | --- | --- | --- | --- |
| 1 | 80 — Function (logic) | Code | Test | Status-switch reset compared the post-update form value with the next status (new vs new); the XOR never fired, so `nim_nip` / `major_departement` were never reset when crossing the Mahasiswa boundary |
| 2 | 60 — Checking (inadequate check) | Code | Test | A null `major_departement_domain` (UPA rows) survived the `Set` dedupe and crashed `emailStaffRule`'s `domain.replace(...)` with a `TypeError` at page render; fixed with the `.filter(Boolean)` guard |

Rationale:

- **Defect 1 → Type 80 (Function).** The intent was correct (compare previous
  status with next status) but the condition was built from the wrong
  operand — the form was read *after* the update, so the comparison became
  new vs new and could never fire. A conditional that can never be true is a
  logic defect.
- **Defect 2 → Type 60 (Checking).** The input data was legal — null domains
  are allowed values for UPA rows. The missing piece was a check: nothing
  verified the value was non-null before using it in
  `domain.replace(...)`. The fix *is* the check (`.filter(Boolean)`).

Both defects were injected in Code and removed in Test — the classic PSP
profile, and the reason decision coverage (not happy-path testing) is what
exposed them.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 2 defects ÷ 0.101 KLOC ≈ 19.8 defects/KLOC
```

Alternative basis (code-only LOC): 2 ÷ 0.058 ≈ 34.5 defects/KLOC.

*Reading note:* defect density is only comparable at module scale when the
KLOC base is meaningful. At 0.101 KLOC the density is naturally inflated —
two defects in a hundred-line module produce a much larger ratio than the
same two defects would in a whole-application KLOC base. The number says the
test design found roughly one defect per 50 physical lines of this module.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Register suite only
npx vitest run resources/js/Pages/Auth/Register/__tests__

# physical line count of the four modules
Get-Content <file> | Measure-Object -Line   # per file, PowerShell
```
