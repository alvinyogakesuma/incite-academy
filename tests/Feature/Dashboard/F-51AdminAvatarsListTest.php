<?php

/**
 * F-51 - Halaman admin daftar avatar
 *
 * Feature tests for the admin's avatar listing: GET /dashboard/avatars (route
 * dashboard.avatars), behind the auth -> verified -> admin gate. Every stored
 * avatar is delivered in one `avatars` prop (search and pagination are handled
 * client-side), each card carrying the metadata, the icon, the first unlock
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
 * | composition       | avatars with and without conditions            | an avatar omitted from the list              |
 * | ordering          | title-ordered                                  | creation order                               |
 * | field exposure    | the seven card fields                          | full requirements, pivot rows, timestamps    |
 * | icon_url          | stored avatars/ path, external URL, null       | a raw stored path reaching the browser       |
 * | conditions_count  | zero, many                                     | a stale count                                |
 * | condition_type    | the first condition's type, null               | a type from a later condition                |
 * | table state       | empty, populated, fresh blank draft            | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F51-01 | access - admin (valid side)                 | admin GET                          | 200 with the avatars prop                                 |
 * | FT-F51-02 | access - student (invalid side)             | student GET                        | 403                                                       |
 * | FT-F51-03 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F51-04 | ordering - by title                         | avatars created out of order       | entries appear title-ordered                              |
 * | FT-F51-05 | exposure - card values (valid side)         | one fully-populated avatar         | the seven fields carry the right values                   |
 * | FT-F51-06 | exposure - withheld fields (invalid side)   | the same entry                     | exactly the seven keys; the full requirements stay out    |
 * | FT-F51-07 | icon_url - stored / external / null         | three avatars                      | disk URL / unchanged / null                               |
 * | FT-F51-08 | conditions - zero / two                     | an empty set, a two-condition set  | count 0 with a null type / count 2 with the first type    |
 * | FT-F51-09 | table state - after an add-avatar call      | empty table, then POST store       | the new blank avatar appears with its defaults            |
 *
 * == Relation to the existing suites =========================================
 *
 * AvatarsManagementTest already proves the access trio and the card mapping.
 * F-51 deliberately repeats those so the feature file is self-contained; the
 * new content is the title ordering, the exact key set, the three-way icon
 * mapping, the zero-condition boundary with the null first type, and the
 * appearance of a freshly created blank avatar.
 *
 * The add flow is F-50's subject; the criteria save is F-52's and the delete
 * F-53's. The badge listing is F-47's with the same shape. The student's
 * avatar grid is F-20's, where the awarded/equipped flags replace the admin
 * counters. The gate ordering is F-04's subject; this route shares the same
 * middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The card carries only the first condition's type and the total count -
 *   the full requirement tree is the editor's concern.
 * - An avatar without conditions shows a zero count and a null type instead
 *   of disappearing.
 * - The recipient counter is the stored column, not a live count of awards.
 * - A stored icon under `avatars/` becomes a public disk URL; an external URL
 *   passes through; a missing icon stays null.
 * - The freshly created blank avatar appears immediately with the empty AND
 *   requirement set and a zero recipient counter.
 */

use App\Models\Avatar;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F51-01 - an admin views the avatars management page', function () {
    // Boundary: access, valid side (baseline).
    Avatar::factory()->create(['title' => 'First Avatar']);

    $this->actingAs(f51Admin())
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Avatars', false)
            ->has('avatars', 1));
});

test('FT-F51-02 - a student is forbidden from the avatars management page', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.avatars'))
        ->assertForbidden();
});

test('FT-F51-03 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('dashboard.avatars'))->assertRedirect(route('login'));
});

test('FT-F51-04 - the listing is ordered by title, not by creation order', function () {
    // Partition: ordering. Created in reverse alphabetical order to make the
    // ordering observable.
    Avatar::factory()->create(['title' => 'Zulu Avatar']);
    Avatar::factory()->create(['title' => 'Alpha Avatar']);
    Avatar::factory()->create(['title' => 'Mike Avatar']);

    $this->actingAs(f51Admin())
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('avatars', fn ($avatars) => collect($avatars)->pluck('title')->all() === [
                'Alpha Avatar',
                'Mike Avatar',
                'Zulu Avatar',
            ]));
});

