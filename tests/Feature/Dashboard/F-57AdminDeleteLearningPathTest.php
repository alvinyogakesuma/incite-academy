<?php

/**
 * F-57 - Fungsi menghapus jalur pembelajaran oleh admin
 *
 * Feature tests for the admin's delete-learning-path flow: DELETE /dashboard/
 * learning-paths/{learning_path} (route dashboard.learning-paths.destroy),
 * behind the auth -> verified -> admin gate. The delete action on the listing
 * submits this endpoint and the response returns the admin to the listing.
 *
 * Method: equivalence partitioning (EP) over the delete request's domains,
 * then boundary value analysis (BVA) of the delete-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain       | Valid classes                              | Invalid classes                            |
 * |--------------|--------------------------------------------|--------------------------------------------|
 * | access       | admin                                      | student, guest                             |
 * | target       | an existing learning path                  | an unknown id                              |
 * | sequence     | courses attached, empty                    | -                                          |
 * | cascade      | the path's pivot rows and enrollments      | an orphaned pivot or enrollment row        |
 * | courses      | the member courses survive                 | a course deleted with the path             |
 * | cover        | stored learning-paths/ path                | a stored file surviving its path           |
 * | persistence  | the row is hard-deleted                    | the row surviving a rejected request       |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F57-01 | success baseline; cascade                   | delete a path with courses and an  | redirect to the listing; pivot rows and enrollments gone; |
 * |           |                                             | enrollment                         | the member courses survive                                |
 * | FT-F57-02 | cover - stored path                         | learning-paths/cover.png           | the stored file is deleted; an unrelated file is kept     |
 * | FT-F57-03 | sequence - bare path                        | a path with no courses             | redirect to the listing; row gone                         |
 * | FT-F57-04 | access - student (invalid side)             | student DELETE                     | 403; row and stored cover survive                         |
 * | FT-F57-05 | access - guest (invalid side)               | logged-out DELETE                  | redirect to login; row survives                           |
 * | FT-F57-06 | target - unknown id (invalid side)          | DELETE on a non-existent path      | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * LearningPathsManagementTest already proves the happy path (redirect, row
 * gone, pivot cascade) and the student rejection. F-57 deliberately repeats
 * those so the feature file is self-contained; the new content is the student
 * enrollment cascade, the surviving member courses, the exact file set
 * (cover removed, unrelated file kept), the bare-path target, the guest
 * DELETE, and the unknown-id 404.
 *
 * The listing the redirect returns to is F-55's subject; the create and
 * update flows are F-54 and F-56. The student enrollment row is F-09's
 * subject. The gate ordering is F-04's subject; this route shares the same
 * middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Delete is hard: the row is gone, not flagged or hidden.
 * - The cascading foreign keys take the pivot sequence and the students'
 *   enrollment rows; the member courses themselves are untouched.
 * - A stored cover under `learning-paths/` is deleted from the public disk;
 *   unrelated files and external URLs are left alone.
 * - A rejected request leaves the row, its pivot rows, and its stored cover
 *   untouched.
 * - An unknown target id is a 404, not a validation error.
 */

use App\Models\Course;
use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f57Admin();
});

test('FT-F57-01 - an admin deletes a path with its sequence and enrollments', function () {
    // Boundary: success baseline and the cascade. The pivot and the student
    // enrollment go with the path; the member courses stay.
    $path = LearningPath::factory()->create(['title' => 'Cascade Path']);
    $first = Course::factory()->create();
    $second = Course::factory()->create();
    $path->courses()->attach($first->id, ['order_index' => 0]);
    $path->courses()->attach($second->id, ['order_index' => 1]);
    $student = User::factory()->create(['role' => 'student']);
    LearningPathEnrollment::factory()->for($student)->for($path)->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.learning-paths.destroy', $path))
        ->assertRedirect(route('dashboard.learning-paths'));

    expect(LearningPath::query()->find($path->id))->toBeNull()
        ->and(DB::table('course_learning_path')->where('learning_path_id', $path->id)->exists())->toBeFalse()
        ->and(LearningPathEnrollment::query()->where('learning_path_id', $path->id)->exists())->toBeFalse()
        ->and(Course::query()->find($first->id))->not->toBeNull()
        ->and(Course::query()->find($second->id))->not->toBeNull();
});

test('FT-F57-02 - deleting a path removes its stored cover', function () {
    // Boundary: cover, valid side (stored path). Only the path's own file is
    // removed.
    Storage::fake('public');
    Storage::disk('public')->put('learning-paths/cover.png', 'cover');
    Storage::disk('public')->put('learning-paths/unrelated.png', 'unrelated');
    $path = LearningPath::factory()->create(['image_url' => 'learning-paths/cover.png']);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.learning-paths.destroy', $path))
        ->assertRedirect(route('dashboard.learning-paths'));

    Storage::disk('public')->assertMissing('learning-paths/cover.png');
    Storage::disk('public')->assertExists('learning-paths/unrelated.png');
});

test('FT-F57-03 - an admin deletes a bare path', function () {
    // Boundary: sequence, valid side (no courses to cascade).
    $path = LearningPath::factory()->create(['courses_count' => 0]);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.learning-paths.destroy', $path))
        ->assertRedirect(route('dashboard.learning-paths'));

    expect(LearningPath::query()->find($path->id))->toBeNull();
});

test('FT-F57-04 - a student cannot delete a learning path', function () {
    // Boundary: access, invalid side (role). The rejected request leaves the
    // row and its stored cover intact.
    Storage::fake('public');
    Storage::disk('public')->put('learning-paths/cover.png', 'cover');
    $path = LearningPath::factory()->create(['image_url' => 'learning-paths/cover.png']);
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->delete(route('dashboard.learning-paths.destroy', $path))
        ->assertForbidden();

    expect(LearningPath::query()->find($path->id))->not->toBeNull();
    Storage::disk('public')->assertExists('learning-paths/cover.png');
});

test('FT-F57-05 - a guest cannot delete a learning path', function () {
    // Boundary: access, invalid side (authentication).
    $path = LearningPath::factory()->create();

    $this->delete(route('dashboard.learning-paths.destroy', $path))
        ->assertRedirect(route('login'));

    expect(LearningPath::query()->find($path->id))->not->toBeNull();
});

test('FT-F57-06 - deleting an unknown path is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->delete(route('dashboard.learning-paths.destroy', 999999))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f57Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}
