<?php

/**
 * F-54 - Fungsi menambah jalur pembelajaran oleh admin
 *
 * Feature tests for the admin's add-learning-path flow: POST /dashboard/
 * learning-paths (route dashboard.learning-paths.store), behind the auth ->
 * verified -> admin gate. The Add Learning Path button on the listing submits
 * this endpoint; the server creates a blank path and opens its editor, so the
 * request carries no form fields.
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
 * | path table state   | empty, already populated                   | -                                          |
 * | invocation count   | first create, repeated create              | -                                          |
 * | resulting row      | Untitled Learning Path, empty description, | a row with null level or non-zero counters |
 * |                    | All Levels, zero counters                  |                                            |
 * | destination        | the new row's editor                       | the list, another row's editor             |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F54-01 | access - admin; empty table (valid side)    | admin POST                         | redirect to the new row's editor; one row created         |
 * | FT-F54-02 | resulting row - the blank defaults          | the created row                    | Untitled Learning Path; empty description; All Levels;    |
 * |           |                                             |                                    | zero counters                                             |
 * | FT-F54-03 | destination - the new row's editor          | follow the redirect                | editor renders with the new path, course pool, levels     |
 * | FT-F54-04 | access - student (invalid side)             | student POST                       | 403; no row created                                       |
 * | FT-F54-05 | access - guest (invalid side)               | logged-out POST                    | redirect to login; no row created                         |
 * | FT-F54-06 | invocation - repeated create (boundary)     | two POSTs with a path present      | two distinct rows; each redirect targets its own editor   |
 *
 * == Relation to the existing suites =========================================
 *
 * LearningPathsManagementTest already proves the blank-create happy path and
 * the redirect to the editor. F-54 deliberately repeats it so the feature
 * file is self-contained; the new content is the blank defaults pinned as a
 * whole (empty description, All Levels, zero counters), the editor rendering
 * the new row with the available-course pool and the levels prop, the guest
 * POST, and the repeated-create boundary.
 *
 * The listing the editor returns to is F-55's subject; the metadata and
 * sequence save is F-56's; the delete is F-57's. The course counterpart of
 * this blank-draft flow is F-30, the challenge counterpart F-42. The gate
 * ordering is F-04's subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The endpoint accepts no input: the created row is always the same blank
 *   path, safe for the editor to render before the first save.
 * - The blank seeds a level, so the editor's select starts from a valid value;
 *   the description starts empty and both aggregates start at zero.
 * - The redirect target is the new row's own editor, so two consecutive
 *   creates land on two different editor URLs.
 * - A student receives a 403 and a guest is sent to the login screen; neither
 *   leaves a row behind.
 */

use App\Models\LearningPath;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F54-01 - an admin creates a learning path and is sent to its editor', function () {
    // Boundary: access, valid side, and the empty-table baseline.
    $this->actingAs(f54Admin())
        ->post(route('dashboard.learning-paths.store'))
        ->assertRedirect(route('dashboard.learning-paths.edit', LearningPath::query()->sole()));

    expect(LearningPath::count())->toBe(1);
});

test('FT-F54-02 - the created path carries the blank defaults', function () {
    // Boundary: resulting row, valid side. The blank is seeded with a level
    // and zero aggregates; the description starts empty.
    $this->actingAs(f54Admin())->post(route('dashboard.learning-paths.store'));

    $path = LearningPath::query()->sole();

    expect($path->title)->toBe('Untitled Learning Path')
        ->and($path->description)->toBe('')
        ->and($path->level)->toBe('All Levels')
        ->and($path->image_url)->toBeNull()
        ->and($path->courses_count)->toBe(0)
        ->and($path->total_duration)->toBe(0);
});

test('FT-F54-03 - the redirect opens the editor of the new path', function () {
    // Boundary: destination, valid side. The editor is requested through the
    // redirect, so the row is reachable at the URL the create returned, with
    // the course pool and the levels available for the form.
    $this->actingAs(f54Admin())
        ->followingRedirects()
        ->post(route('dashboard.learning-paths.store'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/LearningPaths/Editor', false)
            ->where('learningPath.id', LearningPath::query()->sole()->id)
            ->where('learningPath.title', 'Untitled Learning Path')
            ->has('learningPath.courses', 0)
            ->has('availableCourses')
            ->has('levels', 4));
});

test('FT-F54-04 - a student cannot create a learning path', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->post(route('dashboard.learning-paths.store'))
        ->assertForbidden();

    expect(LearningPath::count())->toBe(0);
});

test('FT-F54-05 - a guest cannot create a learning path', function () {
    // Boundary: access, invalid side (authentication).
    $this->post(route('dashboard.learning-paths.store'))->assertRedirect(route('login'));

    expect(LearningPath::count())->toBe(0);
});

test('FT-F54-06 - repeated creates make distinct rows and redirect to each editor', function () {
    // Boundary: invocation count. A populated table is not a reason to reuse
    // or update an existing row - every call appends its own blank path.
    $existing = LearningPath::factory()->create(['title' => 'Existing Path']);
    $admin = f54Admin();

    $first = $this->actingAs($admin)->post(route('dashboard.learning-paths.store'));
    $second = $this->actingAs($admin)->post(route('dashboard.learning-paths.store'));

    $created = LearningPath::query()
        ->whereKeyNot($existing->id)
        ->orderBy('id')
        ->get();

    expect($created)->toHaveCount(2)
        ->and($created[0]->id)->not->toBe($created[1]->id)
        ->and($created->every(
            fn (LearningPath $path) => $path->title === 'Untitled Learning Path'
                && $path->level === 'All Levels'
                && $path->courses_count === 0
        ))->toBeTrue();

    $first->assertRedirect(route('dashboard.learning-paths.edit', $created[0]));
    $second->assertRedirect(route('dashboard.learning-paths.edit', $created[1]));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f54Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
