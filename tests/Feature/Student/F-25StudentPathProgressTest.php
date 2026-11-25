<?php

/**
 * F-25 - Halaman progress jalur pembelajaran
 *
 * Feature tests for the learning path progress meters on the student's
 * profile page: the `paths` prop of GET /profile (route profile.edit),
 * behind the auth gate only. Only the paths the student registered for
 * appear, each carrying its metadata and the progress rolled up across the
 * path's courses.
 *
 * Method: equivalence partitioning (EP) over the meters' domains, then
 * boundary value analysis (BVA) of the progress-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | authenticated student                          | guest                                        |
 * | composition       | registered paths                               | paths without a registration                 |
 * | field exposure    | id, title, description, level, progress        | course sequence, counters, timestamps        |
 * | progress          | 0..100 across the path's courses               | another student's completions                |
 * | completion scope  | completions inside the path's courses          | completions of an outside course             |
 * | table state       | no registrations, registrations                | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F25-01 | composition - registered only               | one registered, one not            | only the registered path appears                          |
 * | FT-F25-02 | exposure - meter values                     | a fully-populated path             | the five fields carry the right values                    |
 * | FT-F25-03 | progress - 0 / 50 / 100 percent             | three paths, two courses each      | 0, 50, and 100                                            |
 * | FT-F25-04 | progress - path without courses             | zero courses                       | progress 0                                                |
 * | FT-F25-05 | progress - per student                      | a classmate's registration         | the viewer's list stays empty                             |
 * | FT-F25-06 | completion scope - outside course           | a completion outside the path      | the meter does not count it                               |
 * | FT-F25-07 | table state - no registrations (boundary)   | empty list                         | an empty paths prop                                       |
 * | FT-F25-08 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 *
 * == Relation to the existing suites =========================================
 *
 * ProfileTest already proves a path meter with a half-finished shared course.
 * F-25 deliberately repeats it so the feature file is self-contained; the new
 * content is the registered-only composition, the five-field mapping, the
 * 0/100 progress boundaries across multiple courses, the no-course floor, the
 * cross-student scope, the outside-course completion scope, and the empty
 * registration boundary.
 *
 * The course meters are F-24's subject; the badge and avatar grids are F-22
 * and F-20's. The student path detail page is F-08's, where the same rollup
 * is shown, and the enroll toggle is F-09's. The admin path editor is F-56's.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The list is driven by the student's learning-path registrations, not by
 *   the path table: an unregistered path never appears.
 * - The meter rolls up the stored lesson counts of the path's courses and the
 *   student's completions inside those courses; a completion outside the path
 *   never counts.
 * - Progress is rounded to a whole percent and floored at zero when the path
 *   has no courses.
 * - Each student sees only their own registrations and tallies.
 */

use App\Models\Course;
use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F25-01 - only registered paths appear in the meters', function () {
    // Boundary: composition. The registration row drives the list.
    $student = f25Student();
    $registered = f25Path('Registered Path', [f25Course(2)]);
    $unregistered = f25Path('Unregistered Path', [f25Course(2)]);
    LearningPathEnrollment::factory()->for($student)->for($registered)->create();

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('paths', 1)
            ->where('paths.0.title', 'Registered Path')
            ->where('paths.0.id', fn ($id) => $id !== $unregistered->id));
});

test('FT-F25-02 - a meter carries the five values', function () {
    // Boundary: exposure, valid side. Every field is pinned so a swapped or
    // truncated mapping fails.
    $student = f25Student();
    $path = LearningPath::factory()->create([
        'title' => 'Reading Journey',
        'description' => 'A guided reading journey.',
        'level' => 'Advanced',
    ]);
    LearningPathEnrollment::factory()->for($student)->for($path)->create();

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('paths.0.id', $path->id)
            ->where('paths.0.title', 'Reading Journey')
            ->where('paths.0.description', 'A guided reading journey.')
            ->where('paths.0.level', 'Advanced')
            ->where('paths.0.progress', 0));
});

