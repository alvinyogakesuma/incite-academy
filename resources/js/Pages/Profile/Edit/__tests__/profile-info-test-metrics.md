# Student Profile Personal Info Page — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul) and a physical line count
of the source files.

## 1. Scope

The unit under test is the first of the iteration-4 features: the student
profile settings page's personal-info surface — the header band's identity
derivations and the Personal Info tab's form. The page's decisions lived
inline in the shell (`index.jsx`) and in `PersonalInfoTab.jsx`; both were
rewired onto the extracted module:

| # | Module | Responsibility |
| --- | --- | --- |
| 1 | `profileInfo.js` | The form's hydration with its nullability map, the PATCH body's program-clearing null, the header band's two-letter initials, the points formatting, and the joined date |

Out of scope (by decision, same convention as the other pages):

- The tab switch state, the Radix form wiring, the `router.patch`
  dispatch (the `/profile` URL is wiring, its body coercion is not), and
  the render-level fallbacks (`initials || 'S'`, `joinedDate && …`).
- The toast plumbing (`status` and the `pageErrors.badge || avatar`
  effects) — it serves the equip and toggle stories (features 4 and 6 of
  this round's list) and is deferred to the first round that owns it.
- The remaining tabs — avatars, badges, course progress, and learning
  path progress — separate scopes.

**The verified nullability map** (from the users migration, pinning which
guards are live versus defensive): `nim_nip`, `biography`, and
`major_departement_id` are **nullable** columns (their fallbacks are
genuinely reachable); `name` is NOT NULL (defensive); `total_points`
defaults 0 and never ships null (defensive); `created_at` is NOT NULL
(defensive). `ProfileController::update` un-verifies the email when it
changes and redirects back — backend behavior, documented.

## 2. Test suite

| Test file | Cases | LOC |
| --- | --- | --- |
| `profileInfo.test.js` (this page) | 10 | 157 |
| **Total for this feature's scope** | **10** | **157** |

Result: **10 tests passed** (`vitest run` scoped to this folder).

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
| D1 | `initialInfoValues` full user | every field hydrates, the select's id as its string |
| D2 | the nullable columns | null `nim_nip`, `biography`, and `major_departement_id` each reach their fallback — live-capable |
| D3 | the select's id coercion | a number id → its string; a null id → the empty value |
| D4 | the name guard | defensive (NOT NULL column) — fires only for a missing auth shape |
| D5 | `infoSubmitValues` | the unselected program clears to **null** (the nullable FK's clear); a value rides as-is |
| D6–D8 | `initialsFor` | multi-word → the first two initials uppercased; single word → one; extra spaces dropped; null/empty → `''` (defensive) |
| D9 | `pointsLabel` | a value groups its thousands **structurally** (see the finding below); 0 → '0'; null → '0' (defensive) |
| D10 | `joinedDateLabel` | a timestamp formats month/day/year en-US (pinned at noon UTC so no timezone shifts the date); null stays null (defensive) |

**Result — 100% decision coverage.** Full suite: 52 files, 811 tests,
**branches 679/679 (100%)**; no file has missing coverage.

| File | Branches | Covered |
| --- | --- | --- |
| `profileInfo.js` | 19 | 19 (100%) |

One test iteration was needed and it produced the round's most
interesting finding: the first D9 case pinned a literal `'12,000'`, and
this machine's locale is **id-ID** — `toLocaleString()` with no explicit
locale renders `'12.000'`. The contract was re-pinned structurally (see
below).

## 4. KLOC measurement

**Method.** Physical LOC — every line in the file, including comments and
blank lines — divided by 1000. Code-only and istanbul executable lines are
listed for transparency; the physical count is the denominator used in § 6.

| File | Physical | Blank | Comment | Code-only |
| --- | --- | --- | --- | --- |
| `profileInfo.js` | 88 | 5 | 44 | 39 |

- **KLOC (physical, primary): 88 / 1000 = 0.088**
- KLOC (code-only): 39 / 1000 = 0.039
- Istanbul executable lines: 6

*Attribution note:* the shell shrank from 274 to 263 physical lines and
the tab from 142 to 129 — the moved derivations belong to this report's
module under the established convention.

## 5. Defect log

Defects discovered while building this suite. Personal-info count: **0**.

Findings documented instead of fixed:

- **The points label is locale-dependent by design.** The header band
  formats points with `toLocaleString()` carrying no explicit locale, so
  the same score renders `12.000` on an id-ID machine and `12,000` on an
  en-US one. Pinned structurally (the grouping itself, either separator)
  rather than counting it as a defect; if the product ever wants a fixed
  separator, the helper takes an explicit locale argument and both arms
  stay covered.
- **The email-clearing side effect.** Changing the email sets
  `email_verified_at` to null on the backend (`update()`'s dirty check) —
  backend behavior, documented as the PATCH contract.
- **The `nullOnDelete` mirror.** Clearing the program ships null, which
  the nullable foreign key accepts (and a department's deletion nulls it
  server-side) — the wire contract the D5 case enforces.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this feature, so there is
nothing to classify. The derivations were extracted verbatim, and the
one environment-dependent output was pinned structurally instead of
being "corrected" into a behavior change.

## 6. Defect density

**Formula:** defect density = defects found ÷ KLOC.

```
defect density = 0 defects ÷ 0.088 KLOC = 0 defects/KLOC
```

*Reading note:* decision coverage is gate-enforced at 100% on the
module, with the nullability map split honestly between live-capable and
defensive arms straight from the migration.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%)
npm run test:coverage

# Profile personal info suite only
npx vitest run resources/js/Pages/Profile/Edit/__tests__

# physical line count of the module
Get-Content resources/js/Pages/Profile/Edit/profileInfo.js | Measure-Object -Line
```
