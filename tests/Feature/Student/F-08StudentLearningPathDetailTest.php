<?php

/**
 * F-08 - Halaman detail jalur pembelajaran
 *
 * Feature tests for the student-facing learning path detail: GET /learning-
 * paths/{learning_path} (route learning-paths.show), behind the auth ->
 * verified gate. The page carries the path metadata, its course sequence in
 * the stored pivot order, each course's own stats, the signed-in student's
 * overall progress across the sequence, and their enrollment flag.
 *
 * Method: equivalence partitioning (EP) over the page's domains, then
 * boundary value analysis (BVA) of the detail-only boundaries - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | target            | a stored learning path                         | an unknown id                                |
 * | sequence          | courses at pivot orders, empty sequence        | -                                            |
 * | sequence order    | ascending pivot order_index                    | attach order                                 |
 * | path exposure     | the seven detail fields                        | timestamps, pivot rows                       |
 * | course exposure   | id, slug, title, description, category,        | long description, counters beyond duration   |
 * |                   | duration, lessons                              | and lessons, timestamps                      |
 * | image             | stored learning-paths/ path, external, null    | a raw stored path reaching the browser       |
 * | progress          | 0..100 from the viewer's real completions      | another student's completions                |
 * | enrollment        | enrolled, not enrolled                         | another student's enrollment                 |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F08-01 | access - verified student (valid side)      | student GET                        | 200 with learningPath, courses, progress, isEnrolled      |
 * | FT-F08-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F08-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F08-04 | target - unknown id (invalid side)          | GET on a missing path              | 404                                                       |
 * | FT-F08-05 | path exposure - values                      | a fully-populated path             | the seven fields carry the right values                   |
 * | FT-F08-06 | sequence - mapping and pivot order          | three courses attached 1, 0, 2     | rows in order 0, 1, 2 with their own fields               |
 * | FT-F08-07 | progress - 0 / 50 / 100 percent             | four lessons, completions added    | 0, 50, and 100                                            |
 * | FT-F08-08 | enrollment flag - both sides                | enrolled, not enrolled             | true / false; a classmate's row never flips it            |
 * | FT-F08-09 | sequence - empty (boundary)                 | a path with no courses             | empty courses; progress 0                                 |
 * | FT-F08-10 | image - stored / external / null            | three paths                        | disk URL / unchanged / null                               |
 *
 * == Relation to the existing suites =========================================
 *
 * StudentLearningPathsPageTest already proves the detail access, the path and
 * sequence mapping, the completion-derived progress, and the enrollment
 * flag. F-08 deliberately repeats those so the feature file is self-contained;
 * the new content is the unknown-id 404, the exact path field set, the pivot
 * ordering across three courses, the 0/100 progress boundaries, the
 * cross-student scope of both the progress and the enrollment flag, and the
 * empty sequence.
 *
 * The listing that links here is F-07's subject; the enroll toggle is F-09's.
 * The admin editor is F-56's. The gate ordering is F-04's subject; this route
 * shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The sequence follows the pivot's order_index, not the attach order, so
 *   the admin's arrangement is what the student sees.
 * - Each course row carries its stored aggregates - duration and lesson
 *   count - not a live count.
 * - Progress is the viewer's completions across the sequence's courses over
 *   the sum of their stored lesson counts; it is zero when the sequence is
 *   empty, and a classmate's completions never move it.
 * - The enrollment flag belongs to the viewer; a classmate's enrollment row
 *   never flips it.
 * - A stored cover under `learning-paths/` becomes a public disk URL; an
 *   external URL passes through; a missing cover stays null.
 */

use App\Enums\Category;
use App\Models\Course;
use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F08-01 - a verified student opens the learning path detail', function () {
    // Boundary: access, valid side (baseline).
    $path = f08Path();

    $this->actingAs(f08Student())
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('LearningPaths/Detail', false)
            ->has('learningPath')
            ->has('courses')
            ->where('progress', 0)
            ->where('isEnrolled', false));
});

test('FT-F08-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $path = f08Path();

    $this->get(route('learning-paths.show', $path))->assertRedirect(route('login'));
});

test('FT-F08-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    $path = f08Path();
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('learning-paths.show', $path))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F08-04 - an unknown learning path is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs(f08Student())
        ->get(route('learning-paths.show', 999999))
        ->assertNotFound();
});

test('FT-F08-05 - the path entry carries the seven detail values', function () {
    // Boundary: path exposure, valid side. The stored cover is converted to a
    // public disk URL on this page as well.
    Storage::fake('public');
    $path = LearningPath::factory()->create([
        'title' => 'Reading Journey',
        'description' => 'A guided reading journey.',
        'level' => 'Intermediate',
        'image_url' => 'learning-paths/cover.jpg',
        'total_duration' => 12,
        'courses_count' => 3,
    ]);

    $this->actingAs(f08Student())
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPath.id', $path->id)
            ->where('learningPath.title', 'Reading Journey')
            ->where('learningPath.description', 'A guided reading journey.')
            ->where('learningPath.level', 'Intermediate')
            ->where('learningPath.image_url', Storage::disk('public')->url('learning-paths/cover.jpg'))
            ->where('learningPath.duration', 12)
            ->where('learningPath.coursesCount', 3));
});

