<?php

/**
 * F-11 - Halaman detail informasi kursus
 *
 * Feature tests for the student-facing course detail page: GET /courses/
 * {course:slug} (route courses.show), behind the auth -> verified gate. The
 * page is the course's landing screen: the stored metadata, the module and
 * lesson outline ordered for the student, and the signed-in student's own
 * completion flags and progress.
 *
 * Method: equivalence partitioning (EP) over the page's domains, then
 * boundary value analysis (BVA) of the detail-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | target            | a published course by slug                     | a draft course, an unknown slug              |
 * | outline           | modules with lessons, empty                    | -                                            |
 * | module ordering   | ascending order_index                          | creation order                               |
 * | lesson ordering   | ascending order_index within its module        | creation order, lessons of another module    |
 * | course exposure   | the nine detail fields                         | status, counters, timestamps                 |
 * | lesson exposure   | id, title, type, duration, completed           | article body, questions                      |
 * | image             | stored courses/ path, external URL, null       | a raw stored path reaching the browser       |
 * | progress          | 0..100 of the viewer's completions             | another student's completions                |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F11-01 | access - verified student (valid side)      | student GET                        | 200 with course + sections props                          |
 * | FT-F11-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F11-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F11-04 | target - draft course (invalid side)        | a titled draft, a blank draft      | 404 / 404                                                 |
 * | FT-F11-05 | target - unknown slug (invalid side)        | GET on a missing slug              | 404                                                       |
 * | FT-F11-06 | course exposure - values                    | a fully-populated course           | the nine fields carry the right values                    |
 * | FT-F11-07 | course exposure - withheld fields           | the same course                    | exactly nine keys; no status or counters                  |
 * | FT-F11-08 | image - stored / external / null            | three courses                      | disk URL / unchanged / null                               |
 * | FT-F11-09 | module ordering and section sums            | modules created out of order       | sections in order; count and duration summed              |
 * | FT-F11-10 | lesson ordering and completion flags        | two modules, two students          | own lessons only, ordered; only the viewer's flags true   |
 * | FT-F11-11 | progress - 0 / 50 / 100 percent             | three courses                      | 0, 50, and 100                                            |
 * | FT-F11-12 | outline - empty course (boundary)           | a course with no modules           | empty sections; progress 0                                |
 *
 * == Relation to the existing suites =========================================
 *
 * CourseDetailPageTest already proves the access trio, the draft 404, the
 * outline mapping (module title, lesson count, duration sum, lesson row),
 * and the 50% progress. F-11 deliberately repeats those so the feature file
 * is self-contained; the new content is the unknown-slug 404, the exact key
 * sets for the course and lesson rows, the three-way image mapping, the
 * module ordering across three rows, the cross-student completion scope,
 * the progress boundary pair (0 / 100), and the empty outline.
 *
 * The catalog that links here is F-10's subject; the lesson rooms this page
 * opens are F-12..F-14's subjects. The admin editor renders the same outline
 * for the admin (F-35). The gate ordering is F-04's subject; this route
 * shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - Only published courses open; a draft is a 404 even for a signed-in
 *   student, so the page is not a preview surface.
 * - The course prop is the public detail shape: the short description
 *   becomes description, the long description becomes about, and the stored
 *   aggregates become duration and lessons.
 * - Sections follow the module order; each carries its lesson count and the
 *   sum of its lessons' durations.
 * - Each lesson row carries id, title, type, duration, and the viewer's
 *   completed flag. The article body and the questions stay in the room.
 * - Progress is the viewer's completions over the stored lesson count;
 *   another student's completion never flips the flag or moves the percent.
 * - A course without modules renders empty sections and zero progress.
 */

use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F11-01 - a verified student opens the course detail page', function () {
    // Boundary: access, valid side (baseline).
    $course = Course::factory()->create();

    $this->actingAs(f11Student())
        ->get(route('courses.show', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Courses/Detail', false)
            ->has('course')
            ->has('sections'));
});

