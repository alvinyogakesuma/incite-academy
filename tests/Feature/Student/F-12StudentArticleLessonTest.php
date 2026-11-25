<?php

/**
 * F-12 - Halaman artikel kursus
 *
 * Feature tests for the student's article room and its completion action:
 * GET /courses/{course:slug}/lessons/{lesson} (route courses.lessons.show)
 * and POST .../complete (route courses.lessons.complete), both behind the
 * auth -> verified gate and scoped to the course. The room renders the
 * article body plus the course outline; the complete action records the
 * student's completion and awards the article's points.
 *
 * Method: equivalence partitioning (EP) over the room's domains, then
 * boundary value analysis (BVA) of the article-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | target            | a lesson of a published course                 | a draft course, a lesson of another course   |
 * | content           | an article body, a null body                   | -                                            |
 * | completion state  | untouched, completed by the viewer             | another student's completion                 |
 * | complete action   | first call, repeated call                      | a call on a draft course                     |
 * | side effects      | enrollment, one completion row, points         | duplicate rows or double points              |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F12-01 | access - verified student (valid side)      | student GET                        | 200 with course, lesson, sections, completed              |
 * | FT-F12-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F12-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F12-04 | target - draft course (invalid side)        | a published lesson in a draft      | 404                                                       |
 * | FT-F12-05 | target - foreign lesson (invalid side)      | course A URL with course B lesson  | 404                                                       |
 * | FT-F12-06 | content - missing body (boundary)           | article_content null               | 200; the lesson carries a null body                       |
 * | FT-F12-07 | completion state - both sides               | untouched room, completed room     | completed false / true in the lesson and its section row  |
 * | FT-F12-08 | complete - first call                       | POST complete                      | redirect back; enrollment; one completion; points awarded |
 * | FT-F12-09 | complete - repeated call (boundary)         | two POSTs                          | one completion; points awarded once                       |
 * | FT-F12-10 | complete - draft course (invalid side)      | POST on a draft course's lesson    | 404; no completion                                        |
 * | FT-F12-11 | completion state - per student              | another student completed it       | the viewer's room still shows false                       |
 *
 * == Relation to the existing suites =========================================
 *
 * LessonRoomTest already proves the access trio, the draft and foreign
 * lesson 404s, the completion row with its awarded points, the repeat
 * no-op, the completed-room flag, and the clawback on removal;
 * EnrollmentTest proves the single-enrollment rule. F-12 deliberately
 * repeats the room and complete flows so the feature file is self-contained;
 * the new content is the null-body boundary, the redirect-back target, the
 * complete-on-draft rejection, and the cross-student scope of the room's
 * completed flag.
 *
 * The catalog and detail pages that link here are F-10 and F-11's subjects;
 * the quiz and exam rooms are F-13 and F-14's subjects. The article
 * points come from F-40's derived stats. The gate ordering is F-04's
 * subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The article branch renders Courses/Room with the lesson body and the
 *   outline; the body may be null, and the page still renders.
 * - Completing the first time creates the completion row and the course
 *   enrollment; the completion observer awards the article's points to the
 *   student and records the amount on the completion.
 * - A repeated call stays a single completion and never awards again.
 * - Only a published course's own lessons are reachable - a draft course or
 *   a foreign lesson is a 404 before any write happens.
 * - The completed flag and the points belong to the signed-in student; a
 *   classmate's completion never marks this student's room.
 */

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F12-01 - a verified student opens the article room', function () {
    // Boundary: access, valid side (baseline). The room carries the article
    // body, the outline, and the viewer's completion flag.
    $course = Course::factory()->create(['title' => 'Article Course']);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create([
        'title' => 'Skimming Basics',
        'article_content' => '<p>The article body.</p>',
    ]);

    $this->actingAs(f12Student())
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Courses/Room', false)
            ->where('course.id', $course->id)
            ->where('course.slug', $course->slug)
            ->where('course.title', 'Article Course')
            ->where('lesson.id', $lesson->id)
            ->where('lesson.title', 'Skimming Basics')
            ->where('lesson.type', 'article')
            ->where('lesson.article_content', '<p>The article body.</p>')
            ->where('completed', false)
            ->has('sections', 1));
});

test('FT-F12-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $course = Course::factory()->create();
    $lesson = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->article()->create();

    $this->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertRedirect(route('login'));
});

