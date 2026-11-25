<?php

/**
 * F-22 - Halaman daftar lencana
 *
 * Feature tests for the badge grid on the student's profile page: the
 * `badges` prop of GET /profile (route profile.edit), behind the auth gate
 * only. Every stored badge reaches the browser with its title, description,
 * icon, and the signed-in student's own awarded/equipped flags - the
 * showcase's source of truth.
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
 * | composition       | awarded, equipped, neither, empty table        | a badge omitted from the grid                |
 * | ordering          | title-ordered                                  | creation order                               |
 * | flags             | awarded + equipped, awarded, neither           | another student's flags                      |
 * | field exposure    | id, title, description, icon_url, flags        | requirements, recipients, timestamps         |
 * | icon_url          | stored badges/ path, external URL, null        | a raw stored path reaching the browser       |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F22-01 | composition and ordering                    | three badges created out of order  | all three appear title-ordered                            |
 * | FT-F22-02 | flags - awarded/equipped combinations       | equipped, awarded, neither         | true/true, true/false, false/false                        |
 * | FT-F22-03 | icon_url - stored / external / null         | three badges                       | disk URL / unchanged / null                               |
 * | FT-F22-04 | exposure - exact row shape                  | one badge                          | exactly the six grid fields                               |
 * | FT-F22-05 | flags - per student scope                   | a classmate's award only           | the viewer's flags stay false                             |
 * | FT-F22-06 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F22-07 | table state - empty badge table (boundary)  | no badges                          | an empty grid                                             |
 *
 * == Relation to the existing suites =========================================
 *
 * ProfileTest already proves the badge grid mapping and the equipped flag.
 * F-22 deliberately repeats those so the feature file is self-contained; the
 * new content is the title ordering, the full flag combination set, the
 * three-way icon mapping, the exact six-field row shape (the requirements
 * and recipient counters stay out), the per-student scope, and the
 * empty-table boundary.
 *
 * The toggle action is F-23's subject; the avatar grid is F-20's; the
 * personal information form is F-18's. The admin badge CRUD is F-46..F-49,
 * where the requirements and recipient counters do appear. A dedicated
 * badges page does not exist - the grid rides the profile page.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - Every stored badge reaches the grid, ordered by title; the flags are the
 *   viewer's awards, so two students see different states on the same rows.
 * - The row is exactly six fields: id, title, description, icon_url,
 *   isAwarded, and isEquipped. The earning requirements and the recipient
 *   counter are admin-listing concerns and never ride this page.
 * - A stored icon under `badges/` becomes a public disk URL; an external URL
 *   passes through; a missing icon stays null.
 * - With no badge rows at all the grid is empty.
 */

use App\Models\Badge;
use App\Models\User;
use App\Models\UserBadge;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F22-01 - the grid lists every badge in title order', function () {
    // Boundary: composition and ordering. Created in reverse alphabetical
    // order so the ordering is observable.
    Badge::factory()->create(['title' => 'Zulu Badge']);
    Badge::factory()->create(['title' => 'Alpha Badge']);
    Badge::factory()->create(['title' => 'Mike Badge']);

    $this->actingAs(f22Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('badges', 3)
            ->where('badges', fn ($badges) => collect($badges)->pluck('title')->all() === [
                'Alpha Badge',
                'Mike Badge',
                'Zulu Badge',
            ]));
});

test('FT-F22-02 - the flags cover every awarded/equipped combination', function () {
    // Boundary: flags. One equipped award, one plain award, one unearned.
    $student = f22Student();
    $equipped = Badge::factory()->create(['title' => 'A Equipped']);
    $awarded = Badge::factory()->create(['title' => 'B Awarded']);
    $unearned = Badge::factory()->create(['title' => 'C Unearned']);
    f22Award($student, $equipped, true);
    f22Award($student, $awarded);

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('badges.0.isAwarded', true)
            ->where('badges.0.isEquipped', true)
            ->where('badges.1.isAwarded', true)
            ->where('badges.1.isEquipped', false)
            ->where('badges.2.id', $unearned->id)
            ->where('badges.2.isAwarded', false)
            ->where('badges.2.isEquipped', false));
});

test('FT-F22-03 - the icon is delivered in three shapes', function () {
    // Partition: icon_url. A stored path becomes a public disk URL, an
    // external URL passes through, and a missing icon stays null.
    Storage::fake('public');
    Badge::factory()->create(['title' => 'A Stored Icon', 'icon_url' => 'badges/stored.png']);
    Badge::factory()->create(['title' => 'B External Icon', 'icon_url' => 'https://cdn.example.com/icon.png']);
    Badge::factory()->create(['title' => 'C No Icon', 'icon_url' => null]);

    $this->actingAs(f22Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('badges.0.icon_url', Storage::disk('public')->url('badges/stored.png'))
            ->where('badges.1.icon_url', 'https://cdn.example.com/icon.png')
            ->where('badges.2.icon_url', null));
});

test('FT-F22-04 - a badge row exposes exactly the six grid fields', function () {
    // Boundary: exposure. The key-set comparison rejects both a missing
    // field and any extra one, so the requirements and counters stay out.
    Badge::factory()->create(['title' => 'Key Set Badge']);

    $this->actingAs(f22Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('badges.0', fn ($badge) => $badge->keys()->sort()->values()->all() === [
                'description',
                'icon_url',
                'id',
                'isAwarded',
                'isEquipped',
                'title',
            ]));
});

test('FT-F22-05 - the flags belong to the viewer', function () {
    // Boundary: per-student scope. A classmate's award never flags the
    // viewer's grid.
    $viewer = f22Student();
    $other = f22Student();
    $badge = Badge::factory()->create(['title' => 'Only Badge']);
    f22Award($other, $badge, true);

    $this->actingAs($viewer)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('badges.0.isAwarded', false)
            ->where('badges.0.isEquipped', false));
});

test('FT-F22-06 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('profile.edit'))->assertRedirect(route('login'));
});

test('FT-F22-07 - an empty badge table renders an empty grid', function () {
    // Boundary: table state. With no badge rows the grid is empty.
    $this->actingAs(f22Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('badges', 0));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f22Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * Award a badge to the student with the given equipped state.
 */
function f22Award(User $student, Badge $badge, bool $equipped = false): UserBadge
{
    return UserBadge::create([
        'user_id' => $student->id,
        'badge_id' => $badge->id,
        'is_equipped' => $equipped,
        'awarded_at' => now(),
    ]);
}