test('FT-F08-06 - the sequence follows the pivot order and maps each course', function () {
    // Partition: sequence order. Three courses attached at orders 1, 0, 2, so
    // the display order can only come from the pivot.
    $path = f08Path();
    $third = f08Course(3, ['title' => 'Third Course', 'slug' => 'third-course']);
    $first = f08Course(2, [
        'title' => 'First Course',
        'slug' => 'first-course',
        'short_description' => 'The first stop.',
        'category' => Category::ReadingComprehension->value,
    ]);
    $second = f08Course(4, ['title' => 'Second Course', 'slug' => 'second-course']);

    $path->courses()->attach($second->id, ['order_index' => 1]);
    $path->courses()->attach($first->id, ['order_index' => 0]);
    $path->courses()->attach($third->id, ['order_index' => 2]);

    $this->actingAs(f08Student())
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 3)
            ->where('courses', fn ($courses) => collect($courses)->pluck('title')->all() === [
                'First Course',
                'Second Course',
                'Third Course',
            ])
            ->where('courses.0.id', $first->id)
            ->where('courses.0.slug', 'first-course')
            ->where('courses.0.description', 'The first stop.')
            ->where('courses.0.category', Category::ReadingComprehension->value)
            ->where('courses.0.duration', fn ($duration) => is_int($duration))
            ->where('courses.0.lessons', 2));
});

test('FT-F08-07 - progress spans 0, 50, and 100 percent from real completions', function () {
    // Boundary: progress. Two courses with two lessons each - four lessons in
    // the sequence; the viewer completes none, then two, then all.
    $student = f08Student();
    $path = f08Path();
    $first = f08Course(2);
    $second = f08Course(2);
    $path->courses()->attach($first->id, ['order_index' => 0]);
    $path->courses()->attach($second->id, ['order_index' => 1]);

    $this->actingAs($student)
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('progress', 0));

    $firstLessons = $first->lessons()->orderBy('order_index')->get();
    $secondLessons = $second->lessons()->orderBy('order_index')->get();

    LessonCompletion::factory()->for($student)->for($first)->for($firstLessons[0])->create();
    LessonCompletion::factory()->for($student)->for($second)->for($secondLessons[0])->create();

    $this->actingAs($student)
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('progress', 50));

    LessonCompletion::factory()->for($student)->for($first)->for($firstLessons[1])->create();
    LessonCompletion::factory()->for($student)->for($second)->for($secondLessons[1])->create();

    $this->actingAs($student)
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('progress', 100));
});

test('FT-F08-08 - the enrollment flag belongs to the viewer', function () {
    // Boundary: enrollment flag, both sides. A classmate's enrollment never
    // flips the viewer's flag.
    $viewer = f08Student();
    $other = f08Student();
    $path = f08Path();
    LearningPathEnrollment::factory()->for($other)->for($path)->create();

    $this->actingAs($viewer)
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('isEnrolled', false));

    LearningPathEnrollment::factory()->for($viewer)->for($path)->create();

    $this->actingAs($viewer)
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('isEnrolled', true));
});

test('FT-F08-09 - a path without courses renders an empty sequence', function () {
    // Boundary: sequence. The detail stays usable with empty courses and zero
    // progress.
    $path = f08Path(['courses_count' => 0]);

    $this->actingAs(f08Student())
        ->get(route('learning-paths.show', $path))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 0)
            ->where('progress', 0)
            ->where('learningPath.coursesCount', 0));
});

test('FT-F08-10 - the cover image is delivered in three shapes', function () {
    // Partition: image. A stored path becomes a public disk URL, an external
    // URL passes through, and a missing cover stays null.
    Storage::fake('public');
    $student = f08Student();
    $stored = f08Path(['image_url' => 'learning-paths/cover.jpg']);
    $external = f08Path(['image_url' => 'https://cdn.example.com/cover.jpg']);
    $missing = f08Path(['image_url' => null]);

    $this->actingAs($student)
        ->get(route('learning-paths.show', $stored))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPath.image_url', Storage::disk('public')->url('learning-paths/cover.jpg')));

    $this->actingAs($student)
        ->get(route('learning-paths.show', $external))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPath.image_url', 'https://cdn.example.com/cover.jpg'));

    $this->actingAs($student)
        ->get(route('learning-paths.show', $missing))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('learningPath.image_url', null));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f08Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * A learning path with the usual metadata.
 *
 * @param  array<string, mixed>  $attributes
 */
function f08Path(array $attributes = []): LearningPath
{
    return LearningPath::factory()->create(array_merge([
        'title' => 'Reading Journey',
        'level' => 'Intermediate',
        'image_url' => null,
    ], $attributes));
}

/**
 * A course carrying the given number of article lessons.
 *
 * CourseFactory seeds random counters, so the lesson count is reset before
 * the lessons are appended; the lesson observer then keeps it in step.
 *
 * @param  array<string, mixed>  $attributes
 */
function f08Course(int $lessons, array $attributes = []): Course
{
    $course = Course::factory()->create(array_merge([
        'lessons_count' => 0,
    ], $attributes));
    $module = Module::factory()->for($course)->create();

    collect(range(1, $lessons))
        ->each(fn () => Lesson::factory()->for($course)->for($module)->article()->create());

    return $course;
}
