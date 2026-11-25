<?php

/**
 * F-37 - Fungsi menghapus modul oleh admin
 *
 * Feature tests for the admin's delete-module flow: DELETE /dashboard/modules/
 * {module} (route dashboard.modules.destroy), behind the auth -> verified ->
 * admin gate. The delete action in the course outline submits this endpoint
 * and the response returns the admin to the module's course editor.
 *
 * Method: equivalence partitioning (EP) over the delete request's domains,
 * then boundary value analysis (BVA) of the delete-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain       | Valid classes                              | Invalid classes                            |
 * |--------------|--------------------------------------------|--------------------------------------------|
 * | access       | admin                                      | student, guest                             |
 * | target       | an existing module                         | an unknown id                              |
 * | module state | with lessons, questions, and answers       | -                                          |
 * |              | empty                                      |                                            |
 * | cascade      | the module's lessons, questions, answers   | a sibling module's content                 |
 * | scope        | the target module                          | its siblings and the parent course         |
 * | ordering     | siblings keep their order_index            | siblings resequenced by the delete         |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F37-01 | success baseline; cascade                   | delete a module with a quiz lesson | redirect to the editor; module, lesson, questions, and    |
 * |           |                                             |                                    | answers gone; sibling and course survive                  |
 * | FT-F37-02 | ordering - siblings keep their index        | delete the module at order 0       | the remaining module keeps order 1                        |
 * | FT-F37-03 | module state - empty module                 | a module with no lessons           | redirect to the editor; row gone                          |
 * | FT-F37-04 | access - student (invalid side)             | student DELETE                     | 403; module and lessons survive                           |
 * | FT-F37-05 | access - guest (invalid side)               | logged-out DELETE                  | redirect to login; module survives                        |
 * | FT-F37-06 | target - unknown id (invalid side)          | DELETE on a non-existent module    | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already proves the happy path (redirect, row gone) and
 * the lesson cascade, plus the student rejection. F-37 deliberately repeats
 * those so the feature file is self-contained; the new content is the
 * question/answer cascade, the sibling scope (a sibling's lesson survives),
 * the order preservation, the empty-module target, the guest DELETE, and the
 * unknown-id 404.
 *
 * The editor page the redirect returns to is F-35's subject; the add and
 * rename flows are F-34 and F-36. The course delete that cascades through
 * modules is F-33's subject. The gate ordering is F-04's subject; this route
 * shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Delete is hard: the module row is gone, not flagged or hidden.
 * - The cascading foreign keys take the module's lessons and their questions
 *   and answers. A sibling module and its lessons are untouched, and the
 *   parent course survives.
 * - The remaining siblings keep their order_index; the delete does not
 *   resequence the outline.
 * - The redirect target is the module's own course editor.
 * - A rejected request leaves the module and its children intact.
 */

use App\Models\Answer;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Question;
use App\Models\User;

beforeEach(function () {
    $this->admin = f37Admin();
});

test('FT-F37-01 - an admin deletes a module with its whole content', function () {
    // Boundary: success baseline and the cascade. The module's tree goes with
    // it; the sibling module, its lesson, and the course survive.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create(['order_index' => 0]);
    $lesson = Lesson::factory()->for($module)->quiz()->create();
    $question = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($question)->create();
    Answer::factory()->for($question)->correct()->create();
    $sibling = Module::factory()->for($course)->create(['order_index' => 1]);
    $siblingLesson = Lesson::factory()->for($sibling)->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.modules.destroy', $module))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect(Module::query()->find($module->id))->toBeNull()
        ->and(Lesson::query()->find($lesson->id))->toBeNull()
        ->and(Question::query()->find($question->id))->toBeNull()
        ->and(Answer::query()->where('question_id', $question->id)->exists())->toBeFalse()
        ->and(Module::query()->find($sibling->id))->not->toBeNull()
        ->and(Lesson::query()->find($siblingLesson->id))->not->toBeNull()
        ->and(Course::query()->find($course->id))->not->toBeNull();
});

test('FT-F37-02 - the remaining siblings keep their order_index', function () {
    // Boundary: ordering. Deleting the first module does not resequence the
    // second one.
    $course = Course::factory()->create();
    $first = Module::factory()->for($course)->create(['order_index' => 0]);
    $second = Module::factory()->for($course)->create(['order_index' => 1]);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.modules.destroy', $first))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($second->fresh()->order_index)->toBe(1);
});

test('FT-F37-03 - an admin deletes an empty module', function () {
    // Boundary: module state, valid side (no lessons to cascade).
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.modules.destroy', $module))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect(Module::query()->find($module->id))->toBeNull();
});

test('FT-F37-04 - a student cannot delete a module', function () {
    // Boundary: access, invalid side (role). The module and its lessons
    // survive the rejected request.
    $module = Module::factory()->create();
    $lesson = Lesson::factory()->for($module)->create();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->delete(route('dashboard.modules.destroy', $module))
        ->assertForbidden();

    expect(Module::query()->find($module->id))->not->toBeNull()
        ->and(Lesson::query()->find($lesson->id))->not->toBeNull();
});

test('FT-F37-05 - a guest cannot delete a module', function () {
    // Boundary: access, invalid side (authentication).
    $module = Module::factory()->create();

    $this->delete(route('dashboard.modules.destroy', $module))
        ->assertRedirect(route('login'));

    expect(Module::query()->find($module->id))->not->toBeNull();
});

test('FT-F37-06 - deleting an unknown module is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->delete(route('dashboard.modules.destroy', 999999))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f37Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
