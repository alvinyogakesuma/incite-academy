<?php

/**
 * F-15 - Halaman daftar tantangan
 *
 * Feature tests for the student-facing challenge listing: GET /challenges
 * (route challenges), behind the auth -> verified gate. Every challenge is
 * delivered in one `challenges` prop (search, filtering, sorting, and
 * pagination are handled client-side), each card carrying the stored
 * metadata, its question count, and its cover.
 *
 * Method: equivalence partitioning (EP) over the listing's domains, then
 * boundary value analysis (BVA) of the list-only boundaries - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | composition       | challenges with and without questions          | a challenge omitted from the list            |
 * | ordering          | title-ordered                                  | creation order                               |
 * | field exposure    | the nine card fields                           | timestamps, order indexes, answer rows       |
 * | image_url         | stored challenges/ path, external URL, null    | a raw stored path reaching the browser       |
 * | questions_count   | zero, many                                     | a stale count                                |
 * | categories prop   | the three enum values                          | a value outside the enum                     |
 * | table state       | empty, populated                               | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F15-01 | access - verified student (valid side)      | student GET                        | 200 with challenges + categories props                    |
 * | FT-F15-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F15-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F15-04 | composition - every stored challenge        | three rows, one without questions  | all three appear                                          |
 * | FT-F15-05 | ordering - by title                         | challenges created out of order    | entries appear title-ordered                              |
 * | FT-F15-06 | exposure - card values (valid side)         | one fully-populated challenge      | the nine fields carry the right values                    |
 * | FT-F15-07 | exposure - withheld fields (invalid side)   | the same entry                     | exactly the nine keys; no timestamps or order indexes     |
 * | FT-F15-08 | image_url - stored / external / null        | three challenges                   | disk URL / unchanged / null                               |
 * | FT-F15-09 | questions_count - zero / many               | 0 and 2 questions                  | 0 and 2                                                   |
 * | FT-F15-10 | table state - empty (boundary)              | no challenges                      | an empty list; the categories prop still rides along      |
 *
 * == Relation to the existing suites =========================================
 *
 * StudentChallengesPageTest already proves the access trio, the card field
 * mapping, and the per-challenge question count. F-15 deliberately repeats
 * those so the feature file is self-contained; the new content is the title
 * ordering, the exact key set, the three-way image mapping, the zero-question
 * boundary, and the empty listing.
 *
 * The challenge detail and room are F-16's subject; the admin listing is
 * F-43's. The gate ordering is F-04's subject; this route shares the same
 * middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - Challenges have no draft status: every stored row reaches the listing.
 * - The card is nine fields. The timestamps and the order indexes stay on
 *   the server, and the questions themselves ride only the take screen.
 * - The question count is a query-time count, so a challenge without
 *   questions shows zero rather than disappearing.
 * - A stored cover under `challenges/` becomes a public disk URL; an
 *   external URL passes through; a missing cover stays null.
 * - The categories prop is built from the enum, so it is complete even when
 *   no challenge uses a category.
 */

use App\Enums\Category;
use App\Models\Challenge;
use App\Models\ChallengeQuestion;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F15-01 - a verified student opens the challenge listing', function () {
    // Boundary: access, valid side (baseline). The categories prop rides
    // along with the cards.
    $this->actingAs(f15Student())
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Challenges', false)
            ->has('challenges')
            ->where('categories', fn ($categories) => collect($categories)->values()->all() === [
                Category::ReadingComprehension->value,
                Category::ListeningComprehension->value,
                Category::StructureAndWritingExpression->value,
            ]));
});

test('FT-F15-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('challenges'))->assertRedirect(route('login'));
});

test('FT-F15-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('challenges'))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F15-04 - every stored challenge appears, with or without questions', function () {
    // Partition: composition. A challenge without questions is still listed,
    // so the page is a full roster rather than a playable-only filter.
    Challenge::factory()->create(['title' => 'First Challenge']);
    Challenge::factory()->create(['title' => 'Second Challenge']);
    Challenge::factory()->create(['title' => 'Third Challenge']);

    $this->actingAs(f15Student())
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('challenges', 3)
            ->where('challenges', fn ($challenges) => collect($challenges)->pluck('title')->all() === [
                'First Challenge',
                'Second Challenge',
                'Third Challenge',
            ]));
});

