<?php

/**
 * F-23 - Fungsi memilih lencana profil
 *
 * Feature tests for the badge showcase toggle: POST /profile/badges/{badge}
 * (route profile.badges.toggle), behind the auth gate only. Only an awarded
 * badge can join the showcase, the action toggles membership, and at most
 * three badges are displayed at once.
 *
 * Method: equivalence partitioning (EP) over the action's domains, then
 * boundary value analysis (BVA) of the showcase-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | authenticated student                          | guest                                        |
 * | target            | a stored badge                                 | an unknown id                                |
 * | award state       | awarded, not awarded                           | -                                            |
 * | showcase state    | unequipped, equipped, 2 slots used, 3 used     | another student's showcase                   |
 * | invocation count  | equip, unequip, re-equip                       | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F23-01 | toggle - equip (valid side)                 | awarded badge POST                 | redirect back; the badge joins the showcase               |
 * | FT-F23-02 | toggle - unequip (boundary)                 | a second POST on the equipped row  | the badge leaves the showcase                             |
 * | FT-F23-03 | showcase size - 2 -> 3 (valid side)         | two equipped, equipping a third    | accepted; exactly three equipped                          |
 * | FT-F23-04 | showcase size - 3 -> 4 (invalid side)       | three equipped, equipping a fourth | rejected on badge; exactly three stay                     |
 * | FT-F23-05 | award state - unearned (invalid side)       | not-awarded badge                  | rejected on badge; nothing equipped                       |
 * | FT-F23-06 | target - unknown id (invalid side)          | 999999                             | 404                                                       |
 * | FT-F23-07 | access - guest (invalid side)               | logged-out POST                    | redirect to login                                         |
 * | FT-F23-08 | scope - another student's showcase          | a classmate with three equipped    | the classmate's rows are untouched                        |
 * | FT-F23-09 | invocation - equip/unequip/re-equip parity  | three POSTs on one badge           | the badge ends equipped; still one row                    |
 *
 * == Relation to the existing suites =========================================
 *
 * ProfileTest already proves the toggle both ways, the three-badge cap, and
 * the unearned rejection. F-23 deliberately repeats those so the feature
 * file is self-contained; the new content is the 2 -> 3 acceptance boundary,
 * the unknown-id 404, the per-student scope, and the three-call parity.
 *
 * The badge grid that renders the flags is F-22's subject. The avatar equip
 * is F-21's. The admin badge CRUD is F-46..F-49. The gate ordering is F-04's
 * subject, but this route uses the auth middleware only.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The action toggles: an equipped badge is removed from the showcase, an
 *   awarded-but-unequipped badge joins it.
 * - The showcase displays at most three badges; equipping a fourth answers
 *   with a `badge` error and leaves the three in place.
 * - Only awarded badges can join; an unearned one answers with a `badge`
 *   error and writes nothing.
 * - The rows belong to the signed-in student; a classmate's showcase is never
 *   touched.
 * - The action redirects back to the page it came from.
 */

use App\Models\Badge;
use App\Models\User;
use App\Models\UserBadge;

test('FT-F23-01 - a student equips an earned badge', function () {
    // Boundary: toggle, valid side (equip). The badge joins the showcase.
    $student = f23Student();
    $badge = Badge::factory()->create();
    f23Award($student, $badge);

    $this->actingAs($student)
        ->from(route('profile.edit'))
        ->post(route('profile.badges.toggle', $badge))
        ->assertRedirect(route('profile.edit'));

    expect(UserBadge::query()->where('user_id', $student->id)->sole()->is_equipped)->toBeTrue();
});

test('FT-F23-02 - a second call removes the badge from the showcase', function () {
    // Boundary: toggle, unequip. The row survives; only the flag clears.
    $student = f23Student();
    $badge = Badge::factory()->create();
    f23Award($student, $badge, true);

    $this->actingAs($student)
        ->post(route('profile.badges.toggle', $badge))
        ->assertRedirect();

    expect(UserBadge::query()->where('user_id', $student->id)->sole()->is_equipped)->toBeFalse();
});

