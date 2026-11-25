<?php

use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;

test('the course detail page is displayed with its outline for verified users', function () {
    $user = User::factory()->create();

    $course = Course::factory()->create([
        'lessons_count' => 0,
        'total_duration' => 0,
    ]);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create([
        'title' => 'Skimming Speed Test Assessment',
        'duration' => 6,
    ]);

    $this->actingAs($user)
        ->get(route('courses.show', $course))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('course', fn ($page) => $page
                ->where('id', $course->id)
                ->where('title', $course->title)
                ->where('slug', $course->slug)
                ->where('description', $course->short_description)
                ->where('about', $course->long_description)
                ->where('image', $course->image_url)
                ->where('duration', 6)
                ->where('lessons', 1)
                ->where('progress', 0)
                ->missing('badge'))
            ->has('sections', 1, fn ($page) => $page
                ->where('id', $module->id)
                ->where('title', $module->title)
                ->where('lessonsCount', 1)
                ->where('duration', 6)
                ->has('lessons', 1, fn ($scope) => $scope
                    ->where('id', $lesson->id)
                    ->where('title', 'Skimming Speed Test Assessment')
                    ->where('type', 'quiz')
                    ->where('duration', 6)
                    ->where('completed', false))));
});

test('guests are redirected to the login page from the course detail page', function () {
    $course = Course::factory()->create();

    $this->get(route('courses.show', $course))
        ->assertRedirect(route('login'));
});

test('unverified users are redirected to the verification page', function () {
    $user = User::factory()->unverified()->create();
    $course = Course::factory()->create();

    $this->actingAs($user)
        ->get(route('courses.show', $course))
        ->assertRedirect(route('verification.notice'));
});

test('draft courses are not visible to students', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create([
        'title' => 'Unpublished Draft Course',
        'status' => 'draft',
    ]);

    $this->actingAs($user)
        ->get(route('courses.show', $course))
        ->assertNotFound();
});

test('the course detail progress reflects completed lessons', function () {
    $user = User::factory()->create();

    $course = Course::factory()->create([
        'title' => 'Reading Comprehension Mastery',
        'lessons_count' => 0,
    ]);
    $module = Module::factory()->for($course)->create();
    $first = Lesson::factory()->for($course)->for($module)->article()->create();
    $second = Lesson::factory()->for($course)->for($module)->article()->create();

    LessonCompletion::factory()->for($user)->for($course)->for($first)->create();

    $this->actingAs($user)
        ->get(route('courses.show', $course))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('course.progress', 50)
            ->where('course.lessons', 2)
            ->has('sections', 1, fn ($page) => $page
                ->where('id', $module->id)
                ->where('title', $module->title)
                ->where('lessonsCount', 2)
                ->where('duration', (int) $first->duration + (int) $second->duration)
                ->has('lessons', 2, fn ($scope) => $scope
                    ->where('id', $first->id)
                    ->where('title', $first->title)
                    ->where('type', $first->type)
                    ->where('duration', (int) $first->duration)
                    ->where('completed', true))));
});
