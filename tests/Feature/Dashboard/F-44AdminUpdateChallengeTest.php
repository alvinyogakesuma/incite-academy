<?php

/**
 * F-44 - Fungsi mengubah detail tantangan oleh admin
 *
 * Feature tests for the admin's challenge save: PUT /dashboard/challenges/
 * {challenge} (route dashboard.challenges.update), behind the auth -> verified
 * -> admin gate. The editor submits the whole payload - the metadata, the
 * cover image (a retained stored cover, a fresh upload, or a removal), and the
 * question/answer tree - in one call.
 *
 * Method: equivalence partitioning (EP) per input domain, then robust boundary
 * value analysis (BVA) - every identified boundary carries both a valid-side
 * and an invalid-side input.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                                        |
 * |-------------------|------------------------------------------------|--------------------------------------------------------|
 * | access            | admin                                          | student, guest                                         |
 * | target            | an existing challenge                          | an unknown id                                          |
 * | title             | 1..255 characters                              | missing, 256+ characters                               |
 * | description       | present                                        | missing                                                |
 * | category          | the three Category enum values                 | any value outside the enum                             |
 * | difficulty        | Easy, Medium, Hard                             | any value outside the enum                             |
 * | points            | 0..                                            | -1                                                     |
 * | duration          | 1..                                            | 0                                                      |
 * | cover image       | retained stored cover, fresh upload            | none when the challenge has none, removed without a    |
 * |                   |                                                | replacement, non-image file, over 2048 KB              |
 * | question type     | text, listening                                | any other value                                        |
 * | question content  | present                                        | missing                                                |
 * | answers count     | 2..6 per question                              | 1, 7                                                   |
 * | tree state        | empty, stored rows present                     | stored rows wiped by the save                          |
 * | audio             | listening with a stored file, remove_audio     | a stored file surviving a removal                      |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F44-01 | success baseline; retained cover            | full payload, external cover       | redirect to the listing; fields updated; cover kept       |
 * | FT-F44-02 | title length - 255 / 256                    | 255 / 256 chars                    | accepted / rejected on title                              |
 * | FT-F44-03 | description - missing (invalid side)        | omitted                            | rejected on description; row unchanged                    |
 * | FT-F44-04 | category - member / outsider                | valid value / Science              | accepted / rejected on category                           |
 * | FT-F44-05 | difficulty - member / outsider              | Hard / Expert                      | accepted / rejected on difficulty                         |
 * | FT-F44-06 | points - 0 / -1                             | 0 / -1                             | accepted / rejected on points                             |
 * | FT-F44-07 | duration - 1 / 0                            | 1 / 0                              | accepted / rejected on duration                           |
 * | FT-F44-08 | cover - none stored, none uploaded          | null image_url                     | rejected on image; row untouched                          |
 * | FT-F44-09 | cover - removal without a replacement       | remove_image=1, no upload          | rejected on image; stored cover kept                      |
 * | FT-F44-10 | cover - fresh upload replaces the stored    | stored challenges/old.png + upload | new stored path; old file deleted                         |
 * | FT-F44-11 | cover - non-image file                      | application/pdf                    | rejected on image                                         |
 * | FT-F44-12 | cover - size 2048 / 2049 KB                 | 2048 / 2049 KB image               | accepted / rejected on image                              |
 * | FT-F44-13 | answers count - 1 / 6 / 7                   | one, six, seven answers            | rejected / accepted / rejected on questions.0.answers     |
 * | FT-F44-14 | question content - missing (invalid side)   | question_content omitted           | rejected on questions.0.question_content                  |
 * | FT-F44-15 | question type - outsider (invalid side)     | video                              | rejected on questions.0.type                              |
 * | FT-F44-16 | tree state - stored rows plus a new row     | one stored question + one new      | both survive; new row ordered after the stored one        |
 * | FT-F44-17 | audio - remove_audio on a stored file       | stored challenges/audio/clip.wav   | stored file deleted; audio_url null                       |
 * | FT-F44-18 | access - student (invalid side)             | student PUT                        | 403; row unchanged                                        |
 * | FT-F44-19 | access - guest (invalid side)               | logged-out PUT                     | redirect to login; row unchanged                          |
 * | FT-F44-20 | target - unknown id (invalid side)          | PUT on a non-existent challenge    | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * ChallengesManagementTest already covers the success baseline with a fresh
 * cover, the cover-required rejection, the question-tree sync, and the audio
 * keep/replace/drop rules. F-44 deliberately repeats the baseline, the
 * cover-required case, the mixed tree, and the audio drop so the feature file
 * is self-contained; the new content is the title and description limits, the
 * category and difficulty membership pairs, the points and duration minimums,
 * the removal rule, the size boundary, the answers 2..6 quartet, the missing
 * content and invalid type rejections, the guest PUT, and the unknown-id 404.
 *
 * The listing the save returns to is F-43's subject; the create flow is F-42's
 * and the delete F-45's. The student's take room is F-16's. The question-tree
 * shape mirrors the lesson save (F-40) with the challenge's is_correct flag.
 * The gate ordering is F-04's subject; this route shares the same middleware
 * group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Update takes the full payload; it is not a partial patch.
 * - Points accept zero; duration starts at one. A negative points value and a
 *   zero duration are both rejected.
 * - The cover is required unless the challenge already has one and the save
 *   keeps it. Removing without a replacement is rejected and the stored cover
 *   survives the rejected request.
 * - A fresh upload replaces the stored file: the previous file under the
 *   challenges/ prefix is deleted. External cover URLs pass through untouched.
 * - The question tree is a whole-payload sync: rows without an id create,
 *   stored rows missing from the payload delete with their answers, and a
 *   stored listening question can drop its audio through remove_audio.
 * - Validation failures leave the stored row exactly as it was.
 */

