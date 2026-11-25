<?php

/**
 * F-47 - Halaman daftar lencana oleh admin
 *
 * Feature tests for the admin's badge listing: GET /dashboard/badges (route
 * dashboard.badges), behind the auth -> verified -> admin gate. Every stored
 * badge is delivered in one `badges` prop (search and pagination are handled
 * client-side), each card carrying the metadata, the icon, the first earning
 * condition, the condition count, and the recipient counter.
 *
 * Method: equivalence partitioning (EP) over the listing's domains, then
 * boundary value analysis (BVA) of the list-only boundaries - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | admin                                          | student, guest                               |
 * | composition       | badges with and without conditions             | a badge omitted from the list                |
 * | ordering          | title-ordered                                  | creation order                               |
 * | field exposure    | the seven card fields                          | full requirements, pivot rows, timestamps    |
 * | icon_url          | stored badges/ path, external URL, null        | a raw stored path reaching the browser       |
 * | conditions_count  | zero, many                                     | a stale count                                |
 * | condition_type    | the first condition's type, null               | a type from a later condition                |
 * | table state       | empty, populated, fresh blank draft            | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F47-01 | access - admin (valid side)                 | admin GET                          | 200 with the badges prop                                  |
 * | FT-F47-02 | access - student (invalid side)             | student GET                        | 403                                                       |
 * | FT-F47-03 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F47-04 | ordering - by title                         | badges created out of order        | entries appear title-ordered                              |
 * | FT-F47-05 | exposure - card values (valid side)         | one fully-populated badge          | the seven fields carry the right values                   |
 * | FT-F47-06 | exposure - withheld fields (invalid side)   | the same entry                     | exactly the seven keys; the full requirements stay out    |
 * | FT-F47-07 | icon_url - stored / external / null         | three badges                       | disk URL / unchanged / null                               |
 * | FT-F47-08 | conditions - zero / two                     | an empty set, a two-condition set  | count 0 with a null type / count 2 with the first type    |
 * | FT-F47-09 | table state - after an add-badge call       | empty table, then POST store       | the new blank badge appears with its defaults             |
 *
 * == Relation to the existing suites =========================================
 *
 * BadgesManagementTest already proves the access trio and the card mapping.
 * F-47 deliberately repeats those so the feature file is self-contained; the
 * new content is the title ordering, the exact key set, the three-way icon
 * mapping, the zero-condition boundary with the null first type, and the
 * appearance of a freshly created blank badge.
 *
 * The add flow is F-46's subject; the criteria save is F-48's and the delete
 * F-49's. The avatar listing is F-51's. The student's badge grid is F-22's,
 * where the flags replace the admin counters. The gate ordering is F-04's
 * subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The card carries only the first condition's type and the total count -
 *   the full requirement tree is the editor's concern.
 * - A badge without conditions shows a zero count and a null type instead of
 *   disappearing.
 * - The recipient counter is the stored column, not a live count of awards.
 * - A stored icon under `badges/` becomes a public disk URL; an external URL
 *   passes through; a missing icon stays null.
 * - The freshly created blank badge appears immediately with the empty AND
 *   requirement set and a zero recipient counter.
 */

use App\Models\Badge;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F47-01 - an admin views the badges management page', function () {
    // Boundary: access, valid side (baseline).
    Badge::factory()->create(['title' => 'First Badge']);

    $this->actingAs(f47Admin())
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Badges', false)
            ->has('badges', 1));
});

test('FT-F47-02 - a student is forbidden from the badges management page', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.badges'))
        ->assertForbidden();
});

test('FT-F47-03 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('dashboard.badges'))->assertRedirect(route('login'));
});

test('FT-F47-04 - the listing is ordered by title, not by creation order', function () {
    // Partition: ordering. Created in reverse alphabetical order to make the
    // ordering observable.
    Badge::factory()->create(['title' => 'Zulu Badge']);
    Badge::factory()->create(['title' => 'Alpha Badge']);
    Badge::factory()->create(['title' => 'Mike Badge']);

    $this->actingAs(f47Admin())
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('badges', fn ($badges) => collect($badges)->pluck('title')->all() === [
                'Alpha Badge',
                'Mike Badge',
                'Zulu Badge',
            ]));
});

