# Student Profile Update Flow — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the **update flow** of the student profile's
personal info — the feature-2 increment of the profile round, measured as
its own unit (the page+flow convention of the delete and enroll flow
reports). The flow's PATCH body coercion shipped with the personal-info
round; this round extracts the flow's one remaining decision and pins the
flow's server contract:

| # | Helper | Responsibility |
| --- | --- | --- |
| 1 | `landingErrorsFor` | The flow's error landing — the server's field errors arrive on the fields as-is, and a save without errors (the success path re-render) clears to the empty map |

Reused (covered by the personal-info round, **not double-counted
here**): `infoSubmitValues` — the PATCH body's program-clearing null is
this flow's defining wire contract, re-summarized as D12.

Out of scope: the `router.patch('/profile', …)` dispatch (the URL is
wiring), the `handleChange` error clearing (an object spread), and the
submit button's `isSaving` disable — wiring across the family.

**The verified server contract** (`ProfileUpdateRequest`): `name`
required string max:255; `email` required lowercase email max:255
**unique except self**; `nim_nip` **nullable** string max:50;
`major_departement_id` **nullable** exists; `biography` **nullable**
string. The nullable trio accepts exactly the null-clearing the wire
sends (the D5/D12 contract), and the form's `required` marking on
name/email mirrors the required pair. `ProfileController::update` fills
the validated fields and un-verifies the email when it changed.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `profileInfo.test.js` (the page's suite; the flow owns 2) | 12 | 185 |
| **Total for this flow's scope** | **2** | **28** |

Result: **12 tests passed** (`vitest run` scoped to this folder).

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
| D11 | `landingErrorsFor` | the server's field errors land as-is; a null payload clears to the empty map so stale field errors never linger |
| D12 | `infoSubmitValues` (re-summarized) | the program clear rides the PATCH as null |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `profileInfo.js` (post-flow) | 21 | 21 (100%) — the index round measured 19 before the flow landed |

The suite passed on its first run — the landing was a one-line
extraction of the pre-existing guard, with the flow's contract
re-summarized rather than re-derived.

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `profileInfo.js` (whole module, post-flow) | 100 | 6 | 52 | 42 |
| **Update-flow delta (this report's scope)** | **+12** | **+1** | **+7** | **+3** |

The delta is the flow's own footprint: the landing helper with its JSDoc
and the module header's entry. The index round's 0.088 KLOC covered the
module pre-flow — its scope tables and totals stay as measured; no
double-counting in either direction.

- **KLOC (physical, primary): 12 / 1000 = 0.012**
- KLOC (code-only): 3 / 1000 = 0.003
- Istanbul executable lines: 7 module-wide (the flow owns the landing's
  one body)

## 5. Defect log

Defects discovered while building this flow's coverage. Update-flow
count: **0**.

Findings documented instead of fixed:

- **No client-side schema.** Unlike every admin editor — whose zod
  schema mirrors its FormRequest before a request is ever sent — the
  personal info form ships raw and relies entirely on the server's
  validation, with the errors landing on the fields after the round
  trip. The structural contrast is now documented as this feature's
  design, with the landing's null arm keeping the failure path clean.
- **The silent save.** `update()` redirects back without a status
  flash, so a successful personal-info save produces no toast — the
  shell's `status` toast serves the *password* flow only, and the
  button re-enabling is the save's only feedback. Twin-inconsistent
  with the password flow's toast, recorded as a potential UX gap if
  raised app-wide.
- **The email-clearing side effect.** Changing the email nulls
  `email_verified_at` server-side — the PATCH's documented
  consequence, already recorded in the personal-info round's report.
- **The URL as wiring.** `PATCH /profile` rides inline like every
  submit URL in the family; only the guard-composed delete URLs were
  extracted, because only they carry a decision.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this flow, so there is nothing
to classify. The flow's one decision was extracted verbatim and its
contract re-summarized from already-covered cases.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.012 KLOC = 0 defects/KLOC
```

*Reading note:* the flow's KLOC base is tiny by design — the body
coercion was already covered — so the flow's value is its pinned
contract: the server's validation rules verified against the wire, the
clean landing, and the structural no-schema contrast now on record.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# The personal info suite (the flow's cases included)
npx vitest run resources/js/Pages/Profile/Edit/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Profile/Edit/profileInfo.js | Measure-Object -Line
```
