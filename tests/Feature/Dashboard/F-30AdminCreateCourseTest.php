<?php

/**
 * F-30 - Fungsi menambah kursus oleh admin
 *
 * Feature tests for the admin's add-course flow: POST /dashboard/courses
 * (route dashboard.courses.store), behind the auth -> verified -> admin gate.
 * The Add Course button on the courses page submits this endpoint; the server
 * creates a blank draft row and opens its editor, so the request carries no
 * form fields - the analysis sits on caller state, table state, and the row
 * the call leaves behind.
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
 * | course table state | empty, already populated                   | -                                          |
 * | invocation count   | first create, repeated create              | -                                          |
 * | resulting row      | blank draft with zeroed counters           | a row with metadata or non-draft status    |
 * | destination        | the new row's editor                       | the list, another row's editor             |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F30-01 | access - admin; empty table (valid side)    | admin POST                         | redirect to the new row's editor; one row created         |
 * | FT-F30-02 | resulting row - blank draft defaults        | the created row                    | draft status; null metadata; zero counters                |
 * | FT-F30-03 | destination - the new row's editor          | follow the redirect                | editor renders with the new course id                     |
 * | FT-F30-04 | access - student (invalid side)             | student POST                       | 403; no row created                                       |
 * | FT-F30-05 | access - guest (invalid side)               | logged-out POST                    | redirect to login; no row created                         |
 * | FT-F30-06 | invocation - repeated create (boundary)     | two POSTs with a course present    | two distinct draft rows; each redirect targets its own    |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already proves the happy path (redirect to the new
 * course's editor and the blank draft's stored defaults) and the student
 * rejection. F-30 deliberately repeats those so the feature file is
 * self-contained; the new content is the editor destination actually
 * rendering, the guest POST, and the repeated-create boundary (each call
 * makes a distinct row and redirects to its own editor).
 *
 * The courses list that will show these drafts is F-31's subject; the editor
 * page's full outline is F-35's subject. The gate ordering is F-04's subject;
 * this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The endpoint accepts no input: the created row always starts blank, with
 *   draft status, null title/category/descriptions/image, and zero counters.
 *   The slug stays null because there is no title to derive it from.
 * - The redirect target is the new row's own editor, so two consecutive
 *   creates land on two different editor URLs.
 * - A student receives a 403 from the course policy and a guest is sent to
 *   the login screen; neither leaves a row behind.
 */

use App\Models\Course;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F30-01 - an admin creates a course and is sent to its editor', function () {
    // Boundary: access, valid side, and the empty-table baseline.
    $this->actingAs(f30Admin())
        ->post(route('dashboard.courses.store'))
        ->assertRedirect(route('dashboard.courses.edit', Course::query()->sole()));

    expect(Course::count())->toBe(1);
});

test('FT-F30-02 - the created course is a blank draft with zeroed counters', function () {
    // Boundary: resulting row, valid side (the draft defaults).
    $this->actingAs(f30Admin())->post(route('dashboard.courses.store'));

    $course = Course::query()->sole();

    expect($course->title)->toBeNull()
        ->and($course->slug)->toBeNull()
        ->and($course->category)->toBeNull()
        ->and($course->short_description)->toBeNull()
        ->and($course->long_description)->toBeNull()
        ->and($course->image_url)->toBeNull()
        ->and($course->status)->toBe('draft')
        ->and($course->total_duration)->toBe(0)
        ->and($course->modules_count)->toBe(0)
        ->and($course->lessons_count)->toBe(0)
        ->and($course->total_points)->toBe(0);
});

test('FT-F30-03 - the redirect opens the editor of the new course', function () {
    // Boundary: destination, valid side. The editor is requested through the
    // redirect, so the row is reachable at the URL the create returned.
    $this->actingAs(f30Admin())
        ->followingRedirects()
        ->post(route('dashboard.courses.store'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Courses/Editor', false)
            ->where('course.id', Course::query()->sole()->id)
            ->has('course.modules')
            ->has('categories'));
});

test('FT-F30-04 - a student cannot create a course', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->post(route('dashboard.courses.store'))
        ->assertForbidden();

    expect(Course::count())->toBe(0);
});

test('FT-F30-05 - a guest cannot create a course', function () {
    // Boundary: access, invalid side (authentication).
    $this->post(route('dashboard.courses.store'))->assertRedirect(route('login'));

    expect(Course::count())->toBe(0);
});

test('FT-F30-06 - repeated creates make distinct rows and redirect to each editor', function () {
    // Boundary: invocation count. A populated table is not a reason to reuse
    // or update an existing row - every call appends its own blank draft.
    $existing = Course::factory()->create(['title' => 'Existing Course']);
    $admin = f30Admin();

    $first = $this->actingAs($admin)->post(route('dashboard.courses.store'));
    $second = $this->actingAs($admin)->post(route('dashboard.courses.store'));

    $created = Course::query()
        ->whereKeyNot($existing->id)
        ->orderBy('id')
        ->get();

    expect($created)->toHaveCount(2)
        ->and($created[0]->id)->not->toBe($created[1]->id)
        ->and($created->every(
            fn (Course $course) => $course->status === 'draft' && $course->title === null
        ))->toBeTrue();

    $first->assertRedirect(route('dashboard.courses.edit', $created[0]));
    $second->assertRedirect(route('dashboard.courses.edit', $created[1]));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f30Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
