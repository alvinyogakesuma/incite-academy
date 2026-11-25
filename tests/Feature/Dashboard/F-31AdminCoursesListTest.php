<?php

/**
 * F-31 - Halaman admin daftar kursus
 *
 * Feature tests for the admin's course listing: GET /dashboard/courses
 * (route dashboard.courses), behind the auth -> verified -> admin gate. The
 * page is the entry point of the course management flow: every stored course
 * is delivered in one `courses` prop (search, filtering, sorting, and
 * pagination are handled client-side), alongside the category list the form
 * offers.
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
 * | composition       | published, draft, blank draft                  | a course omitted from the list               |
 * | ordering          | title-ordered                                  | (none observed)                              |
 * | field exposure    | the ten list fields                            | slug, long description, timestamps           |
 * | image_url         | stored courses/ path, external URL, null       | a raw stored path reaching the browser       |
 * | categories prop   | the three enum values                          | a value outside the enum                     |
 * | table state       | empty, populated                               | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F31-01 | access - admin (valid side)                 | admin GET                          | 200 with courses + categories props                       |
 * | FT-F31-02 | access - student (invalid side)             | student GET                        | 403                                                       |
 * | FT-F31-03 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F31-04 | composition - every status                  | published, draft, blank draft      | all three appear                                          |
 * | FT-F31-05 | ordering - by title                         | courses created out of order       | entries appear title-ordered                              |
 * | FT-F31-06 | exposure - list fields (valid side)         | one fully-populated course         | the ten fields carry the right values                     |
 * | FT-F31-07 | exposure - withheld fields (invalid side)   | the same entry                     | exactly the ten keys; no slug or long description         |
 * | FT-F31-08 | image_url - stored path / external / null   | three courses                      | disk URL / unchanged / null                               |
 * | FT-F31-09 | categories prop                             | the enum's three cases             | the three values, in enum order                           |
 * | FT-F31-10 | table state - after an add-course call      | empty table, then POST store       | the new blank draft appears with zero counters            |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already proves the access trio (admin 200, student
 * 403, guest redirect) and the card shape mapping for a stored course. F-31
 * deliberately repeats those so the feature file is self-contained; the new
 * content is the list itself - composition across statuses, title ordering,
 * the exact key set, the three-way image mapping, the categories prop, and
 * the appearance of a freshly created draft.
 *
 * The add-course flow that produces the draft is F-30's subject; the editor
 * page is F-35's subject. The unverified-admin gate is not repeated: F-04
 * proved the gate ordering and this route shares the same middleware group.
 * The client-side search, filter, sort, and pagination behavior has its own
 * vitest coverage under resources/js/Pages/Dashboard/Courses/__tests__/.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - There is no server-side pagination: every course is delivered in one
 *   `courses` prop, so the BVA effort sits on composition and exposure
 *   instead of a page boundary.
 * - Drafts are listed next to published courses; the page does not filter by
 *   status. A blank draft created by the add-course button therefore appears
 *   immediately, with null metadata and zero counters.
 * - Each entry exposes exactly ten fields. The slug, the long description,
 *   and the timestamps never reach the browser.
 * - A stored cover path under `courses/` is converted to a public disk URL;
 *   an external URL passes through unchanged; a missing cover stays null.
 * - The categories prop is built from the Category enum, not from the stored
 *   rows, so it is complete even when no course uses a given category.
 */

use App\Enums\Category;
use App\Models\Course;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F31-01 - an admin views the courses list page', function () {
    // Boundary: access, valid side (baseline).
    $this->actingAs(f31Admin())
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Courses', false)
            ->has('courses')
            ->has('categories'));
});

test('FT-F31-02 - a student is forbidden from the courses list page', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.courses'))
        ->assertForbidden();
});

test('FT-F31-03 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('dashboard.courses'))->assertRedirect(route('login'));
});

test('FT-F31-04 - every status appears in the list, including blank drafts', function () {
    // Partition: composition. The page is not a published-only catalog: a
    // published course, a titled draft, and a blank draft all appear.
    $published = Course::factory()->create(['title' => 'Published Course']);
    $draft = Course::factory()->draft()->create(['title' => 'Titled Draft']);
    $blank = Course::factory()->draft()->create();

    $this->actingAs(f31Admin())
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 3)
            ->where('courses', fn ($courses) => collect($courses)->pluck('id')->sort()->values()->all() === [
                $published->id,
                $draft->id,
                $blank->id,
            ]));
});