test('FT-F25-03 - the meters span 0, 50, and 100 percent', function () {
    // Boundary: progress. Three paths with two courses of two lessons each -
    // untouched, one course finished, and everything finished.
    $student = f25Student();
    $untouched = f25Path('A Untouched', [f25Course(2), f25Course(2)]);
    $half = f25Path('B Half Done', [f25Course(2), f25Course(2)]);
    $done = f25Path('C All Done', [f25Course(2), f25Course(2)]);
    LearningPathEnrollment::factory()->for($student)->for($untouched)->create();
    LearningPathEnrollment::factory()->for($student)->for($half)->create();
    LearningPathEnrollment::factory()->for($student)->for($done)->create();
    f25Complete($student, $half->courses()->orderByPivot('order_index')->first(), 2);
    $done->courses()->get()->each(fn (Course $course) => f25Complete($student, $course, 2));

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('paths', 3)
            ->where('paths.0.progress', 0)
            ->where('paths.1.progress', 50)
            ->where('paths.2.progress', 100));
});

test('FT-F25-04 - a path without courses floors at zero', function () {
    // Boundary: progress. A zero denominator reports 0.
    $student = f25Student();
    $path = LearningPath::factory()->create(['title' => 'Empty Path', 'courses_count' => 0]);
    LearningPathEnrollment::factory()->for($student)->for($path)->create();

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('paths.0.progress', 0));
});

test('FT-F25-05 - the meters belong to the viewer', function () {
    // Boundary: per-student scope. A classmate's registration never appears.
    $viewer = f25Student();
    $other = f25Student();
    $path = f25Path('Classmate Path', [f25Course(2)]);
    LearningPathEnrollment::factory()->for($other)->for($path)->create();

    $this->actingAs($viewer)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('paths', 0));
});

test('FT-F25-06 - a completion outside the path is not counted', function () {
    // Boundary: completion scope. The student finished a course that is not
    // part of the registered path; the meter stays at zero.
    $student = f25Student();
    $path = f25Path('A Path', [f25Course(2)]);
    LearningPathEnrollment::factory()->for($student)->for($path)->create();
    f25Complete($student, f25Course(2), 2);

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('paths.0.title', 'A Path')
            ->where('paths.0.progress', 0));
});

test('FT-F25-07 - no registrations renders an empty list', function () {
    // Boundary: table state. Without registration rows the meters are empty.
    $this->actingAs(f25Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('paths', 0));
});

test('FT-F25-08 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('profile.edit'))->assertRedirect(route('login'));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f25Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * A course carrying the given number of article lessons.
 *
 * @param  array<string, mixed>  $attributes
 */
function f25Course(int $lessons, array $attributes = []): Course
{
    $course = Course::factory()->create(array_merge([
        'lessons_count' => 0,
    ], $attributes));
    $module = Module::factory()->for($course)->create();

    if ($lessons > 0) {
        collect(range(1, $lessons))
            ->each(fn () => Lesson::factory()->for($course)->for($module)->article()->create());
    }

    return $course;
}

/**
 * A learning path with the given title and course sequence.
 *
 * @param  array<int, Course>  $courses
 */
function f25Path(string $title, array $courses): LearningPath
{
    $path = LearningPath::factory()->create(['title' => $title]);

    foreach ($courses as $index => $course) {
        $path->courses()->attach($course->id, ['order_index' => $index]);
    }

    return $path;
}

/**
 * Complete the first N lessons of the course for the student.
 */
function f25Complete(User $student, Course $course, int $count): void
{
    $course->lessons()
        ->orderBy('order_index')
        ->limit($count)
        ->get()
        ->each(fn (Lesson $lesson) => LessonCompletion::factory()
            ->for($student)
            ->for($course)
            ->for($lesson)
            ->create());
}
