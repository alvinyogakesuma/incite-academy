<?php

use App\Models\Challenge;
use App\Models\ChallengeAnswer;
use App\Models\ChallengeAttempt;
use App\Models\ChallengeQuestion;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

test('the challenge take screen loads without the answer key', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $challenge = Challenge::factory()->create([
        'title' => 'Grammar Challenge',
        'points' => 50,
        'duration' => 15,
    ]);

    $first = ChallengeQuestion::factory()->for($challenge)->text()->create([
        'question_content' => 'First question',
    ]);
    $wrongAnswer = ChallengeAnswer::factory()->for($first)->create(['answer_content' => 'Wrong']);
    ChallengeAnswer::factory()->correct()->for($first)->create(['answer_content' => 'Right']);

    $second = ChallengeQuestion::factory()->for($challenge)->listening()->create([
        'question_content' => 'Second question',
        'audio_url' => 'challenges/audio/clip.wav',
    ]);
    ChallengeAnswer::factory()->for($second)->create(['answer_content' => 'Wrong']);
    ChallengeAnswer::factory()->correct()->for($second)->create(['answer_content' => 'Right']);

    $this->actingAs($user)
        ->get(route('challenges.take', $challenge))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('challenge', fn ($page) => $page
                ->where('id', $challenge->id)
                ->where('title', 'Grammar Challenge')
                ->where('duration', 15)
                ->where('points', 50))
            ->has('questions', 2, fn ($page) => $page
                ->where('id', $first->id)
                ->where('type', 'text')
                ->where('question_content', 'First question')
                ->where('audio_url', null)
                // The strict scope proves no correctness flag ships —
                // the challenge's answer key stays server-side.
                ->has('answers', 2, fn ($scope) => $scope
                    ->where('id', $wrongAnswer->id)
                    ->where('answer_content', 'Wrong')))
            ->where('questions.1.type', 'listening')
            ->where('questions.1.audio_url', Storage::disk('public')->url('challenges/audio/clip.wav'))
            ->where('result', null));
});

test('guests are redirected from the take screen', function () {
    $challenge = Challenge::factory()->create();

    $this->get(route('challenges.take', $challenge))
        ->assertRedirect(route('login'));
});

test('submitting a finished challenge scores it and records the attempt', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $challenge = Challenge::factory()->create([
        'points' => 50,
    ]);

    $first = ChallengeQuestion::factory()->for($challenge)->text()->create();
    $right = ChallengeAnswer::factory()->correct()->for($first)->create();
    ChallengeAnswer::factory()->for($first)->create();

    $second = ChallengeQuestion::factory()->for($challenge)->text()->create();
    ChallengeAnswer::factory()->for($second)->create();
    ChallengeAnswer::factory()->correct()->for($second)->create();

    $response = $this->actingAs($user)
        ->from(route('challenges.take', $challenge))
        ->post(route('challenges.submit', $challenge), [
            'answers' => [
                $first->id => $right->id,
                $second->id => 999999,
            ],
        ])
        ->assertRedirect(route('challenges.take', $challenge));

    // Back to the take screen, carrying the authoritative result.
    $response->assertSessionHas('challenge_result');

    $attempt = ChallengeAttempt::first();

    expect($attempt)
        ->score->toBe(25)
        ->total_points->toBe(50)
        ->correct_count->toBe(1)
        ->total_questions->toBe(2)
        ->percentage->toBe(50)
        ->points_awarded->toBe(25);

    expect($user->fresh()->total_points)->toBe(25);

    // The flashed result renders on the take screen.
    $this->actingAs($user)
        ->get(route('challenges.take', $challenge))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('result', fn ($page) => $page
                ->where('score', 25)
                ->where('total_points', 50)
                ->where('correct_count', 1)
                ->where('total_questions', 2)
                ->where('percentage', 50)));
});

test('a worse challenge retry logs an attempt but moves no points', function () {
    $user = User::factory()->create(['total_points' => 0]);
    $challenge = Challenge::factory()->create([
        'points' => 50,
    ]);

    $question = ChallengeQuestion::factory()->for($challenge)->text()->create();
    $right = ChallengeAnswer::factory()->correct()->for($question)->create();
    $wrong = ChallengeAnswer::factory()->for($question)->create();

    $this->actingAs($user)
        ->post(route('challenges.submit', $challenge), [
            'answers' => [$question->id => $right->id],
        ]);

    $this->actingAs($user)
        ->post(route('challenges.submit', $challenge), [
            'answers' => [$question->id => $wrong->id],
        ]);

    expect(ChallengeAttempt::count())->toBe(2)
        ->and($user->fresh()->total_points)->toBe(50);
});
