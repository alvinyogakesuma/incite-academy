<?php

/**
 * F-42 - Fungsi menambah tantangan oleh admin
 *
 * Feature tests for the admin's add-challenge flow: POST /dashboard/
 * challenges (route dashboard.challenges.store), behind the auth -> verified
 * -> admin gate. The Add Challenge button on the listing submits this
 * endpoint; the server creates a blank challenge with usable defaults and
 * opens its editor, so the request carries no form fields.
 *
 * Method: equivalence partitioning (EP) over the request's domains, then
 * boundary value analysis (BVA) of the create-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain             | Valid classes                              | Invalid classes                            |
 * |--------------------|--------------------------------------------|--------------------------------------------|
 * | access             | admin                                      | student, guest                             |
 * | challenge table    | empty, already populated                   | -                                          |
 * | invocation count   | first create, repeated create              | -                                          |
 * | resulting row      | Untitled Challenge with the four defaults  | a row with null category, difficulty,      |
 * |                    |                                            | points, or duration                        |
 * | destination        | the new row's editor                       | the list, another row's editor             |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F42-01 | access - admin; empty table (valid side)    | admin POST                         | redirect to the new row's editor; one row created         |
 * | FT-F42-02 | resulting row - the default quartet         | the created row                    | Untitled Challenge; Reading; Easy; points 0; duration 0   |
 * | FT-F42-03 | destination - the new row's editor          | follow the redirect                | editor renders with the new challenge and both props      |
 * | FT-F42-04 | access - student (invalid side)             | student POST                       | 403; no row created                                       |
 * | FT-F42-05 | access - guest (invalid side)               | logged-out POST                    | redirect to login; no row created                         |
 * | FT-F42-06 | invocation - repeated create (boundary)     | two POSTs with a challenge present | two distinct rows; each redirect targets its own editor   |
 *
 * == Relation to the existing suites =========================================
 *
 * ChallengesManagementTest already proves the blank-create happy path and
 * the redirect to the editor. F-42 deliberately repeats it so the feature
 * file is self-contained; the new content is the default quartet pinned as a
 * whole (category, difficulty, points, duration - not nulls), the editor
 * actually rendering the new row with both enum props, the guest POST, and
 * the repeated-create boundary.
 *
 * The listing the editor returns to is F-43's subject; the metadata save and
 * the question tree are F-44's; the delete is F-45's. The course counterpart
 * of this blank-draft flow is F-30 (that row leaves metadata null; the
 * challenge seeds the four defaults). The gate ordering is F-04's subject;
 * this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The endpoint accepts no input: the created row is always the same blank
 *   challenge, safe for the editor to render before the first save.
 * - Unlike the course draft, the challenge seeds category, difficulty,
 *   points, and duration, so the editor's number and enum inputs start from
 *   valid values.
 * - The redirect target is the new row's own editor, so two consecutive
 *   creates land on two different editor URLs.
 * - A student receives a 403 and a guest is sent to the login screen; neither
 *   leaves a row behind.
 */

use App\Enums\Category;
use App\Enums\Difficulty;
use App\Models\Challenge;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F42-01 - an admin creates a challenge and is sent to its editor', function () {
    // Boundary: access, valid side, and the empty-table baseline.
    $this->actingAs(f42Admin())
        ->post(route('dashboard.challenges.store'))
        ->assertRedirect(route('dashboard.challenges.edit', Challenge::query()->sole()));

    expect(Challenge::count())->toBe(1);
});

test('FT-F42-02 - the created challenge carries the default quartet', function () {
    // Boundary: resulting row, valid side. The defaults are seeded values,
    // not nulls, so the editor's inputs start valid.
    $this->actingAs(f42Admin())->post(route('dashboard.challenges.store'));

    $challenge = Challenge::query()->sole();

    expect($challenge->title)->toBe('Untitled Challenge')
        ->and($challenge->description)->toBeNull()
        ->and($challenge->category?->value)->toBe(Category::ReadingComprehension->value)
        ->and($challenge->difficulty?->value)->toBe(Difficulty::Easy->value)
        ->and($challenge->points)->toBe(0)
        ->and($challenge->duration)->toBe(0)
        ->and($challenge->image_url)->toBeNull();
});

test('FT-F42-03 - the redirect opens the editor of the new challenge', function () {
    // Boundary: destination, valid side. The editor is requested through the
    // redirect, so the row is reachable at the URL the create returned, with
    // both enum props available for the form.
    $this->actingAs(f42Admin())
        ->followingRedirects()
        ->post(route('dashboard.challenges.store'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Challenges/Editor', false)
            ->where('challenge.id', Challenge::query()->sole()->id)
            ->where('challenge.title', 'Untitled Challenge')
            ->has('challenge.questions', 0)
            ->has('categories', 3)
            ->has('difficulties', 3));
});

test('FT-F42-04 - a student cannot create a challenge', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->post(route('dashboard.challenges.store'))
        ->assertForbidden();

    expect(Challenge::count())->toBe(0);
});

test('FT-F42-05 - a guest cannot create a challenge', function () {
    // Boundary: access, invalid side (authentication).
    $this->post(route('dashboard.challenges.store'))->assertRedirect(route('login'));

    expect(Challenge::count())->toBe(0);
});

test('FT-F42-06 - repeated creates make distinct rows and redirect to each editor', function () {
    // Boundary: invocation count. A populated table is not a reason to reuse
    // or update an existing row - every call appends its own blank challenge.
    $existing = Challenge::factory()->create(['title' => 'Existing Challenge']);
    $admin = f42Admin();

    $first = $this->actingAs($admin)->post(route('dashboard.challenges.store'));
    $second = $this->actingAs($admin)->post(route('dashboard.challenges.store'));

    $created = Challenge::query()
        ->whereKeyNot($existing->id)
        ->orderBy('id')
        ->get();

    expect($created)->toHaveCount(2)
        ->and($created[0]->id)->not->toBe($created[1]->id)
        ->and($created->every(
            fn (Challenge $challenge) => $challenge->title === 'Untitled Challenge'
                && $challenge->points === 0
                && $challenge->duration === 0
        ))->toBeTrue();

    $first->assertRedirect(route('dashboard.challenges.edit', $created[0]));
    $second->assertRedirect(route('dashboard.challenges.edit', $created[1]));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f42Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
