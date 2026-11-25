<?php

/**
 * F-38 - Fungsi menambah unit pelajaran oleh admin
 *
 * Feature tests for the admin's add-lesson flow: POST /dashboard/modules/
 * {module}/lessons (route dashboard.modules.lessons.store), behind the auth ->
 * verified -> admin gate. The Add Item button in the module header submits
 * this endpoint; the server creates a blank article lesson appended to the
 * module and reopens the course editor, so the request carries no form fields.
 *
 * Method: equivalence partitioning (EP) over the request's domains, then
 * boundary value analysis (BVA) of the create-only boundaries - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain              | Valid classes                              | Invalid classes                            |
 * |---------------------|--------------------------------------------|--------------------------------------------|
 * | access              | admin                                      | student, guest                             |
 * | module              | an existing module                         | an unknown id                              |
 * | lesson table state  | empty, populated, populated with a gap     | -                                          |
 * | scope               | the target module's lessons                | another module's lessons                   |
 * | invocation count    | first create, repeated create              | -                                          |
 * | resulting row       | Untitled Lesson, type article, appended    | a lesson attached to another module or     |
 * |                     | after the maximum                          | inserted at the count instead of the max   |
 * | course linkage      | course_id derived from the module          | a null or foreign course_id                |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F38-01 | access - admin; empty module (valid side)   | admin POST on a module             | redirect to the editor; Untitled Lesson at order 0        |
 * | FT-F38-02 | order_index - after the maximum             | existing orders 0 and 5            | new lesson at order 6, not at the count (2)               |
 * | FT-F38-03 | scope - per module                          | add to an empty module             | new lesson at order 0; the other module is untouched      |
 * | FT-F38-04 | invocation - repeated create (boundary)     | three POSTs on one module          | lessons appended at orders 0, 1, 2                        |
 * | FT-F38-05 | access - student (invalid side)             | student POST                       | 403; no lesson created                                    |
 * | FT-F38-06 | access - guest (invalid side)               | logged-out POST                    | redirect to login; no lesson created                      |
 * | FT-F38-07 | module - unknown id (invalid side)          | POST on a non-existent module      | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already proves the happy path (blank lesson appended)
 * and the sequencing after existing lessons, plus the student rejection. F-38
 * deliberately repeats those so the feature file is self-contained; the new
 * content is the gap boundary (max+1 rather than count), the per-module scope,
 * the repeated-create boundary, the course_id linkage, the guest POST, and the
 * unknown-module 404.
 *
 * The course editor that displays the resulting outline is F-35's subject; the
 * lesson content and question tree are F-39 and F-40. The gate ordering is
 * F-04's subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The endpoint accepts no input: the created lesson is always titled
 *   "Untitled Lesson" with type "article" and is appended to the module.
 * - The appended index is the current maximum order_index plus one, not the
 *   lesson count, so a gap left by a previous delete is preserved.
 * - Sequencing is per module: another module's lessons never affect the new
 *   index.
 * - The lesson carries both the module id and the module's course id, so the
 *   course outline can list it without an extra join.
 * - Repeated calls append 0, 1, 2; each response returns to the course editor.
 * - A rejected request (student, guest, unknown module) creates no row.
 */

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;

beforeEach(function () {
    $this->admin = f38Admin();
});

test('FT-F38-01 - an admin adds a blank article lesson to an empty module', function () {
    // Boundary: access, valid side, and the empty-module baseline. The lesson
    // carries the module's course id.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    $this->actingAs($this->admin)
        ->post(route('dashboard.modules.lessons.store', $module))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    $lesson = Lesson::query()->sole();

    expect($lesson->course_id)->toBe($course->id)
        ->and($lesson->module_id)->toBe($module->id)
        ->and($lesson->title)->toBe('Untitled Lesson')
        ->and($lesson->type)->toBe('article')
        ->and($lesson->order_index)->toBe(0);
});

test('FT-F38-02 - a lesson is appended after the maximum order, not the count', function () {
    // Boundary: order_index. Existing orders 0 and 5 leave a gap; the new
    // lesson lands at 6, which distinguishes max+1 from count.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->create(['order_index' => 0]);
    Lesson::factory()->for($module)->create(['order_index' => 5]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.modules.lessons.store', $module))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect(Lesson::query()->where('module_id', $module->id)->max('order_index'))->toBe(6);
});

test('FT-F38-03 - the sequence is scoped to the target module', function () {
    // Boundary: scope. Adding to an empty module starts at 0 and leaves the
    // other module's lessons untouched.
    $course = Course::factory()->create();
    $populated = Module::factory()->for($course)->create(['order_index' => 0]);
    Lesson::factory()->for($populated)->create(['order_index' => 0]);
    Lesson::factory()->for($populated)->create(['order_index' => 1]);
    $empty = Module::factory()->for($course)->create(['order_index' => 1]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.modules.lessons.store', $empty))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    $newLesson = Lesson::query()->where('module_id', $empty->id)->sole();

    expect($newLesson->order_index)->toBe(0)
        ->and(Lesson::query()->where('module_id', $populated->id)->orderBy('order_index')->pluck('order_index')->all())
        ->toBe([0, 1]);
});

test('FT-F38-04 - repeated adds append 0, 1, 2', function () {
    // Boundary: invocation count. Every call appends its own lesson.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    foreach (range(1, 3) as $ignored) {
        $this->actingAs($this->admin)
            ->post(route('dashboard.modules.lessons.store', $module))
            ->assertRedirect(route('dashboard.courses.edit', $course));
    }

    expect(Lesson::query()->where('module_id', $module->id)->orderBy('order_index')->pluck('order_index')->all())
        ->toBe([0, 1, 2]);
});

test('FT-F38-05 - a student cannot add a lesson', function () {
    // Boundary: access, invalid side (role).
    $module = Module::factory()->create();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->post(route('dashboard.modules.lessons.store', $module))
        ->assertForbidden();

    expect(Lesson::count())->toBe(0);
});

test('FT-F38-06 - a guest cannot add a lesson', function () {
    // Boundary: access, invalid side (authentication).
    $module = Module::factory()->create();

    $this->post(route('dashboard.modules.lessons.store', $module))
        ->assertRedirect(route('login'));

    expect(Lesson::count())->toBe(0);
});

test('FT-F38-07 - adding a lesson to an unknown module is not found', function () {
    // Boundary: module, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->post(route('dashboard.modules.lessons.store', 999999))
        ->assertNotFound();

    expect(Lesson::count())->toBe(0);
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f38Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
