<?php

/**
 * F-16 - Halaman soal tantangan
 *
 * Feature tests for the student's challenge flow: the detail page
 * (GET /challenges/{challenge}, Challenges/Detail), the take room
 * (GET .../take, Challenges/Room), and the submission (POST .../submit),
 * behind the auth -> verified gate. The detail carries the challenge stats
 * and the student's attempt history; the take room withholds the answer key;
 * the submission is the authoritative score.
 *
 * Method: equivalence partitioning (EP) over the flow's domains, then
 * boundary value analysis (BVA) of the challenge-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | target            | a stored challenge                             | an unknown id                                |
 * | detail exposure   | challenge stats and the viewer's attempts      | another student's attempts                   |
 * | take exposure     | questions ordered; answers without the key     | the answer key leaking (is_correct)          |
 * | submission        | all correct, partial                           | a payload without answers                    |
 * | scoring           | score = points x correct share                 | a retry double-awarding points               |
 * | attempts          | newest first, scoped to the viewer             | a classmate's attempt leaking in             |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F16-01 | access - verified student (valid side)      | student GET detail                 | 200 with challenge and attempts props                     |
 * | FT-F16-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F16-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F16-04 | target - unknown id (invalid side)          | detail and take on a missing id    | 404 / 404                                                 |
 * | FT-F16-05 | detail exposure - stats and history         | two own attempts, one classmate    | eight fields; own rows newest first                       |
 * | FT-F16-06 | take exposure - answer key withheld         | two questions, answers per row     | questions ordered; each answer is exactly id + content    |
 * | FT-F16-07 | submission - all correct                    | 2 of 2 correct, 100 points         | score 100; percentage 100; 100 awarded                    |
 * | FT-F16-08 | submission - partial                        | 1 of 2 correct, 80 points          | score 40; percentage 50; 40 awarded                       |
 * | FT-F16-09 | submission - missing answers (invalid)      | no answers array                   | rejected on answers; no attempt recorded                  |
 * | FT-F16-10 | scoring - worse retry (boundary)            | 100% then 0%                       | second attempt logged with zero awarded; total unchanged  |
 *
 * == Relation to the existing suites =========================================
 *
 * StudentChallengesPageTest already proves the detail access, the field
 * mapping, and the scoped history; ChallengeRoomTest proves the take screen
 * without the key, the partial scoring, and the worse-retry behavior;
 * ChallengeAttemptTest proves the personal-best observer. F-16 deliberately
 * repeats the flow so the feature file is self-contained; the new content is
 * the exact answer key set on the take room, the question ordering, the
 * all-correct boundary, the missing-answers rejection, and the history
 * ordering across two own attempts.
 *
 * The listing that links here is F-15's subject; the admin challenge CRUD is
 * F-42..F-45's. The challenge has no lesson-style completion - only the
 * attempt history. The gate ordering is F-04's subject; this route shares
 * the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The detail page is the challenge's landing screen: eight stat fields and
 *   the signed-in student's attempt history, newest first.
 * - The take room ships only id and answer_content per answer - the
 *   correctness stays server-side until the submission is scored.
 * - The submission scores from the stored rows: the percentage is the correct
 *   share, and the score is the challenge's points times that share.
 * - The attempt observer awards only the improvement over the student's
 *   personal best on the challenge, recorded as points_awarded; a worse retry
 *   logs an attempt with zero awarded.
 * - The result flashes back to the take screen as challenge_result.
 * - Challenges carry no completion or enrollment side effect.
 */

use App\Enums\Category;
use App\Models\Challenge;
use App\Models\ChallengeAnswer;
use App\Models\ChallengeAttempt;
use App\Models\ChallengeQuestion;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F16-01 - a verified student opens the challenge detail', function () {
    // Boundary: access, valid side (baseline). The detail carries the
    // challenge stats and the viewer's (empty) attempt history.
    $challenge = f16Challenge(100);

    $this->actingAs(f16Student())
        ->get(route('challenges.show', $challenge))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Challenges/Detail', false)
            ->where('challenge.id', $challenge->id)
            ->where('challenge.title', $challenge->title)
            ->has('attempts', 0));
});