test('FT-F51-05 - an entry carries the seven card values', function () {
    // Boundary: field exposure, valid side. Every card field is pinned so a
    // swapped or truncated mapping fails; the two conditions make the count
    // and the first-type mapping observable.
    $avatar = Avatar::factory()->create([
        'title' => 'Knight',
        'description' => 'Unlocked by earning points.',
        'icon_url' => 'https://cdn.example.com/avatar.png',
        'recipients_count' => 11,
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'challenge', 'operator' => '>=', 'value' => '3'],
                ['type' => 'points', 'operator' => '>=', 'value' => '500'],
            ],
        ],
    ]);

    $this->actingAs(f51Admin())
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('avatars.0.id', $avatar->id)
            ->where('avatars.0.title', 'Knight')
            ->where('avatars.0.description', 'Unlocked by earning points.')
            ->where('avatars.0.icon_url', 'https://cdn.example.com/avatar.png')
            ->where('avatars.0.conditions_count', 2)
            ->where('avatars.0.condition_type', 'challenge')
            ->where('avatars.0.recipients_count', 11));
});

test('FT-F51-06 - an entry withholds every non-card field', function () {
    // Boundary: field exposure, invalid side. The key-set comparison rejects
    // both a missing field and any extra field, so the full requirement tree
    // never leaks through.
    Avatar::factory()->create(['title' => 'Key Set Avatar']);

    $this->actingAs(f51Admin())
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('avatars.0', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'condition_type',
                'conditions_count',
                'description',
                'icon_url',
                'id',
                'recipients_count',
                'title',
            ]));
});

test('FT-F51-07 - the icon is delivered in three shapes', function () {
    // Partition: icon_url. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing icon stays null.
    Storage::fake('public');
    Avatar::factory()->create(['title' => 'A Stored Icon', 'icon_url' => 'avatars/stored.png']);
    Avatar::factory()->create(['title' => 'B External Icon', 'icon_url' => 'https://cdn.example.com/icon.png']);
    Avatar::factory()->create(['title' => 'C No Icon', 'icon_url' => null]);

    $this->actingAs(f51Admin())
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('avatars.0.icon_url', Storage::disk('public')->url('avatars/stored.png'))
            ->where('avatars.1.icon_url', 'https://cdn.example.com/icon.png')
            ->where('avatars.2.icon_url', null));
});

test('FT-F51-08 - the condition count spans zero and many', function () {
    // Boundary: conditions. An empty set shows a zero count and a null type;
    // a two-condition set shows two and the first condition's type.
    Avatar::factory()->create([
        'title' => 'A Empty Conditions',
        'requirements' => ['logic' => 'AND', 'conditions' => []],
    ]);
    Avatar::factory()->create([
        'title' => 'B Two Conditions',
        'requirements' => [
            'logic' => 'OR',
            'conditions' => [
                ['type' => 'path', 'operator' => '=', 'value' => 'Reading Journey'],
                ['type' => 'points', 'operator' => '>=', 'value' => '50'],
            ],
        ],
    ]);

    $this->actingAs(f51Admin())
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('avatars.0.conditions_count', 0)
            ->where('avatars.0.condition_type', null)
            ->where('avatars.1.conditions_count', 2)
            ->where('avatars.1.condition_type', 'path'));
});

test('FT-F51-09 - a freshly created avatar appears with its defaults', function () {
    // Boundary: table state. The list is empty before the add call and shows
    // the new blank avatar immediately after it.
    $admin = f51Admin();

    $this->actingAs($admin)
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->has('avatars', 0));

    $this->actingAs($admin)->post(route('dashboard.avatars.store'));

    $this->actingAs($admin)
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('avatars', 1)
            ->where('avatars.0.title', 'Untitled Avatar')
            ->where('avatars.0.description', '')
            ->where('avatars.0.conditions_count', 0)
            ->where('avatars.0.condition_type', null)
            ->where('avatars.0.recipients_count', 0));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f51Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
