<?php

use App\Models\Course;
use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

test('the learning paths page is displayed for verified users', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('learning-paths'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('auth.user')
            ->has('learningPaths')
            ->has('levels', 4));
});

test('guests are redirected to the login page from the learning paths page', function () {
    $this->get(route('learning-paths'))
        ->assertRedirect(route('login'));
});

test('unverified users are redirected to the verification page', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('learning-paths'))
        ->assertRedirect(route('verification.notice'));
});

test('the learning paths page maps path fields for the student card', function () {
    Storage::fake('public');

    $path = LearningPath::factory()->allLevels()->create([
        'title' => 'Complete Preparation',
        'description' => 'A comprehensive learning path.',
        'courses_count' => 3,
        'total_duration' => 481,
        'image_url' => 'learning-paths/cover.png',
    ]);

    $this->actingAs(User::factory()->create())
        ->get(route('learning-paths'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('learningPaths', 1, fn ($page) => $page
                ->where('id', $path->id)
                ->where('title', 'Complete Preparation')
                ->where('description', 'A comprehensive learning path.')
                ->where('level', 'All Levels')
                ->where('total_duration', 481)
                ->where('courses_count', 3)
                ->where('image_url', Storage::disk('public')->url('learning-paths/cover.png'))));
});

test('the learning path detail page is displayed for verified users', function () {
    $path = LearningPath::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('auth.user')
            ->has('learningPath')
            ->has('courses')
            ->where('progress', 0)
            ->where('isEnrolled', false));
});

test('guests are redirected to the login page from the learning path detail page', function () {
    $path = LearningPath::factory()->create();

    $this->get(route('learning-paths.show', $path))
        ->assertRedirect(route('login'));
});

test('the learning path detail maps the path and its course sequence', function () {
    Storage::fake('public');

    $path = LearningPath::factory()->allLevels()->create([
        'title' => 'Complete Preparation',
        'description' => 'A comprehensive learning path.',
        'courses_count' => 2,
        'total_duration' => 180,
        'image_url' => 'learning-paths/cover.png',
    ]);
    $first = Course::factory()->create([
        'title' => 'First Course',
        'short_description' => 'The first course.',
        'total_duration' => 120,
        'modules_count' => 2,
        'lessons_count' => 6,
    ]);
    $second = Course::factory()->create([
        'title' => 'Second Course',
        'total_duration' => 60,
        'modules_count' => 1,
        'lessons_count' => 3,
    ]);
    $path->courses()->attach([
        $first->id => ['order_index' => 0],
        $second->id => ['order_index' => 1],
    ]);

    $this->actingAs(User::factory()->create())
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('learningPath', fn ($page) => $page
                ->where('id', $path->id)
                ->where('title', 'Complete Preparation')
                ->where('description', 'A comprehensive learning path.')
                ->where('level', 'All Levels')
                ->where('image_url', Storage::disk('public')->url('learning-paths/cover.png'))
                ->where('duration', 180)
                ->where('coursesCount', 2))
            ->has('courses', 2, fn ($scope) => $scope
                ->where('id', $first->id)
                ->where('slug', 'first-course')
                ->where('title', 'First Course')
                ->where('description', 'The first course.')
                ->where('category', $first->category->value)
                ->where('duration', 120)
                ->where('lessons', 6))
            ->where('courses.1.id', $second->id)
            ->where('progress', 0)
            ->where('isEnrolled', false));
});

test('the learning path progress derives from real completions', function () {
    $user = User::factory()->create();

    // lessons_count stays observer-maintained — the two real
    // lessons below bring the course's tally to 2.
    $course = Course::factory()->create(['lessons_count' => 0]);
    $module = Module::factory()->for($course)->create();
    $first = Lesson::factory()->for($course)->for($module)->article()->create();
    Lesson::factory()->for($course)->for($module)->article()->create();

    $path = LearningPath::factory()->create();
    $path->courses()->attach([$course->id => ['order_index' => 0]]);

    LessonCompletion::factory()->for($user)->for($course)->for($first)->create();

    $this->actingAs($user)
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('progress', 50)
            ->where('isEnrolled', false));
});

test('enrolling in a learning path toggles both ways', function () {
    $user = User::factory()->create();
    $path = LearningPath::factory()->create();

    $this->actingAs($user)
        ->from(route('learning-paths.show', $path))
        ->post(route('learning-paths.enroll', $path))
        ->assertRedirect(route('learning-paths.show', $path));

    expect(LearningPathEnrollment::count())->toBe(1);

    $this->actingAs($user)
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert->where('isEnrolled', true));

    $this->actingAs($user)
        ->from(route('learning-paths.show', $path))
        ->post(route('learning-paths.enroll', $path))
        ->assertRedirect(route('learning-paths.show', $path));

    expect(LearningPathEnrollment::count())->toBe(0);
});

test('guests are redirected to the login page from the enroll action', function () {
    $path = LearningPath::factory()->create();

    $this->post(route('learning-paths.enroll', $path))
        ->assertRedirect(route('login'));

    expect(LearningPathEnrollment::count())->toBe(0);
});

test('a missing learning path returns not found', function () {
    $this->actingAs(User::factory()->create())
        ->get('/learning-paths/999')
        ->assertNotFound();
});
