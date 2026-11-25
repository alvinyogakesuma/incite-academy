<?php

use App\Models\Challenge;
use App\Models\ChallengeAttempt;
use App\Models\ChallengeQuestion;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

test('the challenges page is displayed for verified users', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('auth.user')
            ->has('challenges')
            ->has('categories', 3));
});

test('guests are redirected to the login page from the challenges page', function () {
    $this->get(route('challenges'))
        ->assertRedirect(route('login'));
});

test('unverified users are redirected to the verification page', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('challenges'))
        ->assertRedirect(route('verification.notice'));
});

test('the challenges page maps challenge fields for the student card', function () {
    Storage::fake('public');

    $user = User::factory()->create();

    $challenge = Challenge::factory()->reading()->easy()->create([
        'title' => 'Grammar Challenge',
        'description' => 'Test your grammar knowledge.',
        'points' => 100,
        'duration' => 15,
        'image_url' => 'challenges/cover.png',
    ]);

    $this->actingAs($user)
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('challenges', 1, fn ($page) => $page
                ->where('id', $challenge->id)
                ->where('title', 'Grammar Challenge')
                ->where('description', 'Test your grammar knowledge.')
                ->where('category', 'Reading Comprehension')
                ->where('difficulty', 'Easy')
                ->where('points', 100)
                ->where('duration', 15)
                ->where('questions_count', 0)
                ->where('image_url', Storage::disk('public')->url('challenges/cover.png'))));
});

test('the challenges page counts each challenge questions', function () {
    $user = User::factory()->create();

    $challenge = Challenge::factory()->create();
    ChallengeQuestion::factory()->count(2)->for($challenge)->text()->create();

    $this->actingAs($user)
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('challenges', 1)
            ->where('challenges.0.questions_count', 2));
});

test('the challenge detail page is displayed for verified users', function () {
    $user = User::factory()->create();
    $challenge = Challenge::factory()->create();

    $this->actingAs($user)
        ->get(route('challenges.show', $challenge))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('auth.user')
            ->has('challenge')
            ->has('attempts'));
});

test('guests are redirected to the login page from the challenge detail page', function () {
    $challenge = Challenge::factory()->create();

    $this->get(route('challenges.show', $challenge))
        ->assertRedirect(route('login'));
});

test('the challenge detail maps the challenge and its attempts', function () {
    $user = User::factory()->create();

    $challenge = Challenge::factory()->reading()->easy()->create([
        'title' => 'Grammar Challenge',
        'description' => 'Test your grammar knowledge.',
        'points' => 100,
        'duration' => 15,
    ]);

    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 80,
        'total_points' => 100,
        'percentage' => 80,
        'attempted_at' => '2026-11-20 10:00:00',
    ]);

    $this->actingAs($user)
        ->get(route('challenges.show', $challenge))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('challenge', fn ($page) => $page
                ->where('id', $challenge->id)
                ->where('title', 'Grammar Challenge')
                ->where('description', 'Test your grammar knowledge.')
                ->where('category', 'Reading Comprehension')
                ->where('difficulty', 'Easy')
                ->where('points', 100)
                ->where('duration', 15)
                ->where('questions_count', 0))
            ->has('attempts', 1, fn ($attempt) => $attempt
                ->where('score', 80)
                ->where('total', 100)
                ->where('percentage', 80)
                ->where('attempted_at', 'Nov 20, 2026 at 10:00 AM')));
});

test('the challenge attempt history is scoped to the signed-in student', function () {
    $student = User::factory()->create();
    $other = User::factory()->create();
    $challenge = Challenge::factory()->create();

    ChallengeAttempt::factory()->for($other)->for($challenge)->create([
        'score' => 10,
    ]);

    ChallengeAttempt::factory()->for($student)->for($challenge)->create([
        'score' => 70,
    ]);

    $this->actingAs($student)
        ->get(route('challenges.show', $challenge))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('attempts', 1)
            ->where('attempts.0.score', 70));
});

test('a missing challenge returns not found', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/challenges/999')
        ->assertNotFound();
});