test('FT-F23-03 - equipping a third badge is accepted', function () {
    // Boundary: showcase size, valid side (2 -> 3).
    $student = f23Student();
    $badges = Badge::factory()->count(3)->create();
    f23Award($student, $badges[0], true);
    f23Award($student, $badges[1], true);
    f23Award($student, $badges[2]);

    $this->actingAs($student)
        ->post(route('profile.badges.toggle', $badges[2]))
        ->assertSessionHasNoErrors();

    expect(UserBadge::query()->where('user_id', $student->id)->where('is_equipped', true)->count())->toBe(3);
});

test('FT-F23-04 - equipping a fourth badge is rejected', function () {
    // Boundary: showcase size, invalid side (3 -> 4).
    $student = f23Student();
    $equipped = Badge::factory()->count(3)->create();
    $equipped->each(fn (Badge $badge) => f23Award($student, $badge, true));
    $fourth = Badge::factory()->create();
    f23Award($student, $fourth);

    $this->actingAs($student)
        ->from(route('profile.edit'))
        ->post(route('profile.badges.toggle', $fourth))
        ->assertSessionHasErrors(['badge']);

    expect(UserBadge::query()->where('user_id', $student->id)->where('is_equipped', true)->count())->toBe(3)
        ->and(UserBadge::query()->where('badge_id', $fourth->id)->sole()->is_equipped)->toBeFalse();
});

test('FT-F23-05 - an unearned badge cannot join the showcase', function () {
    // Boundary: award state, invalid side. The rejected call writes nothing.
    $student = f23Student();
    $badge = Badge::factory()->create();

    $this->actingAs($student)
        ->from(route('profile.edit'))
        ->post(route('profile.badges.toggle', $badge))
        ->assertSessionHasErrors(['badge']);

    expect(UserBadge::query()->count())->toBe(0);
});

test('FT-F23-06 - toggling an unknown badge is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs(f23Student())
        ->post(route('profile.badges.toggle', 999999))
        ->assertNotFound();
});

test('FT-F23-07 - a guest cannot toggle a badge', function () {
    // Boundary: access, invalid side (authentication).
    $badge = Badge::factory()->create();

    $this->post(route('profile.badges.toggle', $badge))
        ->assertRedirect(route('login'));

    expect(UserBadge::query()->count())->toBe(0);
});

test('FT-F23-08 - a classmate showcase is never touched', function () {
    // Boundary: per-student scope. The classmate's three equipped rows stay.
    $student = f23Student();
    $classmate = f23Student();
    $mine = Badge::factory()->create();
    f23Award($student, $mine);
    Badge::factory()->count(3)->create()->each(
        fn (Badge $badge) => f23Award($classmate, $badge, true),
    );

    $this->actingAs($student)
        ->post(route('profile.badges.toggle', $mine))
        ->assertSessionHasNoErrors();

    expect(UserBadge::query()->where('user_id', $classmate->id)->where('is_equipped', true)->count())->toBe(3)
        ->and(UserBadge::query()->where('user_id', $student->id)->where('is_equipped', true)->count())->toBe(1);
});

test('FT-F23-09 - equip, unequip, and re-equip return to equipped', function () {
    // Boundary: invocation parity. Three calls end where the first one did.
    $student = f23Student();
    $badge = Badge::factory()->create();
    f23Award($student, $badge);

    $this->actingAs($student)->post(route('profile.badges.toggle', $badge));
    $this->actingAs($student)->post(route('profile.badges.toggle', $badge));
    $this->actingAs($student)->post(route('profile.badges.toggle', $badge));

    expect(UserBadge::query()->where('user_id', $student->id)->count())->toBe(1)
        ->and(UserBadge::query()->sole()->is_equipped)->toBeTrue();
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f23Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * Award a badge to the student with the given equipped state.
 */
function f23Award(User $student, Badge $badge, bool $equipped = false): UserBadge
{
    return UserBadge::create([
        'user_id' => $student->id,
        'badge_id' => $badge->id,
        'is_equipped' => $equipped,
        'awarded_at' => now(),
    ]);
}