test('FT-F31-05 - the list is ordered by title, not by creation order', function () {
    // Partition: ordering. Created in reverse alphabetical order to make the
    // ordering observable.
    Course::factory()->create(['title' => 'Zulu Course']);
    Course::factory()->create(['title' => 'Alpha Course']);
    Course::factory()->create(['title' => 'Mike Course']);

    $this->actingAs(f31Admin())
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses', fn ($courses) => collect($courses)->pluck('title')->all() === [
                'Alpha Course',
                'Mike Course',
                'Zulu Course',
            ]));
});

test('FT-F31-06 - an entry carries the ten list values', function () {
    // Boundary: field exposure, valid side. Every list field is populated with
    // a distinct value so a swapped or truncated mapping fails.
    $course = Course::factory()->create([
        'title' => 'Structure Mastery',
        'category' => Category::StructureAndWritingExpression->value,
        'short_description' => 'A short description.',
        'status' => 'published',
        'total_duration' => 120,
        'modules_count' => 4,
        'lessons_count' => 9,
        'total_points' => 150,
    ]);

    $this->actingAs(f31Admin())
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0.id', $course->id)
            ->where('courses.0.title', 'Structure Mastery')
            ->where('courses.0.category', Category::StructureAndWritingExpression->value)
            ->where('courses.0.short_description', 'A short description.')
            ->where('courses.0.status', 'published')
            ->where('courses.0.total_duration', 120)
            ->where('courses.0.modules_count', 4)
            ->where('courses.0.lessons_count', 9)
            ->where('courses.0.total_points', 150));
});

test('FT-F31-07 - an entry withholds every non-list field', function () {
    // Boundary: field exposure, invalid side. Comparing the entry's key set
    // against the ten list fields rejects both a missing field and any
    // additional field, so the slug, the long description, or a timestamp
    // leaking through fails the test.
    Course::factory()->create(['title' => 'Key Set Course']);

    $this->actingAs(f31Admin())
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0', fn ($course) => $course->keys()->sort()->values()->all() === [
                'category',
                'id',
                'image_url',
                'lessons_count',
                'modules_count',
                'short_description',
                'status',
                'title',
                'total_duration',
                'total_points',
            ]));
});

test('FT-F31-08 - the cover image is delivered in three shapes', function () {
    // Partition: image_url. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing cover stays null.
    Storage::fake('public');
    Course::factory()->create([
        'title' => 'A Stored Cover',
        'image_url' => 'courses/cover.jpg',
    ]);
    Course::factory()->create([
        'title' => 'B External Cover',
        'image_url' => 'https://cdn.example.com/cover.jpg',
    ]);
    Course::factory()->create([
        'title' => 'C No Cover',
        'image_url' => null,
    ]);

    $this->actingAs(f31Admin())
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0.image_url', Storage::disk('public')->url('courses/cover.jpg'))
            ->where('courses.1.image_url', 'https://cdn.example.com/cover.jpg')
            ->where('courses.2.image_url', null));
});

test('FT-F31-09 - the categories prop lists the three enum values', function () {
    // Partition: categories prop. Built from the enum, so the list is complete
    // even when no stored course uses a category.
    $this->actingAs(f31Admin())
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('categories', fn ($categories) => collect($categories)->values()->all() === [
                Category::ReadingComprehension->value,
                Category::ListeningComprehension->value,
                Category::StructureAndWritingExpression->value,
            ]));
});

test('FT-F31-10 - a freshly created draft appears with zero counters', function () {
    // Boundary: table state. The list is empty before the add-course call and
    // shows the new blank draft immediately after it.
    $admin = f31Admin();

    $this->actingAs($admin)
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->has('courses', 0));

    $this->actingAs($admin)->post(route('dashboard.courses.store'));

    $this->actingAs($admin)
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 1)
            ->where('courses.0.title', null)
            ->where('courses.0.status', 'draft')
            ->where('courses.0.total_duration', 0)
            ->where('courses.0.modules_count', 0)
            ->where('courses.0.lessons_count', 0)
            ->where('courses.0.total_points', 0));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f31Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
