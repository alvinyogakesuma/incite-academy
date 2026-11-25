<?php

/**
 * F-09 - Fungsi mendaftar jalur pembelajaran
 *
 * Feature tests for the student's learning path enrollment: POST /learning-
 * paths/{learning_path}/enroll (route learning-paths.enroll), behind the
 * auth -> verified gate. The action is a toggle: the first call enrolls the
 * signed-in student, and a repeat call drops the row again. The detail page
 * reflects the flag on its next render.
 *
 * Method: equivalence partitioning (EP) over the action's domains, then
 * boundary value analysis (BVA) of the toggle boundaries - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | target            | a stored learning path                         | an unknown id                                |
 * | enrollment state  | not enrolled, enrolled                         | another student's enrollment                 |
 * | invocation count  | first call (enroll), second call (drop),       | -                                            |
 * |                   | third call (re-enroll)                         |                                              |
 * | side effects      | one row with enrolled_at, redirect back        | duplicate rows or a stale flag               |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F09-01 | enrollment - first call (valid side)        | POST enroll                        | redirect back; one row with enrolled_at                   |
 * | FT-F09-02 | enrollment - second call (boundary)         | POST again                         | redirect back; the row is gone                            |
 * | FT-F09-03 | enrollment - third call (boundary)          | POST a third time                  | the row is back; still exactly one                        |
 * | FT-F09-04 | scope - per student                         | two students on one path           | each row is their own; the classmate's stays untouched    |
 * | FT-F09-05 | access - guest (invalid side)               | logged-out POST                    | redirect to login; no row                                 |
 * | FT-F09-06 | target - unknown id (invalid side)          | POST on a missing path             | 404; no row                                               |
 * | FT-F09-07 | detail flag - follows the toggle            | false -> enroll -> true -> drop    | isEnrolled true after the first, false after the second   |
 *
 * == Relation to the existing suites =========================================
 *
 * StudentLearningPathsPageTest already proves the toggle both ways and the
 * guest redirect. F-09 deliberately repeats those so the feature file is
 * self-contained; the new content is the full three-call parity, the
 * per-student row scope, the unknown-path 404, and the detail flag observed
 * across the toggle (including the redirect-back target).
 *
 * The detail page that carries the flag is F-08's subject; the listing is
 * F-07's. The admin sequence editor is F-56's. The gate ordering is F-04's
 * subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Enroll is a toggle, not an idempotent create: an existing row is deleted,
 *   otherwise a row is created with the current timestamp.
 * - Each student owns their own row; one student's toggle never touches a
 *   classmate's enrollment.
 * - The detail page reads the flag for the signed-in student, so it flips on
 *   the next render after the action.
 * - The action redirects back to the page it came from.
 * - A rejected request (guest, unknown path) writes nothing.
 */

use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F09-01 - the first call enrolls the student', function () {
    // Boundary: enrollment, valid side (first call).
    $student = f09Student();
    $path = f09Path();

    $this->actingAs($student)
        ->from(route('learning-paths.show', $path))
        ->post(route('learning-paths.enroll', $path))
        ->assertRedirect(route('learning-paths.show', $path));

    $enrollment = LearningPathEnrollment::query()->sole();

    expect($enrollment->user_id)->toBe($student->id)
        ->and($enrollment->learning_path_id)->toBe($path->id)
        ->and($enrollment->enrolled_at)->not->toBeNull();
});

test('FT-F09-02 - a second call drops the enrollment', function () {
    // Boundary: enrollment, second call (the toggle drops).
    $student = f09Student();
    $path = f09Path();

    $this->actingAs($student)->post(route('learning-paths.enroll', $path));
    $this->actingAs($student)->post(route('learning-paths.enroll', $path));

    expect(LearningPathEnrollment::query()->count())->toBe(0);
});

test('FT-F09-03 - a third call enrolls again, still a single row', function () {
    // Boundary: enrollment, third call (the toggle returns).
    $student = f09Student();
    $path = f09Path();

    $this->actingAs($student)->post(route('learning-paths.enroll', $path));
    $this->actingAs($student)->post(route('learning-paths.enroll', $path));
    $this->actingAs($student)->post(route('learning-paths.enroll', $path));

    expect(LearningPathEnrollment::query()->count())->toBe(1)
        ->and(LearningPathEnrollment::query()->sole()->user_id)->toBe($student->id);
});

test('FT-F09-04 - one student toggle leaves the classmate enrollment alone', function () {
    // Boundary: per-student scope. The classmate's row survives both of the
    // viewer's calls.
    $viewer = f09Student();
    $other = f09Student();
    $path = f09Path();
    LearningPathEnrollment::factory()->for($other)->for($path)->create();

    $this->actingAs($viewer)->post(route('learning-paths.enroll', $path));
    $this->actingAs($viewer)->post(route('learning-paths.enroll', $path));

    expect(LearningPathEnrollment::query()->count())->toBe(1)
        ->and(LearningPathEnrollment::query()->sole()->user_id)->toBe($other->id);
});

test('FT-F09-05 - a guest cannot enroll', function () {
    // Boundary: access, invalid side (authentication).
    $path = f09Path();

    $this->post(route('learning-paths.enroll', $path))
        ->assertRedirect(route('login'));

    expect(LearningPathEnrollment::query()->count())->toBe(0);
});

test('FT-F09-06 - enrolling in an unknown path is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs(f09Student())
        ->post(route('learning-paths.enroll', 999999))
        ->assertNotFound();

    expect(LearningPathEnrollment::query()->count())->toBe(0);
});

test('FT-F09-07 - the detail flag follows the toggle', function () {
    // Boundary: the flag read on the next render. Not enrolled, enrolled,
    // then not enrolled again.
    $student = f09Student();
    $path = f09Path();

    $this->actingAs($student)
        ->get(route('learning-paths.show', $path))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('isEnrolled', false));

    $this->actingAs($student)->post(route('learning-paths.enroll', $path));

    $this->actingAs($student)
        ->get(route('learning-paths.show', $path))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('isEnrolled', true));

    $this->actingAs($student)->post(route('learning-paths.enroll', $path));

    $this->actingAs($student)
        ->get(route('learning-paths.show', $path))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('isEnrolled', false));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f09Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * A stored learning path.
 *
 * @param  array<string, mixed>  $attributes
 */
function f09Path(array $attributes = []): LearningPath
{
    return LearningPath::factory()->create($attributes);
}
