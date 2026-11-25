<?php

/**
 * F-53 - Fungsi menghapus avatar oleh admin
 *
 * Feature tests for the admin's delete-avatar flow: DELETE /dashboard/avatars/
 * {avatar} (route dashboard.avatars.destroy), behind the auth -> verified ->
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
 * | target       | an existing avatar                         | an unknown id                              |
 * | awards       | awarded to students, bare                  | -                                          |
 * | cascade      | the avatar's user_avatars rows             | an orphaned award row                      |
 * | icon         | stored avatars/ path, external, null       | a stored file surviving its avatar         |
 * | persistence  | the row is hard-deleted                    | the row surviving a rejected request       |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F53-01 | success baseline; award cascade             | delete an awarded avatar           | redirect to the listing; avatar and its awards gone       |
 * | FT-F53-02 | icon - stored path                          | avatars/icon.png                   | the stored file is deleted; an unrelated file is kept     |
 * | FT-F53-03 | awards - bare avatar                        | an avatar without awards           | redirect to the listing; row gone                         |
 * | FT-F53-04 | access - student (invalid side)             | student DELETE                     | 403; row, awards, and icon survive                        |
 * | FT-F53-05 | access - guest (invalid side)               | logged-out DELETE                  | redirect to login; row survives                           |
 * | FT-F53-06 | target - unknown id (invalid side)          | DELETE on a non-existent avatar    | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * AvatarsManagementTest already proves the happy path (redirect and row gone),
 * the award/icon cleanup, and the student rejection. F-53 deliberately repeats
 * those so the feature file is self-contained; the new content is the award
 * cascade observed row by row, the exact file set (icon removed, unrelated
 * file kept), the bare-avatar target, the guest DELETE, and the unknown-id 404.
 *
 * The listing the redirect returns to is F-51's subject; the create and update
 * flows are F-50 and F-52. The badge delete is F-49 with the same shape. The
 * student's avatar grid is F-20's, where a deleted avatar simply disappears and
 * an equipped slot would clear with the cascade. The gate ordering is F-04's
 * subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Delete is hard: the row is gone, not flagged or hidden.
 * - The cascading foreign keys take the students' award rows, so no
 *   user_avatars row is left pointing at the deleted avatar.
 * - A stored icon under `avatars/` is deleted from the public disk; unrelated
 *   files and external URLs are left alone.
 * - A rejected request leaves the row, its awards, and its stored icon
 *   untouched.
 * - An unknown target id is a 404, not a validation error.
 */

use App\Models\Avatar;
use App\Models\User;
use App\Models\UserAvatar;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f53Admin();
});

test('FT-F53-01 - an admin deletes an avatar with its awards', function () {
    // Boundary: success baseline and the cascade. Every award row goes with
    // the avatar.
    $avatar = Avatar::factory()->create(['title' => 'Cascade Avatar']);
    $first = User::factory()->create(['role' => 'student']);
    $second = User::factory()->create(['role' => 'student']);
    f53Award($first, $avatar);
    f53Award($second, $avatar, true);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.avatars.destroy', $avatar))
        ->assertRedirect(route('dashboard.avatars'));

    expect(Avatar::query()->find($avatar->id))->toBeNull()
        ->and(UserAvatar::query()->where('avatar_id', $avatar->id)->exists())->toBeFalse();
});

test('FT-F53-02 - deleting an avatar removes its stored icon', function () {
    // Boundary: icon, valid side (stored path). Only the avatar's own file is
    // removed.
    Storage::fake('public');
    Storage::disk('public')->put('avatars/icon.png', 'icon');
    Storage::disk('public')->put('avatars/unrelated.png', 'unrelated');
    $avatar = Avatar::factory()->create(['icon_url' => 'avatars/icon.png']);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.avatars.destroy', $avatar))
        ->assertRedirect(route('dashboard.avatars'));

    Storage::disk('public')->assertMissing('avatars/icon.png');
    Storage::disk('public')->assertExists('avatars/unrelated.png');
});

test('FT-F53-03 - an admin deletes a bare avatar', function () {
    // Boundary: awards, valid side (no award rows to cascade).
    $avatar = Avatar::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.avatars.destroy', $avatar))
        ->assertRedirect(route('dashboard.avatars'));

    expect(Avatar::query()->find($avatar->id))->toBeNull();
});

test('FT-F53-04 - a student cannot delete an avatar', function () {
    // Boundary: access, invalid side (role). The rejected request leaves the
    // row, its award, and its stored icon intact.
    Storage::fake('public');
    Storage::disk('public')->put('avatars/icon.png', 'icon');
    $avatar = Avatar::factory()->create(['icon_url' => 'avatars/icon.png']);
    $student = User::factory()->create(['role' => 'student']);
    f53Award($student, $avatar);

    $this->actingAs($student)
        ->delete(route('dashboard.avatars.destroy', $avatar))
        ->assertForbidden();

    expect(Avatar::query()->find($avatar->id))->not->toBeNull()
        ->and(UserAvatar::query()->where('avatar_id', $avatar->id)->exists())->toBeTrue();
    Storage::disk('public')->assertExists('avatars/icon.png');
});

test('FT-F53-05 - a guest cannot delete an avatar', function () {
    // Boundary: access, invalid side (authentication).
    $avatar = Avatar::factory()->create();

    $this->delete(route('dashboard.avatars.destroy', $avatar))
        ->assertRedirect(route('login'));

    expect(Avatar::query()->find($avatar->id))->not->toBeNull();
});

test('FT-F53-06 - deleting an unknown avatar is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->delete(route('dashboard.avatars.destroy', 999999))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f53Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * Award the avatar to the student.
 */
function f53Award(User $student, Avatar $avatar, bool $equipped = false): UserAvatar
{
    return UserAvatar::create([
        'user_id' => $student->id,
        'avatar_id' => $avatar->id,
        'is_equipped' => $equipped,
        'awarded_at' => now(),
    ]);
}
