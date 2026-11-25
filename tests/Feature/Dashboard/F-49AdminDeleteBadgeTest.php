<?php

/**
 * F-49 - Fungsi menghapus lencana oleh admin
 *
 * Feature tests for the admin's delete-badge flow: DELETE /dashboard/badges/
 * {badge} (route dashboard.badges.destroy), behind the auth -> verified ->
 * admin gate. The delete action on the listing submits this endpoint and the
 * response returns the admin to the listing.
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
 * | target       | an existing badge                          | an unknown id                              |
 * | awards       | awarded to students, bare                  | -                                          |
 * | cascade      | the badge's user_badges rows               | an orphaned award row                      |
 * | icon         | stored badges/ path, external, null        | a stored file surviving its badge          |
 * | persistence  | the row is hard-deleted                    | the row surviving a rejected request       |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F49-01 | success baseline; award cascade             | delete an awarded badge            | redirect to the listing; badge and its awards gone        |
 * | FT-F49-02 | icon - stored path                          | badges/icon.png                    | the stored file is deleted; an unrelated file is kept     |
 * | FT-F49-03 | awards - bare badge                         | a badge without awards             | redirect to the listing; row gone                         |
 * | FT-F49-04 | access - student (invalid side)             | student DELETE                     | 403; row, awards, and icon survive                        |
 * | FT-F49-05 | access - guest (invalid side)               | logged-out DELETE                  | redirect to login; row survives                           |
 * | FT-F49-06 | target - unknown id (invalid side)          | DELETE on a non-existent badge     | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * BadgesManagementTest already proves the happy path (redirect and row gone),
 * the award/icon cleanup, and the student rejection. F-49 deliberately repeats
 * those so the feature file is self-contained; the new content is the award
 * cascade observed row by row, the exact file set (icon removed, unrelated
 * file kept), the bare-badge target, the guest DELETE, and the unknown-id 404.
 *
 * The listing the redirect returns to is F-47's subject; the create and update
 * flows are F-46 and F-48. The avatar delete is F-53 with the same shape. The
 * student's badge grid is F-22's, where a deleted badge simply disappears. The
 * gate ordering is F-04's subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Delete is hard: the row is gone, not flagged or hidden.
 * - The cascading foreign keys take the students' award rows, so no user_badges
 *   row is left pointing at the deleted badge.
 * - A stored icon under `badges/` is deleted from the public disk; unrelated
 *   files and external URLs are left alone.
 * - A rejected request leaves the row, its awards, and its stored icon
 *   untouched.
 * - An unknown target id is a 404, not a validation error.
 */

use App\Models\Badge;
use App\Models\User;
use App\Models\UserBadge;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f49Admin();
});

test('FT-F49-01 - an admin deletes a badge with its awards', function () {
    // Boundary: success baseline and the cascade. Every award row goes with
    // the badge.
    $badge = Badge::factory()->create(['title' => 'Cascade Badge']);
    $first = User::factory()->create(['role' => 'student']);
    $second = User::factory()->create(['role' => 'student']);
    f49Award($first, $badge);
    f49Award($second, $badge, true);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.badges.destroy', $badge))
        ->assertRedirect(route('dashboard.badges'));

    expect(Badge::query()->find($badge->id))->toBeNull()
        ->and(UserBadge::query()->where('badge_id', $badge->id)->exists())->toBeFalse();
});

test('FT-F49-02 - deleting a badge removes its stored icon', function () {
    // Boundary: icon, valid side (stored path). Only the badge's own file is
    // removed.
    Storage::fake('public');
    Storage::disk('public')->put('badges/icon.png', 'icon');
    Storage::disk('public')->put('badges/unrelated.png', 'unrelated');
    $badge = Badge::factory()->create(['icon_url' => 'badges/icon.png']);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.badges.destroy', $badge))
        ->assertRedirect(route('dashboard.badges'));

    Storage::disk('public')->assertMissing('badges/icon.png');
    Storage::disk('public')->assertExists('badges/unrelated.png');
});

test('FT-F49-03 - an admin deletes a bare badge', function () {
    // Boundary: awards, valid side (no award rows to cascade).
    $badge = Badge::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.badges.destroy', $badge))
        ->assertRedirect(route('dashboard.badges'));

    expect(Badge::query()->find($badge->id))->toBeNull();
});

test('FT-F49-04 - a student cannot delete a badge', function () {
    // Boundary: access, invalid side (role). The rejected request leaves the
    // row, its award, and its stored icon intact.
    Storage::fake('public');
    Storage::disk('public')->put('badges/icon.png', 'icon');
    $badge = Badge::factory()->create(['icon_url' => 'badges/icon.png']);
    $student = User::factory()->create(['role' => 'student']);
    f49Award($student, $badge);

    $this->actingAs($student)
        ->delete(route('dashboard.badges.destroy', $badge))
        ->assertForbidden();

    expect(Badge::query()->find($badge->id))->not->toBeNull()
        ->and(UserBadge::query()->where('badge_id', $badge->id)->exists())->toBeTrue();
    Storage::disk('public')->assertExists('badges/icon.png');
});

test('FT-F49-05 - a guest cannot delete a badge', function () {
    // Boundary: access, invalid side (authentication).
    $badge = Badge::factory()->create();

    $this->delete(route('dashboard.badges.destroy', $badge))
        ->assertRedirect(route('login'));

    expect(Badge::query()->find($badge->id))->not->toBeNull();
});

test('FT-F49-06 - deleting an unknown badge is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->delete(route('dashboard.badges.destroy', 999999))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f49Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * Award the badge to the student.
 */
function f49Award(User $student, Badge $badge, bool $equipped = false): UserBadge
{
    return UserBadge::create([
        'user_id' => $student->id,
        'badge_id' => $badge->id,
        'is_equipped' => $equipped,
        'awarded_at' => now(),
    ]);
}
