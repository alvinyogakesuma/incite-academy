<?php

/**
 * F-26 - Halaman admin daftar pengguna sistem
 *
 * Feature tests for App\Http\Controllers\Admin\UserController::index()
 * (route GET /dashboard/users, behind the auth -> verified -> admin gate).
 *
 * Method: equivalence partitioning (EP) over the list's observable domains,
 * then boundary value analysis (BVA) of the list's content - each boundary
 * carries both the valid-side and the invalid-side observation.
 *
 * The page is server-rendered as a single Inertia response: the `users` prop
 * carries every account (the controller declares search, filtering, sorting,
 * and pagination as client-side concerns), and `majorDepartements` feeds the
 * create/edit dialogs.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                                  |
 * |-------------------|------------------------------------------------|--------------------------------------------------|
 * | access            | admin                                          | student, guest                                   |
 * | composition       | every account appears (self, peer admins,      | an account omitted from the list                 |
 * |                   | students)                                      |                                                  |
 * | ordering          | name-ordered                                   | (none observed)                                  |
 * | field exposure    | the nine list fields                           | password, remember token, google id, verified-at |
 * | department        | present -> the department name                 | absent -> null                                   |
 * | departments prop  | full, name-ordered list                        | (none observed)                                  |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                             | Expected outcome                                  |
 * |-----------|---------------------------------------------|-----------------------------------|---------------------------------------------------|
 * | FT-F26-01 | access - admin (valid side)                 | admin GET /dashboard/users        | 200, users + majorDepartements props              |
 * | FT-F26-02 | access - student (invalid side)             | student GET                       | 403                                               |
 * | FT-F26-03 | access - guest (invalid side)               | logged-out GET                    | redirect to login                                 |
 * | FT-F26-04 | composition - every account                 | admin, peer admin, student        | all three appear, incl. the viewing admin         |
 * | FT-F26-05 | ordering - by name                          | accounts created out of order     | entries appear name-ordered                       |
 * | FT-F26-06 | exposure - list fields (valid side)         | one fully-populated user          | the nine fields carry the right values            |
 * | FT-F26-07 | exposure - withheld fields (invalid side)   | the same entry                    | exactly the nine keys; no sensitive fields        |
 * | FT-F26-08 | department - present (valid side)           | user with a major                 | major_department shows the name                   |
 * | FT-F26-09 | department - absent (invalid side)          | user without a major              | major_department is null                          |
 * | FT-F26-10 | departments prop                            | three known departments           | full, name-ordered list                           |
 *
 * == Relation to the existing suites =========================================
 *
 * UsersManagementTest already proves the access trio (admin 200, student 403,
 * guest redirect) and the create/update/delete operations. F-26 deliberately
 * repeats the trio so the feature file is self-contained; the new content is
 * the list itself - composition, ordering, field exposure, and the department
 * pair. The unverified-admin gate is not repeated: F-04 proved the gate
 * ordering and this route shares the same middleware group. The client-side
 * search, filter, sort, and pagination behavior has its own vitest coverage
 * under resources/js/Pages/Dashboard/Users/__tests__/.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - There is no server-side pagination: every account is delivered in one
 *   `users` prop. The page boundary a list feature would normally expose does
 *   not exist here, so the BVA effort sits on composition, exposure, and the
 *   department pair instead.
 * - The viewing admin and peer admins appear in the list like any other
 *   account; nothing is hidden from the administrator.
 * - Each entry exposes exactly nine fields; credentials, remember tokens,
 *   Google identifiers, and verification timestamps never reach the browser.
 * - Users without a department (for example OAuth-created accounts) appear
 *   with a null major_department.
 * - Entries are name-ordered. How mixed-case names sort depends on the
 *   database collation, so this suite asserts only the clear alphabetical
 *   order and does not encode a collation-specific expectation.
 */

use App\Models\MajorDepartement;
use App\Models\User;
use Illuminate\Testing\Fluent\AssertableJson;
use Inertia\Testing\AssertableInertia;

test('FT-F26-01 - an admin views the users list page', function () {
    // Boundary: access, valid side (baseline).
    $admin = f26Admin();

    $this->actingAs($admin)
        ->get(route('dashboard.users'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard/Users', false)
            ->has('users')
            ->has('majorDepartements'));
});

test('FT-F26-02 - a student is forbidden from the users list page', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.users'))
        ->assertForbidden();
});

test('FT-F26-03 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('dashboard.users'))->assertRedirect(route('login'));
});

