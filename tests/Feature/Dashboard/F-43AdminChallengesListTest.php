<?php

/**
 * F-43 - Halaman daftar tantangan oleh admin
 *
 * Feature tests for the admin's challenge listing: GET /dashboard/challenges
 * (route dashboard.challenges), behind the auth -> verified -> admin gate.
 * Every stored challenge is delivered in one `challenges` prop (search,
 * filtering, sorting, and pagination are handled client-side), each card
 * carrying the stored metadata, the question count, and the cover.
 *
 * Method: equivalence partitioning (EP) over the listing's domains, then
 * boundary value analysis (BVA) of the list-only boundaries - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | admin                                          | student, guest                               |
 * | composition       | challenges with and without questions          | a challenge omitted from the list            |
 * | ordering          | title-ordered                                  | creation order                               |
 * | field exposure    | the nine card fields                           | timestamps, order indexes, answer rows       |
 * | image_url         | stored challenges/ path, external URL, null    | a raw stored path reaching the browser       |
 * | questions_count   | zero, many                                     | a stale count                                |
 * | categories prop   | the three enum values                          | a value outside the enum                     |
 * | table state       | empty, populated, fresh blank draft            | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F43-01 | access - admin (valid side)                 | admin GET                          | 200 with challenges + categories props                    |
 * | FT-F43-02 | access - student (invalid side)             | student GET                        | 403                                                       |
 * | FT-F43-03 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F43-04 | ordering - by title                         | challenges created out of order    | entries appear title-ordered                              |
 * | FT-F43-05 | exposure - card values (valid side)         | one fully-populated challenge      | the nine fields carry the right values                    |
 * | FT-F43-06 | exposure - withheld fields (invalid side)   | the same entry                     | exactly the nine keys; no timestamps or order indexes     |
 * | FT-F43-07 | image_url - stored / external / null        | three challenges                   | disk URL / unchanged / null                               |
 * | FT-F43-08 | questions_count - zero / many               | 0 and 2 questions                  | 0 and 2                                                   |
 * | FT-F43-09 | table state - after an add-challenge call   | empty table, then POST store       | the new blank challenge appears with its defaults          |
 *
 * == Relation to the existing suites =========================================
 *
 * ChallengesManagementTest already proves the access trio and the card shape
 * mapping. F-43 deliberately repeats those so the feature file is
 * self-contained; the new content is the title ordering, the exact key set,
 * the three-way image mapping, the zero-question boundary, and the
 * appearance of a freshly created blank challenge.
 *
 * The add flow that produces the draft is F-42's subject; the editor is
 * F-44's and the delete F-45's. The student's own challenge listing is F-15's
 * subject. The gate ordering is F-04's subject; this route shares the same
 * middleware group. The client-side search, filter, sort, and pagination
 * behavior has its own vitest coverage.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - Challenges have no draft status: every stored row reaches the admin list,
 *   including the blank row the Add Challenge button just created.
 * - The card is nine fields. The timestamps and the order indexes never reach
 *   the browser.
 * - The question count is a query-time count, so a challenge without
 *   questions shows zero rather than disappearing.
 * - A stored cover under `challenges/` becomes a public disk URL; an external
 *   URL passes through; a missing cover stays null.
 * - The categories prop is built from the enum, so it is complete even when
 *   no challenge uses a category.
 */

use App\Enums\Category;
use App\Enums\Difficulty;
use App\Models\Challenge;
use App\Models\ChallengeQuestion;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F43-01 - an admin views the challenges management page', function () {
    // Boundary: access, valid side (baseline). The categories prop rides along
    // with the cards.
    $this->actingAs(f43Admin())
        ->get(route('dashboard.challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Challenges', false)
            ->has('challenges')
            ->where('categories', fn ($categories) => collect($categories)->values()->all() === [
                Category::ReadingComprehension->value,
                Category::ListeningComprehension->value,
                Category::StructureAndWritingExpression->value,
            ]));
});

test('FT-F43-02 - a student is forbidden from the challenges management page', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.challenges'))
        ->assertForbidden();
});

test('FT-F43-03 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('dashboard.challenges'))->assertRedirect(route('login'));
});

