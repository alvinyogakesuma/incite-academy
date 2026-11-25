<?php

/**
 * F-46 - Fungsi menambah lencana baru oleh admin
 *
 * Feature tests for the admin's add-badge flow: POST /dashboard/badges
 * (route dashboard.badges.store), behind the auth -> verified -> admin gate.
 * The Add Badge button on the listing submits this endpoint; the server
 * creates a blank badge with an empty AND requirement set and opens its
 * editor, so the request carries no form fields.
 *
 * Method: equivalence partitioning (EP) over the request's domains, then
 * boundary value analysis (BVA) of the create-only boundaries - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain             | Valid classes                              | Invalid classes                            |
 * |--------------------|--------------------------------------------|--------------------------------------------|
 * | access             | admin                                      | student, guest                             |
 * | badge table state  | empty, already populated                   | -                                          |
 * | invocation count   | first create, repeated create              | -                                          |
 * | resulting row      | Untitled Badge, empty description, AND     | a row with null requirements or a          |
 * |                    | logic with no conditions, zero recipients  | non-zero recipient counter                 |
 * | destination        | the new row's editor                       | the list, another row's editor             |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F46-01 | access - admin; empty table (valid side)    | admin POST                         | redirect to the new row's editor; one row created         |
 * | FT-F46-02 | resulting row - the blank defaults          | the created row                    | Untitled Badge; empty description; AND logic; no          |
 * |           |                                             |                                    | conditions; zero recipients                               |
 * | FT-F46-03 | destination - the new row's editor          | follow the redirect                | editor renders with the badge and the three pools         |
 * | FT-F46-04 | access - student (invalid side)             | student POST                       | 403; no row created                                       |
 * | FT-F46-05 | access - guest (invalid side)               | logged-out POST                    | redirect to login; no row created                         |
 * | FT-F46-06 | invocation - repeated create (boundary)     | two POSTs with a badge present     | two distinct rows; each redirect targets its own editor   |
 *
 * == Relation to the existing suites =========================================
 *
 * BadgesManagementTest already proves the blank-create happy path and the
 * redirect to the editor. F-46 deliberately repeats it so the feature file is
 * self-contained; the new content is the blank defaults pinned as a whole
 * (empty description, AND logic, no conditions, zero recipients), the editor
 * rendering the new row with the course/path/challenge pools, the guest POST,
 * and the repeated-create boundary.
 *
 * The listing the editor returns to is F-47's subject; the criteria save is
 * F-48's; the delete is F-49's. The avatar counterpart is F-50, and the
 * course/challenge/path blank-draft flows are F-30, F-42, and F-54. The gate
 * ordering is F-04's subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The endpoint accepts no input: the created row is always the same blank
 *   badge, safe for the editor to render before the first criteria save.
 * - The empty requirement set is a JSON object with AND logic and an empty
 *   conditions array, and the recipient counter starts at zero.
 * - The redirect target is the new row's own editor, so two consecutive
 *   creates land on two different editor URLs.
 * - A student receives a 403 and a guest is sent to the login screen; neither
 *   leaves a row behind.
 */

use App\Models\Badge;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F46-01 - an admin creates a badge and is sent to its editor', function () {
    // Boundary: access, valid side, and the empty-table baseline.
    $this->actingAs(f46Admin())
        ->post(route('dashboard.badges.store'))
        ->assertRedirect(route('dashboard.badges.edit', Badge::query()->sole()));

    expect(Badge::count())->toBe(1);
});

test('FT-F46-02 - the created badge carries the blank defaults', function () {
    // Boundary: resulting row, valid side. The requirement set starts empty
    // with AND logic; the recipient counter starts at zero.
    $this->actingAs(f46Admin())->post(route('dashboard.badges.store'));

    $badge = Badge::query()->sole();

    expect($badge->title)->toBe('Untitled Badge')
        ->and($badge->description)->toBe('')
        ->and($badge->icon_url)->toBeNull()
        ->and($badge->requirements)->toBe([
            'logic' => 'AND',
            'conditions' => [],
        ])
        ->and($badge->recipients_count)->toBe(0);
});

test('FT-F46-03 - the redirect opens the editor of the new badge', function () {
    // Boundary: destination, valid side. The editor is requested through the
    // redirect and carries the three option pools for the criteria form.
    $this->actingAs(f46Admin())
        ->followingRedirects()
        ->post(route('dashboard.badges.store'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Badges/Editor', false)
            ->where('badge.id', Badge::query()->sole()->id)
            ->where('badge.title', 'Untitled Badge')
            ->where('badge.logic', 'AND')
            ->has('badge.conditions', 0)
            ->has('availableCourses')
            ->has('availablePaths')
            ->has('availableChallenges'));
});

test('FT-F46-04 - a student cannot create a badge', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->post(route('dashboard.badges.store'))
        ->assertForbidden();

    expect(Badge::count())->toBe(0);
});

test('FT-F46-05 - a guest cannot create a badge', function () {
    // Boundary: access, invalid side (authentication).
    $this->post(route('dashboard.badges.store'))->assertRedirect(route('login'));

    expect(Badge::count())->toBe(0);
});

test('FT-F46-06 - repeated creates make distinct rows and redirect to each editor', function () {
    // Boundary: invocation count. A populated table is not a reason to reuse
    // or update an existing row - every call appends its own blank badge.
    $existing = Badge::factory()->create(['title' => 'Existing Badge']);
    $admin = f46Admin();

    $first = $this->actingAs($admin)->post(route('dashboard.badges.store'));
    $second = $this->actingAs($admin)->post(route('dashboard.badges.store'));

    $created = Badge::query()
        ->whereKeyNot($existing->id)
        ->orderBy('id')
        ->get();

    expect($created)->toHaveCount(2)
        ->and($created[0]->id)->not->toBe($created[1]->id)
        ->and($created->every(
            fn (Badge $badge) => $badge->title === 'Untitled Badge'
                && $badge->recipients_count === 0
                && $badge->requirements['conditions'] === []
        ))->toBeTrue();

    $first->assertRedirect(route('dashboard.badges.edit', $created[0]));
    $second->assertRedirect(route('dashboard.badges.edit', $created[1]));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f46Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