test('FT-F15-05 - the listing is ordered by title, not by creation order', function () {
    // Partition: ordering. Created in reverse alphabetical order to make the
    // ordering observable.
    Challenge::factory()->create(['title' => 'Zulu Challenge']);
    Challenge::factory()->create(['title' => 'Alpha Challenge']);
    Challenge::factory()->create(['title' => 'Mike Challenge']);

    $this->actingAs(f15Student())
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenges', fn ($challenges) => collect($challenges)->pluck('title')->all() === [
                'Alpha Challenge',
                'Mike Challenge',
                'Zulu Challenge',
            ]));
});

test('FT-F15-06 - an entry carries the nine card values', function () {
    // Boundary: field exposure, valid side. Every card field is populated
    // with a distinct value so a swapped or truncated mapping fails.
    $challenge = Challenge::factory()->create([
        'title' => 'Reading Sprint',
        'description' => 'A timed reading duel.',
        'category' => Category::ReadingComprehension->value,
        'difficulty' => 'Hard',
        'points' => 150,
        'duration' => 20,
        'image_url' => 'https://cdn.example.com/challenge.jpg',
    ]);

    $this->actingAs(f15Student())
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenges.0.id', $challenge->id)
            ->where('challenges.0.title', 'Reading Sprint')
            ->where('challenges.0.description', 'A timed reading duel.')
            ->where('challenges.0.category', Category::ReadingComprehension->value)
            ->where('challenges.0.difficulty', 'Hard')
            ->where('challenges.0.points', 150)
            ->where('challenges.0.duration', 20)
            ->where('challenges.0.image_url', 'https://cdn.example.com/challenge.jpg')
            ->where('challenges.0.questions_count', 0));
});

test('FT-F15-07 - an entry withholds every non-card field', function () {
    // Boundary: field exposure, invalid side. Comparing the entry's key set
    // against the nine card fields rejects both a missing field and any
    // additional field.
    Challenge::factory()->create(['title' => 'Key Set Challenge']);

    $this->actingAs(f15Student())
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenges.0', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'category',
                'description',
                'difficulty',
                'duration',
                'id',
                'image_url',
                'points',
                'questions_count',
                'title',
            ]));
});

test('FT-F15-08 - the cover image is delivered in three shapes', function () {
    // Partition: image_url. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing cover stays null.
    Storage::fake('public');
    Challenge::factory()->create(['title' => 'A Stored Cover', 'image_url' => 'challenges/cover.jpg']);
    Challenge::factory()->create(['title' => 'B External Cover', 'image_url' => 'https://cdn.example.com/cover.jpg']);
    Challenge::factory()->create(['title' => 'C No Cover', 'image_url' => null]);

    $this->actingAs(f15Student())
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenges.0.image_url', Storage::disk('public')->url('challenges/cover.jpg'))
            ->where('challenges.1.image_url', 'https://cdn.example.com/cover.jpg')
            ->where('challenges.2.image_url', null));
});

test('FT-F15-09 - the question count spans zero and many', function () {
    // Boundary: questions_count. A challenge without questions shows zero;
    // one with two questions shows two.
    $empty = Challenge::factory()->create(['title' => 'A Empty Challenge']);
    $full = Challenge::factory()->create(['title' => 'B Full Challenge']);
    ChallengeQuestion::factory()->for($full)->text()->create();
    ChallengeQuestion::factory()->for($full)->text()->create();

    $this->actingAs(f15Student())
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenges.0.id', $empty->id)
            ->where('challenges.0.questions_count', 0)
            ->where('challenges.1.id', $full->id)
            ->where('challenges.1.questions_count', 2));
});

test('FT-F15-10 - an empty listing still carries the categories prop', function () {
    // Boundary: table state. With no challenges the list is empty, not the
    // page: the categories prop still rides along for the client filter.
    $this->actingAs(f15Student())
        ->get(route('challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('challenges', 0)
            ->has('categories', 3));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f15Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}
