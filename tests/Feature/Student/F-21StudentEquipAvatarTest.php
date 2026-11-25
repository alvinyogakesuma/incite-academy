<?php

/**
 * F-21 - Fungsi memilih avatar profil
 *
 * Feature tests for equipping an avatar: POST /profile/avatars/{avatar}
 * (route profile.avatars.equip), behind the auth gate only. The action is the
 * profile grid's pick: only an awarded avatar can take the slot, and the pick
 * is exclusive - every other equipped avatar clears.
 *
 * Method: equivalence partitioning (EP) over the action's domains, then
 * boundary value analysis (BVA) of the equip-only boundaries - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | authenticated student                          | guest                                        |
 * | target            | a stored avatar                                | an unknown id                                |
 * | award state       | awarded, not awarded                           | -                                            |
 * | equipped state    | already equipped, another pick equipped        | another student's equipped row               |
 * | side effects      | one equipped row, redirect back                | duplicate equipped rows                      |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F21-01 | equip - earned avatar (valid side)          | awarded avatar POST                | redirect back; the row becomes equipped                   |
 * | FT-F21-02 | exclusivity - previous pick cleared         | a second awarded avatar            | the old pick clears; only the new one is equipped         |
 * | FT-F21-03 | award state - unearned (invalid side)       | not-awarded avatar                 | error on avatar; no row written                           |
 * | FT-F21-04 | target - unknown id (invalid side)          | 999999                             | 404; no row written                                       |
 * | FT-F21-05 | access - guest (invalid side)               | logged-out POST                    | redirect to login; no row written                         |
 * | FT-F21-06 | scope - another student's slot              | classmate equipped                 | the classmate's row is untouched                          |
 * | FT-F21-07 | re-equip - same avatar (boundary)           | two POSTs on the same avatar       | still exactly one equipped row                            |
 *
 * == Relation to the existing suites =========================================
 *
 * ProfileTest already proves the exclusive switch and the unearned rejection
 * plus the guest redirect. F-21 deliberately repeats those so the feature
 * file is self-contained; the new content is the single-row equip, the
 * unknown-id 404, the per-student scope, and the re-equip idempotence.
 *
 * The grid that lists the avatars is F-20's subject; the shared header icon
 * is F-20's too. The badge toggle is F-23's. The admin avatar CRUD is
 * F-50..F-53. The gate ordering is F-04's subject, but this route uses the
 * auth middleware only.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Only awarded avatars can take the slot; an unearned one answers with an
 *   `avatar` error and writes nothing.
 * - The pick is exclusive: the equip clears every equipped row first, then
 *   sets the chosen one, so exactly one avatar is worn at a time.
 * - The action redirects back to the page it came from.
 * - The award rows belong to the signed-in student; a classmate's slot is
 *   never touched.
 * - Re-equipping the already-worn avatar stays a single equipped row.
 */

use App\Models\Avatar;
use App\Models\User;
use App\Models\UserAvatar;

test('FT-F21-01 - a student equips an earned avatar', function () {
    // Boundary: equip, valid side. The award row becomes the equipped pick.
    $student = f21Student();
    $avatar = Avatar::factory()->create(['title' => 'Knight']);
    f21Award($student, $avatar);

    $this->actingAs($student)
        ->from(route('profile.edit'))
        ->post(route('profile.avatars.equip', $avatar))
        ->assertRedirect(route('profile.edit'));

    expect(UserAvatar::query()->where('user_id', $student->id)->sole()->is_equipped)->toBeTrue();
});

test('FT-F21-02 - equipping another avatar clears the previous pick', function () {
    // Boundary: exclusivity. Only one avatar wears the slot.
    $student = f21Student();
    $old = Avatar::factory()->create(['title' => 'Old Pick']);
    $new = Avatar::factory()->create(['title' => 'New Pick']);
    f21Award($student, $old, true);
    f21Award($student, $new);

    $this->actingAs($student)
        ->post(route('profile.avatars.equip', $new))
        ->assertRedirect();

    expect(UserAvatar::query()->where('avatar_id', $old->id)->sole()->is_equipped)->toBeFalse()
        ->and(UserAvatar::query()->where('avatar_id', $new->id)->sole()->is_equipped)->toBeTrue()
        ->and(UserAvatar::query()->where('user_id', $student->id)->where('is_equipped', true)->count())->toBe(1);
});

test('FT-F21-03 - an unearned avatar cannot be equipped', function () {
    // Boundary: award state, invalid side. The rejected call writes nothing.
    $student = f21Student();
    $avatar = Avatar::factory()->create();

    $this->actingAs($student)
        ->from(route('profile.edit'))
        ->post(route('profile.avatars.equip', $avatar))
        ->assertSessionHasErrors(['avatar']);

    expect(UserAvatar::query()->count())->toBe(0);
});

test('FT-F21-04 - equipping an unknown avatar is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs(f21Student())
        ->post(route('profile.avatars.equip', 999999))
        ->assertNotFound();

    expect(UserAvatar::query()->count())->toBe(0);
});

test('FT-F21-05 - a guest cannot equip an avatar', function () {
    // Boundary: access, invalid side (authentication).
    $avatar = Avatar::factory()->create();

    $this->post(route('profile.avatars.equip', $avatar))
        ->assertRedirect(route('login'));

    expect(UserAvatar::query()->count())->toBe(0);
});

test('FT-F21-06 - the pick never touches a classmate slot', function () {
    // Boundary: per-student scope. The classmate keeps their equipped row.
    $student = f21Student();
    $classmate = f21Student();
    $mine = Avatar::factory()->create(['title' => 'Mine']);
    $theirs = Avatar::factory()->create(['title' => 'Theirs']);
    f21Award($student, $mine);
    f21Award($classmate, $theirs, true);

    $this->actingAs($student)
        ->post(route('profile.avatars.equip', $mine))
        ->assertRedirect();

    expect(UserAvatar::query()->where('user_id', $student->id)->sole()->is_equipped)->toBeTrue()
        ->and(UserAvatar::query()->where('user_id', $classmate->id)->sole()->is_equipped)->toBeTrue();
});

test('FT-F21-07 - re-equipping the same avatar stays a single row', function () {
    // Boundary: re-equip. The second call is a no-op on the row count and
    // keeps the pick.
    $student = f21Student();
    $avatar = Avatar::factory()->create();
    f21Award($student, $avatar);

    $this->actingAs($student)->post(route('profile.avatars.equip', $avatar));
    $this->actingAs($student)->post(route('profile.avatars.equip', $avatar));

    expect(UserAvatar::query()->where('user_id', $student->id)->count())->toBe(1)
        ->and(UserAvatar::query()->sole()->is_equipped)->toBeTrue();
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f21Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * Award an avatar to the student with the given equipped state.
 */
function f21Award(User $student, Avatar $avatar, bool $equipped = false): UserAvatar
{
    return UserAvatar::create([
        'user_id' => $student->id,
        'avatar_id' => $avatar->id,
        'is_equipped' => $equipped,
        'awarded_at' => now(),
    ]);
}
