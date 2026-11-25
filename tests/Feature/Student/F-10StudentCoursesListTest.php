<?php

/**
 * F-10 - Halaman daftar kursus
 *
 * Feature tests for the student-facing course catalog: GET /courses
 * (route courses), behind the auth -> verified gate. The page is the
 * student's entry point into the library: every published course is
 * delivered in one `courses` prop (search, filtering, sorting, and
 * pagination are handled client-side), each card carrying the stored
 * aggregates plus the signed-in student's own completion progress.
 *
 * Method: equivalence partitioning (EP) over the listing's domains, then
 * boundary value analysis (BVA) of the catalog-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | composition       | published                                      | draft, blank draft                           |
 * | ordering          | title-ordered                                  | creation order                               |
 * | field exposure    | the eleven card fields                         | status, long description, timestamps         |
 * | image_url         | stored courses/ path, external URL, null      | a raw stored path reaching the browser       |
 * | progress          | 0..100 percent of the course's lessons        | another student's completions                |
 * | categories prop   | the three enum values                          | a value outside the enum                     |
 * | table state       | empty, populated                               | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F10-01 | access - verified student (valid side)      | student GET                        | 200 with courses + categories props                       |
 * | FT-F10-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F10-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F10-04 | composition - published only                | published, draft, blank draft      | only the published row appears                            |
 * | FT-F10-05 | ordering - by title                        | courses created out of order       | entries appear title-ordered                              |
 * | FT-F10-06 | exposure - card values (valid side)        | one fully-populated course          | the eleven fields carry the right values                  |
 * | FT-F10-07 | exposure - withheld fields (invalid side)  | the same entry                     | exactly the eleven keys; no status or long description    |
 * | FT-F10-08 | image_url - stored / external / null       | three courses                      | disk URL / unchanged / null                               |
 * | FT-F10-09 | progress - 0 / 50 / 100 percent            | three courses                      | 0, 50, and 100                                            |
 * | FT-F10-10 | progress - per student                     | two students with different work   | each sees only their own progress                         |
 *
 * == Relation to the existing suites =========================================
 *
 * StudentCoursesPageTest already proves the access trio (verified 200,
 * guest redirect, unverified redirect), the published-only composition,
 * the card mapping, and the progress tally. F-10 deliberately repeats
 * those so the feature file is self-contained; the new content is the
 * ordering, the exact key set (eleven fields, no status), the three-way
 * image mapping, the progress boundary pair (0 / 50 / 100), and the
 * per-student scope of the progress computation.
 *
 * The admin's own courses list is F-31's subject (a different page behind
 * the admin gate that also shows drafts); the course detail page is
 * F-11's subject. The gate ordering itself is F-04's subject; this route
 * shares the same middleware group. The client-side search, filter, sort,
 * and pagination behavior has its own vitest coverage.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - Drafts never reach the catalog: the page is a published-only catalog,
 *   so a course the admin has not published is invisible to students.
 * - The eleven card fields are the whole entry. The status, the long
 *   description, and the timestamps stay on the server.
 * - A stored cover path under `courses/` is converted to a public disk URL;
 *   an external URL passes through unchanged; a missing cover stays null.
 * - The card's progress is the percentage of the course's lessons the
 *   signed-in student has completed, floored at zero - a course without
 *   lessons shows 0, and one student's completions never leak into
 *   another student's card.
 * - The categories prop is built from the Category enum, not from the
 *   stored rows, so it is complete even when no course uses a category.
 */

use App\Enums\Category;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F10-01 - a verified student opens the course catalog', function () {
    // Boundary: access, valid side (baseline). The categories prop rides
    // along with the cards.
    $this->actingAs(f10Student())
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Courses', false)
            ->has('courses')
            ->where('categories', fn ($categories) => collect($categories)->values()->all() === [
                Category::ReadingComprehension->value,
                Category::ListeningComprehension->value,
                Category::StructureAndWritingExpression->value,
            ]));
});

test('FT-F10-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('courses'))->assertRedirect(route('login'));
});

test('FT-F10-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('courses'))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F10-04 - only published courses appear in the catalog', function () {
    // Boundary: composition, invalid side (drafts are withheld). A titled
    // draft and a blank draft both stay invisible.
    Course::factory()->create(['title' => 'Published Course']);
    Course::factory()->draft()->create(['title' => 'Titled Draft']);
    Course::factory()->draft()->create();

    $this->actingAs(f10Student())
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 1)
            ->where('courses.0.title', 'Published Course'));
});

