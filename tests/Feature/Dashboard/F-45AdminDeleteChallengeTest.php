<?php

/**
 * F-45 - Fungsi menghapus tantangan oleh admin
 *
 * Feature tests for the admin's delete-challenge flow: DELETE /dashboard/
 * challenges/{challenge} (route dashboard.challenges.destroy), behind the
 * auth -> verified -> admin gate. The delete action on the listing submits
 * this endpoint and the response returns the admin to the listing.
 *
 * Method: equivalence partitioning (EP) over the delete request's domains,
 * then boundary value analysis (BVA) of the delete-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain       | Valid classes                              | Invalid classes                            |
 * |--------------|--------------------------------------------|--------------------------------------------|
 * | access       | admin                                      | student, guest                             |
 * | target       | an existing challenge                      | an unknown id                              |
 * | tree state   | questions with answers, bare               | -                                          |
 * | cascade      | the challenge's questions, answers,        | an orphaned child row                      |
 * |              | and attempts                               |                                            |
 * | files        | stored cover and question audio            | a stored file surviving its challenge      |
 * | persistence  | the row is hard-deleted                    | the row surviving a rejected request       |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F45-01 | success baseline; cascade                   | delete a challenge with a tree     | redirect to the listing; challenge, questions, answers,   |
 * |           |                                             | and attempts gone                                         |
 * | FT-F45-02 | files - stored cover and question audio     | challenges/cover + audio/clip      | both files deleted; unrelated files kept                  |
 * | FT-F45-03 | tree state - bare challenge                 | a challenge with no questions      | redirect to the listing; row gone                         |
 * | FT-F45-04 | access - student (invalid side)             | student DELETE                     | 403; row, question, and cover survive                     |
 * | FT-F45-05 | access - guest (invalid side)               | logged-out DELETE                  | redirect to login; row survives                           |
 * | FT-F45-06 | target - unknown id (invalid side)          | DELETE on a non-existent challenge | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * ChallengesManagementTest already proves the happy path (redirect and row
 * gone), the stored-file cleanup, and the question-tree cascade, plus the
 * student rejection. F-45 deliberately repeats those so the feature file is
 * self-contained; the new content is the attempts cascade (the challenge's
 * own children), the exact file set (cover plus per-question audio, with an
 * unrelated file left alone), the bare-challenge target, the guest DELETE,
 * and the unknown-id 404.
 *
 * The listing the redirect returns to is F-43's subject; the create and
 * update flows are F-42 and F-44. The student's attempt history lives on
 * F-16's detail page. The gate ordering is F-04's subject; this route shares
 * the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Delete is hard: the row is gone, not flagged or hidden.
 * - The cascading foreign keys take the challenge's questions and answers,
 *   plus the attempt history - every score row belongs to the challenge, so
 *   nothing is left behind.
 * - The stored cover under challenges/ and each question's audio under
 *   challenges/audio/ are deleted from the public disk; unrelated files and
 *   external URLs are left alone.
 * - A rejected request leaves the row, its tree, and its files untouched.
 * - An unknown target id is a 404, not a validation error.
 */

use App\Models\Challenge;
use App\Models\ChallengeAnswer;
use App\Models\ChallengeAttempt;
use App\Models\ChallengeQuestion;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f45Admin();
});

test('FT-F45-01 - an admin deletes a challenge with its whole tree', function () {
    // Boundary: success baseline and the cascade. Questions, answers, and the
    // attempt history go with the challenge.
    $challenge = Challenge::factory()->create(['title' => 'Cascade Challenge']);
    $question = ChallengeQuestion::factory()->for($challenge)->text()->create();
    ChallengeAnswer::factory()->for($question)->create();
    ChallengeAnswer::factory()->correct()->for($question)->create();
    $student = User::factory()->create(['role' => 'student']);
    ChallengeAttempt::factory()->for($student)->for($challenge)->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.challenges.destroy', $challenge))
        ->assertRedirect(route('dashboard.challenges'));

    expect(Challenge::query()->find($challenge->id))->toBeNull()
        ->and(ChallengeQuestion::query()->find($question->id))->toBeNull()
        ->and(ChallengeAnswer::query()->where('challenge_question_id', $question->id)->exists())->toBeFalse()
        ->and(ChallengeAttempt::query()->where('challenge_id', $challenge->id)->exists())->toBeFalse();
});

test('FT-F45-02 - deleting a challenge removes its cover and question audio', function () {
    // Boundary: files, valid side. Only the challenge's own files are removed;
    // an unrelated file on the same disk survives.
    Storage::fake('public');
    Storage::disk('public')->put('challenges/cover.png', 'cover');
    Storage::disk('public')->put('challenges/audio/clip.wav', 'audio');
    Storage::disk('public')->put('challenges/unrelated.png', 'unrelated');
    $challenge = Challenge::factory()->create(['image_url' => 'challenges/cover.png']);
    ChallengeQuestion::factory()->for($challenge)->listening()->create([
        'audio_url' => 'challenges/audio/clip.wav',
    ]);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.challenges.destroy', $challenge))
        ->assertRedirect(route('dashboard.challenges'));

    Storage::disk('public')->assertMissing('challenges/cover.png');
    Storage::disk('public')->assertMissing('challenges/audio/clip.wav');
    Storage::disk('public')->assertExists('challenges/unrelated.png');
});

test('FT-F45-03 - an admin deletes a bare challenge', function () {
    // Boundary: tree state, valid side (no questions to cascade).
    $challenge = Challenge::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.challenges.destroy', $challenge))
        ->assertRedirect(route('dashboard.challenges'));

    expect(Challenge::query()->find($challenge->id))->toBeNull();
});

test('FT-F45-04 - a student cannot delete a challenge', function () {
    // Boundary: access, invalid side (role). The rejected request leaves the
    // row, its question, and its stored cover intact.
    Storage::fake('public');
    Storage::disk('public')->put('challenges/cover.png', 'cover');
    $challenge = Challenge::factory()->create(['image_url' => 'challenges/cover.png']);
    $question = ChallengeQuestion::factory()->for($challenge)->text()->create();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->delete(route('dashboard.challenges.destroy', $challenge))
        ->assertForbidden();

    expect(Challenge::query()->find($challenge->id))->not->toBeNull()
        ->and(ChallengeQuestion::query()->find($question->id))->not->toBeNull();
    Storage::disk('public')->assertExists('challenges/cover.png');
});

test('FT-F45-05 - a guest cannot delete a challenge', function () {
    // Boundary: access, invalid side (authentication).
    $challenge = Challenge::factory()->create();

    $this->delete(route('dashboard.challenges.destroy', $challenge))
        ->assertRedirect(route('login'));

    expect(Challenge::query()->find($challenge->id))->not->toBeNull();
});

test('FT-F45-06 - deleting an unknown challenge is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->delete(route('dashboard.challenges.destroy', 999999))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f45Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
