<?php

use App\Models\Answer;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonAttempt;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\Question;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Storage;

test('the lesson room is displayed with the outline for verified users', function () {
    $user = User::factory()->create();

    $course = Course::factory()->create(['title' => 'Reading Comprehension Mastery']);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create([
        'article_content' => '<p>Skimming is the art of reading fast.</p>',
    ]);

    $this->actingAs($user)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('course', fn ($page) => $page
                ->where('id', $course->id)
                ->where('slug', 'reading-comprehension-mastery')
                ->where('title', 'Reading Comprehension Mastery'))
            ->has('lesson', fn ($page) => $page
                ->where('id', $lesson->id)
                ->where('title', $lesson->title)
                ->where('type', 'article')
                ->where('article_content', '<p>Skimming is the art of reading fast.</p>'))
            ->has('sections', 1, fn ($page) => $page
                ->where('id', $module->id)
                ->where('title', $module->title)
                ->where('lessonsCount', 1)
                ->where('duration', (int) $lesson->duration)
                ->has('lessons', 1, fn ($scope) => $scope
                    ->where('id', $lesson->id)
                    ->where('title', $lesson->title)
                    ->where('type', 'article')
                    ->where('duration', (int) $lesson->duration)
                    ->where('completed', false)))
            ->where('completed', false));
});

test('guests are redirected from the lesson room', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->create();

    $this->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertRedirect(route('login'));
});

test('draft courses have no lesson room', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create([
        'title' => 'Draft Course',
        'status' => 'draft',
    ]);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->create();

    $this->actingAs($user)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertNotFound();
});

test('a lesson from another course is not reachable through this course', function () {
    $user = User::factory()->create();

    $course = Course::factory()->create(['title' => 'Home Course']);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->create();

    $otherCourse = Course::factory()->create(['title' => 'Other Course']);
    $otherModule = Module::factory()->for($otherCourse)->create();
    $otherLesson = Lesson::factory()->for($otherCourse)->for($otherModule)->create();

    $this->actingAs($user)
        ->get("/courses/{$course->slug}/lessons/{$otherLesson->id}")
        ->assertNotFound();

    expect($lesson->exists)->toBeTrue();
});

test('completing a lesson records the completion, enrolls the student, and awards points', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['title' => 'Counted Course']);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create([
        'points' => 25,
    ]);

    $this->actingAs($user)
        ->post(route('courses.lessons.complete', [$course, $lesson]))
        ->assertRedirect();

    $completion = LessonCompletion::first();

    expect(LessonCompletion::count())->toBe(1)
        ->and(Enrollment::count())->toBe(1)
        ->and($user->fresh()->total_points)->toBe(25)
        ->and($completion->points_awarded)->toBe(25)
        ->and($completion->completed_at)->not->toBeNull();
});

test('completing a lesson twice stays a single completion', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create([
        'points' => 25,
    ]);

    $this->actingAs($user)->post(route('courses.lessons.complete', [$course, $lesson]));
    $this->actingAs($user)->post(route('courses.lessons.complete', [$course, $lesson]));

    expect(LessonCompletion::count())->toBe(1)
        ->and($user->fresh()->total_points)->toBe(25);
});

test('completing a quiz lesson does not award points', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create();

    $this->actingAs($user)
        ->post(route('courses.lessons.complete', [$course, $lesson]))
        ->assertRedirect();

    expect(LessonCompletion::first()->points_awarded)->toBe(0)
        ->and($user->fresh()->total_points)->toBe(0);
});

test('the lesson room reflects a completed lesson', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['title' => 'Counted Course']);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create();

    LessonCompletion::factory()->for($user)->for($course)->for($lesson)->create();

    $this->actingAs($user)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('completed', true)
            ->has('sections', 1, fn ($page) => $page
                ->where('id', $module->id)
                ->where('title', $module->title)
                ->where('lessonsCount', 1)
                ->where('duration', (int) $lesson->duration)
                ->has('lessons', 1, fn ($scope) => $scope
                    ->where('id', $lesson->id)
                    ->where('title', $lesson->title)
                    ->where('type', $lesson->type)
                    ->where('duration', (int) $lesson->duration)
                    ->where('completed', true))));
});

test('a lesson cannot be completed twice at the database level', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create();

    LessonCompletion::factory()->for($user)->for($course)->for($lesson)->create();

    expect(fn () => LessonCompletion::factory()->for($user)->for($course)->for($lesson)->create())
        ->toThrow(QueryException::class);
});

test('removing a completion claws the awarded points back', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create([
        'points' => 25,
    ]);

    LessonCompletion::factory()->for($user)->for($course)->for($lesson)->create();

    expect($user->fresh()->total_points)->toBe(25);

    LessonCompletion::first()->delete();

    expect($user->fresh()->total_points)->toBe(0);
});