test('FT-F10-05 - the catalog is ordered by title, not by creation order', function () {
    // Partition: ordering. Created in reverse alphabetical order to make
    // the ordering observable.
    Course::factory()->create(['title' => 'Zulu Course']);
    Course::factory()->create(['title' => 'Alpha Course']);
    Course::factory()->create(['title' => 'Mike Course']);

    $this->actingAs(f10Student())
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses', fn ($courses) => collect($courses)->pluck('title')->all() === [
                'Alpha Course',
                'Mike Course',
                'Zulu Course',
            ]));
});

test('FT-F10-06 - an entry carries the eleven card values', function () {
    // Boundary: field exposure, valid side. Every card field is populated
    // with a distinct value so a swapped or truncated mapping fails.
    $course = Course::factory()->create([
        'title' => 'Structure Mastery',
        'slug' => 'structure-mastery',
        'category' => Category::StructureAndWritingExpression->value,
        'short_description' => 'A short description.',
        'status' => 'published',
        'total_duration' => 120,
        'modules_count' => 4,
        'lessons_count' => 9,
        'total_points' => 150,
    ]);

    $this->actingAs(f10Student())
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0.id', $course->id)
            ->where('courses.0.title', 'Structure Mastery')
            ->where('courses.0.slug', 'structure-mastery')
            ->where('courses.0.category', Category::StructureAndWritingExpression->value)
            ->where('courses.0.short_description', 'A short description.')
            ->where('courses.0.total_duration', 120)
            ->where('courses.0.modules_count', 4)
            ->where('courses.0.lessons_count', 9)
            ->where('courses.0.total_points', 150)
            ->where('courses.0.progress', 0));
});

test('FT-F10-07 - an entry withholds every non-card field', function () {
    // Boundary: field exposure, invalid side. Comparing the entry's key set
    // against the eleven card fields rejects both a missing field and any
    // additional field, so the status or the long description leaking
    // through fails the test.
    Course::factory()->create(['title' => 'Key Set Course']);

    $this->actingAs(f10Student())
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'category',
                'id',
                'image_url',
                'lessons_count',
                'modules_count',
                'progress',
                'short_description',
                'slug',
                'title',
                'total_duration',
                'total_points',
            ]));
});

test('FT-F10-08 - the cover image is delivered in three shapes', function () {
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

    $this->actingAs(f10Student())
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0.image_url', Storage::disk('public')->url('courses/cover.jpg'))
            ->where('courses.1.image_url', 'https://cdn.example.com/cover.jpg')
            ->where('courses.2.image_url', null));
});

test('FT-F10-09 - the progress spans 0, 50, and 100 percent', function () {
    // Boundary: progress. One course untouched, one half finished, one
    // finished; a course without lessons floors at zero.
    $student = f10Student();

    $untouched = Course::factory()->create(['title' => 'A Untouched', 'lessons_count' => 0]);
    f10Lessons($untouched, 2);

    $half = Course::factory()->create(['title' => 'B Half Done', 'lessons_count' => 0]);
    $halfLessons = f10Lessons($half, 2);
    LessonCompletion::factory()->for($student)->for($half)->for($halfLessons[0])->create();

    $done = Course::factory()->create(['title' => 'C All Done', 'lessons_count' => 0]);
    $doneLessons = f10Lessons($done, 2);
    LessonCompletion::factory()->for($student)->for($done)->for($doneLessons[0])->create();
    LessonCompletion::factory()->for($student)->for($done)->for($doneLessons[1])->create();

    Course::factory()->create(['title' => 'D No Lessons', 'lessons_count' => 0]);

    $this->actingAs($student)
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0.progress', 0)
            ->where('courses.1.progress', 50)
            ->where('courses.2.progress', 100)
            ->where('courses.3.progress', 0));
});

test('FT-F10-10 - the progress is computed per student', function () {
    // Boundary: progress scope. One student's completions never feed
    // another student's card - each request is tallied for its own viewer.
    $viewer = f10Student();
    $other = f10Student();

    $course = Course::factory()->create(['title' => 'Shared Course', 'lessons_count' => 0]);
    $lessons = f10Lessons($course, 2);
    LessonCompletion::factory()->for($other)->for($course)->for($lessons[0])->create();
    LessonCompletion::factory()->for($other)->for($course)->for($lessons[1])->create();

    $this->actingAs($viewer)
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0.progress', 0));

    $this->actingAs($other)
        ->get(route('courses'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0.progress', 100));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f10Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * Append fresh article lessons to the course, returning them in order.
 *
 * @return array<int, Lesson>
 */
function f10Lessons(Course $course, int $count): array
{
    $module = Module::factory()->for($course)->create();

    return collect(range(1, $count))
        ->map(fn () => Lesson::factory()->for($course)->for($module)->article()->create())
        ->all();
}
