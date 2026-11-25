<?php

/**
 * F-14 - Halaman ujian kursus
 *
 * Feature tests for the student's exam flow: the exam room
 * (GET .../lessons/{lesson}, Courses/RoomExam), the take screen
 * (GET .../take, Courses/RoomExamStart), and the submission
 * (POST .../submit), behind the auth -> verified gate and scoped to the
 * course. The room shows the exam's manual time limit and the student's
 * attempt history; the take screen withholds the answer key; the
 * submission is the authoritative score.
 *
 * Method: equivalence partitioning (EP) over the exam's domains, then
 * boundary value analysis (BVA) of the exam-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | target            | an exam lesson of a published course           | a draft course, an article lesson, a         |
 * |                   |                                                | foreign exam                                 |
 * | room exposure     | stats plus the manual time limit, the          | another student's attempts                   |
 * |                   | viewer's attempts                              |                                              |
 * | take exposure     | questions ordered; answers without the key     | the answer key leaking (is_correct)          |
 * | submission        | all correct, partial                           | a payload without answers                    |
 * | scoring           | score = points x correct / total               | a retry double-awarding points               |
 * | attempts          | newest first, scoped to the viewer             | a classmate's attempt leaking in             |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F14-01 | access - verified student (valid side)      | student GET                        | 200 with course, lesson, sections, attempts               |
 * | FT-F14-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F14-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F14-04 | target - draft course (invalid side)        | an exam lesson in a draft          | 404                                                       |
 * | FT-F14-05 | take exposure - answer key withheld         | two questions, answers per row     | questions ordered; each answer is exactly id + content    |
 * | FT-F14-06 | take target - article and foreign           | article lesson, foreign exam       | 404 / 404                                                 |
 * | FT-F14-07 | submission - all correct                    | 2 of 2 correct, 40 points          | score 40; percentage 100; attempt, completion, enrolment  |
 * | FT-F14-08 | submission - partial                        | 1 of 2 correct, 40 points          | score 20; percentage 50; 20 points awarded                |
 * | FT-F14-09 | submission - missing answers (invalid)      | no answers array                   | rejected on answers; no attempt recorded                  |
 * | FT-F14-10 | attempts - history and scope                | two own attempts, one classmate    | own rows newest first; the classmate's row absent         |
 * | FT-F14-11 | scoring - worse retry (boundary)            | 100% then 50%                      | second attempt logged with zero awarded; total unchanged  |
 *
 * == Relation to the existing suites =========================================
 *
 * LessonRoomTest already proves the exam room stats, the take screen without
 * the key, the exam submission, and the retry behavior; LessonAttemptTest
 * proves the personal-best observer. F-14 deliberately repeats the flow so
 * the feature file is self-contained; the new content is the exact answer
 * key set on the take screen (id + content only), the manual duration on the
 * room, the all-correct boundary, the missing-answers rejection, the history
 * ordering and scope, and the foreign-exam take rejection.
 *
 * F-13 is the quiz counterpart: the deliberate difference is the withheld
 * answer key. The derived lesson points come from F-40. The gate ordering is
 * F-04's subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The exam take screen ships only id and answer_content per answer - the
 *   correctness stays server-side until the submission is scored. This is
 *   the deliberate difference from the quiz take screen (F-13).
 * - The room carries the exam's manual duration alongside the question count
 *   and points.
 * - The submission scores from the stored rows: score is the lesson's points
 *   times the correct share, rounded; percentage is the correct share.
 * - The attempt observer awards only the improvement over the student's
 *   personal best; a worse retry logs an attempt with zero awarded.
 * - Every submission also creates the lesson completion and the course
 *   enrollment, and flashes the result back to the take screen.
 * - The attempt history is scoped to the signed-in student, newest first.
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

test('FT-F14-01 - a verified student opens the exam room', function () {
    // Boundary: access, valid side (baseline). The room carries the manual
    // time limit, the stats, and an empty attempt history.
    [$course, , $lesson] = f14ExamLesson(40, 45);
    Question::factory()->for($lesson)->text()->create();
    Question::factory()->for($lesson)->text()->create();

    $this->actingAs(f14Student())
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Courses/RoomExam', false)
            ->where('lesson.id', $lesson->id)
            ->where('lesson.type', 'exam')
            ->where('lesson.points', 40)
            ->where('lesson.duration', 45)
            ->where('lesson.questions_count', 2)
            ->where('completed', false)
            ->has('attempts', 0)
            ->has('sections', 1));
});

test('FT-F14-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    [$course, , $lesson] = f14ExamLesson();

    $this->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertRedirect(route('login'));
});

test('FT-F14-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    [$course, , $lesson] = f14ExamLesson();
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F14-04 - a draft course has no exam room', function () {
    // Boundary: target, invalid side (draft course).
    $course = Course::factory()->create(['status' => 'draft']);
    $lesson = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->exam()->create();

    $this->actingAs(f14Student())
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertNotFound();
});

test('FT-F14-05 - the take screen orders questions and withholds the answer key', function () {
    // Boundary: take exposure, valid side (exam). Questions are created out of
    // order; each answer exposes exactly id and answer_content - the
    // correctness flag must not leak.
    [$course, , $lesson] = f14ExamLesson();
    $second = Question::factory()->for($lesson)->text()->create(['question_content' => 'Second question?', 'order_index' => 1]);
    $first = Question::factory()->for($lesson)->text()->create(['question_content' => 'First question?', 'order_index' => 0]);
    Answer::factory()->for($second)->create(['answer_content' => 'B wrong']);
    Answer::factory()->correct()->for($second)->create(['answer_content' => 'B right']);
    Answer::factory()->correct()->for($first)->create(['answer_content' => 'A right']);
    Answer::factory()->for($first)->create(['answer_content' => 'A wrong']);

    $this->actingAs(f14Student())
        ->get(route('courses.lessons.take', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Courses/RoomExamStart', false)
            ->has('questions', 2)
            ->where('questions.0.question_content', 'First question?')
            ->where('questions.1.question_content', 'Second question?')
            ->where('questions.0.answers.0', fn ($answer) => $answer->keys()->sort()->values()->all() === [
                'answer_content',
                'id',
            ])
            ->where('questions.1.answers.1', fn ($answer) => $answer->keys()->sort()->values()->all() === [
                'answer_content',
                'id',
            ])
            ->where('result', null));
});

test('FT-F14-06 - the take screen only accepts an exam of this course', function () {
    // Boundary: take target, invalid side. An article lesson has no take
    // screen, and a foreign exam is not reachable through this course's URL.
    [$course, , $lesson] = f14ExamLesson();
    $article = Lesson::factory()->for($course)->for(Module::factory()->for($course)->create())->article()->create();
    $foreignCourse = Course::factory()->create();
    $foreignExam = Lesson::factory()->for($foreignCourse)->for(Module::factory()->for($foreignCourse)->create())->exam()->create();
    $student = f14Student();

    $this->actingAs($student)
        ->get(route('courses.lessons.take', [$course, $article]))
        ->assertNotFound();

    $this->actingAs($student)
        ->get(route('courses.lessons.take', [$course, $foreignExam]))
        ->assertNotFound();
});

test('FT-F14-07 - an all-correct exam submission scores the full points', function () {
    // Boundary: submission, all correct. One attempt, one completion, one
    // enrollment, and the full award.
    [$course, , $lesson] = f14ExamLesson(40, 45);
    $first = Question::factory()->for($lesson)->text()->create();
    $firstRight = Answer::factory()->correct()->for($first)->create();
    Answer::factory()->for($first)->create();
    $second = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($second)->create();
    $secondRight = Answer::factory()->correct()->for($second)->create();
    $student = f14Student();

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
        ->score->toBe(40)
        ->total_points->toBe(40)
        ->correct_count->toBe(2)
        ->total_questions->toBe(2)
        ->percentage->toBe(100)
        ->points_awarded->toBe(40)
        ->and($student->fresh()->total_points)->toBe(40)
        ->and(LessonCompletion::query()->count())->toBe(1)
        ->and(Enrollment::query()->count())->toBe(1);
});

test('FT-F14-08 - a partial exam submission scores the correct share', function () {
    // Boundary: submission, partial. One of two correct is half the points.
    [$course, , $lesson] = f14ExamLesson(40, 45);
    $first = Question::factory()->for($lesson)->text()->create();
    $firstRight = Answer::factory()->correct()->for($first)->create();
    Answer::factory()->for($first)->create();
    $second = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($second)->create();
    Answer::factory()->correct()->for($second)->create();
    $student = f14Student();

    $this->actingAs($student)
        ->post(route('courses.lessons.submit', [$course, $lesson]), [
            'answers' => [
                $first->id => $firstRight->id,
                $second->id => 999999,
            ],
        ]);

    expect(LessonAttempt::query()->sole())
        ->score->toBe(20)
        ->percentage->toBe(50)
        ->correct_count->toBe(1)
        ->points_awarded->toBe(20)
        ->and($student->fresh()->total_points)->toBe(20);
});

test('FT-F14-09 - an exam submission without answers is rejected', function () {
    // Boundary: submission, invalid side (missing answers array).
    [$course, , $lesson] = f14ExamLesson();
    Question::factory()->for($lesson)->text()->create();
    $student = f14Student();

    $this->actingAs($student)
        ->post(route('courses.lessons.submit', [$course, $lesson]), [])
        ->assertSessionHasErrors(['answers']);

    expect(LessonAttempt::query()->count())->toBe(0)
        ->and(LessonCompletion::query()->count())->toBe(0);
});

test('FT-F14-10 - the attempt history is newest first and scoped to the viewer', function () {
    // Boundary: attempts. Two own attempts and one classmate's row; only the
    // viewer's rows appear, newest first, with the formatted timestamp.
    [$course, , $lesson] = f14ExamLesson(40, 45);
    $viewer = f14Student();
    $other = f14Student();
    LessonAttempt::factory()->for($viewer)->for($course)->for($lesson)->create([
        'score' => 10,
        'percentage' => 25,
        'attempted_at' => now()->subDay(),
    ]);
    LessonAttempt::factory()->for($viewer)->for($course)->for($lesson)->create([
        'score' => 30,
        'percentage' => 75,
        'attempted_at' => now(),
    ]);
    LessonAttempt::factory()->for($other)->for($course)->for($lesson)->create([
        'score' => 40,
        'percentage' => 100,
        'attempted_at' => now(),
    ]);

    $this->actingAs($viewer)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('attempts', 2)
            ->where('attempts.0.score', 30)
            ->where('attempts.1.score', 10)
            ->has('attempts.0.attempted_at'));
});

test('FT-F14-11 - a worse exam retry logs an attempt but awards nothing', function () {
    // Boundary: scoring. The personal best pays once; the weaker retry is
    // recorded with zero awarded and the total stays put.
    [$course, , $lesson] = f14ExamLesson(40, 45);
    $first = Question::factory()->for($lesson)->text()->create();
    $firstRight = Answer::factory()->correct()->for($first)->create();
    Answer::factory()->for($first)->create();
    $second = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($second)->create();
    $secondRight = Answer::factory()->correct()->for($second)->create();
    $student = f14Student();

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
        ->and($attempts[0]->points_awarded)->toBe(40)
        ->and($attempts[1]->score)->toBe(20)
        ->and($attempts[1]->points_awarded)->toBe(0)
        ->and($student->fresh()->total_points)->toBe(40);
});

/**
 * A verified student account with a clean points total.
 *
 * @param  array<string, mixed>  $attributes
 */
function f14Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
        'total_points' => 0,
    ], $attributes));
}

/**
 * An exam lesson inside its own course and module.
 *
 * @return array{0: Course, 1: Module, 2: Lesson}
 */
function f14ExamLesson(int $points = 40, int $duration = 45): array
{
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->exam()->create([
        'points' => $points,
        'duration' => $duration,
    ]);

    return [$course, $module, $lesson];
}