use App\Enums\Category;
use App\Enums\Difficulty;
use App\Models\Challenge;
use App\Models\ChallengeAnswer;
use App\Models\ChallengeQuestion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f44Admin();
});

test('FT-F44-01 - an admin updates the challenge metadata and keeps the cover', function () {
    // Boundary: success baseline. The whole metadata save lands and the
    // retained external cover stays untouched.
    $challenge = f44Challenge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload())
        ->assertRedirect(route('dashboard.challenges'));

    $challenge->refresh();

    expect($challenge->title)->toBe('Updated Challenge')
        ->and($challenge->description)->toBe('An updated description.')
        ->and($challenge->category?->value)->toBe(Category::ReadingComprehension->value)
        ->and($challenge->difficulty?->value)->toBe(Difficulty::Medium->value)
        ->and($challenge->points)->toBe(120)
        ->and($challenge->duration)->toBe(15)
        ->and($challenge->image_url)->toBe('https://example.com/cover.png');
});

test('FT-F44-02 - the title boundary is 255 characters', function () {
    // Boundary: title max / max+1.
    $challenge = f44Challenge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'title' => str_repeat('c', 255),
        ]))
        ->assertRedirect(route('dashboard.challenges'));

    expect($challenge->fresh()->title)->toHaveLength(255);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'title' => str_repeat('c', 256),
        ]))
        ->assertSessionHasErrors(['title']);

    expect($challenge->fresh()->title)->toHaveLength(255);
});

test('FT-F44-03 - the description is required', function () {
    // Boundary: description, invalid side (missing).
    $challenge = f44Challenge();

    $payload = f44Payload();
    unset($payload['description']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), $payload)
        ->assertSessionHasErrors(['description']);

    expect($challenge->fresh()->description)->toBe('Original description.');
});

test('FT-F44-04 - the category must be a member of the enum', function () {
    // Partition: category. A member is stored; an outsider is rejected.
    $challenge = f44Challenge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'category' => Category::ListeningComprehension->value,
        ]))
        ->assertRedirect(route('dashboard.challenges'));

    expect($challenge->fresh()->category?->value)->toBe(Category::ListeningComprehension->value);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'category' => 'Science',
        ]))
        ->assertSessionHasErrors(['category']);

    expect($challenge->fresh()->category?->value)->toBe(Category::ListeningComprehension->value);
});

test('FT-F44-05 - the difficulty must be a member of the enum', function () {
    // Partition: difficulty. A member is stored; an outsider is rejected.
    $challenge = f44Challenge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'difficulty' => Difficulty::Hard->value,
        ]))
        ->assertRedirect(route('dashboard.challenges'));

    expect($challenge->fresh()->difficulty?->value)->toBe(Difficulty::Hard->value);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'difficulty' => 'Expert',
        ]))
        ->assertSessionHasErrors(['difficulty']);

    expect($challenge->fresh()->difficulty?->value)->toBe(Difficulty::Hard->value);
});

test('FT-F44-06 - the points minimum is zero', function () {
    // Boundary: points 0 / -1.
    $challenge = f44Challenge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload(['points' => 0]))
        ->assertRedirect(route('dashboard.challenges'));

    expect($challenge->fresh()->points)->toBe(0);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload(['points' => -1]))
        ->assertSessionHasErrors(['points']);

    expect($challenge->fresh()->points)->toBe(0);
});

