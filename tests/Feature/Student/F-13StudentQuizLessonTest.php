<?php

/**
 * F-13 - Halaman kuis kursus
 *
 * Feature tests for the student's quiz flow: the quiz room
 * (GET .../lessons/{lesson}, Courses/RoomQuiz), the take screen
 * (GET .../take, Courses/RoomQuizStart), and the submission
 * (POST .../submit), behind the auth -> verified gate and scoped to the
 * course. The room shows the quiz stats and the student's attempt history;
 * the take screen ships the answer correctness for instant feedback; the
 * submission is the authoritative score.
 *
 * Method: equivalence partitioning (EP) over the quiz's domains, then
 * boundary value analysis (BVA) of the quiz-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | target            | a quiz lesson of a published course            | a draft course, an article lesson, a         |
 * |                   |                                                | foreign lesson                               |
 * | room exposure     | lesson stats and the viewer's attempts         | another student's attempts                   |
 * | take exposure     | questions ordered, answers with correctness    | an answer key withheld (that is the exam)    |
 * | submission        | all correct, partial                           | a payload without answers                    |
 * | scoring           | score = points x correct / total               | a retry double-awarding points               |
 * | attempts          | newest first, scoped to the viewer             | a classmate's attempt leaking in             |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F13-01 | access - verified student (valid side)      | student GET                        | 200 with course, lesson, sections, attempts               |
 * | FT-F13-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F13-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F13-04 | target - draft course (invalid side)        | a quiz lesson in a draft           | 404                                                       |
 * | FT-F13-05 | take exposure - quiz answer key (valid)     | two questions, answers per row     | questions ordered; each answer carries is_correct         |
 * | FT-F13-06 | take target - article and foreign           | article lesson, foreign quiz       | 404 / 404                                                 |
 * | FT-F13-07 | submission - all correct                    | 2 of 2 correct, 50 points          | score 50; percentage 100; attempt, completion, enrolment  |
 * | FT-F13-08 | submission - partial                        | 1 of 2 correct, 50 points          | score 25; percentage 50; 25 points awarded                |
 * | FT-F13-09 | submission - missing answers (invalid)      | no answers array                   | rejected on answers; no attempt recorded                  |
 * | FT-F13-10 | attempts - history and scope                | two own attempts, one classmate    | own rows newest first; the classmate's row absent         |
 * | FT-F13-11 | scoring - worse retry (boundary)            | 100% then 50%                      | second attempt logged with zero awarded; total unchanged  |
 *
 * == Relation to the existing suites =========================================
 *
 * LessonRoomTest already proves the quiz room stats, the take screen, the
 * partial-scored submission, and the worse-retry no-award; LessonAttemptTest
 * proves the personal-best observer in isolation. F-13 deliberately repeats
 * the flow so the feature file is self-contained; the new content is the
 * question and answer ordering on the take screen, the all-correct boundary,
 * the missing-answers rejection, the attempt-history ordering and per-student
 * scope, and the take-screen target pair (article and foreign lesson).
 *
 * The article room is F-12's subject; the exam room is F-14's; the derived
 * lesson points come from F-40. The gate ordering is F-04's subject; this
 * route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The quiz take screen is the only take screen that ships the answer key:
 *   every answer carries is_correct so the client can give instant feedback.
 *   The exam take screen deliberately withholds it (F-14).
 * - The submission scores from the stored rows: score is the lesson's points
 *   times the correct share, rounded; percentage is the correct share.
 * - The attempt observer awards only the improvement over the student's
 *   personal best on the lesson, recorded as points_awarded; a worse retry
 *   logs an attempt with zero awarded.
 * - Every submission also creates the lesson completion and the course
 *   enrollment, and flashes the result back to the take screen.
 * - The room's attempt history is scoped to the signed-in student and
 *   ordered newest first.
 */

use App\Models\Answer;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonAttempt;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\Question;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F13-01 - a verified student opens the quiz room', function () {
    // Boundary: access, valid side (baseline). The room carries the quiz
    // stats, the outline, and an empty attempt history.
    [$course, , $lesson] = f13QuizLesson(50);
    Question::factory()->for($lesson)->text()->create();
    Question::factory()->for($lesson)->text()->create();

    $this->actingAs(f13Student())
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Courses/RoomQuiz', false)
            ->where('lesson.id', $lesson->id)
            ->where('lesson.type', 'quiz')
            ->where('lesson.points', 50)
            ->where('lesson.questions_count', 2)
            ->where('completed', false)
            ->has('attempts', 0)
            ->has('sections', 1));
});

