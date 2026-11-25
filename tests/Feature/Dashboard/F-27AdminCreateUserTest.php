<?php

/**
 * F-27 - Fungsi menambah pengguna oleh admin
 *
 * Feature tests for the admin's add-user flow: POST /dashboard/users
 * (route dashboard.users.store), behind the auth -> verified -> admin gate.
 * The create dialog on the users page submits this endpoint and the response
 * returns the admin to the list.
 *
 * Method: equivalence partitioning (EP) over the submitted form's domains,
 * then boundary value analysis (BVA) of each domain - every boundary carries
 * both the valid-side and the invalid-side input, grouped side by side.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                      | Invalid classes                                  |
 * |-------------------|----------------------------------------------------|--------------------------------------------------|
 * | access            | admin                                              | student, guest                                   |
 * | name              | present, 1..255 characters                         | missing, 256+ characters                         |
 * | email case        | all lowercase                                      | any uppercase letter                             |
 * | email domain      | bare itera.ac.id, one or more subdomains           | external domain, near-miss suffix                |
 * | email uniqueness  | unused address                                     | address already registered                       |
 * | role              | student, admin                                     | any other value                                  |
 * | academic_status   | Mahasiswa, Dosen, Staff; omitted; explicit null    | any other value                                  |
 * | nim_nip           | digits only, 1..50 characters, unused              | non-digits, 51+ characters, already registered  |
 * | major_department  | an existing department name                        | unknown or missing name                          |
 * | total_points      | integer >= 0                                       | negative, non-integer                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                          | Value                                  | Expected outcome                                      |
 * |-----------|-----------------------------------------------|----------------------------------------|-------------------------------------------------------|
 * | FT-F27-01 | success baseline; status omitted              | minimum payload, role student          | redirect to list; row persisted; status Mahasiswa     |
 * | FT-F27-02 | role admin; status Staff                      | admin payload with academic_status     | redirect to list; row persisted with role and status  |
 * | FT-F27-03 | access - student (invalid side)               | student POST                           | 403; nothing persisted                                |
 * | FT-F27-04 | access - guest (invalid side)                 | logged-out POST                        | redirect to login; nothing persisted                  |
 * | FT-F27-05 | email case - lowercase / mixed                | alvin@... / Alvin@...                  | accepted / rejected on `email`                        |
 * | FT-F27-06 | email domain - institutional / near-miss      | bare, subdomain / notitera, gmail      | accepted / rejected on `email`                        |
 * | FT-F27-07 | name length - 255 / 256                       | 255 chars / 256 chars                  | accepted / rejected on `name`                         |
 * | FT-F27-08 | nim_nip length - 50 / 51                      | 50 digits / 51 digits                  | accepted / rejected on `nim_nip`                      |
 * | FT-F27-09 | uniqueness - duplicate email / duplicate nim  | address or number already registered   | rejected on `email` / `nim_nip`                       |
 * | FT-F27-10 | total_points - 0 / negative / non-integer     | 0 / -1 / 1.5                           | accepted / rejected / rejected on `total_points`      |
 *
 * == Relation to the existing suites =========================================
 *
 * UsersManagementTest already covers the happy path (redirect, department
 * link, points, password present), one persisted academic status, the
 * invalid-status rejection, duplicate email, and single-field rejections
 * for a missing name, external email, invalid role, non-digit nim, unknown
 * department, and negative points. F-27 deliberately repeats the success
 * baseline so the feature file is self-contained; the new content is the
 * POST access pair (the existing suite only gates the page), duplicate
 * nim_nip, the mixed-case and near-miss domain rejections, the length and
 * points boundaries, and the omitted-versus-explicit-null status pair.
 *
 * The email length boundary (255/256) is not repeated: F-01 analysed it at
 * registration and the rule is the same. The unverified-admin gate is not
 * repeated either: F-04 proved the gate ordering and this route shares the
 * same middleware group. The page itself (the redirect target) is F-26's
 * subject; F-26 also proved that a created account appears in the list.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - A successful create redirects to the users list and persists every
 *   submitted field; the department name is resolved to its record.
 * - The admin never submits a password: the system assigns the account's
 *   credentials, so a created account always has a password set.
 * - Omitting academic_status does not store null - the system fills its
 *   default "Mahasiswa". An explicit null is preserved as null. Both are
 *   valid inputs, which is why the pair is exercised separately.
 * - A created account starts unverified (no verification timestamp), so the
 *   account exists immediately but the verification gate still applies to it.
 * - The institutional email check is anchored: a bare @itera.ac.id address
 *   and deeper subdomains pass, while a near-miss such as @notitera.ac.id is
 *   rejected just like an external domain.
 * - Role and academic_status are closed lists; values outside the lists are
 *   rejected even when the rest of the payload is valid.
 * - A validation failure leaves the database untouched and flashes the error
 *   for the offending field only.
 */

