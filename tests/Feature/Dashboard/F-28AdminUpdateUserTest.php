<?php

/**
 * F-28 - Fungsi mengubah data pengguna oleh admin
 *
 * Feature tests for the admin's edit-user flow: PUT /dashboard/users/{user}
 * (route dashboard.users.update), behind the auth -> verified -> admin gate.
 * The edit dialog on the users page submits this endpoint and the response
 * returns the admin to the list.
 *
 * Method: equivalence partitioning (EP) over the update form's domains, then
 * boundary value analysis (BVA) of the update-only boundaries - each boundary
 * carries both the valid-side and the invalid-side input. The field rules are
 * shared with the create flow and are cited from F-27 instead of repeated.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | admin                                          | student, guest                               |
 * | target            | another existing account                       | the acting admin, unknown id                 |
 * | email uniqueness  | the target's own address (ignored)             | any other account's address                  |
 * | nim_nip uniqueness| the target's own number (ignored)              | any other account's number                   |
 * | role              | student, admin; changed or unchanged           | any other value (cited from F-27)            |
 * | side effects      | role change -> target's sessions cleared;      | no role change -> sessions survive           |
 * |                   | password untouched                             |                                              |
 * | field rules       | shared with the create flow                    | shared with the create flow                  |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                                | Expected outcome                                        |
 * |-----------|---------------------------------------------|--------------------------------------|---------------------------------------------------------|
 * | FT-F28-01 | success baseline                            | name, status, points changed         | redirect to list; fresh values; password hash unchanged |
 * | FT-F28-02 | access - student (invalid side)             | student PUT                          | 403; target unchanged                                   |
 * | FT-F28-03 | access - guest (invalid side)               | logged-out PUT                       | redirect to login; target unchanged                     |
 * | FT-F28-04 | target - self (invalid side)                | admin PUT on own account             | 403; row unchanged                                      |
 * | FT-F28-05 | uniqueness - own values / peer values       | target's own vs another's email/nim  | accepted / rejected on `email` and `nim_nip`            |
 * | FT-F28-06 | role change - sessions (invalid side)       | student -> admin                     | target's session rows removed                           |
 * | FT-F28-07 | role unchanged - sessions (valid side)      | points-only update                   | target's session rows survive                           |
 * | FT-F28-08 | target - unknown id (invalid side)          | PUT on a non-existent account        | 404                                                     |
 *
 * == Relation to the existing suites =========================================
 *
 * UsersManagementTest already covers the happy path (redirect, points,
 * department link), one role change clearing the target's sessions
 * (admin -> student), the self-update rejection, and the "last admin" case.
 * F-28 deliberately repeats the success baseline so the feature file is
 * self-contained; the new content is the PUT access pair (the existing suite
 * only gates the page), the ignore-self uniqueness pair (untested anywhere),
 * the sessions-survive side of a no-change update, the student -> admin
 * direction, the untouched password hash, and the unknown-target 404.
 *
 * The field boundaries shared with the create form - name 255/256, nim_nip
 * 50/51, total_points 0/-1/1.5, email case and domain, academic_status list,
 * department existence - are analysed in F-27 and not repeated here. The
 * unverified-admin gate is F-04's subject; this route shares the middleware
 * group. The list page that reflects the changes is F-26's subject.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Update takes the full payload: every field, including the department
 *   name, must be present; it is not a partial patch.
 * - The uniqueness checks ignore the target's own row: keeping the target's
 *   email and nim_nip succeeds, while taking another account's values is
 *   rejected on the corresponding field.
 * - The acting admin cannot update their own account; the rejection is a 403
 *   and the row is left untouched.
 * - A role change removes the target's session rows, forcing a re-login. An
 *   update that keeps the role leaves the sessions alone.
 * - The password is not part of the update contract: the stored hash is
 *   identical before and after.
 * - An unknown target id is a 404, not a validation error.
 * - The existing "last admin cannot be demoted" test targets the acting admin
 *   themselves, so the self-update rule fires first. A peer demoting the last
 *   admin cannot occur - if a peer admin exists, the target is not the last
 *   one - so no separate case is written for it.
 */

use App\Models\MajorDepartement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->admin = f28Admin();
    $this->department = f28Department();
    $this->target = User::factory()->create([
        'name' => 'Target Student',
        'role' => 'student',
        'email' => 'target@student.itera.ac.id',
        'nim_nip' => '555000111',
        'total_points' => 0,
        'academic_status' => 'Mahasiswa',
    ]);
});

