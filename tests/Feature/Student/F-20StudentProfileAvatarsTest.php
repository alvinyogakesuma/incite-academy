<?php

/**
 * F-20 - Halaman profil avatar
 *
 * Feature tests for the avatar grid on the student's profile page: the
 * `avatars` prop of GET /profile (route profile.edit), behind the auth gate
 * only. Each avatar reaches the browser with its title, description, icon,
 * and the signed-in student's own awarded/equipped flags; the header band
 * picks the equipped avatar from the same payload.
 *
 * Method: equivalence partitioning (EP) over the grid's domains, then
 * boundary value analysis (BVA) of the grid-only boundaries - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | authenticated student                          | guest                                        |
 * | composition       | awarded, equipped, neither, empty table        | an avatar omitted from the grid              |
 * | ordering          | title-ordered                                  | creation order                               |
 * | flags             | awarded + equipped, awarded, neither           | another student's flags                      |
 * | icon_url          | stored avatars/ path, external URL, null       | a raw stored path reaching the browser       |
 * | equippedAvatar    | the equipped icon, null                        | a non-equipped icon                          |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F20-01 | composition and ordering                    | three avatars created out of order | all three appear title-ordered                            |
 * | FT-F20-02 | flags - awarded/equipped combinations       | equipped, awarded, neither         | true/true, true/false, false/false                        |
 * | FT-F20-03 | icon_url - stored / external / null         | three avatars                      | disk URL / unchanged / null                               |
 * | FT-F20-04 | equippedAvatar - picked / none              | with and without an equipped row   | icon URL / null                                           |
 * | FT-F20-05 | flags - per student scope                   | a classmate's award only           | the viewer's flags stay false                             |
 * | FT-F20-06 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F20-07 | table state - empty avatar table (boundary) | no avatars                         | an empty grid and a null equipped avatar                  |
 *
 * == Relation to the existing suites =========================================
 *
 * ProfileTest already proves the grid mapping, the equipped pick, and the
 * shared header icon. F-20 deliberately repeats those so the feature file is
 * self-contained; the new content is the title ordering, the full flag
 * combination set, the three-way icon mapping, the per-student scope, and the
 * empty-table boundary.
 *
 * The personal information form is F-18's subject; the equip action is
 * F-21's. The badge grid is F-22's. The admin avatar CRUD is F-50..F-53.
 * A dedicated avatars page does not exist - the grid rides the profile page.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - Every stored avatar reaches the grid, ordered by title; the flags are the
 *   viewer's awards, so two students see different states on the same rows.
 * - A stored icon under `avatars/` becomes a public disk URL; an external URL
 *   passes through; a missing icon stays null.
 * - The equippedAvatar prop is the icon of the viewer's equipped row - null
 *   when nothing is equipped, and never a non-equipped avatar's icon.
 * - With no avatar rows at all the grid is empty and the header icon is null.
 */

use App\Models\Avatar;
use App\Models\User;
use App\Models\UserAvatar;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F20-01 - the grid lists every avatar in title order', function () {
    // Boundary: composition and ordering. Created in reverse alphabetical
    // order so the ordering is observable.
    Avatar::factory()->create(['title' => 'Zulu Character']);
    Avatar::factory()->create(['title' => 'Alpha Character']);
    Avatar::factory()->create(['title' => 'Mike Character']);

    $this->actingAs(f20Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('avatars', 3)
            ->where('avatars', fn ($avatars) => collect($avatars)->pluck('title')->all() === [
                'Alpha Character',
                'Mike Character',
                'Zulu Character',
            ]));
});

test('FT-F20-02 - the flags cover every awarded/equipped combination', function () {
    // Boundary: flags. One equipped award, one plain award, one unearned.
    $student = f20Student();
    $equipped = Avatar::factory()->create(['title' => 'A Equipped']);
    $awarded = Avatar::factory()->create(['title' => 'B Awarded']);
    $unearned = Avatar::factory()->create(['title' => 'C Unearned']);
    UserAvatar::create([
        'user_id' => $student->id,
        'avatar_id' => $equipped->id,
        'is_equipped' => true,
        'awarded_at' => now(),
    ]);
    UserAvatar::create([
        'user_id' => $student->id,
        'avatar_id' => $awarded->id,
        'is_equipped' => false,
        'awarded_at' => now(),
    ]);

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('avatars.0.isAwarded', true)
            ->where('avatars.0.isEquipped', true)
            ->where('avatars.1.isAwarded', true)
            ->where('avatars.1.isEquipped', false)
            ->where('avatars.2.isAwarded', false)
            ->where('avatars.2.isEquipped', false));
});

test('FT-F20-03 - the icon is delivered in three shapes', function () {
    // Partition: icon_url. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing icon stays null.
    Storage::fake('public');
    Avatar::factory()->create(['title' => 'A Stored Icon', 'icon_url' => 'avatars/stored.png']);
    Avatar::factory()->create(['title' => 'B External Icon', 'icon_url' => 'https://cdn.example.com/icon.png']);
    Avatar::factory()->create(['title' => 'C No Icon', 'icon_url' => null]);

    $this->actingAs(f20Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('avatars.0.icon_url', Storage::disk('public')->url('avatars/stored.png'))
            ->where('avatars.1.icon_url', 'https://cdn.example.com/icon.png')
            ->where('avatars.2.icon_url', null));
});

test('FT-F20-04 - equippedAvatar follows the equipped row', function () {
    // Boundary: equippedAvatar, both sides. The header picks the equipped
    // avatar's icon and nothing else.
    Storage::fake('public');
    $student = f20Student();
    $picked = Avatar::factory()->create(['title' => 'A Picked', 'icon_url' => 'avatars/picked.png']);
    Avatar::factory()->create(['title' => 'B Not Picked', 'icon_url' => 'avatars/not-picked.png']);
    UserAvatar::create([
        'user_id' => $student->id,
        'avatar_id' => $picked->id,
        'is_equipped' => true,
        'awarded_at' => now(),
    ]);

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('equippedAvatar', Storage::disk('public')->url('avatars/picked.png')));

    UserAvatar::query()->where('user_id', $student->id)->update(['is_equipped' => false]);

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('equippedAvatar', null));
});

test('FT-F20-05 - the flags belong to the viewer', function () {
    // Boundary: per-student scope. A classmate's award never flags the
    // viewer's grid.
    $viewer = f20Student();
    $other = f20Student();
    $avatar = Avatar::factory()->create(['title' => 'Only Avatar']);
    UserAvatar::create([
        'user_id' => $other->id,
        'avatar_id' => $avatar->id,
        'is_equipped' => true,
        'awarded_at' => now(),
    ]);

    $this->actingAs($viewer)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('avatars.0.isAwarded', false)
            ->where('avatars.0.isEquipped', false)
            ->where('equippedAvatar', null));
});

test('FT-F20-06 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('profile.edit'))->assertRedirect(route('login'));
});

test('FT-F20-07 - an empty avatar table renders an empty grid', function () {
    // Boundary: table state. With no avatar rows the grid is empty and the
    // header has no icon.
    $this->actingAs(f20Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('avatars', 0)
            ->where('equippedAvatar', null));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f20Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}
