<?php

use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;

test('the courses exploration page is displayed for verified users', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('auth.user')
            ->has('courses')
            ->has('categories', 3));
});

test('guests are redirected to the login page from the courses exploration page', function () {
    $this->get(route('courses'))
        ->assertRedirect(route('login'));
});

test('unverified users are redirected to the verification page', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('courses'))
        ->assertRedirect(route('verification.notice'));
});

test('the course catalog lists only published courses', function () {
    $user = User::factory()->create();

    Course::factory()->count(2)->create();
    Course::factory()->draft()->create();

    $this->actingAs($user)
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert->has('courses', 2));
});

test('the course catalog maps course fields for the student card', function () {
    $user = User::factory()->create();

    $course = Course::factory()->reading()->create([
        'title' => 'Reading Comprehension Mastery',
        'short_description' => 'Develop critical reading skills',
        'image_url' => null,
        'total_duration' => 234,
        'modules_count' => 3,
        'lessons_count' => 9,
        'total_points' => 160,
    ]);

    $this->actingAs($user)
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('courses', 1, fn ($page) => $page
                ->where('id', $course->id)
                ->where('title', 'Reading Comprehension Mastery')
                ->where('slug', 'reading-comprehension-mastery')
                ->where('category', 'Reading Comprehension')
                ->where('short_description', 'Develop critical reading skills')
                ->where('total_duration', 234)
                ->where('modules_count', 3)
                ->where('lessons_count', 9)
                ->where('total_points', 160)
                ->where('image_url', null)
                ->missing('status')
                ->where('progress', 0)));
});

test('the catalog carries the student progress per course', function () {
    $user = User::factory()->create();

    $course = Course::factory()->create([
        'title' => 'Reading Comprehension Mastery',
        'lessons_count' => 0,
    ]);
    $module = Module::factory()->for($course)->create();
    $first = Lesson::factory()->for($course)->for($module)->article()->create();
    Lesson::factory()->for($course)->for($module)->article()->create();

    LessonCompletion::factory()->for($user)->for($course)->for($first)->create();

    $this->actingAs($user)
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('courses', 1)
            ->where('courses.0.progress', 50));
});