test('FT-F28-01 - an admin updates a user and the password survives', function () {
    // Boundary: success baseline. The payload keeps the target's own email
    // and nim_nip, so this also exercises the valid side of ignore-self.
    $originalPassword = $this->target->password;

    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $this->target), f28Payload($this->target, [
            'name' => 'Renamed Student',
            'academic_status' => 'Dosen',
            'total_points' => 250,
        ]))
        ->assertRedirect(route('dashboard.users'));

    $target = $this->target->fresh();

    expect($target->name)->toBe('Renamed Student')
        ->and($target->academic_status)->toBe('Dosen')
        ->and($target->total_points)->toBe(250)
        ->and($target->email)->toBe('target@student.itera.ac.id')
        ->and($target->nim_nip)->toBe('555000111')
        ->and($target->major_departement_id)->toBe($this->department->id)
        ->and($target->password)->toBe($originalPassword);
});

test('FT-F28-02 - a student cannot update a user', function () {
    // Boundary: access, invalid side (role). The target must not change.
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->put(route('dashboard.users.update', $this->target), f28Payload($this->target, [
            'name' => 'Hijacked',
        ]))
        ->assertForbidden();

    expect($this->target->fresh()->name)->toBe('Target Student');
});

test('FT-F28-03 - a guest cannot update a user', function () {
    // Boundary: access, invalid side (authentication).
    $this->put(route('dashboard.users.update', $this->target), f28Payload($this->target, [
        'name' => 'Hijacked',
    ]))
        ->assertRedirect(route('login'));

    expect($this->target->fresh()->name)->toBe('Target Student');
});

test('FT-F28-04 - an admin cannot update their own account', function () {
    // Boundary: target, invalid side (self).
    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $this->admin), f28Payload($this->admin, [
            'name' => 'Renamed Admin',
        ]))
        ->assertForbidden();

    expect($this->admin->fresh()->name)->not->toBe('Renamed Admin');
});

test('FT-F28-05 - the uniqueness checks ignore the target but not a peer', function () {
    // Boundary: uniqueness. Own values are accepted (valid side); a peer's
    // email and a peer's nim_nip are each rejected on their own field.
    $peer = User::factory()->create([
        'email' => 'peer@student.itera.ac.id',
        'nim_nip' => '666000222',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $this->target), f28Payload($this->target, [
            'email' => 'target@student.itera.ac.id',
            'nim_nip' => '555000111',
        ]))
        ->assertRedirect(route('dashboard.users'));

    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $this->target), f28Payload($this->target, [
            'email' => 'peer@student.itera.ac.id',
        ]))
        ->assertInvalid('email');

    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $this->target), f28Payload($this->target, [
            'nim_nip' => '666000222',
        ]))
        ->assertInvalid('nim_nip');

    expect($this->target->fresh()->email)->toBe('target@student.itera.ac.id')
        ->and($this->target->fresh()->nim_nip)->toBe('555000111')
        ->and($peer->fresh()->email)->toBe('peer@student.itera.ac.id');
});

test('FT-F28-06 - changing a role clears the target sessions', function () {
    // Boundary: role change, invalid side for the target's sessions.
    f28Session($this->target);
    f28Session($this->target);

    expect(DB::table('sessions')->where('user_id', $this->target->id)->count())->toBe(2);

    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $this->target), f28Payload($this->target, [
            'role' => 'admin',
        ]))
        ->assertRedirect(route('dashboard.users'));

    expect($this->target->fresh()->role)->toBe('admin')
        ->and(DB::table('sessions')->where('user_id', $this->target->id)->count())->toBe(0);
});

test('FT-F28-07 - an update without a role change keeps the sessions', function () {
    // Boundary: role unchanged, valid side for the target's sessions.
    f28Session($this->target);

    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $this->target), f28Payload($this->target, [
            'total_points' => 75,
        ]))
        ->assertRedirect(route('dashboard.users'));

    expect($this->target->fresh()->total_points)->toBe(75)
        ->and($this->target->fresh()->role)->toBe('student')
        ->and(DB::table('sessions')->where('user_id', $this->target->id)->count())->toBe(1);
});

test('FT-F28-08 - updating an unknown user is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', 999999), f28Payload($this->target))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f28Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * The department the edit form offers; the factory only supplies the name,
 * while the table also requires a domain and code.
 */
function f28Department(): MajorDepartement
{
    return MajorDepartement::factory()->create([
        'name' => 'Teknik Informatika',
        'major_departement_domain' => 'if.itera.ac.id',
        'major_departement_code' => 14,
    ]);
}

/**
 * A complete, valid update payload derived from the target; tests override
 * single fields to move along one domain at a time.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function f28Payload(User $target, array $overrides = []): array
{
    return array_merge([
        'name' => $target->name,
        'email' => $target->email,
        'role' => $target->role,
        'academic_status' => $target->academic_status,
        'nim_nip' => $target->nim_nip,
        'major_department' => 'Teknik Informatika',
        'total_points' => $target->total_points ?? 0,
    ], $overrides);
}

/**
 * Record an active session row for the given account.
 */
function f28Session(User $user): void
{
    DB::table('sessions')->insert([
        'id' => 'f28-session-'.$user->id.'-'.uniqid(),
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'test',
        'payload' => 'test',
        'last_activity' => time(),
    ]);
}