test('FT-F12-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    $course = Course::factory()->create();
    $lesson = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->article()->create();
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F12-04 - a draft course has no article room', function () {
    // Boundary: target, invalid side (draft course). The URL is addressable
    // because the draft carries a slug, but the room answers 404.
    $course = Course::factory()->create(['title' => 'Draft Course', 'status' => 'draft']);
    $lesson = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->article()->create();

    $this->actingAs(f12Student())
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertNotFound();
});

test('FT-F12-05 - a lesson of another course is not reachable', function () {
    // Boundary: target, invalid side (scope binding).
    $course = Course::factory()->create();
    $foreign = Course::factory()->create();
    $foreignLesson = Lesson::factory()->for($foreign)->for(Module::factory()->for($foreign)->create())->article()->create();

    $this->actingAs(f12Student())
        ->get(route('courses.lessons.show', [$course, $foreignLesson]))
        ->assertNotFound();
});

test('FT-F12-06 - an article without a body still renders', function () {
    // Boundary: content. The prepared placeholder is the client's concern;
    // the server delivers a null body and the room stays usable.
    $course = Course::factory()->create();
    $lesson = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->article()->create([
        'article_content' => null,
    ]);

    $this->actingAs(f12Student())
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('lesson.article_content', null)
            ->where('completed', false));
});

test('FT-F12-07 - the completed flag appears in the room and its outline row', function () {
    // Boundary: completion state, valid side (the viewer completed it).
    $student = f12Student();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create();
    LessonCompletion::factory()->for($student)->for($course)->for($lesson)->create();

    $this->actingAs($student)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('completed', true)
            ->where('sections.0.lessons.0.completed', true));
});

test('FT-F12-08 - completing an article enrolls the student and awards its points', function () {
    // Boundary: the complete action, first call. One completion row, one
    // enrollment, and the article's points on the student's total.
    $student = f12Student();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create(['points' => 25]);

    $this->actingAs($student)
        ->from(route('courses.lessons.show', [$course, $lesson]))
        ->post(route('courses.lessons.complete', [$course, $lesson]))
        ->assertRedirect(route('courses.lessons.show', [$course, $lesson]));

    $completion = LessonCompletion::query()->sole();

    expect($completion->user_id)->toBe($student->id)
        ->and($completion->lesson_id)->toBe($lesson->id)
        ->and($completion->course_id)->toBe($course->id)
        ->and($completion->points_awarded)->toBe(25)
        ->and($completion->completed_at)->not->toBeNull()
        ->and(Enrollment::query()->where('user_id', $student->id)->where('course_id', $course->id)->exists())->toBeTrue()
        ->and($student->fresh()->total_points)->toBe(25);
});

test('FT-F12-09 - completing twice stays a single completion and a single award', function () {
    // Boundary: complete action, repeated call.
    $student = f12Student();
    $course = Course::factory()->create();
    $lesson = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->article()->create(['points' => 25]);

    $this->actingAs($student)->post(route('courses.lessons.complete', [$course, $lesson]));
    $this->actingAs($student)->post(route('courses.lessons.complete', [$course, $lesson]));

    expect(LessonCompletion::query()->count())->toBe(1)
        ->and($student->fresh()->total_points)->toBe(25);
});

test('FT-F12-10 - a draft course cannot be completed', function () {
    // Boundary: complete action, invalid side (draft course). The rejected
    // call writes nothing.
    $student = f12Student();
    $course = Course::factory()->create(['title' => 'Draft Course', 'status' => 'draft']);
    $lesson = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->article()->create();

    $this->actingAs($student)
        ->post(route('courses.lessons.complete', [$course, $lesson]))
        ->assertNotFound();

    expect(LessonCompletion::query()->count())->toBe(0)
        ->and(Enrollment::query()->count())->toBe(0)
        ->and($student->fresh()->total_points)->toBe(0);
});

test('FT-F12-11 - a classmate completion never marks this student room', function () {
    // Boundary: completion state, per-student scope.
    $viewer = f12Student();
    $other = f12Student();
    $course = Course::factory()->create();
    $lesson = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->article()->create();
    LessonCompletion::factory()->for($other)->for($course)->for($lesson)->create();

    $this->actingAs($viewer)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('completed', false)
            ->where('sections.0.lessons.0.completed', false));
});

/**
 * A verified student account with a clean points total.
 *
 * @param  array<string, mixed>  $attributes
 */
function f12Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
        'total_points' => 0,
    ], $attributes));
}