test('the quiz lesson room opens with its stats and attempt history', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['title' => 'Listening Lab']);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create([
        'points' => 50,
    ]);
    Question::factory()->for($lesson)->text()->create();
    Question::factory()->for($lesson)->text()->create();

    LessonAttempt::factory()->for($user)->for($course)->for($lesson)->create([
        'score' => 30,
        'total_points' => 50,
        'correct_count' => 3,
        'total_questions' => 5,
        'percentage' => 60,
        'attempted_at' => '2026-11-19 09:30:00',
    ]);
    LessonAttempt::factory()->for($user)->for($course)->for($lesson)->create([
        'score' => 40,
        'total_points' => 50,
        'correct_count' => 4,
        'total_questions' => 5,
        'percentage' => 80,
        'attempted_at' => '2026-11-20 10:00:00',
    ]);

    $this->actingAs($user)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('lesson', fn ($page) => $page
                ->where('id', $lesson->id)
                ->where('title', $lesson->title)
                ->where('type', 'quiz')
                ->where('points', 50)
                ->where('questions_count', 2))
            ->has('attempts', 2, fn ($page) => $page
                ->where('score', 40)
                ->where('total', 50)
                ->where('percentage', 80)
                ->where('correct', 4)
                ->where('total_questions', 5)
                ->where('attempted_at', 'Nov 20, 2026 at 10:00 AM'))
            ->has('sections', 1, fn ($page) => $page
                ->where('id', $module->id)
                ->where('title', $module->title)
                ->where('lessonsCount', 1)
                ->where('duration', (int) $lesson->duration)
                ->has('lessons', 1, fn ($scope) => $scope
                    ->where('id', $lesson->id)
                    ->where('title', $lesson->title)
                    ->where('type', 'quiz')
                    ->where('duration', (int) $lesson->duration)
                    ->where('completed', false)))
            ->where('completed', false));
});

test('the exam lesson room opens with its stats and attempt history', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create(['title' => 'Final Stretch']);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->exam()->create([
        'points' => 50,
        'duration' => 30,
    ]);
    Question::factory()->for($lesson)->text()->create();
    Question::factory()->for($lesson)->text()->create();

    LessonAttempt::factory()->for($user)->for($course)->for($lesson)->create([
        'score' => 40,
        'total_points' => 50,
        'correct_count' => 4,
        'total_questions' => 5,
        'percentage' => 80,
        'attempted_at' => '2026-11-20 10:00:00',
    ]);

    $this->actingAs($user)
        ->get(route('courses.lessons.show', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('lesson', fn ($page) => $page
                ->where('id', $lesson->id)
                ->where('title', $lesson->title)
                ->where('type', 'exam')
                ->where('points', 50)
                ->where('duration', 30)
                ->where('questions_count', 2))
            ->has('attempts', 1, fn ($page) => $page
                ->where('score', 40)
                ->where('total', 50)
                ->where('percentage', 80)
                ->where('correct', 4)
                ->where('total_questions', 5)
                ->where('attempted_at', 'Nov 20, 2026 at 10:00 AM'))
            ->has('sections', 1, fn ($page) => $page
                ->where('id', $module->id)
                ->where('title', $module->title)
                ->where('lessonsCount', 1)
                ->where('duration', (int) $lesson->duration)
                ->has('lessons', 1, fn ($scope) => $scope
                    ->where('id', $lesson->id)
                    ->where('title', $lesson->title)
                    ->where('type', 'exam')
                    ->where('duration', 30)
                    ->where('completed', false)))
            ->where('completed', false));
});

test('the quiz take screen loads with its questions and answer flags', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $course = Course::factory()->create(['title' => 'Listening Lab']);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create([
        'points' => 50,
    ]);

    $first = Question::factory()->for($lesson)->text()->create([
        'question_content' => 'First question',
    ]);
    $wrongAnswer = Answer::factory()->for($first)->create(['answer_content' => 'Wrong']);
    Answer::factory()->correct()->for($first)->create(['answer_content' => 'Right']);

    $second = Question::factory()->for($lesson)->listening()->create([
        'question_content' => 'Second question',
        'audio_url' => 'questions/clip.wav',
    ]);
    Answer::factory()->for($second)->create(['answer_content' => 'Wrong']);
    Answer::factory()->correct()->for($second)->create(['answer_content' => 'Right']);

    $this->actingAs($user)
        ->get(route('courses.lessons.take', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('lesson', fn ($page) => $page
                ->where('id', $lesson->id)
                ->where('title', $lesson->title)
                ->where('type', 'quiz')
                ->where('points', 50)
                ->where('duration', (int) $lesson->duration))
            ->has('questions', 2, fn ($page) => $page
                ->where('id', $first->id)
                ->where('type', 'text')
                ->where('question_content', 'First question')
                ->where('audio_url', null)
                ->has('answers', 2, fn ($scope) => $scope
                    ->where('id', $wrongAnswer->id)
                    ->where('answer_content', 'Wrong')
                    ->where('is_correct', false)))
            ->where('questions.1.type', 'listening')
            ->where('questions.1.audio_url', Storage::disk('public')->url('questions/clip.wav'))
            ->has('sections', 1)
            ->where('result', null));
});