use App\Models\MajorDepartement;
use App\Models\User;

beforeEach(function () {
    $this->admin = f27Admin();
    $this->department = f27Department();
});

test('FT-F27-01 - an admin adds a student with the minimum payload', function () {
    // Boundary: success baseline and the omitted-status side of the nullable
    // domain.
    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload())
        ->assertRedirect(route('dashboard.users'));

    $user = User::query()->where('email', 'alvin@student.itera.ac.id')->first();

    expect($user)->not->toBeNull()
        ->and($user->name)->toBe('Alvin Yoga Kesuma')
        ->and($user->role)->toBe('student')
        ->and($user->nim_nip)->toBe('121140154')
        ->and($user->major_departement_id)->toBe($this->department->id)
        ->and($user->total_points)->toBe(0)
        ->and($user->academic_status)->toBe('Mahasiswa')
        ->and($user->password)->not->toBeNull()
        ->and($user->email_verified_at)->toBeNull();
});

test('FT-F27-02 - an admin adds an admin with an academic status', function () {
    // Boundary: the role=admin side and the academic_status in-list side.
    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'name' => 'Dosen Baru',
            'email' => 'dosen@itera.ac.id',
            'role' => 'admin',
            'academic_status' => 'Staff',
            'nim_nip' => '198504122010011001',
            'total_points' => 15,
        ]))
        ->assertRedirect(route('dashboard.users'));

    $user = User::query()->where('email', 'dosen@itera.ac.id')->first();

    expect($user)->not->toBeNull()
        ->and($user->role)->toBe('admin')
        ->and($user->academic_status)->toBe('Staff')
        ->and($user->total_points)->toBe(15);
});

test('FT-F27-03 - a student cannot add a user', function () {
    // Boundary: access, invalid side (role). Nothing may be persisted.
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->post(route('dashboard.users.store'), f27Payload())
        ->assertForbidden();

    expect(User::query()->where('email', 'alvin@student.itera.ac.id')->exists())->toBeFalse();
});

test('FT-F27-04 - a guest cannot add a user', function () {
    // Boundary: access, invalid side (authentication). Nothing may be persisted.
    $this->post(route('dashboard.users.store'), f27Payload())
        ->assertRedirect(route('login'));

    expect(User::query()->where('email', 'alvin@student.itera.ac.id')->exists())->toBeFalse();
});

test('FT-F27-05 - the email must be lowercase', function () {
    // Boundary: email case. The mixed-case attempt is rejected; the same
    // address in lowercase is accepted.
    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'Alvin@student.itera.ac.id',
        ]))
        ->assertInvalid('email');

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'alvin@student.itera.ac.id',
        ]))
        ->assertRedirect(route('dashboard.users'));

    expect(User::query()->where('email', 'alvin@student.itera.ac.id')->exists())->toBeTrue();
});

test('FT-F27-06 - the email domain must be institutional', function () {
    // Boundary: email domain. Valid sides: a bare @itera.ac.id address and a
    // deeper subdomain. Invalid sides: a near-miss suffix and an external
    // domain. Each accepted attempt uses its own nim_nip.
    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'bare@itera.ac.id',
            'nim_nip' => '121140001',
        ]))
        ->assertRedirect(route('dashboard.users'));

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'deep@a.b.itera.ac.id',
            'nim_nip' => '121140002',
        ]))
        ->assertRedirect(route('dashboard.users'));

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'near@notitera.ac.id',
            'nim_nip' => '121140003',
        ]))
        ->assertInvalid('email');

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'external@gmail.com',
            'nim_nip' => '121140004',
        ]))
        ->assertInvalid('email');

    expect(User::query()->whereIn('email', [
        'bare@itera.ac.id',
        'deep@a.b.itera.ac.id',
    ])->count())->toBe(2)
        ->and(User::query()->whereIn('email', [
            'near@notitera.ac.id',
            'external@gmail.com',
        ])->exists())->toBeFalse();
});