test('FT-F44-07 - the duration minimum is one minute', function () {
    // Boundary: duration 1 / 0.
    $challenge = f44Challenge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload(['duration' => 1]))
        ->assertRedirect(route('dashboard.challenges'));

    expect($challenge->fresh()->duration)->toBe(1);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload(['duration' => 0]))
        ->assertSessionHasErrors(['duration']);

    expect($challenge->fresh()->duration)->toBe(1);
});

test('FT-F44-08 - a cover is required when the challenge has none', function () {
    // Boundary: cover, invalid side (none stored, none uploaded).
    $challenge = f44Challenge(['image_url' => null]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload())
        ->assertSessionHasErrors(['image']);

    expect($challenge->fresh()->image_url)->toBeNull();
});

test('FT-F44-09 - removing the cover without a replacement is rejected', function () {
    // Boundary: cover, invalid side (remove_image without an upload). The
    // stored cover survives the rejected request.
    Storage::fake('public');
    Storage::disk('public')->put('challenges/old.png', 'old cover');
    $challenge = f44Challenge(['image_url' => 'challenges/old.png']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload(['remove_image' => true]))
        ->assertSessionHasErrors(['image']);

    expect($challenge->fresh()->image_url)->toBe('challenges/old.png');
    Storage::disk('public')->assertExists('challenges/old.png');
});

test('FT-F44-10 - a fresh upload replaces the stored cover', function () {
    // Boundary: cover, valid side (fresh upload). The new file replaces the
    // stored one and the old file is deleted.
    Storage::fake('public');
    Storage::disk('public')->put('challenges/old.png', 'old cover');
    $challenge = f44Challenge(['image_url' => 'challenges/old.png']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...f44Payload(),
            'image' => UploadedFile::fake()->image('new.png'),
        ])
        ->assertRedirect(route('dashboard.challenges'));

    $challenge->refresh();

    expect($challenge->image_url)->toStartWith('challenges/')
        ->and($challenge->image_url)->not->toBe('challenges/old.png');

    Storage::disk('public')->assertExists($challenge->image_url);
    Storage::disk('public')->assertMissing('challenges/old.png');
});

test('FT-F44-11 - a non-image cover is rejected', function () {
    // Boundary: cover, invalid side (mime).
    $challenge = f44Challenge(['image_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...f44Payload(),
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors(['image']);

    expect($challenge->fresh()->image_url)->toBeNull();
});

test('FT-F44-12 - the cover size boundary is 2048 KB', function () {
    // Boundary: cover size max / max+1.
    Storage::fake('public');
    $challenge = f44Challenge(['image_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...f44Payload(),
            'image' => UploadedFile::fake()->image('max.png')->size(2048),
        ])
        ->assertRedirect(route('dashboard.challenges'));

    expect($challenge->fresh()->image_url)->toStartWith('challenges/');

    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...f44Payload(),
            'image' => UploadedFile::fake()->image('over.png')->size(2049),
        ])
        ->assertSessionHasErrors(['image']);
});

test('FT-F44-13 - the answers count spans 2 to 6', function () {
    // Boundary: answers count. One is below the minimum, six is the maximum,
    // seven is above it; the rejected rows write nothing.
    $challenge = f44Challenge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'questions' => [f44Question(answers: 1)],
        ]))
        ->assertSessionHasErrors(['questions.0.answers']);

    expect(ChallengeQuestion::query()->where('challenge_id', $challenge->id)->count())->toBe(0);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'questions' => [f44Question(answers: 6)],
        ]))
        ->assertRedirect(route('dashboard.challenges'));

    $question = ChallengeQuestion::query()->sole();

    expect($question->answers()->count())->toBe(6);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'questions' => [f44Question(answers: 7)],
        ]))
        ->assertSessionHasErrors(['questions.0.answers']);

    expect($question->answers()->count())->toBe(6);
});

test('FT-F44-14 - a question without content is rejected', function () {
    // Boundary: question content, invalid side (missing).
    $challenge = f44Challenge();
    $question = f44Question();
    unset($question['question_content']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload(['questions' => [$question]]))
        ->assertSessionHasErrors(['questions.0.question_content']);

    expect(ChallengeQuestion::query()->count())->toBe(0);
});

test('FT-F44-15 - an unknown question type is rejected', function () {
    // Boundary: question type, invalid side (outside text/listening).
    $challenge = f44Challenge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'questions' => [f44Question(type: 'video')],
        ]))
        ->assertSessionHasErrors(['questions.0.type']);

    expect(ChallengeQuestion::query()->count())->toBe(0);
});

