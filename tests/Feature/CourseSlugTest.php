<?php

use App\Models\Course;
use App\Models\User;

test('the slug is generated from the title on first save', function () {
    $course = Course::factory()->create([
        'title' => 'Reading Comprehension Mastery',
    ]);

    expect($course->slug)->toBe('reading-comprehension-mastery');
});

test('duplicate titles get a suffixed slug', function () {
    Course::factory()->create(['title' => 'Reading Comprehension Mastery']);

    $second = Course::factory()->create([
        'title' => 'Reading Comprehension Mastery',
    ]);

    expect($second->slug)->toBe('reading-comprehension-mastery-2');
});

test('renaming a course keeps its slug', function () {
    $course = Course::factory()->create([
        'title' => 'Reading Comprehension Mastery',
    ]);

    $course->update(['title' => 'Skimming & Scanning Techniques']);

    expect($course->slug)->toBe('reading-comprehension-mastery');
});

test('drafts without a title carry no slug until they are named', function () {
    $course = Course::factory()->draft()->create();

    expect($course->slug)->toBeNull();

    $course->update(['title' => 'Freshly Titled Course']);

    expect($course->slug)->toBe('freshly-titled-course');
});

test('the course detail page is reachable by slug', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create([
        'title' => 'Reading Comprehension Mastery',
    ]);

    $this->actingAs($user)
        ->get("/courses/{$course->slug}")
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert->has('sections'));
});

test('draft courses stay unreachable by slug', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create([
        'title' => 'Secret Draft',
        'status' => 'draft',
    ]);

    expect($course->slug)->toBe('secret-draft');

    $this->actingAs($user)
        ->get("/courses/{$course->slug}")
        ->assertNotFound();
});