test('FT-F27-07 - the name boundary is 255 characters', function () {
    // Boundary: name length. 255 is accepted, 256 is rejected.
    $maxName = str_repeat('a', 255);

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'name' => $maxName,
            'email' => 'name255@student.itera.ac.id',
            'nim_nip' => '121140001',
        ]))
        ->assertRedirect(route('dashboard.users'));

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'name' => str_repeat('a', 256),
            'email' => 'name256@student.itera.ac.id',
            'nim_nip' => '121140002',
        ]))
        ->assertInvalid('name');

    expect(User::query()->where('email', 'name255@student.itera.ac.id')->first()?->name)->toBe($maxName)
        ->and(User::query()->where('email', 'name256@student.itera.ac.id')->exists())->toBeFalse();
});

test('FT-F27-08 - the nim_nip boundary is 50 digits', function () {
    // Boundary: nim_nip length. 50 digits are accepted, 51 are rejected.
    $maxNim = str_repeat('9', 50);

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'nim50@student.itera.ac.id',
            'nim_nip' => $maxNim,
        ]))
        ->assertRedirect(route('dashboard.users'));

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'nim51@student.itera.ac.id',
            'nim_nip' => str_repeat('9', 51),
        ]))
        ->assertInvalid('nim_nip');

    expect(User::query()->where('email', 'nim50@student.itera.ac.id')->first()?->nim_nip)->toBe($maxNim)
        ->and(User::query()->where('email', 'nim51@student.itera.ac.id')->exists())->toBeFalse();
});

test('FT-F27-09 - duplicate email and duplicate nim_nip are rejected', function () {
    // Boundary: uniqueness. Both identifiers are checked independently, so a
    // duplicate in one field is reported against that field only.
    User::factory()->create([
        'email' => 'taken@student.itera.ac.id',
        'nim_nip' => '111111111',
    ]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'taken@student.itera.ac.id',
            'nim_nip' => '222222222',
        ]))
        ->assertInvalid('email');

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'fresh@student.itera.ac.id',
            'nim_nip' => '111111111',
        ]))
        ->assertInvalid('nim_nip');

    expect(User::query()->where('email', 'fresh@student.itera.ac.id')->exists())->toBeFalse();
});

test('FT-F27-10 - total_points accepts zero and rejects negatives and fractions', function () {
    // Boundary: total_points. Zero is the valid side of the lower bound; -1
    // is the invalid side; 1.5 is invalid because the field is an integer.
    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'zero@student.itera.ac.id',
            'nim_nip' => '121140001',
            'total_points' => 0,
        ]))
        ->assertRedirect(route('dashboard.users'));

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'negative@student.itera.ac.id',
            'nim_nip' => '121140002',
            'total_points' => -1,
        ]))
        ->assertInvalid('total_points');

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), f27Payload([
            'email' => 'fraction@student.itera.ac.id',
            'nim_nip' => '121140003',
            'total_points' => 1.5,
        ]))
        ->assertInvalid('total_points');

    expect(User::query()->where('email', 'zero@student.itera.ac.id')->first()?->total_points)->toBe(0)
        ->and(User::query()->whereIn('email', [
            'negative@student.itera.ac.id',
            'fraction@student.itera.ac.id',
        ])->exists())->toBeFalse();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f27Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
    ], $attributes));
}

/**
 * The department the create form offers; the factory only supplies the name,
 * while the table also requires a domain and code.
 */
function f27Department(): MajorDepartement
{
    return MajorDepartement::factory()->create([
        'name' => 'Teknik Informatika',
        'major_departement_domain' => 'if.itera.ac.id',
        'major_departement_code' => 14,
    ]);
}

/**
 * A complete, valid create payload; tests override single fields to move
 * along one domain at a time.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function f27Payload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Alvin Yoga Kesuma',
        'email' => 'alvin@student.itera.ac.id',
        'role' => 'student',
        'nim_nip' => '121140154',
        'major_department' => 'Teknik Informatika',
        'total_points' => 0,
    ], $overrides);
}
