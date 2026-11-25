<?php

/**
 * F-19 - Fungsi mengubah informasi pribadi profil
 *
 * Feature tests for the profile information save: PATCH /profile (route
 * profile.update), behind the auth gate only. The student edits the name,
 * email, NIM/NIP, study program, and biography in one whole-payload save;
 * changing the email address drops the verification stamp so the new address
 * must be verified again.
 *
 * Method: equivalence partitioning (EP) per input domain, then robust boundary
 * value analysis (BVA) - every identified boundary carries both a valid-side
 * and an invalid-side input.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain       | Valid classes                                | Invalid classes                              |
 * |--------------|----------------------------------------------|----------------------------------------------|
 * | access       | authenticated student                        | guest                                        |
 * | name         | 1..255 characters                            | missing, 256+ characters                     |
 * | email        | lowercase, unique, the user's own address    | missing, another user's address              |
 * | email change | unchanged keeps the verification stamp       | a changed address clears it                  |
 * | nim_nip      | null, 1..50 characters                       | 51+ characters                               |
 * | major        | null, an existing study program              | an unknown id                                |
 * | biography    | text, null                                   | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F19-01 | success baseline                            | name, NIM, major, biography        | redirect to the profile; fields stored                    |
 * | FT-F19-02 | name - missing (invalid side)               | name omitted                       | rejected on name; row unchanged                           |
 * | FT-F19-03 | name length - 255 / 256                     | 255 / 256 characters               | accepted / rejected on name                               |
 * | FT-F19-04 | email - missing (invalid side)              | email omitted                      | rejected on email                                         |
 * | FT-F19-05 | email uniqueness - other / own              | another user's / the user's own    | rejected / accepted                                       |
 * | FT-F19-06 | email change - verification reset           | a new address                      | email_verified_at cleared                                 |
 * | FT-F19-07 | email unchanged - stamp kept                | the same address                   | email_verified_at kept                                    |
 * | FT-F19-08 | nim_nip length - 50 / 51                    | 50 / 51 characters                 | accepted / rejected on nim_nip                            |
 * | FT-F19-09 | major - unknown id (invalid side)           | 999999                             | rejected on major_departement_id; column unchanged        |
 * | FT-F19-10 | biography - null (boundary)                 | null                               | the stored biography clears                               |
 * | FT-F19-11 | access - guest (invalid side)               | logged-out PATCH                   | redirect to login; no write                               |
 *
 * == Relation to the existing suites =========================================
 *
 * ProfileTest already proves the baseline save, the student-detail save, the
 * unknown-major rejection, the unchanged-email stamp, and the reset on an
 * email change. F-19 deliberately repeats those so the feature file is
 * self-contained; the new content is the name length boundary, the email
 * uniqueness pair, the nim_nip length boundary, the biography clearing, and
 * the guest PATCH.
 *
 * The page that hosts the form is F-18's subject; the avatar and badge
 * actions are F-21 and F-23's. The admin user update is F-28's, with its own
 * role and academic-status domains. The gate ordering is F-04's subject, but
 * this route uses the auth middleware only.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The save is a full patch of the editable fields and redirects back to the
 *   profile page.
 * - The email uniqueness rule ignores the signed-in user's own row, so saving
 *   the unchanged address passes; another user's address is rejected.
 * - Changing the email address clears the verification stamp, while an
 *   unchanged address keeps it.
 * - nim_nip and the study program are optional; the biography is optional and
 *   may be cleared to null.
 * - Validation failures leave the stored row exactly as it was.
 */

use App\Models\MajorDepartement;
use App\Models\User;

test('FT-F19-01 - a student updates the personal information', function () {
    // Boundary: success baseline. The editable fields land and the save
    // returns to the profile page.
    $major = f19Major('Teknik Informatika');
    $student = f19Student(['nim_nip' => '121140001']);

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
            'email' => $student->email,
            'nim_nip' => '121140089',
            'major_departement_id' => $major->id,
            'biography' => 'Preparing for the ITERA English test.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $student->refresh();

    expect($student->name)->toBe('Ayu Lestari')
        ->and($student->nim_nip)->toBe('121140089')
        ->and($student->major_departement_id)->toBe($major->id)
        ->and($student->biography)->toBe('Preparing for the ITERA English test.');
});

test('FT-F19-02 - the name is required', function () {
    // Boundary: name, invalid side (missing).
    $student = f19Student(['name' => 'Original Name']);

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'email' => $student->email,
        ])
        ->assertSessionHasErrors(['name']);

    expect($student->fresh()->name)->toBe('Original Name');
});