test('FT-F13-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    [$course, , $lesson] = f13QuizLesson();

    $this->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertRedirect(route('login'));
});

test('FT-F13-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    [$course, , $lesson] = f13QuizLesson();
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F13-04 - a draft course has no quiz room', function () {
    // Boundary: target, invalid side (draft course).
    $course = Course::factory()->create(['status' => 'draft']);
    $lesson = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->quiz()->create();

    $this->actingAs(f13Student())
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertNotFound();
});

test('FT-F13-05 - the take screen orders questions and ships the answer key', function () {
    // Boundary: take exposure, valid side (quiz). Questions are created out
    // of order; each answer carries its correctness for instant feedback.
    [$course, , $lesson] = f13QuizLesson();
    $second = Question::factory()->for($lesson)->text()->create(['question_content' => 'Second question?', 'order_index' => 1]);
    $first = Question::factory()->for($lesson)->text()->create(['question_content' => 'First question?', 'order_index' => 0]);
    $secondWrong = Answer::factory()->for($second)->create(['answer_content' => 'B wrong']);
    Answer::factory()->correct()->for($second)->create(['answer_content' => 'B right']);
    $firstRight = Answer::factory()->correct()->for($first)->create(['answer_content' => 'A right']);
    Answer::factory()->for($first)->create(['answer_content' => 'A wrong']);

    $this->actingAs(f13Student())
        ->get(route('courses.lessons.take', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Courses/RoomQuizStart', false)
            ->has('questions', 2)
            ->where('questions.0.question_content', 'First question?')
            ->where('questions.1.question_content', 'Second question?')
            ->where('questions.0.answers.0.id', $firstRight->id)
            ->where('questions.0.answers.0.is_correct', true)
            ->where('questions.0.answers.1.is_correct', false)
            ->where('questions.1.answers.0.is_correct', false)
            ->where('questions.1.answers.1.id', fn ($id) => $id !== $secondWrong->id)
            ->where('result', null));
});

test('FT-F13-06 - the take screen only accepts a quiz of this course', function () {
    // Boundary: take target, invalid side. An article lesson has no take
    // screen, and a foreign quiz lesson is not reachable through this
    // course's URL.
    [$course, , $lesson] = f13QuizLesson();
    $article = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->article()->create();
    $foreignCourse = Course::factory()->create();
    $foreignQuiz = Lesson::factory()->for($foreignCourse)->for(Module::factory()->for($foreignCourse)->create())->quiz()->create();
    $student = f13Student();

    $this->actingAs($student)
        ->get(route('courses.lessons.take', [$course, $article]))
        ->assertNotFound();

    $this->actingAs($student)
        ->get(route('courses.lessons.take', [$course, $foreignQuiz]))
        ->assertNotFound();
});

test('FT-F13-07 - an all-correct submission scores the full points', function () {
    // Boundary: submission, all correct. One attempt, one completion, one
    // enrollment, and the full award.
    [$course, , $lesson] = f13QuizLesson(50);
    $first = Question::factory()->for($lesson)->text()->create();
    $firstRight = Answer::factory()->correct()->for($first)->create();
    Answer::factory()->for($first)->create();
    $second = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($second)->create();
    $secondRight = Answer::factory()->correct()->for($second)->create();
    $student = f13Student();

    $this->actingAs($student)
        ->from(route('courses.lessons.take', [$course, $lesson]))
        ->post(route('courses.lessons.submit', [$course, $lesson]), [
            'answers' => [
                $first->id => $firstRight->id,
                $second->id => $secondRight->id,
            ],
        ])
        ->assertRedirect(route('courses.lessons.take', [$course, $lesson]))
        ->assertSessionHas('quiz_result');

    $attempt = LessonAttempt::query()->sole();

    expect($attempt)
        ->score->toBe(50)
        ->total_points->toBe(50)
        ->correct_count->toBe(2)
        ->total_questions->toBe(2)
        ->percentage->toBe(100)
        ->points_awarded->toBe(50)
        ->and($student->fresh()->total_points)->toBe(50)
        ->and(LessonCompletion::query()->count())->toBe(1)
        ->and(Enrollment::query()->count())->toBe(1);
});

test('FT-F13-08 - a partial submission scores the correct share', function () {
    // Boundary: submission, partial. One of two correct is half the points.
    [$course, , $lesson] = f13QuizLesson(50);
    $first = Question::factory()->for($lesson)->text()->create();
    $firstRight = Answer::factory()->correct()->for($first)->create();
    Answer::factory()->for($first)->create();
    $second = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($second)->create();
    Answer::factory()->correct()->for($second)->create();
    $student = f13Student();

    $this->actingAs($student)
        ->post(route('courses.lessons.submit', [$course, $lesson]), [
            'answers' => [
                $first->id => $firstRight->id,
                $second->id => 999999,
            ],
        ]);

    expect(LessonAttempt::query()->sole())
        ->score->toBe(25)
        ->percentage->toBe(50)
        ->correct_count->toBe(1)
        ->points_awarded->toBe(25)
        ->and($student->fresh()->total_points)->toBe(25);
});

test('FT-F13-09 - a submission without answers is rejected', function () {
    // Boundary: submission, invalid side (missing answers array).
    [$course, , $lesson] = f13QuizLesson();
    Question::factory()->for($lesson)->text()->create();
    $student = f13Student();

    $this->actingAs($student)
        ->post(route('courses.lessons.submit', [$course, $lesson]), [])
        ->assertSessionHasErrors(['answers']);

    expect(LessonAttempt::query()->count())->toBe(0)
        ->and(LessonCompletion::query()->count())->toBe(0);
});

test('FT-F13-10 - the attempt history is newest first and scoped to the viewer', function () {
    // Boundary: attempts. Two own attempts and one classmate's row; only the
    // viewer's rows appear, newest first, with the formatted timestamp.
    [$course, , $lesson] = f13QuizLesson(50);
    $viewer = f13Student();
    $other = f13Student();
    LessonAttempt::factory()->for($viewer)->for($course)->for($lesson)->create([
        'score' => 20,
        'percentage' => 40,
        'attempted_at' => now()->subDay(),
    ]);
    LessonAttempt::factory()->for($viewer)->for($course)->for($lesson)->create([
        'score' => 40,
        'percentage' => 80,
        'attempted_at' => now(),
    ]);
    LessonAttempt::factory()->for($other)->for($course)->for($lesson)->create([
        'score' => 50,
        'percentage' => 100,
        'attempted_at' => now(),
    ]);

    $this->actingAs($viewer)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('attempts', 2)
            ->where('attempts.0.score', 40)
            ->where('attempts.1.score', 20)
            ->has('attempts.0.attempted_at'));
});

