<?php

/**
 * F-35 - Halaman daftar modul pembelajaran
 *
 * Feature tests for the course editor page: GET /dashboard/courses/{course}/
 * edit (route dashboard.courses.edit), behind the auth -> verified -> admin
 * gate. The page is the outline the module and lesson actions return to: it
 * delivers the course metadata, its modules ordered by order_index, and each
 * module's lessons ordered by order_index. Questions and answers are not part
 * of this page - they belong to the lesson editor.
 *
 * Method: equivalence partitioning (EP) over the page's domains, then boundary
 * value analysis (BVA) of the outline-only boundaries - each boundary carries
 * both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | admin                                          | student, guest                               |
 * | target            | an existing course                             | an unknown id                                |
 * | outline           | empty, populated, gaps in order_index          | -                                            |
 * | module ordering   | ascending order_index                          | creation order                               |
 * | lesson ordering   | ascending order_index within its module        | creation order, lessons of another module    |
 * | module exposure   | id, title, lessons                             | course_id, order_index, counters, timestamps |
 * | lesson exposure   | id, title, type                                | content, questions, order_index              |
 * | course exposure   | the ten editor fields                          | slug, denormalized counters                  |
 * | course state      | a populated course, a blank draft              | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F35-01 | access - admin (valid side)                 | admin GET                          | 200 with course + categories props                        |
 * | FT-F35-02 | access - student (invalid side)             | student GET                        | 403                                                       |
 * | FT-F35-03 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F35-04 | target - unknown id (invalid side)          | GET on a non-existent course       | 404                                                       |
 * | FT-F35-05 | module ordering - by order_index            | orders 2, 0, 1                     | modules appear in order 0, 1, 2                           |
 * | FT-F35-06 | lesson ordering and scope                   | two modules, lessons out of order  | each module lists only its own lessons, ordered           |
 * | FT-F35-07 | module exposure - withheld fields           | one module                         | exactly id, title, lessons                                |
 * | FT-F35-08 | lesson exposure - withheld fields           | one lesson                         | exactly id, title, type                                   |
 * | FT-F35-09 | course exposure - values                    | a fully-populated course           | the ten editor fields carry the right values              |
 * | FT-F35-10 | course exposure - withheld fields           | the same course                    | exactly the ten keys; no slug or counters                 |
 * | FT-F35-11 | course state - blank draft                  | a fresh draft                      | null metadata; empty modules                              |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already proves the access trio, the populated editor's
 * outline, and the fresh-draft editor. F-35 deliberately repeats those so the
 * feature file is self-contained; the new content is the ordering pair (module
 * and lesson), the per-module lesson scope, the exact key sets for the course,
 * module, and lesson entries, and the stored-cover mapping on this page.
 *
 * The module and lesson mutations that return to this page are F-34 and
 * F-36..F-40's subjects. The lesson editor is F-40's subject. The
 * unverified-admin gate is not repeated: F-04 proved the gate ordering and
 * this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The whole outline rides in one `course` prop: the course metadata plus a
 *   `modules` array, each module carrying its own `lessons` array.
 * - Modules are ordered by order_index, not by creation order; the same holds
 *   for lessons inside a module.
 * - A module entry exposes exactly id, title, and lessons. The lesson entries
 *   expose exactly id, title, and type - the article body, the questions, and
 *   the order index stay on the lesson editor.
 * - The course entry omits the slug and the denormalized counters; a stored
 *   cover under courses/ is converted to a public disk URL.
 * - A blank draft renders with null metadata and an empty modules array, so
 *   the editor is usable before the first save.
 */

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F35-01 - an admin opens the course editor', function () {
    // Boundary: access, valid side (baseline).
    $course = Course::factory()->create(['title' => 'Editor Course']);

    $this->actingAs(f35Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Courses/Editor', false)
            ->has('course')
            ->has('categories'));
});

test('FT-F35-02 - a student is forbidden from the course editor', function () {
    // Boundary: access, invalid side (role).
    $course = Course::factory()->create();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.courses.edit', $course))
        ->assertForbidden();
});

test('FT-F35-03 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $course = Course::factory()->create();

    $this->get(route('dashboard.courses.edit', $course))
        ->assertRedirect(route('login'));
});

test('FT-F35-04 - opening an unknown course is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs(f35Admin())
        ->get(route('dashboard.courses.edit', 999999))
        ->assertNotFound();
});

