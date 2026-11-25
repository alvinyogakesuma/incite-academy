<?php

/**
 * F-01 - Sistem pendaftaran menggunakan email institusi
 *
 * Feature tests for App\Http\Controllers\Auth\RegisteredUserController::store()
 * (routes GET/POST /register, behind the `guest` middleware).
 *
 * Method: equivalence partitioning (EP) per input domain, then robust boundary
 * value analysis (BVA) - every identified boundary carries both a valid-side
 * and an invalid-side input.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                | Invalid classes                                        |
 * |-------------------|----------------------------------------------|--------------------------------------------------------|
 * | visitor state     | guest (form renders)                         | authenticated (redirected away)                        |
 * | email: domain     | @itera.ac.id, @sub.itera.ac.id               | foreign domain, suffix attack, malformed               |
 * | email: case       | already-lowercase (implicit in valid cases)  | mixed-case - rejected, not normalized (observed)       |
 * | email: length     | <= 255 chars (constructible, see notes)      | >= 256 chars                                           |
 * | email: uniqueness | new address                                  | exact duplicate, case-variant duplicate                |
 * | nim_nip: range    | 9..18 digits                                 | 8 or 19 digits, non-digits, duplicate                  |
 * | password: length  | >= 8 chars (observed minimum)                | 7 chars                                                |
 * | password: confirm | matches password                             | mismatch                                               |
 * | name: length      | <= 255 chars                                 | >= 256 chars                                           |
 * | academic_status   | Mahasiswa / Dosen / Staff                    | any other string                                       |
 * | major_departement | existing name (implicit in valid cases)      | unknown name (covered by RegistrationTest)             |
 * | required fields   | present (implicit in valid cases)            | missing (representative: name)                         |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                       | Expected outcome                          |
 * |-----------|---------------------------------------------|-----------------------------|-------------------------------------------|
 * | FT-F01-01 | nim_nip min-1 (invalid side)                | 8 digits                    | validation error on nim_nip, no user row  |
 * | FT-F01-02 | nim_nip min (valid side)                    | 9 digits                    | user created, authenticated, redirect     |
 * | FT-F01-03 | nim_nip max (valid side)                    | 18 digits                   | user created                              |
 * | FT-F01-04 | nim_nip max+1 (invalid side)                | 19 digits                   | validation error on nim_nip, no user row  |
 * | FT-F01-05 | password min-1 (invalid side)               | 7 chars                     | validation error on password, no user row |
 * | FT-F01-06 | password min (valid side)                   | 8 chars                     | user created                              |
 * | FT-F01-07 | confirmation mismatch (invalid side)        | confirmation != password    | validation error on password, no user row |
 * | FT-F01-08 | name max (valid side)                       | 255 chars                   | user created                              |
 * | FT-F01-09 | name max+1 (invalid side)                   | 256 chars                   | validation error on name, no user row     |
 * | FT-F01-10 | email max (valid side)                      | exactly 255 chars           | user created                              |
 * | FT-F01-11 | email max+1 (invalid side)                  | 256 chars                   | validation error on email, no user row    |
 * | FT-F01-12 | email malformed format (invalid side)       | not-an-email                | validation error on email, no user row    |
 * | FT-F01-13 | email domain - suffix attack (invalid side) | x@itera.ac.id.evil.com      | validation error on email, no user row    |
 * | FT-F01-14 | email uniqueness - exact duplicate          | already-registered email    | validation error on email, count stays 1  |
 * | FT-F01-15 | email uniqueness x case (invalid side)      | UPPERCASE variant duplicate | validation error on email, count stays 1  |
 * | FT-F01-16 | email case - mixed-case input               | Alvin@ITERA.AC.ID           | validation error on email, no user row    |
 * | FT-F01-17 | academic_status - valid member              | Staff                       | user created with Staff                   |
 * | FT-F01-18 | academic_status - non-member                | Rektor                      | validation error on academic_status       |
 * | FT-F01-19 | visitor state - authenticated               | GET /register while logged  | redirected to route('dashboard')          |
 * | FT-F01-20 | required field missing (invalid side)       | name omitted                | validation error on name, no user row     |
 *
 * == Relation to the existing suites =========================================
 *
 * RegistrationTest already proves: the happy flow (9-digit nim_nip), foreign
 * domain rejection (gmail.com), non-digit and duplicate nim_nip, and unknown
 * major_departement. The 8/19-digit cases below deliberately repeat the 8-digit
 * coverage so the BVA quartet is self-contained and traceable inside F-01.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - Mixed-case institutional emails are rejected, not normalized. Observed:
 *   Alvin@ITERA.AC.ID returns a validation error ("must be lowercase") - the
 *   system requires the input to already be lowercase. Hence FT-F01-16
 *   asserts rejection, not normalization.
 * - The smallest accepted password is 8 characters (observed: 7 rejected,
 *   8 accepted); the password rule adds no other visible requirements.
 * - An authenticated visitor to /register is redirected to the admin
 *   dashboard route; for a regular student that chain ends in a 403 on
 *   /dashboard/users. The redirect asserted in FT-F01-19 is the observed
 *   first hop of that chain.
 * - Addresses at the length maximum are accepted only when built with a
 *   64-char local part and short subdomain labels (empirically: labels
 *   after the first must be at most 62 chars, the domain at most 253 chars);
 *   longer labels fail the email format check first and would mask the
 *   length boundary under test. See FT-F01-10/11 for the exact constructions.
 */

