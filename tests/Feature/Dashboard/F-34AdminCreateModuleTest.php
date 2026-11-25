<?php

/**
 * F-34 - Fungsi menambah modul pembelajaran oleh admin
 *
 * Feature tests for the admin's add-module flow: POST /dashboard/courses/
 * {course}/modules (route dashboard.courses.modules.store), behind the auth ->
 * verified -> admin gate. The Add Module button in the course editor submits
 * this endpoint; the server creates a blank module appended to the course's
 * outline and reopens the editor, so the request carries no form fields.
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
 * | course             | an existing course                         | an unknown id                              |
 * | module table state | empty, populated, populated with a gap     | -                                          |
 * | scope              | the target course's modules                | another course's modules                   |
 * | invocation count   | first create, repeated create              | -                                          |
 * | resulting row      | Untitled Module appended after the maximum | a row inserted at the count instead of     |
 * |                    |                                            | the maximum, or attached to another course |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F34-01 | access - admin; empty outline (valid)       | admin POST on a course            | redirect to the editor; Untitled Module at order 0        |
 * | FT-F34-02 | order_index - after the maximum             | existing orders 0 and 5            | new module at order 6, not at the count (2)               |
 * | FT-F34-03 | scope - per course                          | add to an empty course             | new module at order 0; the other course is untouched      |
 * | FT-F34-04 | invocation - repeated create (boundary)     | three POSTs on one course          | modules appended at orders 0, 1, 2                        |
 * | FT-F34-05 | access - student (invalid side)             | student POST                       | 403; no module created                                    |
 * | FT-F34-06 | access - guest (invalid side)               | logged-out POST                    | redirect to login; no module created                      |
 * | FT-F34-07 | course - unknown id (invalid side)          | POST on a non-existent course      | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already proves the happy path (blank module appended)
 * and the sequencing after existing modules, plus the student rejection. F-34
 * deliberately repeats those so the feature file is self-contained; the new
 * content is the gap boundary (max+1 rather than count), the per-course scope,
 * the repeated-create boundary, the guest POST, and the unknown-course 404.
 *
 * The editor page that displays the resulting outline is F-35's subject; the
 * rename and delete flows are F-36 and F-37. The gate ordering is F-04's
 * subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The endpoint accepts no input: the created module is always titled
 *   "Untitled Module" and is appended to the outline.
 * - The appended index is the current maximum order_index plus one, not the
 *   module count, so a gap left by a previous delete is preserved rather than
 *   filled.
 * - Sequencing is per course: another course's modules never affect the new
 *   index.
 * - Repeated calls append 0, 1, 2; each response returns to the same course
 *   editor.
 * - A rejected request (student, guest, unknown course) creates no row.
 */

use App\Models\Course;
use App\Models\Module;
use App\Models\User;

beforeEach(function () {
    $this->admin = f34Admin();
});

test('FT-F34-01 - an admin adds a blank module to an empty outline', function () {
    // Boundary: access, valid side, and the empty-outline baseline.
    $course = Course::factory()->create(['title' => 'Target Course']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.modules.store', $course))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    $module = Module::query()->sole();

    expect($module->course_id)->toBe($course->id)
        ->and($module->title)->toBe('Untitled Module')
        ->and($module->order_index)->toBe(0);
});

test('FT-F34-02 - a module is appended after the maximum order, not the count', function () {
    // Boundary: order_index. Existing orders 0 and 5 leave a gap; the new
    // module lands at 6, which distinguishes max+1 from count.
    $course = Course::factory()->create();
    Module::factory()->for($course)->create(['order_index' => 0]);
    Module::factory()->for($course)->create(['order_index' => 5]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.modules.store', $course))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect(Module::query()->where('course_id', $course->id)->max('order_index'))->toBe(6);
});

test('FT-F34-03 - the sequence is scoped to the target course', function () {
    // Boundary: scope. Adding to an empty course starts at 0 and leaves the
    // other course's outline untouched.
    $populated = Course::factory()->create(['title' => 'Populated Course']);
    Module::factory()->for($populated)->create(['order_index' => 0]);
    Module::factory()->for($populated)->create(['order_index' => 1]);
    $empty = Course::factory()->create(['title' => 'Empty Course']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.modules.store', $empty))
        ->assertRedirect(route('dashboard.courses.edit', $empty));

    $newModule = Module::query()->where('course_id', $empty->id)->sole();

    expect($newModule->order_index)->toBe(0)
        ->and(Module::query()->where('course_id', $populated->id)->orderBy('order_index')->pluck('order_index')->all())
        ->toBe([0, 1]);
});

test('FT-F34-04 - repeated adds append 0, 1, 2', function () {
    // Boundary: invocation count. Every call appends its own module.
    $course = Course::factory()->create();

    foreach (range(1, 3) as $ignored) {
        $this->actingAs($this->admin)
            ->post(route('dashboard.courses.modules.store', $course))
            ->assertRedirect(route('dashboard.courses.edit', $course));
    }

    expect(Module::query()->where('course_id', $course->id)->orderBy('order_index')->pluck('order_index')->all())
        ->toBe([0, 1, 2]);
});

test('FT-F34-05 - a student cannot add a module', function () {
    // Boundary: access, invalid side (role).
    $course = Course::factory()->create();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->post(route('dashboard.courses.modules.store', $course))
        ->assertForbidden();

    expect(Module::count())->toBe(0);
});

test('FT-F34-06 - a guest cannot add a module', function () {
    // Boundary: access, invalid side (authentication).
    $course = Course::factory()->create();

    $this->post(route('dashboard.courses.modules.store', $course))
        ->assertRedirect(route('login'));

    expect(Module::count())->toBe(0);
});

test('FT-F34-07 - adding a module to an unknown course is not found', function () {
    // Boundary: course, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.modules.store', 999999))
        ->assertNotFound();

    expect(Module::count())->toBe(0);
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f34Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