test('FT-F11-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $course = Course::factory()->create();

    $this->get(route('courses.show', $course))
        ->assertRedirect(route('login'));
});

test('FT-F11-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    $course = Course::factory()->create();
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('courses.show', $course))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F11-04 - draft courses are not reachable', function () {
    // Boundary: target, invalid side (draft status). A titled draft and a
    // blank draft with a stored slug both answer 404.
    $titled = Course::factory()->create(['title' => 'Unpublished Draft', 'status' => 'draft']);
    $blank = Course::factory()->draft()->create(['slug' => 'untitled-draft']);
    $student = f11Student();

    $this->actingAs($student)
        ->get(route('courses.show', $titled))
        ->assertNotFound();

    $this->actingAs($student)
        ->get(route('courses.show', $blank))
        ->assertNotFound();
});

test('FT-F11-05 - an unknown slug is not found', function () {
    // Boundary: target, invalid side (unknown slug).
    $this->actingAs(f11Student())
        ->get(route('courses.show', 'no-such-course'))
        ->assertNotFound();
});

test('FT-F11-06 - the course entry carries the nine detail values', function () {
    // Boundary: course exposure, valid side. Every field is pinned so a
    // swapped or truncated mapping fails.
    Storage::fake('public');
    $course = Course::factory()->create([
        'title' => 'Reading Mastery',
        'slug' => 'reading-mastery',
        'short_description' => 'A short description.',
        'long_description' => 'A long description.',
        'image_url' => 'courses/cover.jpg',
        'total_duration' => 90,
        'lessons_count' => 9,
    ]);

    $this->actingAs(f11Student())
        ->get(route('courses.show', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.id', $course->id)
            ->where('course.slug', 'reading-mastery')
            ->where('course.title', 'Reading Mastery')
            ->where('course.description', 'A short description.')
            ->where('course.about', 'A long description.')
            ->where('course.image', Storage::disk('public')->url('courses/cover.jpg'))
            ->where('course.duration', 90)
            ->where('course.lessons', 9)
            ->where('course.progress', 0));
});

test('FT-F11-07 - the course entry withholds every non-detail field', function () {
    // Boundary: course exposure, invalid side. The key-set comparison
    // rejects both a missing field and any extra field, so the status or a
    // stored counter leaking through fails the test.
    $course = Course::factory()->create();

    $this->actingAs(f11Student())
        ->get(route('courses.show', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'about',
                'description',
                'duration',
                'id',
                'image',
                'lessons',
                'progress',
                'slug',
                'title',
            ]));
});

test('FT-F11-08 - the cover image is delivered in three shapes', function () {
    // Partition: image. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing cover stays null.
    Storage::fake('public');
    $student = f11Student();
    $stored = Course::factory()->create(['image_url' => 'courses/cover.jpg']);
    $external = Course::factory()->create(['image_url' => 'https://cdn.example.com/cover.jpg']);
    $missing = Course::factory()->create(['image_url' => null]);

    $this->actingAs($student)
        ->get(route('courses.show', $stored))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.image', Storage::disk('public')->url('courses/cover.jpg')));

    $this->actingAs($student)
        ->get(route('courses.show', $external))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.image', 'https://cdn.example.com/cover.jpg'));

    $this->actingAs($student)
        ->get(route('courses.show', $missing))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.image', null));
});

