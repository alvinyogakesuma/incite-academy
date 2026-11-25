<?php

/**
 * F-18 - Halaman profil informasi pribadi
 *
 * Feature tests for the student's profile page: GET /profile (route
 * profile.edit), behind the auth gate only. The page carries the personal
 * information forms, the study-program options, the badge and avatar grids,
 * and the student's live progress across their courses and learning paths.
 *
 * Method: equivalence partitioning (EP) over the page's domains, then
 * boundary value analysis (BVA) of the profile-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | authenticated student                          | guest                                        |
 * | verification      | verified, unverified (both allowed)            | -                                            |
 * | personal info     | the viewer's own fields                        | another student's fields                     |
 * | majors prop       | name-ordered value/label pairs                 | a value outside the table                    |
 * | page collections  | empty, populated                               | -                                            |
 * | status            | absent, flashed                                | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F18-01 | access - authenticated student (valid)      | student GET                        | 200 with every profile prop                               |
 * | FT-F18-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F18-03 | verification - unverified (boundary)        | unverified student GET             | 200; the page still renders                               |
 * | FT-F18-04 | majors prop - mapping and order             | two majors created out of order    | value/label pairs, name-ordered                           |
 * | FT-F18-05 | personal info - the viewer's own fields     | name, email, NIM, major, bio       | auth.user carries the right values                        |
 * | FT-F18-06 | status - flashed message (valid side)       | session status                     | the prop carries the message                              |
 * | FT-F18-07 | personal info - scope                       | two students                       | the page carries only the viewer's identity               |
 * | FT-F18-08 | collections - empty profile (boundary)      | a fresh student                    | empty badges, avatars, courses, paths; no equipped avatar |
 *
 * == Relation to the existing suites =========================================
 *
 * ProfileTest already proves the page renders, the guest redirect, and the
 * progress/showcase payloads. F-18 deliberately repeats the baseline and the
 * guest redirect so the feature file is self-contained; the new content is
 * the auth-only gate boundary (an unverified student still opens the page),
 * the majors mapping and ordering, the personal-info fields on the shared
 * auth.user prop, the status flash, the viewer scope, and the empty-profile
 * boundary.
 *
 * The update action is F-19's subject; the badge grid is F-22's, the avatar
 * grid F-20's, the course progress F-24's, and the path progress F-25's -
 * this suite only pins their presence as page props. The leaderboard is
 * F-17's. The admin gate ordering is F-04's subject.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The profile route sits behind the auth middleware only, so an unverified
 *   student opens the page; the `mustVerifyEmail` flag is true for every
 *   user because it reflects the model interface, not the verification state.
 * - The signed-in user rides the shared `auth.user` prop as the serialized
 *   model (password and remember-token hidden).
 * - The majors prop is ordered by name and carries the string id as value
 *   and the name as label.
 * - The status prop is the session flash; on a fresh visit it is null.
 * - A student with no awards, enrollments, or path registrations gets empty
 *   collections and a null equipped-avatar header.
 */

use App\Models\MajorDepartement;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F18-01 - an authenticated student opens the profile page', function () {
    // Boundary: access, valid side (baseline). Every page prop is present.
    $student = f18Student();

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Profile/Edit', false)
            ->where('auth.user.id', $student->id)
            ->where('mustVerifyEmail', true)
            ->where('status', null)
            ->has('majorDepartements')
            ->has('badges')
            ->has('avatars')
            ->has('courses')
            ->has('paths'));
});

test('FT-F18-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('profile.edit'))->assertRedirect(route('login'));
});

test('FT-F18-03 - an unverified student still opens the profile page', function () {
    // Boundary: verification. The profile route is auth-only, so an
    // unverified student is not redirected to the verification notice.
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('auth.user.id', $student->id)
            ->where('mustVerifyEmail', true));
});

test('FT-F18-04 - the majors prop is ordered with value and label pairs', function () {
    // Partition: majors prop. Created out of order so the name ordering is
    // observable; the value is the string id and the label the name.
    $later = f18Major('Teknik Informatika');
    $earlier = f18Major('Sistem Informasi');

    $this->actingAs(f18Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('majorDepartements', 2)
            ->where('majorDepartements.0.value', (string) $earlier->id)
            ->where('majorDepartements.0.label', 'Sistem Informasi')
            ->where('majorDepartements.1.value', (string) $later->id)
            ->where('majorDepartements.1.label', 'Teknik Informatika'));
});

test('FT-F18-05 - the shared user carries the viewer personal fields', function () {
    // Boundary: personal info, valid side. The profile form reads the shared
    // auth.user prop, so every editable field must reach the browser.
    $major = f18Major('Teknik Informatika');
    $student = f18Student([
        'name' => 'Ayu Lestari',
        'email' => 'ayu@student.itera.ac.id',
        'nim_nip' => '121140089',
        'biography' => 'Preparing for the ITERA English test.',
        'major_departement_id' => $major->id,
    ]);

    $this->actingAs($student)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('auth.user.name', 'Ayu Lestari')
            ->where('auth.user.email', 'ayu@student.itera.ac.id')
            ->where('auth.user.nim_nip', '121140089')
            ->where('auth.user.biography', 'Preparing for the ITERA English test.')
            ->where('auth.user.major_departement_id', $major->id)
            ->missing('auth.user.password'));
});

test('FT-F18-06 - a flashed status rides the page prop', function () {
    // Boundary: status, valid side (the save flash).
    $this->actingAs(f18Student())
        ->withSession(['status' => 'profile-updated'])
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('status', 'profile-updated'));
});

test('FT-F18-07 - the page carries only the viewer identity', function () {
    // Boundary: personal info scope. Two students on the same request path;
    // the page must carry the signed-in one.
    $viewer = f18Student(['name' => 'Viewer Student', 'email' => 'viewer@student.itera.ac.id']);
    $other = f18Student(['name' => 'Other Student', 'email' => 'other@student.itera.ac.id']);

    $this->actingAs($viewer)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('auth.user.id', $viewer->id)
            ->where('auth.user.email', 'viewer@student.itera.ac.id')
            ->where('auth.user.email', fn ($email) => $email !== $other->email));
});

test('FT-F18-08 - a fresh profile renders empty collections', function () {
    // Boundary: collections. No awards, no enrollments, no registrations -
    // the page is still usable and the header has no equipped avatar.
    $this->actingAs(f18Student())
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('badges', 0)
            ->has('avatars', 0)
            ->has('courses', 0)
            ->has('paths', 0)
            ->where('equippedAvatar', null));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f18Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * A study program row with its display name.
 */
function f18Major(string $name): MajorDepartement
{
    return MajorDepartement::query()->create([
        'name' => $name,
        'major_departement_domain' => strtolower(str_replace(' ', '-', $name)),
        'major_departement_code' => '135',
    ]);
}
