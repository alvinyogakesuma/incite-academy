<?php

/**
 * F-36 - Fungsi mengubah konten modul oleh admin
 *
 * Feature tests for the admin's module-rename flow: PUT /dashboard/modules/
 * {module} (route dashboard.modules.rename), behind the auth -> verified ->
 * admin gate. The inline title editor in the course outline submits this
 * endpoint and the response returns the admin to the course editor.
 *
 * Method: equivalence partitioning (EP) per input domain, then robust boundary
 * value analysis (BVA) - every identified boundary carries both a valid-side
 * and an invalid-side input.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain       | Valid classes                              | Invalid classes                            |
 * |--------------|--------------------------------------------|--------------------------------------------|
 * | access       | admin                                      | student, guest                             |
 * | target       | an existing module                         | an unknown id                              |
 * | title        | 1..255 characters                          | missing, whitespace-only, 256+ characters  |
 * | side effects | lessons survive; course and order kept     | a lesson lost or the order rewritten       |
 * | scope        | the target module                          | its sibling modules                        |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F36-01 | success baseline; side effects              | rename a module with lessons       | redirect to the editor; title changed; order and lessons  |
 * |           |                                             |                                    | kept                                                      |
 * | FT-F36-02 | title - missing (invalid side)              | title omitted                      | rejected on title; old title kept                         |
 * | FT-F36-03 | title - whitespace-only (invalid side)      | "   "                              | rejected on title; old title kept                         |
 * | FT-F36-04 | title length - 255 / 256                    | 255 chars / 256 chars              | accepted / rejected on title                              |
 * | FT-F36-05 | scope - sibling modules                     | rename one of two modules          | the sibling's title is untouched                          |
 * | FT-F36-06 | access - student (invalid side)             | student PUT                        | 403; title unchanged                                      |
 * | FT-F36-07 | access - guest (invalid side)               | logged-out PUT                     | redirect to login; title unchanged                        |
 * | FT-F36-08 | target - unknown id (invalid side)          | PUT on a non-existent module       | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already proves the happy path and the missing-title
 * rejection, plus the student rejection. F-36 deliberately repeats those so
 * the feature file is self-contained; the new content is the whitespace-only
 * class, the 255/256 length boundary, the sibling scope, the guest PUT, the
 * unknown-id 404, and the side-effect check (lessons, course, and order
 * survive a rename).
 *
 * The editor page the redirect returns to is F-35's subject; the add and
 * delete flows are F-34 and F-37. The lesson rename is F-40's subject. The
 * gate ordering is F-04's subject; this route shares the same middleware
 * group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Rename is a single-field save: only the title changes. The module's
 *   course, its order_index, and its lessons survive the request.
 * - A missing title and a whitespace-only title are both rejected; the stored
 *   title stays as it was.
 * - Sibling modules are never touched, even when they share the course.
 * - A rejected request leaves the row unchanged; an unknown target is a 404.
 */

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;

beforeEach(function () {
    $this->admin = f36Admin();
});

test('FT-F36-01 - an admin renames a module and its lessons survive', function () {
    // Boundary: success baseline and the side effects.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create([
        'title' => 'Old Module Title',
        'order_index' => 3,
    ]);
    $lesson = Lesson::factory()->for($module)->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.rename', $module), ['title' => 'New Module Title'])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    $module->refresh();

    expect($module->title)->toBe('New Module Title')
        ->and($module->order_index)->toBe(3)
        ->and($module->course_id)->toBe($course->id)
        ->and(Lesson::query()->find($lesson->id))->not->toBeNull();
});

test('FT-F36-02 - a missing title is rejected', function () {
    // Boundary: title, invalid side (missing).
    $module = Module::factory()->create(['title' => 'Old Module Title']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.rename', $module), [])
        ->assertSessionHasErrors(['title']);

    expect($module->fresh()->title)->toBe('Old Module Title');
});

test('FT-F36-03 - a whitespace-only title is rejected', function () {
    // Boundary: title, invalid side (present but blank).
    $module = Module::factory()->create(['title' => 'Old Module Title']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.rename', $module), ['title' => '   '])
        ->assertSessionHasErrors(['title']);

    expect($module->fresh()->title)->toBe('Old Module Title');
});

test('FT-F36-04 - the title boundary is 255 characters', function () {
    // Boundary: title max / max+1.
    $module = Module::factory()->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.rename', $module), ['title' => str_repeat('m', 255)])
        ->assertRedirect();

    expect($module->fresh()->title)->toHaveLength(255);

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.rename', $module), ['title' => str_repeat('m', 256)])
        ->assertSessionHasErrors(['title']);

    expect($module->fresh()->title)->toHaveLength(255);
});

test('FT-F36-05 - renaming one module leaves its siblings untouched', function () {
    // Boundary: scope. The sibling shares the course but not the request.
    $course = Course::factory()->create();
    $first = Module::factory()->for($course)->create(['title' => 'First Module', 'order_index' => 0]);
    $second = Module::factory()->for($course)->create(['title' => 'Second Module', 'order_index' => 1]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.rename', $first), ['title' => 'Renamed First'])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($first->fresh()->title)->toBe('Renamed First')
        ->and($second->fresh()->title)->toBe('Second Module');
});

test('FT-F36-06 - a student cannot rename a module', function () {
    // Boundary: access, invalid side (role).
    $module = Module::factory()->create(['title' => 'Old Module Title']);
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->put(route('dashboard.modules.rename', $module), ['title' => 'Hacked Title'])
        ->assertForbidden();

    expect($module->fresh()->title)->toBe('Old Module Title');
});

test('FT-F36-07 - a guest cannot rename a module', function () {
    // Boundary: access, invalid side (authentication).
    $module = Module::factory()->create(['title' => 'Old Module Title']);

    $this->put(route('dashboard.modules.rename', $module), ['title' => 'Hacked Title'])
        ->assertRedirect(route('login'));

    expect($module->fresh()->title)->toBe('Old Module Title');
});

test('FT-F36-08 - renaming an unknown module is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.rename', 999999), ['title' => 'New Title'])
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f36Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
