<?php

/**
 * F-39 - Halaman daftar pelajaran
 *
 * Feature tests for the lesson list inside the course editor: GET /dashboard/
 * courses/{course}/edit (route dashboard.courses.edit), behind the auth ->
 * verified -> admin gate. Each module card delivers its lessons in a nested
 * `lessons` array - the rows the outline renders with their type badges - and
 * this suite isolates that lesson side of the outline.
 *
 * Method: equivalence partitioning (EP) over the list's domains, then boundary
 * value analysis (BVA) of the list-only boundaries - each boundary carries
 * both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | admin                                          | student, guest                               |
 * | module state      | with lessons, empty                            | -                                            |
 * | lesson ordering   | ascending order_index within its module        | creation order                               |
 * | lesson scope      | the module's own lessons                       | lessons of another module                    |
 * | lesson exposure   | id, title, type                                | content, questions, order_index              |
 * | lesson types      | article, quiz, exam                            | a value outside the three types              |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F39-01 | access - admin (valid side)                 | admin GET                          | 200 with the modules and their lessons                    |
 * | FT-F39-02 | access - student (invalid side)             | student GET                        | 403                                                       |
 * | FT-F39-03 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F39-04 | ordering - by order_index                   | lessons created out of order       | rows appear in order 0, 1, 2                              |
 * | FT-F39-05 | scope - per module                          | two modules with two lessons each  | each module lists only its own rows                       |
 * | FT-F39-06 | exposure - withheld fields                  | one lesson                         | exactly id, title, type                                   |
 * | FT-F39-07 | types - all three badges                    | article, quiz, exam lessons        | each row carries its own type value                       |
 * | FT-F39-08 | module state - empty module (boundary)      | a module with no lessons           | an empty lessons array                                    |
 *
 * == Relation to the existing suites =========================================
 *
 * F-35 covers the same editor page from the module side and already asserts
 * the lesson ordering, scope, and exposure as part of its outline check;
 * CoursesManagementTest also opens the editor with lessons. F-39 deliberately
 * repeats those so the lesson-list story is self-contained; the new content
 * is the isolated lesson view - the ordering boundary across three rows, the
 * per-module split, the exact key set, the three type badges, and the empty
 * module. The lesson mutations that return to this list are F-38, F-40, and
 * F-41's subjects. The gate ordering is F-04's subject; this route shares the
 * same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The lessons ride inside each module entry, so an empty module delivers an
 *   empty `lessons` array rather than omitting the key.
 * - Lessons are ordered by order_index, not by creation order, and each
 *   module's array holds only its own rows.
 * - A lesson row exposes exactly id, title, and type. The article body, the
 *   question tree, the order index, and the duration stay on the lesson
 *   editor or out of this page.
 * - The three stored type values - article, quiz, exam - reach the browser
 *   unchanged; the badge labels are the client's concern.
 */

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F39-01 - an admin views the lesson list of a module', function () {
    // Boundary: access, valid side (baseline). The module entry carries its
    // lessons array.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->create();

    $this->actingAs(f39Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Courses/Editor', false)
            ->has('course.modules.0.lessons', 1));
});

test('FT-F39-02 - a student is forbidden from the lesson list', function () {
    // Boundary: access, invalid side (role).
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->create();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.courses.edit', $course))
        ->assertForbidden();
});

test('FT-F39-03 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->create();

    $this->get(route('dashboard.courses.edit', $course))
        ->assertRedirect(route('login'));
});

test('FT-F39-04 - lessons are ordered by order_index, not creation order', function () {
    // Partition: lesson ordering. Created in reverse order with explicit
    // indices so creation order and list order disagree.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->create(['title' => 'Third Lesson', 'order_index' => 2]);
    Lesson::factory()->for($module)->create(['title' => 'First Lesson', 'order_index' => 0]);
    Lesson::factory()->for($module)->create(['title' => 'Second Lesson', 'order_index' => 1]);

    $this->actingAs(f39Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.modules.0.lessons', fn ($lessons) => collect($lessons)->pluck('title')->all() === [
                'First Lesson',
                'Second Lesson',
                'Third Lesson',
            ]));
});

test('FT-F39-05 - each module lists only its own lessons', function () {
    // Partition: lesson scope. Two modules with two lessons each, so a leaked
    // or merged list fails.
    $course = Course::factory()->create();
    $first = Module::factory()->for($course)->create(['title' => 'First Module', 'order_index' => 0]);
    $second = Module::factory()->for($course)->create(['title' => 'Second Module', 'order_index' => 1]);

    Lesson::factory()->for($first)->create(['title' => 'First A', 'order_index' => 0]);
    Lesson::factory()->for($first)->create(['title' => 'First B', 'order_index' => 1]);
    Lesson::factory()->for($second)->create(['title' => 'Second A', 'order_index' => 0]);
    Lesson::factory()->for($second)->create(['title' => 'Second B', 'order_index' => 1]);

    $this->actingAs(f39Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.modules.0.lessons', fn ($lessons) => collect($lessons)->pluck('title')->all() === [
                'First A',
                'First B',
            ])
            ->where('course.modules.1.lessons', fn ($lessons) => collect($lessons)->pluck('title')->all() === [
                'Second A',
                'Second B',
            ]));
});

test('FT-F39-06 - a lesson row withholds its content fields', function () {
    // Boundary: lesson exposure, invalid side. The key-set comparison rejects
    // both a missing field and any extra field.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->create();

    $this->actingAs(f39Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.modules.0.lessons.0', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'id',
                'title',
                'type',
            ]));
});

test('FT-F39-07 - the three lesson types reach the list unchanged', function () {
    // Partition: lesson types. One row of each type, so the badge mapping has
    // all three stored values to work with.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->article()->create(['title' => 'Article Lesson', 'order_index' => 0]);
    Lesson::factory()->for($module)->quiz()->create(['title' => 'Quiz Lesson', 'order_index' => 1]);
    Lesson::factory()->for($module)->exam()->create(['title' => 'Exam Lesson', 'order_index' => 2]);

    $this->actingAs(f39Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.modules.0.lessons.0.type', 'article')
            ->where('course.modules.0.lessons.1.type', 'quiz')
            ->where('course.modules.0.lessons.2.type', 'exam'));
});

test('FT-F39-08 - an empty module delivers an empty lessons array', function () {
    // Boundary: module state. The key is present with zero rows, so the
    // outline can render the module before its first lesson is added.
    $course = Course::factory()->create();
    Module::factory()->for($course)->create();

    $this->actingAs(f39Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('course.modules.0.lessons', 0));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f39Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
