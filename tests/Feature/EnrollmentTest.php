<?php

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\QueryException;

test('ensureFor enrolls the user once and refreshes the access stamp on repeat calls', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();

    $enrollment = Enrollment::ensureFor($user, $course->id);

    expect($enrollment->wasRecentlyCreated)->toBeTrue();
    expect($enrollment->user_id)->toBe($user->id);
    expect($enrollment->course_id)->toBe($course->id);
    expect($enrollment->enrolled_at)->not->toBeNull();
    expect(Enrollment::count())->toBe(1);

    // A repeat call refreshes the stale access stamp instead of inserting a duplicate row.
    $enrollment->fill(['last_accessed' => now()->subDays(7)])->save();

    $refreshed = Enrollment::ensureFor($user, $course->id);

    expect($refreshed->id)->toBe($enrollment->id);
    expect($refreshed->last_accessed->greaterThan(now()->subDays(6)))->toBeTrue();
    expect(Enrollment::count())->toBe(1);
});

test('a user cannot be enrolled twice in the same course', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();

    Enrollment::factory()->for($user)->for($course)->create();

    expect(fn () => Enrollment::factory()->for($user)->for($course)->create())
        ->toThrow(QueryException::class);
});

test('deleting a course removes its enrollments', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();

    Enrollment::factory()->for($user)->for($course)->create();

    $course->delete();

    expect(Enrollment::count())->toBe(0);
});

test('deleting a user removes their enrollments', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();

    Enrollment::factory()->for($user)->for($course)->create();

    $user->delete();

    expect(Enrollment::count())->toBe(0);
});

test('the enrollment relations read through the pivot', function () {
    $user = User::factory()->create();
    $course = Course::factory()->create();

    Enrollment::factory()->for($user)->for($course)->recentlyAccessed()->create();

    $enrollment = Enrollment::first();
    expect($enrollment->user->is($user))->toBeTrue();
    expect($enrollment->course->is($course))->toBeTrue();

    $enrolledUser = $course->enrolledUsers->first();
    expect($enrolledUser->is($user))->toBeTrue();
    expect($enrolledUser->pivot->enrolled_at)->not->toBeNull();
    expect($enrolledUser->pivot->last_accessed)->not->toBeNull();

    expect($user->enrollments->first()->course_id)->toBe($course->id);
});