test('FT-F44-16 - saving keeps the stored question and appends the new row', function () {
    // Boundary: tree state. The stored row rides the payload with its ids;
    // the new row is appended after it.
    $challenge = f44Challenge();
    $stored = ChallengeQuestion::factory()->for($challenge)->text()->create([
        'question_content' => 'Stored challenge question?',
        'order_index' => 0,
    ]);
    $storedCorrect = ChallengeAnswer::factory()->correct()->for($stored)->create(['answer_content' => 'Stored correct']);
    $storedWrong = ChallengeAnswer::factory()->for($stored)->create(['answer_content' => 'Stored wrong']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'questions' => [
                [
                    'id' => $stored->id,
                    'type' => 'text',
                    'question_content' => 'Stored challenge question?',
                    'answers' => [
                        ['id' => $storedCorrect->id, 'answer_content' => 'Stored correct', 'is_correct' => '1'],
                        ['id' => $storedWrong->id, 'answer_content' => 'Stored wrong', 'is_correct' => '0'],
                    ],
                ],
                f44Question('New challenge question?'),
            ],
        ]))
        ->assertRedirect(route('dashboard.challenges'));

    $created = ChallengeQuestion::query()->whereKeyNot($stored->id)->sole();

    expect(ChallengeQuestion::query()->where('challenge_id', $challenge->id)->count())->toBe(2)
        ->and($stored->fresh())->not->toBeNull()
        ->and($created->order_index)->toBe(1)
        ->and(ChallengeAnswer::query()->count())->toBe(4);
});

test('FT-F44-17 - remove_audio drops the stored listening audio', function () {
    // Boundary: audio, valid side (removal). The stored file under the
    // challenges/audio prefix is deleted and the url is cleared.
    Storage::fake('public');
    Storage::disk('public')->put('challenges/audio/clip.wav', 'stub');
    $challenge = f44Challenge();
    $question = ChallengeQuestion::factory()->for($challenge)->listening()->create([
        'audio_url' => 'challenges/audio/clip.wav',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload([
            'questions' => [
                [
                    'id' => $question->id,
                    'type' => 'listening',
                    'question_content' => $question->question_content,
                    'remove_audio' => '1',
                    'answers' => f44Answers(2),
                ],
            ],
        ]))
        ->assertRedirect(route('dashboard.challenges'));

    expect($question->fresh()->audio_url)->toBeNull();
    Storage::disk('public')->assertMissing('challenges/audio/clip.wav');
});

test('FT-F44-18 - a student cannot update a challenge', function () {
    // Boundary: access, invalid side (role).
    $challenge = f44Challenge();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->put(route('dashboard.challenges.update', $challenge), f44Payload(['title' => 'Hacked Title']))
        ->assertForbidden();

    expect($challenge->fresh()->title)->toBe('Old Challenge');
});

test('FT-F44-19 - a guest cannot update a challenge', function () {
    // Boundary: access, invalid side (authentication).
    $challenge = f44Challenge();

    $this->put(route('dashboard.challenges.update', $challenge), f44Payload(['title' => 'Hacked Title']))
        ->assertRedirect(route('login'));

    expect($challenge->fresh()->title)->toBe('Old Challenge');
});

test('FT-F44-20 - updating an unknown challenge is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->put(route('dashboard.challenges.update', 999999), f44Payload())
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f44Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * A challenge with a retained external cover, so the image rule is satisfied
 * without touching the disk.
 *
 * @param  array<string, mixed>  $attributes
 */
function f44Challenge(array $attributes = []): Challenge
{
    return Challenge::factory()->create(array_merge([
        'title' => 'Old Challenge',
        'description' => 'Original description.',
        'image_url' => 'https://example.com/cover.png',
    ], $attributes));
}

/**
 * A valid whole-payload save.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function f44Payload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Updated Challenge',
        'description' => 'An updated description.',
        'category' => Category::ReadingComprehension->value,
        'difficulty' => Difficulty::Medium->value,
        'points' => 120,
        'duration' => 15,
    ], $overrides);
}

/**
 * A new question row with the given content, answer count, and type.
 *
 * @param  array<string, mixed>  $extra
 * @return array<string, mixed>
 */
function f44Question(
    string $content = 'Challenge question?',
    int $answers = 2,
    string $type = 'text',
    array $extra = [],
): array {
    return array_merge([
        'type' => $type,
        'question_content' => $content,
        'answers' => f44Answers($answers),
    ], $extra);
}

/**
 * The answer rows for one question, the first marked correct.
 *
 * @return array<int, array<string, string>>
 */
function f44Answers(int $count): array
{
    return collect(range(1, $count))
        ->map(fn (int $index): array => [
            'answer_content' => 'Choice '.$index,
            'is_correct' => $index === 1 ? '1' : '0',
        ])
        ->all();
}