use App\Models\User;
use Database\Seeders\MajorDepartementSeeder;

test('FT-F01-01 - nim_nip with 8 digits (min-1, invalid side) is rejected', function () {
    // Boundary: digits_between:9,18, one below the minimum.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'nim_nip' => '12345678',
    ]));

    $response->assertInvalid(['nim_nip']);
    expect(User::count())->toBe(0);
});

test('FT-F01-02 - nim_nip with 9 digits (min, valid side) registers', function () {
    // Boundary: digits_between:9,18, exactly at the minimum.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'nim_nip' => '123456789',
    ]));

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
    expect(User::where('nim_nip', '123456789')->exists())->toBeTrue();
});

test('FT-F01-03 - nim_nip with 18 digits (max, valid side) registers', function () {
    // Boundary: digits_between:9,18, exactly at the maximum.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'nim_nip' => '123456789012345678',
    ]));

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
    expect(User::where('nim_nip', '123456789012345678')->exists())->toBeTrue();
});

test('FT-F01-04 - nim_nip with 19 digits (max+1, invalid side) is rejected', function () {
    // Boundary: digits_between:9,18, one above the maximum.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'nim_nip' => '1234567890123456789',
    ]));

    $response->assertInvalid(['nim_nip']);
    expect(User::count())->toBe(0);
});

test('FT-F01-05 - password with 7 chars (min-1, invalid side) is rejected', function () {
    // Boundary: the smallest accepted password is 8 chars (observed), one below.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'password' => 'Passwor',
        'password_confirmation' => 'Passwor',
    ]));

    $response->assertInvalid(['password']);
    expect(User::count())->toBe(0);
});

test('FT-F01-06 - password with 8 chars (min, valid side) registers', function () {
    // Boundary: the smallest accepted password is 8 chars (observed), exactly at it.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'password' => 'Password',
        'password_confirmation' => 'Password',
    ]));

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
    expect(User::count())->toBe(1);
});

test('FT-F01-07 - mismatched password confirmation is rejected', function () {
    // Partition: password confirmed, confirmation does not match.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'password' => 'Password123',
        'password_confirmation' => 'Different123',
    ]));

    $response->assertInvalid(['password']);
    expect(User::count())->toBe(0);
});

test('FT-F01-08 - name with 255 chars (max, valid side) registers', function () {
    // Boundary: name string|max:255, exactly at the maximum.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'name' => str_repeat('a', 255),
    ]));

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
    expect(User::first()->name)->toHaveLength(255);
});

test('FT-F01-09 - name with 256 chars (max+1, invalid side) is rejected', function () {
    // Boundary: name string|max:255, one above the maximum.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'name' => str_repeat('a', 256),
    ]));

    $response->assertInvalid(['name']);
    expect(User::count())->toBe(0);
});

test('FT-F01-10 - email of exactly 255 chars (max, valid side) registers', function () {
    // Boundary: the longest accepted email is 255 chars, exactly at the
    // maximum. The address is built with a 64-char local part and short
    // subdomain labels so the email format check accepts it and the
    // 255-char length is the boundary this request exercises - longer
    // labels are rejected by the format check first and would mask it.
    $this->seed(MajorDepartementSeeder::class);

    $email = str_repeat('a', 64)
        .'@'
        .str_repeat('b', 62)
        .'.'
        .str_repeat('c', 62)
        .'.'
        .str_repeat('d', 52)
        .'.itera.ac.id';
    expect(strlen($email))->toBe(255);

    $response = $this->post('/register', f01ValidPayload([
        'email' => $email,
    ]));

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
    expect(User::where('email', $email)->exists())->toBeTrue();
});

