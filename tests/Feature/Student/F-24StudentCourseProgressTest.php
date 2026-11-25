<?php

/**
 * F-24 - Halaman progress kursus
 *
 * Feature tests for the course progress meters on the student's profile
 * page: the `courses` prop of GET /profile (route profile.edit), behind the
 * auth gate only. Only the courses the student is enrolled in appear, each
 * carrying the stored aggregates and the student's completed-lesson tally
 * with the derived progress percentage.
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
 * | composition       | enrolled courses                               | courses without an enrollment                |
 * | field exposure    | id, slug, title, description, category,        | stored counters beyond total, timestamps     |
 * |                   | completed, total, progress                     |                                              |
 * | progress          | 0..100 percent of the course's lessons         | another student's completions                |
 * | completion scope  | completions of this course                     | completions of another course                |
 * | table state       | no enrollments, enrollments                    | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F24-01 | composition - enrolled only                 | one enrolled, one unenrolled       | only the enrolled course appears                          |
 * | FT-F24-02 | exposure - meter values                     | a fully-populated course           | the eight fields carry the right values                   |
 * | FT-F24-03 | progress - 0 / 50 / 100 percent             | three enrolled courses             | 0, 50, and 100 with the matching tallies                  |
 * | FT-F24-04 | progress - course without lessons           | zero total                         | progress 0; total 0                                       |
 * | FT-F24-05 | progress - per student                      | a classmate's enrollment           | the viewer's list stays empty                             |
 * | FT-F24-06 | completion scope - another course           | a completion outside the course    | the meter does not count it                               |
 * | FT-F24-07 | table state - no enrollments (boundary)     | empty list                         | an empty courses prop                                     |
 * | FT-F24-08 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 *
 * == Relation to the existing suites =========================================
 *
 * ProfileTest already proves the course meter mapping and a half-finished
 * course. F-24 deliberately repeats those so the feature file is
 * self-contained; the new content is the enrolled-only composition, the
 * 0/100 progress boundaries, the no-lesson floor, the cross-student scope,
 * the cross-course completion scope, and the empty-enrollment boundary.
 *
 * The path meters are F-25's subject; the badge and avatar grids are F-22 and
 * F-20's; the personal information form is F-18's. The student course catalog
 * is F-10's, where the same progress formula is shown on the cards. The admin
 * course stats are F-31's.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The list is driven by the student's enrollment rows, not by the course
 *   table: an unenrolled course never appears even when it has completions.
 * - The meter is the course's stored lesson count and the student's
 *   completions in that course; a completion in another course never counts.
 * - Progress is rounded to a whole percent and floored at zero when the
 *   course has no lessons.
 * - Each student sees only their own enrollments and tallies.
 */

use App\Enums\Category;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F24-01 - only enrolled courses appear in the meters', function () {
    // Boundary: composition. The enrollment row, not the course row, drives
    // the list.
    $student = f24Student();
    $enrolled = Course::factory()->create(['title' => 'Enrolled Course', 'lessons_count' => 0]);
    Course::factory()->create(['title' => 'Unenrolled Course', 'lessons_count' => 0]);
    Enrollment::factory()->for($student)->for($enrolled)->create();

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 1)
            ->where('courses.0.title', 'Enrolled Course'));
});

test('FT-F24-02 - a meter carries the eight values', function () {
    // Boundary: exposure, valid side. Every field is pinned so a swapped or
    // truncated mapping fails.
    $student = f24Student();
    $course = f24Course(2, [
        'title' => 'Reading Mastery',
        'slug' => 'reading-mastery',
        'short_description' => 'A short description.',
        'category' => Category::ReadingComprehension->value,
    ]);
    Enrollment::factory()->for($student)->for($course)->create();
    $first = $course->lessons()->orderBy('order_index')->first();
    LessonCompletion::factory()->for($student)->for($course)->for($first)->create();

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0.id', $course->id)
            ->where('courses.0.slug', 'reading-mastery')
            ->where('courses.0.title', 'Reading Mastery')
            ->where('courses.0.description', 'A short description.')
            ->where('courses.0.category', Category::ReadingComprehension->value)
            ->where('courses.0.completed', 1)
            ->where('courses.0.total', 2)
            ->where('courses.0.progress', 50));
});

test('FT-F24-03 - the meters span 0, 50, and 100 percent', function () {
    // Boundary: progress. Three enrolled courses with two lessons each -
    // untouched, half finished, and finished.
    $student = f24Student();
    $untouched = f24Course(2, ['title' => 'A Untouched']);
    $half = f24Course(2, ['title' => 'B Half Done']);
    $done = f24Course(2, ['title' => 'C All Done']);
    Enrollment::factory()->for($student)->for($untouched)->create();
    Enrollment::factory()->for($student)->for($half)->create();
    Enrollment::factory()->for($student)->for($done)->create();
    f24Complete($student, $half, 1);
    f24Complete($student, $done, 2);

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 3)
            ->where('courses.0.progress', 0)
            ->where('courses.1.progress', 50)
            ->where('courses.2.progress', 100));
});

test('FT-F24-04 - a course without lessons floors at zero', function () {
    // Boundary: progress. A zero total cannot divide; the meter reports 0.
    $student = f24Student();
    $course = f24Course(0, ['title' => 'Empty Course']);
    Enrollment::factory()->for($student)->for($course)->create();

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('courses.0.total', 0)
            ->where('courses.0.completed', 0)
            ->where('courses.0.progress', 0));
});

test('FT-F24-05 - the meters belong to the viewer', function () {
    // Boundary: per-student scope. A classmate's enrollment never appears in
    // the viewer's list.
    $viewer = f24Student();
    $other = f24Student();
    $course = f24Course(2);
    Enrollment::factory()->for($other)->for($course)->create();
    f24Complete($other, $course, 2);

    $this->actingAs($viewer)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 0));
});

test('FT-F24-06 - a completion outside the course is not counted', function () {
    // Boundary: completion scope. The student completed a lesson of another
    // course; the enrolled course's meter stays at zero.
    $student = f24Student();
    $enrolled = f24Course(2, ['title' => 'A Enrolled']);
    $outside = f24Course(2, ['title' => 'B Outside']);
    Enrollment::factory()->for($student)->for($enrolled)->create();
    f24Complete($student, $outside, 2);

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 1)
            ->where('courses.0.title', 'A Enrolled')
            ->where('courses.0.completed', 0)
            ->where('courses.0.progress', 0));
});

test('FT-F24-07 - no enrollments renders an empty list', function () {
    // Boundary: table state. Without enrollment rows the meters are empty.
    $this->actingAs(f24Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('courses', 0));
});

test('FT-F24-08 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('profile.edit'))->assertRedirect(route('login'));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f24Student(array $attributes = []): User
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
function f24Course(int $lessons, array $attributes = []): Course
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
 * Complete the first N lessons of the course for the student.
 */
function f24Complete(User $student, Course $course, int $count): void
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