test('FT-F16-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $challenge = f16Challenge();

    $this->get(route('challenges.show', $challenge))->assertRedirect(route('login'));
});

test('FT-F16-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    $challenge = f16Challenge();
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('challenges.show', $challenge))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F16-04 - an unknown challenge is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $student = f16Student();

    $this->actingAs($student)
        ->get(route('challenges.show', 999999))
        ->assertNotFound();

    $this->actingAs($student)
        ->get(route('challenges.take', 999999))
        ->assertNotFound();
});

test('FT-F16-05 - the detail maps the stats and the viewer history', function () {
    // Boundary: detail exposure. Eight stat fields are pinned; the history is
    // the viewer's only, newest first, and carries the formatted timestamp.
    $viewer = f16Student();
    $other = f16Student();
    $challenge = Challenge::factory()->create([
        'title' => 'Reading Sprint',
        'description' => 'A timed reading duel.',
        'category' => Category::ReadingComprehension->value,
        'difficulty' => 'Hard',
        'points' => 100,
        'duration' => 20,
    ]);
    ChallengeQuestion::factory()->for($challenge)->text()->create();
    ChallengeQuestion::factory()->for($challenge)->text()->create();
    ChallengeAttempt::factory()->for($viewer)->for($challenge)->create([
        'score' => 20,
        'percentage' => 20,
        'attempted_at' => now()->subDay(),
    ]);
    ChallengeAttempt::factory()->for($viewer)->for($challenge)->create([
        'score' => 80,
        'percentage' => 80,
        'attempted_at' => now(),
    ]);
    ChallengeAttempt::factory()->for($other)->for($challenge)->create([
        'score' => 100,
        'percentage' => 100,
        'attempted_at' => now(),
    ]);

    $this->actingAs($viewer)
        ->get(route('challenges.show', $challenge))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenge.title', 'Reading Sprint')
            ->where('challenge.description', 'A timed reading duel.')
            ->where('challenge.category', Category::ReadingComprehension->value)
            ->where('challenge.difficulty', 'Hard')
            ->where('challenge.points', 100)
            ->where('challenge.duration', 20)
            ->where('challenge.questions_count', 2)
            ->has('attempts', 2)
            ->where('attempts.0.score', 80)
            ->where('attempts.1.score', 20)
            ->has('attempts.0.attempted_at'));
});

test('FT-F16-06 - the take room orders questions and withholds the answer key', function () {
    // Boundary: take exposure, valid side. Questions are created out of
    // order; each answer exposes exactly id and answer_content.
    $challenge = f16Challenge(100);
    $second = ChallengeQuestion::factory()->for($challenge)->text()->create(['question_content' => 'Second question?', 'order_index' => 1]);
    $first = ChallengeQuestion::factory()->for($challenge)->text()->create(['question_content' => 'First question?', 'order_index' => 0]);
    ChallengeAnswer::factory()->for($second)->create(['answer_content' => 'B wrong']);
    ChallengeAnswer::factory()->correct()->for($second)->create(['answer_content' => 'B right']);
    ChallengeAnswer::factory()->correct()->for($first)->create(['answer_content' => 'A right']);
    ChallengeAnswer::factory()->for($first)->create(['answer_content' => 'A wrong']);

    $this->actingAs(f16Student())
        ->get(route('challenges.take', $challenge))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Challenges/Room', false)
            ->where('challenge.id', $challenge->id)
            ->where('challenge.duration', 20)
            ->where('challenge.points', 100)
            ->has('questions', 2)
            ->where('questions.0.question_content', 'First question?')
            ->where('questions.1.question_content', 'Second question?')
            ->where('questions.0.answers.0', fn ($answer) => $answer->keys()->sort()->values()->all() === [
                'answer_content',
                'id',
            ])
            ->where('questions.1.answers.1', fn ($answer) => $answer->keys()->sort()->values()->all() === [
                'answer_content',
                'id',
            ])
            ->where('result', null));
});