test('FT-F01-11 - email of 256 chars (max+1, invalid side) is rejected', function () {
    // Boundary: one above the longest accepted email. Built like FT-F01-10
    // but one char longer, so the email format check passes and the length
    // limit is what rejects it (observed by probing: 255 accepted, 256 not).
    $this->seed(MajorDepartementSeeder::class);

    $email = str_repeat('a', 64)
        .'@'
        .str_repeat('b', 62)
        .'.'
        .str_repeat('c', 62)
        .'.'
        .str_repeat('d', 53)
        .'.itera.ac.id';
    expect(strlen($email))->toBe(256);

    $response = $this->post('/register', f01ValidPayload([
        'email' => $email,
    ]));

    $response->assertInvalid(['email']);
    expect(User::count())->toBe(0);
});

test('FT-F01-12 - a malformed email is rejected', function () {
    // Partition: email format, invalid class (valid side is exercised by
    // every successful registration in this suite).
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'email' => 'not-an-email',
    ]));

    $response->assertInvalid(['email']);
    expect(User::count())->toBe(0);
});

test('FT-F01-13 - a look-alike domain suffix (itera.ac.id.evil.com) is rejected', function () {
    // Partition: email institutional domain, invalid side. The regex is
    // anchored at the end, so a suffix after itera.ac.id must not slip through.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'email' => 'student@itera.ac.id.evil.com',
    ]));

    $response->assertInvalid(['email']);
    expect(User::count())->toBe(0);
});

test('FT-F01-14 - an exactly duplicated email is rejected', function () {
    // Partition: email unique, invalid side (valid side is exercised by
    // every successful registration in this suite).
    $this->seed(MajorDepartementSeeder::class);
    User::factory()->create(['email' => 'alvin@student.itera.ac.id']);

    $response = $this->post('/register', f01ValidPayload([
        'email' => 'alvin@student.itera.ac.id',
    ]));

    $response->assertInvalid(['email']);
    expect(User::count())->toBe(1);
});

test('FT-F01-15 - a case-variant duplicate email is rejected', function () {
    // Partition: email uniqueness x case. Observed: the system rejects
    // non-lowercase email input outright, so this case-variant duplicate is
    // rejected on the case constraint alone.
    $this->seed(MajorDepartementSeeder::class);
    User::factory()->create(['email' => 'alvin@student.itera.ac.id']);

    $response = $this->post('/register', f01ValidPayload([
        'email' => 'ALVIN@STUDENT.ITERA.AC.ID',
    ]));

    $response->assertInvalid(['email']);
    expect(User::count())->toBe(1);
});

test('FT-F01-16 - a mixed-case institutional email is rejected, not normalized', function () {
    // Partition: email case, invalid side. Observed: the system requires the
    // input to already be lowercase - there is no normalization step.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'email' => 'Alvin@ITERA.AC.ID',
    ]));

    $response->assertInvalid(['email']);
    expect(User::count())->toBe(0);
});

test('FT-F01-17 - the Staff academic status registers', function () {
    // Partition: academic_status membership, valid side. Staff is the only
    // accepted value no other suite covers; Mahasiswa (default) and Dosen are
    // proven by RegistrationTest.
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'academic_status' => 'Staff',
    ]));

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
    expect(User::first()->academic_status)->toBe('Staff');
});

test('FT-F01-18 - an unknown academic status is rejected', function () {
    // Partition: academic_status membership, invalid side - only
    // Mahasiswa, Dosen and Staff are accepted (observed).
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', f01ValidPayload([
        'academic_status' => 'Rektor',
    ]));

    $response->assertInvalid(['academic_status']);
    expect(User::count())->toBe(0);
});

test('FT-F01-19 - an authenticated user is redirected away from the register screen', function () {
    // Partition: visitor state, invalid side (valid side: guest, proven by
    // RegistrationTest's render test). Observed redirect target: the admin
    // dashboard route.
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/register');

    $response->assertRedirect(route('dashboard'));
});

test('FT-F01-20 - a missing name is rejected', function () {
    // Partition: required fields, invalid side, represented by name. The
    // same class applies to email, nim_nip, major_departement and password.
    $this->seed(MajorDepartementSeeder::class);

    $payload = f01ValidPayload();
    unset($payload['name']);

    $response = $this->post('/register', $payload);

    $response->assertInvalid(['name']);
    expect(User::count())->toBe(0);
});

/**
 * The valid baseline payload every case overrides one field of -
 * each invalid case differs from a proven-valid request in exactly
 * one partition.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function f01ValidPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Alvin Yoga Kesuma',
        'email' => 'alvin.121140154@student.itera.ac.id',
        'nim_nip' => '123456789',
        'major_departement' => 'Teknik Informatika',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ], $overrides);
}