test('FT-F11-09 - sections follow the module order with their sums', function () {
    // Partition: module ordering and section sums. Created 2, 0, 1 so the
    // order is observable; each section totals its own lessons.
    $course = Course::factory()->create(['lessons_count' => 0]);
    $third = Module::factory()->for($course)->create(['title' => 'Third Module', 'order_index' => 2]);
    $first = Module::factory()->for($course)->create(['title' => 'First Module', 'order_index' => 0]);
    $second = Module::factory()->for($course)->create(['title' => 'Second Module', 'order_index' => 1]);
    Lesson::factory()->for($course)->for($first)->article()->create(['duration' => 3]);
    Lesson::factory()->for($course)->for($first)->article()->create(['duration' => 5]);
    Lesson::factory()->for($course)->for($second)->article()->create(['duration' => 7]);

    $this->actingAs(f11Student())
        ->get(route('courses.show', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('sections', 3)
            ->where('sections', fn ($sections) => collect($sections)->pluck('title')->all() === [
                'First Module',
                'Second Module',
                'Third Module',
            ])
            ->where('sections.0.lessonsCount', 2)
            ->where('sections.0.duration', 8)
            ->where('sections.1.lessonsCount', 1)
            ->where('sections.1.duration', 7)
            ->where('sections.2.lessonsCount', 0)
            ->where('sections.2.duration', 0));
});

test('FT-F11-10 - lessons are ordered and flagged for the viewer only', function () {
    // Partition: lesson ordering and completion scope. The lessons are
    // created out of order across two modules; the viewer completed the
    // second row, while another student completed the first.
    $viewer = f11Student();
    $other = f11Student();
    $course = Course::factory()->create(['lessons_count' => 0]);
    $first = Module::factory()->for($course)->create(['title' => 'First Module', 'order_index' => 0]);
    $second = Module::factory()->for($course)->create(['title' => 'Second Module', 'order_index' => 1]);
    $secondLesson = Lesson::factory()->for($course)->for($first)->article()->create(['title' => 'Second Lesson', 'order_index' => 1]);
    $firstLesson = Lesson::factory()->for($course)->for($first)->article()->create(['title' => 'First Lesson', 'order_index' => 0]);
    $onlyLesson = Lesson::factory()->for($course)->for($second)->article()->create(['title' => 'Only Lesson', 'order_index' => 0]);
    LessonCompletion::factory()->for($other)->for($course)->for($firstLesson)->create();
    LessonCompletion::factory()->for($viewer)->for($course)->for($secondLesson)->create();

    $this->actingAs($viewer)
        ->get(route('courses.show', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('sections.0.lessons', fn ($lessons) => collect($lessons)->pluck('title')->all() === [
                'First Lesson',
                'Second Lesson',
            ])
            ->where('sections.0.lessons.0.completed', false)
            ->where('sections.0.lessons.1.completed', true)
            ->where('sections.1.lessons', fn ($lessons) => collect($lessons)->pluck('title')->all() === [
                'Only Lesson',
            ])
            ->where('sections.1.lessons.0.completed', false));
});

test('FT-F11-11 - the progress spans 0, 50, and 100 percent', function () {
    // Boundary: progress. Three courses with two lessons each - untouched,
    // half finished, and finished.
    $student = f11Student();

    $untouched = Course::factory()->create(['lessons_count' => 0]);
    f11Lessons($untouched, 2);

    $half = Course::factory()->create(['lessons_count' => 0]);
    $halfLessons = f11Lessons($half, 2);
    LessonCompletion::factory()->for($student)->for($half)->for($halfLessons[0])->create();

    $done = Course::factory()->create(['lessons_count' => 0]);
    $doneLessons = f11Lessons($done, 2);
    LessonCompletion::factory()->for($student)->for($done)->for($doneLessons[0])->create();
    LessonCompletion::factory()->for($student)->for($done)->for($doneLessons[1])->create();

    foreach ([[$untouched, 0], [$half, 50], [$done, 100]] as [$course, $expected]) {
        $this->actingAs($student)
            ->get(route('courses.show', $course))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('course.progress', $expected));
    }
});

test('FT-F11-12 - a course without modules renders an empty outline', function () {
    // Boundary: outline. The course is published but has no content yet, so
    // the page stays usable with empty sections and zero progress.
    $course = Course::factory()->create(['lessons_count' => 0]);

    $this->actingAs(f11Student())
        ->get(route('courses.show', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('sections', 0)
            ->where('course.progress', 0));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f11Student(array $attributes = []): User
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
function f11Lessons(Course $course, int $count): array
{
    $module = Module::factory()->for($course)->create();

    return collect(range(1, $count))
        ->map(fn () => Lesson::factory()->for($course)->for($module)->article()->create())
        ->all();
}