test('FT-F16-07 - an all-correct submission scores the full points', function () {
    // Boundary: submission, all correct. One attempt with the full award and
    // the result flashed back to the take room.
    $challenge = f16Challenge(100);
    $first = ChallengeQuestion::factory()->for($challenge)->text()->create();
    $firstRight = ChallengeAnswer::factory()->correct()->for($first)->create();
    ChallengeAnswer::factory()->for($first)->create();
    $second = ChallengeQuestion::factory()->for($challenge)->text()->create();
    ChallengeAnswer::factory()->for($second)->create();
    $secondRight = ChallengeAnswer::factory()->correct()->for($second)->create();
    $student = f16Student();

    $this->actingAs($student)
        ->from(route('challenges.take', $challenge))
        ->post(route('challenges.submit', $challenge), [
            'answers' => [
                $first->id => $firstRight->id,
                $second->id => $secondRight->id,
            ],
        ])
        ->assertRedirect(route('challenges.take', $challenge))
        ->assertSessionHas('challenge_result');

    $attempt = ChallengeAttempt::query()->sole();

    expect($attempt)
        ->score->toBe(100)
        ->total_points->toBe(100)
        ->correct_count->toBe(2)
        ->total_questions->toBe(2)
        ->percentage->toBe(100)
        ->points_awarded->toBe(100)
        ->and($student->fresh()->total_points)->toBe(100);
});

test('FT-F16-08 - a partial submission scores the correct share', function () {
    // Boundary: submission, partial. One of two correct is half the points.
    $challenge = f16Challenge(80);
    $first = ChallengeQuestion::factory()->for($challenge)->text()->create();
    $firstRight = ChallengeAnswer::factory()->correct()->for($first)->create();
    ChallengeAnswer::factory()->for($first)->create();
    $second = ChallengeQuestion::factory()->for($challenge)->text()->create();
    ChallengeAnswer::factory()->for($second)->create();
    ChallengeAnswer::factory()->correct()->for($second)->create();
    $student = f16Student();

    $this->actingAs($student)
        ->post(route('challenges.submit', $challenge), [
            'answers' => [
                $first->id => $firstRight->id,
                $second->id => 999999,
            ],
        ]);

    expect(ChallengeAttempt::query()->sole())
        ->score->toBe(40)
        ->percentage->toBe(50)
        ->correct_count->toBe(1)
        ->points_awarded->toBe(40)
        ->and($student->fresh()->total_points)->toBe(40);
});

test('FT-F16-09 - a submission without answers is rejected', function () {
    // Boundary: submission, invalid side (missing answers array).
    $challenge = f16Challenge();
    ChallengeQuestion::factory()->for($challenge)->text()->create();
    $student = f16Student();

    $this->actingAs($student)
        ->post(route('challenges.submit', $challenge), [])
        ->assertSessionHasErrors(['answers']);

    expect(ChallengeAttempt::query()->count())->toBe(0);
});

test('FT-F16-10 - a worse retry logs an attempt but awards nothing', function () {
    // Boundary: scoring. The personal best pays once; the weaker retry is
    // recorded with zero awarded and the total stays put.
    $challenge = f16Challenge(100);
    $question = ChallengeQuestion::factory()->for($challenge)->text()->create();
    $right = ChallengeAnswer::factory()->correct()->for($question)->create();
    $wrong = ChallengeAnswer::factory()->for($question)->create();
    $student = f16Student();

    $this->actingAs($student)
        ->post(route('challenges.submit', $challenge), [
            'answers' => [$question->id => $right->id],
        ]);

    $this->actingAs($student)
        ->post(route('challenges.submit', $challenge), [
            'answers' => [$question->id => $wrong->id],
        ]);

    $attempts = ChallengeAttempt::query()->orderBy('id')->get();

    expect($attempts)->toHaveCount(2)
        ->and($attempts[0]->points_awarded)->toBe(100)
        ->and($attempts[1]->score)->toBe(0)
        ->and($attempts[1]->points_awarded)->toBe(0)
        ->and($student->fresh()->total_points)->toBe(100);
});

/**
 * A verified student account with a clean points total.
 *
 * @param  array<string, mixed>  $attributes
 */
function f16Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
        'total_points' => 0,
    ], $attributes));
}

/**
 * A challenge with the given points and a twenty-minute limit.
 */
function f16Challenge(int $points = 100): Challenge
{
    return Challenge::factory()->create([
        'points' => $points,
        'duration' => 20,
    ]);
}