test('FT-F35-05 - modules are ordered by order_index, not creation order', function () {
    // Partition: module ordering. Created in reverse order with explicit
    // indices so creation order and outline order disagree.
    $course = Course::factory()->create();
    Module::factory()->for($course)->create(['title' => 'Third Module', 'order_index' => 2]);
    Module::factory()->for($course)->create(['title' => 'First Module', 'order_index' => 0]);
    Module::factory()->for($course)->create(['title' => 'Second Module', 'order_index' => 1]);

    $this->actingAs(f35Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.modules', fn ($modules) => collect($modules)->pluck('title')->all() === [
                'First Module',
                'Second Module',
                'Third Module',
            ]));
});

test('FT-F35-06 - each module lists only its own lessons, ordered', function () {
    // Partition: lesson ordering and scope. Lessons are created out of order
    // and split across two modules so a leaked or misordered list fails.
    $course = Course::factory()->create();
    $first = Module::factory()->for($course)->create(['title' => 'First Module', 'order_index' => 0]);
    $second = Module::factory()->for($course)->create(['title' => 'Second Module', 'order_index' => 1]);

    Lesson::factory()->for($first)->create(['title' => 'Second Lesson', 'order_index' => 1]);
    Lesson::factory()->for($first)->create(['title' => 'First Lesson', 'order_index' => 0]);
    Lesson::factory()->for($second)->create(['title' => 'Only Lesson', 'order_index' => 0]);

    $this->actingAs(f35Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.modules.0.lessons', fn ($lessons) => collect($lessons)->pluck('title')->all() === [
                'First Lesson',
                'Second Lesson',
            ])
            ->where('course.modules.1.lessons', fn ($lessons) => collect($lessons)->pluck('title')->all() === [
                'Only Lesson',
            ]));
});

test('FT-F35-07 - a module entry withholds its internal fields', function () {
    // Boundary: module exposure, invalid side. The key-set comparison rejects
    // both a missing field and any extra field.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->create();

    $this->actingAs(f35Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.modules.0', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'id',
                'lessons',
                'title',
            ]));
});

test('FT-F35-08 - a lesson entry withholds its content fields', function () {
    // Boundary: lesson exposure, invalid side. Content, questions, and the
    // order index stay on the lesson editor.
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->create();

    $this->actingAs(f35Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.modules.0.lessons.0', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'id',
                'title',
                'type',
            ]));
});

test('FT-F35-09 - the course entry carries the ten editor values', function () {
    // Boundary: course exposure, valid side. The stored cover is converted to
    // a public disk URL on this page as well.
    Storage::fake('public');
    $course = Course::factory()->create([
        'title' => 'Reading Mastery',
        'short_description' => 'A short description.',
        'long_description' => 'A long description.',
        'image_url' => 'courses/cover.jpg',
        'status' => 'published',
        'total_duration' => 90,
        'total_points' => 120,
    ]);

    $this->actingAs(f35Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.id', $course->id)
            ->where('course.title', 'Reading Mastery')
            ->where('course.category', $course->category?->value)
            ->where('course.short_description', 'A short description.')
            ->where('course.long_description', 'A long description.')
            ->where('course.image_url', Storage::disk('public')->url('courses/cover.jpg'))
            ->where('course.status', 'published')
            ->where('course.total_duration', 90)
            ->where('course.total_points', 120));
});

test('FT-F35-10 - the course entry withholds the slug and counters', function () {
    // Boundary: course exposure, invalid side. The editor works from the
    // fields it can save; the slug and the denormalized counters stay out.
    $course = Course::factory()->create(['title' => 'Key Set Course']);

    $this->actingAs(f35Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course', fn ($entry) => $entry->keys()->sort()->values()->all() === [
                'category',
                'id',
                'image_url',
                'long_description',
                'modules',
                'short_description',
                'status',
                'title',
                'total_duration',
                'total_points',
            ]));
});

test('FT-F35-11 - a fresh draft opens with null metadata and no modules', function () {
    // Boundary: course state, valid side (blank draft). The editor is usable
    // before the first save.
    $course = Course::factory()->draft()->create();

    $this->actingAs(f35Admin())
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('course.title', null)
            ->where('course.category', null)
            ->where('course.long_description', null)
            ->where('course.image_url', null)
            ->where('course.status', 'draft')
            ->where('course.total_duration', 0)
            ->where('course.total_points', 0)
            ->where('course.modules', fn ($modules) => collect($modules)->isEmpty())
            ->has('categories'));
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f35Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