test('FT-F19-03 - the name boundary is 255 characters', function () {
    // Boundary: name max / max+1.
    $student = f19Student();

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => str_repeat('n', 255),
            'email' => $student->email,
        ])
        ->assertSessionHasNoErrors();

    expect($student->fresh()->name)->toHaveLength(255);

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => str_repeat('n', 256),
            'email' => $student->email,
        ])
        ->assertSessionHasErrors(['name']);

    expect($student->fresh()->name)->toHaveLength(255);
});

test('FT-F19-04 - the email is required', function () {
    // Boundary: email, invalid side (missing).
    $student = f19Student(['email' => 'keep@student.itera.ac.id']);

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
        ])
        ->assertSessionHasErrors(['email']);

    expect($student->fresh()->email)->toBe('keep@student.itera.ac.id');
});

test('FT-F19-05 - the email uniqueness rule covers other users only', function () {
    // Boundary: email uniqueness. Another user's address is rejected; the
    // user's own address passes.
    $student = f19Student(['email' => 'ayu@student.itera.ac.id']);
    $other = f19Student(['email' => 'other@student.itera.ac.id']);

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
            'email' => $other->email,
        ])
        ->assertSessionHasErrors(['email']);

    expect($student->fresh()->email)->toBe('ayu@student.itera.ac.id');

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
            'email' => $student->email,
        ])
        ->assertSessionHasNoErrors();

    expect($student->fresh()->email)->toBe('ayu@student.itera.ac.id');
});

test('FT-F19-06 - a changed email clears the verification stamp', function () {
    // Boundary: email change. The new address must be verified again.
    $student = f19Student();

    expect($student->email_verified_at)->not->toBeNull();

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
            'email' => 'ayu.changed@student.itera.ac.id',
        ])
        ->assertSessionHasNoErrors();

    expect($student->fresh()->email)->toBe('ayu.changed@student.itera.ac.id')
        ->and($student->fresh()->email_verified_at)->toBeNull();
});

test('FT-F19-07 - an unchanged email keeps the verification stamp', function () {
    // Boundary: email unchanged. Saving the same address is not a change.
    $student = f19Student();

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
            'email' => $student->email,
        ])
        ->assertSessionHasNoErrors();

    expect($student->fresh()->email_verified_at)->not->toBeNull();
});

test('FT-F19-08 - the nim_nip boundary is 50 characters', function () {
    // Boundary: nim_nip max / max+1.
    $student = f19Student();

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
            'email' => $student->email,
            'nim_nip' => str_repeat('1', 50),
        ])
        ->assertSessionHasNoErrors();

    expect($student->fresh()->nim_nip)->toHaveLength(50);

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
            'email' => $student->email,
            'nim_nip' => str_repeat('1', 51),
        ])
        ->assertSessionHasErrors(['nim_nip']);

    expect($student->fresh()->nim_nip)->toHaveLength(50);
});

test('FT-F19-09 - an unknown study program is rejected', function () {
    // Boundary: major, invalid side (unknown id).
    $student = f19Student();

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
            'email' => $student->email,
            'major_departement_id' => 999999,
        ])
        ->assertSessionHasErrors(['major_departement_id']);

    expect($student->fresh()->major_departement_id)->toBeNull();
});

test('FT-F19-10 - the biography can be cleared', function () {
    // Boundary: biography, null side. An existing biography may be removed.
    $student = f19Student(['biography' => 'An old biography.']);

    $this->actingAs($student)
        ->patch(route('profile.update'), [
            'name' => 'Ayu Lestari',
            'email' => $student->email,
            'biography' => null,
        ])
        ->assertSessionHasNoErrors();

    expect($student->fresh()->biography)->toBeNull();
});

test('FT-F19-11 - a guest cannot update a profile', function () {
    // Boundary: access, invalid side (authentication).
    $student = f19Student(['name' => 'Original Name']);

    $this->patch(route('profile.update'), [
        'name' => 'Hacked Name',
        'email' => 'hacked@student.itera.ac.id',
    ])->assertRedirect(route('login'));

    expect($student->fresh()->name)->toBe('Original Name');
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f19Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * A study program row with its display name.
 */
function f19Major(string $name): MajorDepartement
{
    return MajorDepartement::query()->create([
        'name' => $name,
        'major_departement_domain' => strtolower(str_replace(' ', '-', $name)),
        'major_departement_code' => '135',
    ]);
}
