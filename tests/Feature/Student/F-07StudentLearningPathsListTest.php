<?php

/**
 * F-07 - Halaman daftar jalur pembelajaran
 *
 * Feature tests for the student-facing learning path listing: GET
 * /learning-paths (route learning-paths), behind the auth -> verified gate.
 * Every learning path is delivered in one `learningPaths` prop (search,
 * filtering, sorting, and pagination are handled client-side), each card
 * carrying its cover, level, duration, and course count, alongside the four
 * level options for the client filter.
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
 * | composition       | all four levels, paths without courses         | a path omitted from the list                 |
 * | ordering          | title-ordered                                  | creation order                               |
 * | field exposure    | the seven card fields                          | timestamps, pivot rows                       |
 * | image_url         | stored learning-paths/ path, external, null    | a raw stored path reaching the browser       |
 * | levels prop       | the four LEVELS values                         | a value outside the constant                 |
 * | table state       | empty, populated                               | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F07-01 | access - verified student (valid side)      | student GET                        | 200 with learningPaths + levels props                     |
 * | FT-F07-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F07-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F07-04 | ordering - by title                         | paths created out of order         | entries appear title-ordered                              |
 * | FT-F07-05 | exposure - card values (valid side)         | one fully-populated path           | the seven fields carry the right values                   |
 * | FT-F07-06 | exposure - withheld fields (invalid side)   | the same entry                     | exactly the seven keys; no timestamps or pivot rows       |
 * | FT-F07-07 | image_url - stored / external / null        | three paths                        | disk URL / unchanged / null                               |
 * | FT-F07-08 | levels - all four options                   | one path per level                 | each row carries its own stored level                     |
 * | FT-F07-09 | table state - empty (boundary)              | no paths                           | an empty list; the levels prop still rides along          |
 *
 * == Relation to the existing suites =========================================
 *
 * StudentLearningPathsPageTest already proves the access trio, the card field
 * mapping, and the levels prop. F-07 deliberately repeats those so the
 * feature file is self-contained; the new content is the title ordering, the
 * exact key set, the three-way image mapping, the four-level composition, and
 * the empty listing.
 *
 * The detail page and the enroll toggle are F-08 and F-09's subjects; the
 * admin listing is F-55's. The gate ordering is F-04's subject; this route
 * shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The card is seven fields. The timestamps and the pivot rows stay on the
 *   server.
 * - A stored cover under `learning-paths/` becomes a public disk URL; an
 *   external URL passes through; a missing cover stays null.
 * - The level is the stored string from the four-value constant, and the
 *   levels prop is built from the constant, so it is complete even when no
 *   path uses a level.
 * - A path without courses still appears; the card simply reports zero.
 */

use App\Models\LearningPath;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F07-01 - a verified student opens the learning paths page', function () {
    // Boundary: access, valid side (baseline). The levels prop rides along
    // with the cards.
    $this->actingAs(f07Student())
        ->get(route('learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('LearningPaths', false)
            ->has('learningPaths')
            ->where('levels', fn ($levels) => collect($levels)->values()->all() === LearningPath::LEVELS));
});

test('FT-F07-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('learning-paths'))->assertRedirect(route('login'));
});

test('FT-F07-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('learning-paths'))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F07-04 - the listing is ordered by title, not by creation order', function () {
    // Partition: ordering. Created in reverse alphabetical order to make the
    // ordering observable.
    LearningPath::factory()->create(['title' => 'Zulu Path']);
    LearningPath::factory()->create(['title' => 'Alpha Path']);
    LearningPath::factory()->create(['title' => 'Mike Path']);

    $this->actingAs(f07Student())
        ->get(route('learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPaths', fn ($paths) => collect($paths)->pluck('title')->all() === [
                'Alpha Path',
                'Mike Path',
                'Zulu Path',
            ]));
});

test('FT-F07-05 - an entry carries the seven card values', function () {
    // Boundary: field exposure, valid side. Every card field is populated with
    // a distinct value so a swapped or truncated mapping fails.
    $path = LearningPath::factory()->create([
        'title' => 'Reading Journey',
        'description' => 'A guided reading journey.',
        'level' => 'Intermediate',
        'image_url' => 'https://cdn.example.com/path.jpg',
        'total_duration' => 12,
        'courses_count' => 3,
    ]);

    $this->actingAs(f07Student())
        ->get(route('learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPaths.0.id', $path->id)
            ->where('learningPaths.0.title', 'Reading Journey')
            ->where('learningPaths.0.description', 'A guided reading journey.')
            ->where('learningPaths.0.level', 'Intermediate')
            ->where('learningPaths.0.image_url', 'https://cdn.example.com/path.jpg')
            ->where('learningPaths.0.total_duration', 12)
            ->where('learningPaths.0.courses_count', 3));
});

test('FT-F07-06 - an entry withholds every non-card field', function () {
    // Boundary: field exposure, invalid side. Comparing the entry's key set
    // against the seven card fields rejects both a missing field and any
    // additional field.
    LearningPath::factory()->create(['title' => 'Key Set Path']);

    $this->actingAs(f07Student())
        ->get(route('learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPaths.0', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'courses_count',
                'description',
                'id',
                'image_url',
                'level',
                'title',
                'total_duration',
            ]));
});

test('FT-F07-07 - the cover image is delivered in three shapes', function () {
    // Partition: image_url. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing cover stays null.
    Storage::fake('public');
    LearningPath::factory()->create(['title' => 'A Stored Cover', 'image_url' => 'learning-paths/cover.jpg']);
    LearningPath::factory()->create(['title' => 'B External Cover', 'image_url' => 'https://cdn.example.com/cover.jpg']);
    LearningPath::factory()->create(['title' => 'C No Cover', 'image_url' => null]);

    $this->actingAs(f07Student())
        ->get(route('learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPaths.0.image_url', Storage::disk('public')->url('learning-paths/cover.jpg'))
            ->where('learningPaths.1.image_url', 'https://cdn.example.com/cover.jpg')
            ->where('learningPaths.2.image_url', null));
});

test('FT-F07-08 - every level option reaches its own card', function () {
    // Partition: levels. One path per constant value, so the client filter has
    // all four stored strings to work with.
    LearningPath::factory()->beginner()->create(['title' => 'A Beginner Path']);
    LearningPath::factory()->intermediate()->create(['title' => 'B Intermediate Path']);
    LearningPath::factory()->advanced()->create(['title' => 'C Advanced Path']);
    LearningPath::factory()->allLevels()->create(['title' => 'D All Levels Path']);

    $this->actingAs(f07Student())
        ->get(route('learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPaths.0.level', 'Beginner')
            ->where('learningPaths.1.level', 'Intermediate')
            ->where('learningPaths.2.level', 'Advanced')
            ->where('learningPaths.3.level', 'All Levels'));
});

test('FT-F07-09 - an empty listing still carries the levels prop', function () {
    // Boundary: table state. With no paths the list is empty, not the page:
    // the levels prop still rides along for the client filter.
    $this->actingAs(f07Student())
        ->get(route('learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('learningPaths', 0)
            ->has('levels', 4));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f07Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}
