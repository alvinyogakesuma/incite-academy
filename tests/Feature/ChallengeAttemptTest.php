<?php

use App\Models\Challenge;
use App\Models\ChallengeAttempt;
use App\Models\User;

test('the first attempt on a challenge awards its full score', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $challenge = Challenge::factory()->create(['points' => 50]);

    $attempt = ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 50,
    ]);

    expect($attempt->points_awarded)->toBe(50)
        ->and($user->fresh()->total_points)->toBe(50);
});

test('a retry below the personal best awards nothing', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $challenge = Challenge::factory()->create(['points' => 50]);

    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 50,
    ]);

    $retry = ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 30,
    ]);

    expect($retry->points_awarded)->toBe(0)
        ->and($user->fresh()->total_points)->toBe(50)
        ->and(ChallengeAttempt::count())->toBe(2);
});

test('beating the personal best awards only the improvement', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $challenge = Challenge::factory()->create(['points' => 50]);

    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 50,
    ]);

    $retry = ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 70,
    ]);

    expect($retry->points_awarded)->toBe(20)
        ->and($user->fresh()->total_points)->toBe(70);
});

test('deleting the best attempt settles the total to the next best', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $challenge = Challenge::factory()->create(['points' => 50]);

    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 50,
    ]);

    $best = ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 70,
    ]);

    expect($user->fresh()->total_points)->toBe(70);

    $best->delete();

    expect($user->fresh()->total_points)->toBe(50);
});

test('deleting a non-best attempt leaves the total untouched', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $challenge = Challenge::factory()->create(['points' => 50]);

    $best = ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 70,
    ]);

    $worst = ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 30,
    ]);

    expect($user->fresh()->total_points)->toBe(70);

    $worst->delete();

    expect($user->fresh()->total_points)->toBe(70)
        ->and(ChallengeAttempt::count())->toBe(1);
});

test('attempt stat fields persist with their casts', function () {
    $user = User::factory()->create();
    $challenge = Challenge::factory()->create();

    $attempt = ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 25,
        'total_points' => 50,
        'correct_count' => 2,
        'total_questions' => 5,
        'percentage' => 40,
        'attempted_at' => '2026-11-20 10:00:00',
    ]);

    $fresh = $attempt->fresh();

    expect($fresh->attempted_at->format('Y-m-d H:i:s'))->toBe('2026-11-20 10:00:00')
        ->and($fresh->percentage)->toBe(40)
        ->and($fresh->correct_count)->toBe(2)
        ->and($fresh->total_questions)->toBe(5)
        ->and($fresh->total_points)->toBe(50);
});

test('deleting the challenge removes its attempts', function () {
    $user = User::factory()->create();
    $challenge = Challenge::factory()->create();

    ChallengeAttempt::factory()->for($user)->for($challenge)->create();

    $challenge->delete();

    expect(ChallengeAttempt::count())->toBe(0);
});
