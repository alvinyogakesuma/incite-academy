<?php

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;

test('direct module and lesson creation maintain the counters', function () {
    $course = Course::factory()->create([
        'title' => 'Counted Course',
        'modules_count' => 0,
        'lessons_count' => 0,
    ]);
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($course)->for($module)->article()->create();

    expect($course->fresh()->modules_count)->toBe(1)
        ->and($course->fresh()->lessons_count)->toBe(1)
        ->and($module->fresh()->lessons_count)->toBe(1);
});

test('creating a module through the endpoint increments the course module count', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $course = Course::factory()->create([
        'title' => 'Counted Course',
        'modules_count' => 0,
    ]);

    $this->actingAs($admin)
        ->post(route('dashboard.courses.modules.store', $course))
        ->assertRedirect();

    expect($course->fresh()->modules_count)->toBe(1);
});

test('creating a lesson through the endpoint increments both lesson counters', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $course = Course::factory()->create([
        'title' => 'Counted Course',
        'lessons_count' => 0,
    ]);
    $module = Module::factory()->for($course)->create();

    $this->actingAs($admin)
        ->post(route('dashboard.modules.lessons.store', $module))
        ->assertRedirect();

    expect($course->fresh()->lessons_count)->toBe(1)
        ->and($module->fresh()->lessons_count)->toBe(1);
});

test('deleting a module decrements the module count and the cascaded lesson count', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $course = Course::factory()->create([
        'title' => 'Counted Course',
        'modules_count' => 0,
        'lessons_count' => 0,
    ]);
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($course)->for($module)->article()->create();
    Lesson::factory()->for($course)->for($module)->article()->create();

    expect($course->fresh()->modules_count)->toBe(1)
        ->and($course->fresh()->lessons_count)->toBe(2);

    $this->actingAs($admin)
        ->delete(route('dashboard.modules.destroy', $module))
        ->assertRedirect();

    expect($course->fresh()->modules_count)->toBe(0)
        ->and($course->fresh()->lessons_count)->toBe(0)
        ->and(Module::count())->toBe(0)
        ->and(Lesson::count())->toBe(0);
});

test('saving an exam lesson folds its duration and points into the course sums', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $course = Course::factory()->create([
        'title' => 'Counted Course',
        'total_duration' => 0,
        'total_points' => 0,
    ]);
    $module = Module::factory()->for($course)->create(['total_points' => 0]);
    $lesson = Lesson::factory()->for($course)->for($module)->exam()->create([
        'duration' => 0,
        'points' => 0,
    ]);

    $this->actingAs($admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Final Exam',
            'type' => 'exam',
            'duration' => 30,
            'questions' => [
                [
                    'type' => 'text',
                    'question_content' => 'First question',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_true' => '0'],
                        ['answer_content' => 'Right', 'is_true' => '1'],
                    ],
                ],
                [
                    'type' => 'text',
                    'question_content' => 'Second question',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_true' => '0'],
                        ['answer_content' => 'Right', 'is_true' => '1'],
                    ],
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    // The manual exam time limit and the question-count points.
    expect($course->fresh()->total_duration)->toBe(30)
        ->and($course->fresh()->total_points)->toBe(20)
        ->and($module->fresh()->total_points)->toBe(20);
});

test('renaming a lesson leaves the course sums untouched', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $course = Course::factory()->create([
        'title' => 'Counted Course',
        'total_duration' => 0,
        'total_points' => 0,
    ]);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->exam()->create([
        'duration' => 30,
        'points' => 50,
    ]);

    expect($course->fresh()->total_duration)->toBe(30)
        ->and($course->fresh()->total_points)->toBe(50);

    $this->actingAs($admin)
        ->put(route('dashboard.lessons.rename', $lesson), ['title' => 'Renamed Exam'])
        ->assertRedirect();

    expect($course->fresh()->total_duration)->toBe(30)
        ->and($course->fresh()->total_points)->toBe(50);
});

test('deleting a module subtracts its lessons from the course sums', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $course = Course::factory()->create([
        'title' => 'Counted Course',
        'total_duration' => 0,
        'total_points' => 0,
    ]);
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($course)->for($module)->exam()->create([
        'duration' => 30,
        'points' => 50,
    ]);

    expect($course->fresh()->total_duration)->toBe(30)
        ->and($course->fresh()->total_points)->toBe(50);

    $this->actingAs($admin)
        ->delete(route('dashboard.modules.destroy', $module))
        ->assertRedirect();

    expect($course->fresh()->total_duration)->toBe(0)
        ->and($course->fresh()->total_points)->toBe(0);
});
