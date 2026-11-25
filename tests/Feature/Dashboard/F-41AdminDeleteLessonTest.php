<?php

/**
 * F-41 - Fungsi menghapus unit pelajaran oleh admin
 *
 * Feature tests for the admin's delete-lesson flow: DELETE /dashboard/
 * lessons/{lesson} (route dashboard.lessons.destroy), behind the auth ->
 * verified -> admin gate. The endpoint completes the lesson CRUD surface the
 * outline needs - it mirrors ModuleController::destroy - and the response
 * returns the admin to the lesson's course editor.
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
 * | target       | an existing lesson                         | an unknown id                              |
 * | lesson state | with questions and answers, bare           | -                                          |
 * | cascade      | the lesson's questions and answers         | a sibling lesson's tree                    |
 * | scope        | the target lesson                          | its siblings, module, and course           |
 * | ordering     | siblings keep their order_index            | siblings resequenced by the delete         |
 * | counters     | lesson count, duration, and points drop    | counters left stale                        |
 * |              | by the lesson's stats                      |                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F41-01 | success baseline; cascade                   | delete a quiz lesson with a tree   | redirect to the editor; lesson, questions, and answers    |
 * |           |                                             |                                    | gone; module, course, and sibling survive                 |
 * | FT-F41-02 | ordering - siblings keep their index        | delete the lesson at order 0       | the remaining lesson keeps order 1                        |
 * | FT-F41-03 | counters - stats folded out                 | delete a 5-minute, 10-point lesson | course and module counts, duration, and points drop by    |
 * |           |                                             |                                    | the lesson's stats                                        |
 * | FT-F41-04 | lesson state - bare lesson                  | a lesson with no questions         | redirect to the editor; row gone                          |
 * | FT-F41-05 | access - student (invalid side)             | student DELETE                     | 403; lesson and questions survive                         |
 * | FT-F41-06 | access - guest (invalid side)               | logged-out DELETE                  | redirect to login; lesson survives                        |
 * | FT-F41-07 | target - unknown id (invalid side)          | DELETE on a non-existent lesson    | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest has no lesson-delete coverage because the endpoint did
 * not exist; it is added here and mirrors ModuleController::destroy. The
 * module delete that cascades lessons is F-37's subject, the course delete is
 * F-33's, and the outline that the redirect returns to is F-35's. The lesson
 * update whose derived stats the counters fold is F-40's subject. The gate
 * ordering is F-04's subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Delete is hard: the lesson row is gone, not flagged or hidden.
 * - The cascading foreign keys take the lesson's questions and their answers.
 *   A sibling lesson and its tree are untouched, and the module and course
 *   survive.
 * - The lesson observer folds the deleted row's stats out of the course and
 *   module counters, so the denormalized totals stay consistent.
 * - The remaining siblings keep their order_index; the delete does not
 *   resequence the module.
 * - The redirect target is the lesson's own course editor.
 * - A rejected request leaves the lesson and its tree intact; an unknown
 *   target is a 404.
 */

use App\Models\Answer;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Question;
use App\Models\User;

beforeEach(function () {
    $this->admin = f41Admin();
});

test('FT-F41-01 - an admin deletes a lesson with its whole question tree', function () {
    // Boundary: success baseline and the cascade. The lesson's tree goes with
    // it; the sibling lesson, its question, the module, and the course stay.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->quiz()->create(['order_index' => 0]);
    $question = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($question)->create();
    Answer::factory()->for($question)->correct()->create();
    $sibling = Lesson::factory()->for($module)->article()->create(['order_index' => 1]);
    $siblingQuestion = Question::factory()->for($sibling)->text()->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.lessons.destroy', $lesson))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect(Lesson::query()->find($lesson->id))->toBeNull()
        ->and(Question::query()->find($question->id))->toBeNull()
        ->and(Answer::query()->where('question_id', $question->id)->exists())->toBeFalse()
        ->and(Lesson::query()->find($sibling->id))->not->toBeNull()
        ->and(Question::query()->find($siblingQuestion->id))->not->toBeNull()
        ->and(Module::query()->find($module->id))->not->toBeNull()
        ->and(Course::query()->find($course->id))->not->toBeNull();
});

test('FT-F41-02 - the remaining siblings keep their order_index', function () {
    // Boundary: ordering. Deleting the first lesson does not resequence the
    // second one.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $first = Lesson::factory()->for($module)->create(['order_index' => 0]);
    $second = Lesson::factory()->for($module)->create(['order_index' => 1]);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.lessons.destroy', $first))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($second->fresh()->order_index)->toBe(1);
});

test('FT-F41-03 - deleting a lesson folds its stats out of the counters', function () {
    // Boundary: counters. The observer subtracts the lesson's duration and
    // points from the course and module totals.
    $course = Course::factory()->draft()->create();
    $module = Module::factory()->for($course)->create(['total_points' => 0]);
    $lesson = Lesson::factory()->for($module)->article()->create([
        'duration' => 5,
        'points' => 10,
    ]);

    $course->refresh();
    $module->refresh();

    expect($course->lessons_count)->toBe(1)
        ->and($course->total_duration)->toBe(5)
        ->and($course->total_points)->toBe(10)
        ->and($module->lessons_count)->toBe(1)
        ->and($module->total_points)->toBe(10);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.lessons.destroy', $lesson))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($course->fresh())
        ->lessons_count->toBe(0)
        ->total_duration->toBe(0)
        ->total_points->toBe(0)
        ->and($module->fresh())
        ->lessons_count->toBe(0)
        ->total_points->toBe(0);
});

test('FT-F41-04 - an admin deletes a bare lesson', function () {
    // Boundary: lesson state, valid side (no questions to cascade).
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->article()->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.lessons.destroy', $lesson))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect(Lesson::query()->find($lesson->id))->toBeNull();
});

test('FT-F41-05 - a student cannot delete a lesson', function () {
    // Boundary: access, invalid side (role). The lesson and its questions
    // survive the rejected request.
    $lesson = f41Lesson();
    $question = Question::factory()->for($lesson)->text()->create();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->delete(route('dashboard.lessons.destroy', $lesson))
        ->assertForbidden();

    expect(Lesson::query()->find($lesson->id))->not->toBeNull()
        ->and(Question::query()->find($question->id))->not->toBeNull();
});

test('FT-F41-06 - a guest cannot delete a lesson', function () {
    // Boundary: access, invalid side (authentication).
    $lesson = f41Lesson();

    $this->delete(route('dashboard.lessons.destroy', $lesson))
        ->assertRedirect(route('login'));

    expect(Lesson::query()->find($lesson->id))->not->toBeNull();
});

test('FT-F41-07 - deleting an unknown lesson is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->delete(route('dashboard.lessons.destroy', 999999))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f41Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * A quiz lesson inside its own course and module.
 */
function f41Lesson(): Lesson
{
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    return Lesson::factory()->for($module)->quiz()->create(['title' => 'Quiz Lesson']);
}
