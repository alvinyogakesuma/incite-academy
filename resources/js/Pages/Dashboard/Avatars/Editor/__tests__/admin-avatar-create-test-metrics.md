# Admin Avatar Create Flow — Frontend Unit Test Metrics

Measurement date: 2026-11-24. All numbers below were produced from a fresh
`npm run test:coverage` run (Vitest 5 + istanbul).

## 1. Scope

The unit under test is the **create flow** of the admin avatar management
— the feature-13 increment, measured as its own unit. The flow follows
the project's **draft-first convention** (the badge editor's shape
measured in feature 9's round), so this round is prose-honest: the
create carries no client-side branching to test, and the report
documents the verified contract instead of inventing cases for a
branchless flow.

**The verified `store()` contract** (`Admin\AvatarController::store`):

- A gate, then a seeded blank draft with its **exact shape**: `'title' =>
  'Untitled Avatar'` (filled), `'description' => ''`,
  `'requirements' => ['logic' => 'AND', 'conditions' => []]` (an empty
  unlock-conditions list inside the AND logic), and
  `'recipients_count' => 0` — the badge editor's store() verbatim.
- The redirect chain lands in the editor (`dashboard.avatars.edit`), so
  the admin meets the avatar editor with the hydrated draft — the
  create flow's visible surface is the editor's fresh state, not a
  separate client path.
- The editor **always PUTs** (`/dashboard/avatars/${avatar.id}` unguarded —
  the draft-first flow guarantees the id, the same always-present
  contract the challenge editor's round documented).

## 2. Cross-references (the convention)

The draft-first family splits its verification across the stories that
own the surfaces:

- **The draft row's listing products** — a null `icon_url` (the card's
  fallback), the empty description, and the zero conditions count — are
  covered by feature 14's upcoming null-safety rows (the avatars listing
  suite, its badges-listing counterpart).
- **The editor suite** — the whole-payload schema (the unlock-conditions
  rules), the multipart wire, and the hydration arms (the logic `??
  'AND'` default, the empty conditions array) — rides **feature 15's
  update story**, the same convention that put the badge editor's
  suites on its Ubah story.
- **The conditions module is inherited covered.** The shared
  `ConditionsBuilder`'s row decisions (`conditionsLogic.js`) were
  extracted and covered in feature 11's round, and this editor is its
  second consumer from day one — its condition rows ride the covered
  type/operator/value and chip decisions without any new coverage
  debt.

## 3. Test suite

No test cases were produced for this story — the draft-first create
runs entirely on the backend without client-side logic, and its visible
products are covered by the stories above. This matches the family's
established shape (the badges' feature 9 round), where the behavior is
verified through the listing and editor suites it feeds.

## 4. KLOC measurement

No frontend code was added or changed for this flow: the Add button's
POST is wiring, the seeded draft lives server-side, and the editor's
hydration is shared with the update story (single-extraction
convention — testing it here and again in feature 15 would
double-count).

- **KLOC: 0** — the degenerate density stated honestly per the family
  convention.
- Full suite baseline: **52 files, 811 tests, 679/679 branches (100%)** —
  unchanged by this round; no totals sync was needed.

## 5. Defect log

Defects discovered while building this story. Avatar-create count: **0**.

Findings documented instead of fixed:

- **The seeded requirements shape.** The blank draft carries
  `logic: 'AND'` with an empty conditions array — the editor's hydration
  defaults (`logic ?? 'AND'`, the conditions' per-row defaults) ride
  exactly that shape, the mirror contract the editor suite will pin.
- **The always-PUTs flow.** The editor PUTs one route with the method
  spoof, riding the draft-first guarantee.
- **The shared builder's second consumer.** The conditions module's
  coverage carries over to this editor's condition rows from day one —
  the structuring-twins payoff the challenges and avatars rooms already
  demonstrated.

### 5.1 PSP defect classification

Per the standard PSP (Personal Software Process, Watts Humphrey) defect
type taxonomy: no defects were found for this story, so there is nothing
to classify. A draft-first create injects no client-side logic — there
is nothing for a probe to bite.

## 6. Defect density

```
defect density = 0 defects (no frontend LOC measured — the flow adds none)
```

The formula is degenerate for a draft-first create; the honest reading
is that the story's quality rides the editor and listing suites it
cross-references.

## 7. Reproducing the measurements

```sh
# full suite with decision coverage (threshold-gated at 100%) —
# unchanged by this round
npm run test:coverage

# The editor suites land with feature 15's round
npx vitest run resources/js/Pages/Dashboard/Avatars/Editor/__tests__
```