test('FT-F26-04 - every account appears in the list, including the viewing admin', function () {
    // Partition: composition. The list is not limited to students: the
    // viewing admin and a peer admin appear alongside a student.
    $viewer = f26Admin(['email' => 'viewer@itera.ac.id']);
    User::factory()->create([
        'name' => 'Bob Peer',
        'email' => 'peer@itera.ac.id',
        'role' => 'admin',
    ]);
    User::factory()->create([
        'name' => 'Alice Student',
        'email' => 'student@itera.ac.id',
        'role' => 'student',
    ]);

    $this->actingAs($viewer)
        ->get(route('dashboard.users'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('users', 3)
            ->where('users', fn ($users) => $users->pluck('email')->sort()->values()->all() === [
                'peer@itera.ac.id',
                'student@itera.ac.id',
                'viewer@itera.ac.id',
            ])
            ->has('majorDepartements'));
});

test('FT-F26-05 - the list is ordered by name, not by creation order', function () {
    // Partition: ordering. Created in reverse alphabetical order to make the
    // ordering observable.
    $viewer = f26Admin(['name' => 'Admin Viewer']);
    User::factory()->create(['name' => 'Zara Zulu', 'email' => 'zara@itera.ac.id']);
    User::factory()->create(['name' => 'Bob Brown', 'email' => 'bob@itera.ac.id']);
    User::factory()->create(['name' => 'Alice Anderson', 'email' => 'alice@itera.ac.id']);

    $this->actingAs($viewer)
        ->get(route('dashboard.users'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('users', 4)
            ->where('users', fn ($users) => $users->pluck('name')->all() === [
                'Admin Viewer',
                'Alice Anderson',
                'Bob Brown',
                'Zara Zulu',
            ])
            ->has('majorDepartements'));
});

test('FT-F26-06 - an entry exposes the list fields with their values', function () {
    // Boundary: field exposure, valid side. The viewer sorts last so the
    // target is the first entry.
    $department = f26Department('Teknik Informatika', 'if.itera.ac.id', 14);
    $viewer = f26Admin();
    $target = User::factory()->create([
        'name' => 'Alvin Yoga Kesuma',
        'email' => 'alvin@student.itera.ac.id',
        'role' => 'student',
        'academic_status' => 'Mahasiswa',
        'nim_nip' => '121140154',
        'major_departement_id' => $department->id,
        'total_points' => 42,
        'created_at' => '2026-01-15 10:00:00',
    ]);

    $this->actingAs($viewer)
        ->get(route('dashboard.users'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('users', 2)
            ->has('majorDepartements')
            ->has('users.0', fn (AssertableJson $user) => $user
                ->where('id', $target->id)
                ->where('name', 'Alvin Yoga Kesuma')
                ->where('email', 'alvin@student.itera.ac.id')
                ->where('role', 'student')
                ->where('academic_status', 'Mahasiswa')
                ->where('nim_nip', '121140154')
                ->where('major_department', 'Teknik Informatika')
                ->where('total_points', 42)
                ->where('joined', '2026-01-15')));
});

test('FT-F26-07 - an entry withholds every sensitive field', function () {
    // Boundary: field exposure, invalid side. Comparing the entry's key set
    // against the nine list fields rejects both a missing field and any
    // additional field, so a leaked password hash, remember token, google
    // id, or verification timestamp fails the test.
    $viewer = f26Admin();
    User::factory()->create([
        'name' => 'Alvin Yoga Kesuma',
        'email' => 'alvin@student.itera.ac.id',
    ]);

    $this->actingAs($viewer)
        ->get(route('dashboard.users'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('users', 2)
            ->has('majorDepartements')
            ->where('users.0', fn ($user) => $user->keys()->sort()->values()->all() === [
                'academic_status',
                'email',
                'id',
                'joined',
                'major_department',
                'name',
                'nim_nip',
                'role',
                'total_points',
            ]));
});

test('FT-F26-08 - a user with a department shows its name', function () {
    // Boundary: department presence, valid side.
    $department = f26Department('Teknik Informatika', 'if.itera.ac.id', 14);
    $viewer = f26Admin();
    User::factory()->create([
        'name' => 'Alvin Yoga Kesuma',
        'email' => 'alvin@student.itera.ac.id',
        'major_departement_id' => $department->id,
    ]);

    $this->actingAs($viewer)
        ->get(route('dashboard.users'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('users', 2)
            ->has('majorDepartements')
            ->has('users.0', fn (AssertableJson $user) => $user
                ->where('email', 'alvin@student.itera.ac.id')
                ->where('major_department', 'Teknik Informatika')
                ->etc()));
});

test('FT-F26-09 - a user without a department shows null', function () {
    // Boundary: department presence, invalid side (OAuth-created accounts
    // have no department).
    $viewer = f26Admin();
    User::factory()->create([
        'name' => 'Alvin Yoga Kesuma',
        'email' => 'alvin@student.itera.ac.id',
        'major_departement_id' => null,
    ]);

    $this->actingAs($viewer)
        ->get(route('dashboard.users'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('users', 2)
            ->has('majorDepartements')
            ->has('users.0', fn (AssertableJson $user) => $user
                ->where('email', 'alvin@student.itera.ac.id')
                ->whereNull('major_department')
                ->etc()));
});

test('FT-F26-10 - the page carries the full department list, ordered by name', function () {
    // Partition: the departments prop that feeds the create/edit dialogs.
    $viewer = f26Admin();
    f26Department('Teknik Informatika', 'if.itera.ac.id', 14);
    f26Department('Sistem Informasi', 'si.itera.ac.id', 15);
    f26Department('Teknik Elektro', 'el.itera.ac.id', 16);

    $this->actingAs($viewer)
        ->get(route('dashboard.users'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('users', 1)
            ->has('majorDepartements', 3)
            ->where('majorDepartements', fn ($departments) => $departments->pluck('name')->all() === [
                'Sistem Informasi',
                'Teknik Elektro',
                'Teknik Informatika',
            ]));
});

/**
 * A department with the columns the list page needs; the factory only
 * supplies the name, while the table also requires a domain and code.
 */
function f26Department(string $name, string $domain, int $code): MajorDepartement
{
    return MajorDepartement::factory()->create([
        'name' => $name,
        'major_departement_domain' => $domain,
        'major_departement_code' => $code,
    ]);
}

/**
 * A verified administrator account; the name sorts last so list fixtures
 * with earlier names land on index 0.
 *
 * @param  array<string, mixed>  $attributes
 */
function f26Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'name' => 'Zzz Admin',
        'email' => 'admin@itera.ac.id',
        'role' => 'admin',
    ], $attributes));
}