test('the exam take screen loads without the answer key', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->exam()->create([
        'points' => 50,
        'duration' => 30,
    ]);

    $question = Question::factory()->for($lesson)->text()->create([
        'question_content' => 'First question',
    ]);
    $wrong = Answer::factory()->for($question)->create(['answer_content' => 'Wrong']);
    Answer::factory()->correct()->for($question)->create(['answer_content' => 'Right']);

    $this->actingAs($user)
        ->get(route('courses.lessons.take', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('lesson', fn ($page) => $page
                ->where('id', $lesson->id)
                ->where('title', $lesson->title)
                ->where('type', 'exam')
                ->where('points', 50)
                ->where('duration', 30))
            ->has('questions', 1, fn ($page) => $page
                ->where('id', $question->id)
                ->where('type', 'text')
                ->where('question_content', 'First question')
                ->where('audio_url', null)
                // The strict scope proves no correctness flag ships —
                // the exam's answer key stays server-side.
                ->has('answers', 2, fn ($scope) => $scope
                    ->where('id', $wrong->id)
                    ->where('answer_content', 'Wrong')))
            ->where('result', null));
});

test('draft courses have no take screen', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create([
        'title' => 'Draft Course',
        'status' => 'draft',
    ]);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create();

    $this->actingAs($user)
        ->get(route('courses.lessons.take', [$course, $lesson]))
        ->assertNotFound();
});

test('guests are redirected from the take screen', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create();

    $this->get(route('courses.lessons.take', [$course, $lesson]))
        ->assertRedirect(route('login'));
});

test('submitting a finished quiz scores it and records the attempt', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create([
        'points' => 50,
    ]);

    $first = Question::factory()->for($lesson)->text()->create();
    $right = Answer::factory()->correct()->for($first)->create();
    Answer::factory()->for($first)->create();

    $second = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($second)->create();
    Answer::factory()->correct()->for($second)->create();

    $response = $this->actingAs($user)
        ->from(route('courses.lessons.take', [$course, $lesson]))
        ->post(route('courses.lessons.submit', [$course, $lesson]), [
            'answers' => [
                $first->id => $right->id,
                $second->id => 999999,
            ],
        ])
        ->assertRedirect(route('courses.lessons.take', [$course, $lesson]));

    // Back to the take screen, carrying the authoritative result.
    $response->assertSessionHas('quiz_result');

    $attempt = LessonAttempt::first();

    expect($attempt)
        ->score->toBe(25)
        ->total_points->toBe(50)
        ->correct_count->toBe(1)
        ->total_questions->toBe(2)
        ->percentage->toBe(50)
        ->points_awarded->toBe(25);

    expect($user->fresh()->total_points)->toBe(25);
    expect(LessonCompletion::count())->toBe(1)
        ->and(Enrollment::count())->toBe(1);
});

test('a worse quiz retry logs an attempt but moves no points', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create([
        'points' => 50,
    ]);

    $question = Question::factory()->for($lesson)->text()->create();
    $right = Answer::factory()->correct()->for($question)->create();
    $wrong = Answer::factory()->for($question)->create();

    $this->actingAs($user)
        ->post(route('courses.lessons.submit', [$course, $lesson]), [
            'answers' => [$question->id => $right->id],
        ]);

    $this->actingAs($user)
        ->post(route('courses.lessons.submit', [$course, $lesson]), [
            'answers' => [$question->id => $wrong->id],
        ]);

    expect(LessonAttempt::count())->toBe(2)
        ->and($user->fresh()->total_points)->toBe(50);
});

test('submitting a finished exam scores it and records the attempt', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->exam()->create([
        'points' => 50,
    ]);

    $first = Question::factory()->for($lesson)->text()->create();
    $right = Answer::factory()->correct()->for($first)->create();
    Answer::factory()->for($first)->create();

    $second = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($second)->create();
    Answer::factory()->correct()->for($second)->create();

    $response = $this->actingAs($user)
        ->from(route('courses.lessons.take', [$course, $lesson]))
        ->post(route('courses.lessons.submit', [$course, $lesson]), [
            'answers' => [
                $first->id => $right->id,
                $second->id => 999999,
            ],
        ])
        ->assertRedirect(route('courses.lessons.take', [$course, $lesson]));

    // Back to the take screen, carrying the authoritative result.
    $response->assertSessionHas('quiz_result');

    $attempt = LessonAttempt::first();

    expect($attempt)
        ->score->toBe(25)
        ->total_points->toBe(50)
        ->correct_count->toBe(1)
        ->total_questions->toBe(2)
        ->percentage->toBe(50)
        ->points_awarded->toBe(25);

    expect($user->fresh()->total_points)->toBe(25);
    expect(LessonCompletion::count())->toBe(1)
        ->and(Enrollment::count())->toBe(1);
});
