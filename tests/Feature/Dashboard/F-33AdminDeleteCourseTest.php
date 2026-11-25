<?php

/**
 * F-33 - Fungsi menghapus kursus oleh admin
 *
 * Feature tests for the admin's delete-course flow: DELETE /dashboard/courses/
 * {course} (route dashboard.courses.destroy), behind the auth -> verified ->
 * admin gate. The delete action on the courses page submits this endpoint and
 * the response returns the admin to the list.
 *
 * Method: equivalence partitioning (EP) over the delete request's domains,
 * then boundary value analysis (BVA) of the delete-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | admin                                          | student, guest                               |
 * | target            | an existing course                             | an unknown id                                |
 * | outline           | a course with modules, lessons, and content    | -                                            |
 * | course state      | a populated course, a blank draft              | -                                            |
 * | persistence       | the row is hard-deleted                        | the row survives a rejected request          |
 * | cascade           | modules, lessons, questions, answers,          | an orphaned child row                        |
 * |                   | enrollments, completions                       |                                              |
 * | cover             | stored courses/ path, external URL, null       | a stored file surviving its course           |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F33-01 | success baseline; cascade                   | delete a course with a full outline| redirect to list; course and every child row gone         |
 * | FT-F33-02 | cover - stored path                         | courses/cover.png                  | the stored file is deleted from the disk                  |
 * | FT-F33-03 | course state - blank draft                  | a course with no modules           | redirect to list; row gone                                |
 * | FT-F33-04 | access - student (invalid side)             | student DELETE                     | 403; row and stored cover survive                         |
 * | FT-F33-05 | access - guest (invalid side)               | logged-out DELETE                  | redirect to login; row survives                           |
 * | FT-F33-06 | target - unknown id (invalid side)          | DELETE on a non-existent course    | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already proves the happy path (redirect and row gone),
 * the stored-cover deletion, and the student rejection. F-33 deliberately
 * repeats those so the feature file is self-contained; the new content is the
 * full cascade (questions, answers, enrollments, completions), the blank-draft
 * target, the guest DELETE, and the unknown-id 404.
 *
 * The listing the redirect returns to is F-31's subject; a deleted course is
 * simply absent from its `courses` prop. The gate ordering is F-04's subject;
 * this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Delete is hard: the row is gone, not flagged or hidden.
 * - The cascading foreign keys take the whole outline with the course -
 *   modules, lessons, questions, answers - plus the enrollments, lesson
 *   completions, and lesson attempts that reference it.
 * - A stored cover under the courses/ prefix is deleted from the public disk.
 *   External URLs and null covers are left alone.
 * - A rejected request leaves both the row and its stored cover untouched.
 * - An unknown target id is a 404, not a validation error.
 */

use App\Models\Answer;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\Question;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f33Admin();
});

test('FT-F33-01 - an admin deletes a course with its whole outline', function () {
    // Boundary: success baseline and the cascade. Every row that references
    // the course disappears with it.
    $course = Course::factory()->create(['title' => 'Cascade Course']);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->quiz()->create();
    $question = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($question)->create();
    Answer::factory()->for($question)->correct()->create();
    $student = User::factory()->create(['role' => 'student']);
    Enrollment::factory()->for($student)->for($course)->create();
    LessonCompletion::factory()->for($student)->for($course)->for($lesson)->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.courses.destroy', $course))
        ->assertRedirect(route('dashboard.courses'));

    expect(Course::query()->find($course->id))->toBeNull()
        ->and(Module::query()->find($module->id))->toBeNull()
        ->and(Lesson::query()->find($lesson->id))->toBeNull()
        ->and(Question::query()->find($question->id))->toBeNull()
        ->and(Answer::query()->where('question_id', $question->id)->exists())->toBeFalse()
        ->and(Enrollment::query()->where('course_id', $course->id)->exists())->toBeFalse()
        ->and(LessonCompletion::query()->where('course_id', $course->id)->exists())->toBeFalse();
});

test('FT-F33-02 - deleting a course removes its stored cover', function () {
    // Boundary: cover, valid side (stored path). Only the course's own file is
    // removed.
    Storage::fake('public');
    Storage::disk('public')->put('courses/cover.png', 'cover');
    Storage::disk('public')->put('courses/unrelated.png', 'unrelated');
    $course = Course::factory()->create(['image_url' => 'courses/cover.png']);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.courses.destroy', $course))
        ->assertRedirect(route('dashboard.courses'));

    Storage::disk('public')->assertMissing('courses/cover.png');
    Storage::disk('public')->assertExists('courses/unrelated.png');
});

test('FT-F33-03 - an admin deletes a blank draft course', function () {
    // Boundary: course state, valid side (no outline to cascade).
    $course = Course::factory()->draft()->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.courses.destroy', $course))
        ->assertRedirect(route('dashboard.courses'));

    expect(Course::query()->find($course->id))->toBeNull();
});

test('FT-F33-04 - a student cannot delete a course', function () {
    // Boundary: access, invalid side (role). The rejected request leaves the
    // row and its stored cover intact.
    Storage::fake('public');
    Storage::disk('public')->put('courses/cover.png', 'cover');
    $course = Course::factory()->create(['image_url' => 'courses/cover.png']);
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->delete(route('dashboard.courses.destroy', $course))
        ->assertForbidden();

    expect(Course::query()->find($course->id))->not->toBeNull();
    Storage::disk('public')->assertExists('courses/cover.png');
});

test('FT-F33-05 - a guest cannot delete a course', function () {
    // Boundary: access, invalid side (authentication).
    $course = Course::factory()->create();

    $this->delete(route('dashboard.courses.destroy', $course))
        ->assertRedirect(route('login'));

    expect(Course::query()->find($course->id))->not->toBeNull();
});

test('FT-F33-06 - deleting an unknown course is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->delete(route('dashboard.courses.destroy', 999999))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f33Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