test('FT-F43-04 - the listing is ordered by title, not by creation order', function () {
    // Partition: ordering. Created in reverse alphabetical order to make the
    // ordering observable.
    Challenge::factory()->create(['title' => 'Zulu Challenge']);
    Challenge::factory()->create(['title' => 'Alpha Challenge']);
    Challenge::factory()->create(['title' => 'Mike Challenge']);

    $this->actingAs(f43Admin())
        ->get(route('dashboard.challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenges', fn ($challenges) => collect($challenges)->pluck('title')->all() === [
                'Alpha Challenge',
                'Mike Challenge',
                'Zulu Challenge',
            ]));
});

test('FT-F43-05 - an entry carries the nine card values', function () {
    // Boundary: field exposure, valid side. Every card field is populated with
    // a distinct value so a swapped or truncated mapping fails.
    $challenge = Challenge::factory()->create([
        'title' => 'Reading Sprint',
        'description' => 'A timed reading duel.',
        'category' => Category::ListeningComprehension->value,
        'difficulty' => Difficulty::Hard->value,
        'points' => 150,
        'duration' => 20,
        'image_url' => 'https://cdn.example.com/challenge.jpg',
    ]);

    $this->actingAs(f43Admin())
        ->get(route('dashboard.challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenges.0.id', $challenge->id)
            ->where('challenges.0.title', 'Reading Sprint')
            ->where('challenges.0.description', 'A timed reading duel.')
            ->where('challenges.0.category', Category::ListeningComprehension->value)
            ->where('challenges.0.difficulty', Difficulty::Hard->value)
            ->where('challenges.0.points', 150)
            ->where('challenges.0.duration', 20)
            ->where('challenges.0.image_url', 'https://cdn.example.com/challenge.jpg')
            ->where('challenges.0.questions_count', 0));
});

test('FT-F43-06 - an entry withholds every non-card field', function () {
    // Boundary: field exposure, invalid side. Comparing the entry's key set
    // against the nine card fields rejects both a missing field and any
    // additional field.
    Challenge::factory()->create(['title' => 'Key Set Challenge']);

    $this->actingAs(f43Admin())
        ->get(route('dashboard.challenges'))
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

test('FT-F43-07 - the cover image is delivered in three shapes', function () {
    // Partition: image_url. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing cover stays null.
    Storage::fake('public');
    Challenge::factory()->create(['title' => 'A Stored Cover', 'image_url' => 'challenges/cover.jpg']);
    Challenge::factory()->create(['title' => 'B External Cover', 'image_url' => 'https://cdn.example.com/cover.jpg']);
    Challenge::factory()->create(['title' => 'C No Cover', 'image_url' => null]);

    $this->actingAs(f43Admin())
        ->get(route('dashboard.challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenges.0.image_url', Storage::disk('public')->url('challenges/cover.jpg'))
            ->where('challenges.1.image_url', 'https://cdn.example.com/cover.jpg')
            ->where('challenges.2.image_url', null));
});

test('FT-F43-08 - the question count spans zero and many', function () {
    // Boundary: questions_count. A challenge without questions shows zero;
    // one with two questions shows two.
    $empty = Challenge::factory()->create(['title' => 'A Empty Challenge']);
    $full = Challenge::factory()->create(['title' => 'B Full Challenge']);
    ChallengeQuestion::factory()->for($full)->text()->create();
    ChallengeQuestion::factory()->for($full)->text()->create();

    $this->actingAs(f43Admin())
        ->get(route('dashboard.challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('challenges.0.id', $empty->id)
            ->where('challenges.0.questions_count', 0)
            ->where('challenges.1.id', $full->id)
            ->where('challenges.1.questions_count', 2));
});

test('FT-F43-09 - a freshly created challenge appears with its defaults', function () {
    // Boundary: table state. The list is empty before the add-challenge call
    // and shows the new blank row immediately after it.
    $admin = f43Admin();

    $this->actingAs($admin)
        ->get(route('dashboard.challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->has('challenges', 0));

    $this->actingAs($admin)->post(route('dashboard.challenges.store'));

    $this->actingAs($admin)
        ->get(route('dashboard.challenges'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('challenges', 1)
            ->where('challenges.0.title', 'Untitled Challenge')
            ->where('challenges.0.category', Category::ReadingComprehension->value)
            ->where('challenges.0.difficulty', Difficulty::Easy->value)
            ->where('challenges.0.points', 0)
            ->where('challenges.0.duration', 0)
            ->where('challenges.0.questions_count', 0));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f43Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
