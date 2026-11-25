<?php

/**
 * F-55 - Halaman daftar jalur pembelajaran oleh admin
 *
 * Feature tests for the admin's learning path listing: GET /dashboard/
 * learning-paths (route dashboard.learning-paths), behind the auth -> verified
 * -> admin gate. Every stored path is delivered in one `learningPaths` prop
 * (search, filtering, sorting, and pagination are handled client-side), each
 * card carrying the stored metadata and aggregates, alongside the four level
 * options for the client filter.
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
 * | composition       | all four levels, paths without courses         | a path omitted from the list                 |
 * | ordering          | title-ordered                                  | creation order                               |
 * | field exposure    | the seven card fields                          | timestamps, pivot rows                       |
 * | image_url         | stored learning-paths/ path, external, null    | a raw stored path reaching the browser       |
 * | levels prop       | the four LEVELS values                         | a value outside the constant                 |
 * | table state       | empty, populated, fresh blank draft            | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F55-01 | access - admin (valid side)                 | admin GET                          | 200 with learningPaths + levels props                     |
 * | FT-F55-02 | access - student (invalid side)             | student GET                        | 403                                                       |
 * | FT-F55-03 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F55-04 | ordering - by title                         | paths created out of order         | entries appear title-ordered                              |
 * | FT-F55-05 | exposure - card values (valid side)         | one fully-populated path           | the seven fields carry the right values                   |
 * | FT-F55-06 | exposure - withheld fields (invalid side)   | the same entry                     | exactly the seven keys; no timestamps or pivot rows       |
 * | FT-F55-07 | image_url - stored / external / null        | three paths                        | disk URL / unchanged / null                               |
 * | FT-F55-08 | levels - all four options                   | one path per level                 | each row carries its own stored level                     |
 * | FT-F55-09 | table state - after an add call             | empty table, then POST store       | the new blank path appears with its defaults              |
 *
 * == Relation to the existing suites =========================================
 *
 * LearningPathsManagementTest already proves the access trio and the card
 * shape mapping. F-55 deliberately repeats those so the feature file is
 * self-contained; the new content is the title ordering, the exact key set,
 * the three-way image mapping, the four-level composition, and the
 * appearance of a freshly created blank path.
 *
 * The add flow that produces the draft is F-54's subject; the editor and
 * sequence save is F-56's, the delete F-57's. The student's own listing is
 * F-07's subject. The gate ordering is F-04's subject; this route shares the
 * same middleware group. The client-side search, filter, sort, and pagination
 * behavior has its own vitest coverage.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The card is seven fields. The timestamps and the pivot rows never reach
 *   the browser.
 * - The listing carries the freshly created blank path immediately, with its
 *   empty description, All Levels level, and zero aggregates.
 * - A stored cover under `learning-paths/` becomes a public disk URL; an
 *   external URL passes through; a missing cover stays null.
 * - The level is the stored string from the four-value constant, and the
 *   levels prop is built from the constant, so it is complete even when no
 *   path uses a level.
 */

use App\Models\LearningPath;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F55-01 - an admin views the learning paths management page', function () {
    // Boundary: access, valid side (baseline). The levels prop rides along
    // with the cards.
    $this->actingAs(f55Admin())
        ->get(route('dashboard.learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/LearningPaths', false)
            ->has('learningPaths')
            ->where('levels', fn ($levels) => collect($levels)->values()->all() === LearningPath::LEVELS));
});

test('FT-F55-02 - a student is forbidden from the learning paths management page', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.learning-paths'))
        ->assertForbidden();
});

test('FT-F55-03 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('dashboard.learning-paths'))->assertRedirect(route('login'));
});

test('FT-F55-04 - the listing is ordered by title, not by creation order', function () {
    // Partition: ordering. Created in reverse alphabetical order to make the
    // ordering observable.
    LearningPath::factory()->create(['title' => 'Zulu Path']);
    LearningPath::factory()->create(['title' => 'Alpha Path']);
    LearningPath::factory()->create(['title' => 'Mike Path']);

    $this->actingAs(f55Admin())
        ->get(route('dashboard.learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPaths', fn ($paths) => collect($paths)->pluck('title')->all() === [
                'Alpha Path',
                'Mike Path',
                'Zulu Path',
            ]));
});

test('FT-F55-05 - an entry carries the seven card values', function () {
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

    $this->actingAs(f55Admin())
        ->get(route('dashboard.learning-paths'))
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

test('FT-F55-06 - an entry withholds every non-card field', function () {
    // Boundary: field exposure, invalid side. Comparing the entry's key set
    // against the seven card fields rejects both a missing field and any
    // additional field.
    LearningPath::factory()->create(['title' => 'Key Set Path']);

    $this->actingAs(f55Admin())
        ->get(route('dashboard.learning-paths'))
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

test('FT-F55-07 - the cover image is delivered in three shapes', function () {
    // Partition: image_url. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing cover stays null.
    Storage::fake('public');
    LearningPath::factory()->create(['title' => 'A Stored Cover', 'image_url' => 'learning-paths/cover.jpg']);
    LearningPath::factory()->create(['title' => 'B External Cover', 'image_url' => 'https://cdn.example.com/cover.jpg']);
    LearningPath::factory()->create(['title' => 'C No Cover', 'image_url' => null]);

    $this->actingAs(f55Admin())
        ->get(route('dashboard.learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPaths.0.image_url', Storage::disk('public')->url('learning-paths/cover.jpg'))
            ->where('learningPaths.1.image_url', 'https://cdn.example.com/cover.jpg')
            ->where('learningPaths.2.image_url', null));
});

test('FT-F55-08 - every level option reaches its own card', function () {
    // Partition: levels. One path per constant value, so the client filter has
    // all four stored strings to work with.
    LearningPath::factory()->beginner()->create(['title' => 'A Beginner Path']);
    LearningPath::factory()->intermediate()->create(['title' => 'B Intermediate Path']);
    LearningPath::factory()->advanced()->create(['title' => 'C Advanced Path']);
    LearningPath::factory()->allLevels()->create(['title' => 'D All Levels Path']);

    $this->actingAs(f55Admin())
        ->get(route('dashboard.learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPaths.0.level', 'Beginner')
            ->where('learningPaths.1.level', 'Intermediate')
            ->where('learningPaths.2.level', 'Advanced')
            ->where('learningPaths.3.level', 'All Levels'));
});

test('FT-F55-09 - a freshly created path appears with its defaults', function () {
    // Boundary: table state. The list is empty before the add call and shows
    // the new blank path immediately after it.
    $admin = f55Admin();

    $this->actingAs($admin)
        ->get(route('dashboard.learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->has('learningPaths', 0));

    $this->actingAs($admin)->post(route('dashboard.learning-paths.store'));

    $this->actingAs($admin)
        ->get(route('dashboard.learning-paths'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('learningPaths', 1)
            ->where('learningPaths.0.title', 'Untitled Learning Path')
            ->where('learningPaths.0.description', '')
            ->where('learningPaths.0.level', 'All Levels')
            ->where('learningPaths.0.courses_count', 0)
            ->where('learningPaths.0.total_duration', 0));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f55Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