test('FT-F47-05 - an entry carries the seven card values', function () {
    // Boundary: field exposure, valid side. Every card field is pinned so a
    // swapped or truncated mapping fails; the two conditions make the count
    // and the first-type mapping observable.
    $badge = Badge::factory()->create([
        'title' => 'Rising Star',
        'description' => 'Awarded for earning points.',
        'icon_url' => 'https://cdn.example.com/badge.png',
        'recipients_count' => 7,
        'requirements' => [
            'logic' => 'OR',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
                ['type' => 'quiz', 'operator' => '>=', 'value' => '5'],
            ],
        ],
    ]);

    $this->actingAs(f47Admin())
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('badges.0.id', $badge->id)
            ->where('badges.0.title', 'Rising Star')
            ->where('badges.0.description', 'Awarded for earning points.')
            ->where('badges.0.icon_url', 'https://cdn.example.com/badge.png')
            ->where('badges.0.conditions_count', 2)
            ->where('badges.0.condition_type', 'points')
            ->where('badges.0.recipients_count', 7));
});

test('FT-F47-06 - an entry withholds every non-card field', function () {
    // Boundary: field exposure, invalid side. The key-set comparison rejects
    // both a missing field and any extra field, so the full requirement tree
    // never leaks through.
    Badge::factory()->create(['title' => 'Key Set Badge']);

    $this->actingAs(f47Admin())
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('badges.0', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'condition_type',
                'conditions_count',
                'description',
                'icon_url',
                'id',
                'recipients_count',
                'title',
            ]));
});

test('FT-F47-07 - the icon is delivered in three shapes', function () {
    // Partition: icon_url. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing icon stays null.
    Storage::fake('public');
    Badge::factory()->create(['title' => 'A Stored Icon', 'icon_url' => 'badges/stored.png']);
    Badge::factory()->create(['title' => 'B External Icon', 'icon_url' => 'https://cdn.example.com/icon.png']);
    Badge::factory()->create(['title' => 'C No Icon', 'icon_url' => null]);

    $this->actingAs(f47Admin())
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('badges.0.icon_url', Storage::disk('public')->url('badges/stored.png'))
            ->where('badges.1.icon_url', 'https://cdn.example.com/icon.png')
            ->where('badges.2.icon_url', null));
});

test('FT-F47-08 - the condition count spans zero and many', function () {
    // Boundary: conditions. An empty set shows a zero count and a null type;
    // a two-condition set shows two and the first condition's type.
    Badge::factory()->create([
        'title' => 'A Empty Conditions',
        'requirements' => ['logic' => 'AND', 'conditions' => []],
    ]);
    Badge::factory()->create([
        'title' => 'B Two Conditions',
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'course', 'operator' => '=', 'value' => 'Reading Mastery'],
                ['type' => 'points', 'operator' => '>=', 'value' => '50'],
            ],
        ],
    ]);

    $this->actingAs(f47Admin())
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('badges.0.conditions_count', 0)
            ->where('badges.0.condition_type', null)
            ->where('badges.1.conditions_count', 2)
            ->where('badges.1.condition_type', 'course'));
});

test('FT-F47-09 - a freshly created badge appears with its defaults', function () {
    // Boundary: table state. The list is empty before the add call and shows
    // the new blank badge immediately after it.
    $admin = f47Admin();

    $this->actingAs($admin)
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->has('badges', 0));

    $this->actingAs($admin)->post(route('dashboard.badges.store'));

    $this->actingAs($admin)
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('badges', 1)
            ->where('badges.0.title', 'Untitled Badge')
            ->where('badges.0.description', '')
            ->where('badges.0.conditions_count', 0)
            ->where('badges.0.condition_type', null)
            ->where('badges.0.recipients_count', 0));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f47Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