test('FT-F13-11 - a worse retry logs an attempt but awards nothing', function () {
    // Boundary: scoring. The personal best pays once; the weaker retry is
    // recorded with zero awarded and the total stays put.
    [$course, , $lesson] = f13QuizLesson(50);
    $first = Question::factory()->for($lesson)->text()->create();
    $firstRight = Answer::factory()->correct()->for($first)->create();
    Answer::factory()->for($first)->create();
    $second = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($second)->create();
    $secondRight = Answer::factory()->correct()->for($second)->create();
    $student = f13Student();

    $this->actingAs($student)
        ->post(route('courses.lessons.submit', [$course, $lesson]), [
            'answers' => [$first->id => $firstRight->id, $second->id => $secondRight->id],
        ]);

    $this->actingAs($student)
        ->post(route('courses.lessons.submit', [$course, $lesson]), [
            'answers' => [$first->id => $firstRight->id, $second->id => 999999],
        ]);

    $attempts = LessonAttempt::query()->orderBy('id')->get();

    expect($attempts)->toHaveCount(2)
        ->and($attempts[0]->points_awarded)->toBe(50)
        ->and($attempts[1]->score)->toBe(25)
        ->and($attempts[1]->points_awarded)->toBe(0)
        ->and($student->fresh()->total_points)->toBe(50);
});

/**
 * A verified student account with a clean points total.
 *
 * @param  array<string, mixed>  $attributes
 */
function f13Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
        'total_points' => 0,
    ], $attributes));
}

/**
 * A quiz lesson inside its own course and module.
 *
 * @return array{0: Course, 1: Module, 2: Lesson}
 */
function f13QuizLesson(int $points = 50): array
{
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create([
        'points' => $points,
    ]);

    return [$course, $module, $lesson];
}
