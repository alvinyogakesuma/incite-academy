<?php

/**
 * F-03 - Sistem login dengan akun terdaftar
 *
 * Feature tests for App\Http\Controllers\Auth\AuthenticatedSessionController
 * (routes GET/POST /login, behind the `guest` middleware; credentials are
 * checked by App\Http\Requests\Auth\LoginRequest).
 *
 * Method: equivalence partitioning (EP) per input domain, then robust boundary
 * value analysis (BVA) - every identified boundary carries both a valid-side
 * and an invalid-side input.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain             | Valid classes                              | Invalid classes                                      |
 * |--------------------|--------------------------------------------|------------------------------------------------------|
 * | credentials        | registered email + correct password        | wrong password, unregistered email                   |
 * | email: case        | matching the stored address (observed)     | case-variant of the stored address (observed, notes) |
 * | email: presence    | present                                    | missing                                              |
 * | email: format      | well-formed address                        | malformed address                                    |
 * | password: presence | present                                    | missing                                              |
 * | attempt count      | 1..5 consecutive failures; success clears  | 6th failure while locked out                         |
 * | visitor state      | guest                                      | authenticated (redirected away)                      |
 * | remember flag      | absent / false                             | true (sets a persistent-login cookie)                |
 * | intended URL       | absent (lands on the role home)            | present (lands on the requested page)                |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                          | Value                           | Expected outcome                              |
 * |-----------|-----------------------------------------------|---------------------------------|-----------------------------------------------|
 * | FT-F03-01 | credentials - registered + correct (valid)    | valid email + Password123       | authenticated, redirect /home                 |
 * | FT-F03-02 | credentials - wrong password (invalid)        | valid email + wrong password    | guest, generic error on email                 |
 * | FT-F03-03 | credentials - unregistered email (invalid)    | unknown email + any password    | same generic error as FT-F03-02               |
 * | FT-F03-04 | email case - case-variant input               | Alvin@ITERA.AC.ID               | rejected in this environment (observed)       |
 * | FT-F03-05 | email presence - missing (invalid side)       | email omitted                   | validation error on email                     |
 * | FT-F03-06 | email format - malformed (invalid side)       | not-an-email                    | validation error on email                     |
 * | FT-F03-07 | password presence - missing (invalid side)    | password omitted                | validation error on password                  |
 * | FT-F03-08 | attempts - limit-1 then success (valid)       | 4 failures + correct login      | authenticated, redirect /home                 |
 * | FT-F03-09 | attempts - exactly at the limit (valid)       | 5th consecutive failure         | still the generic error on email              |
 * | FT-F03-10 | attempts - limit+1 (invalid side)             | 6th attempt, correct credentials| throttle error, guest                         |
 * | FT-F03-11 | attempts - per-identity scope                 | account A locked, B logs in     | B authenticated                               |
 * | FT-F03-12 | visitor state - authenticated                 | GET /login while logged in      | redirected to route('dashboard')              |
 * | FT-F03-13 | remember flag - true                          | remember=true                   | persistent-login cookie set                   |
 * | FT-F03-14 | intended URL - present                        | guest visits /courses, logs in  | redirected to /courses                        |
 *
 * == Relation to the existing suites =========================================
 *
 * AuthenticationTest already proves: the login screen renders, the student
 * happy path, the admin dashboard redirect, a wrong-password rejection, and
 * logout. F-03 deliberately repeats the student happy path and the
 * wrong-password rejection as baselines for the rate-limit walk; the render,
 * admin destination, and logout are not repeated here.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The attempt limit sits between the 5th and 6th consecutive failure: five
 *   failures still return the generic credentials error, while the 6th is
 *   refused with the throttle message even when the credentials are correct.
 *   A successful login clears the counter, and the counter is per email+IP,
 *   so a different account can still sign in from the same client.
 * - A wrong password and an unregistered email produce the same generic
 *   error, so the screen does not reveal whether an account exists.
 * - A mixed-case variant of a registered address does not authenticate in
 *   this environment; the lookup is case-sensitive here. This is recorded as
 *   observed behavior and may vary with the database collation.
 * - An authenticated visitor to /login is redirected to the dashboard route.
 * - Logging in with remember=true sets a persistent-login cookie.
 * - A guest who requests a protected page is returned to that page after
 *   logging in instead of the role home.
 */

use App\Models\User;

test('FT-F03-01 - a registered account with correct credentials logs in', function () {
    // Baseline: registered account, both fields correct.
    $user = f03RegisteredUser();

    $response = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
        'password' => 'Password123',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('home', absolute: false));
});

test('FT-F03-02 - a wrong password is rejected', function () {
    // Baseline failure: registered email, incorrect password.
    f03RegisteredUser();

    $response = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
        'password' => 'WrongPassword',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('FT-F03-03 - an unregistered email gets the same error as a wrong password', function () {
    // Partition: credentials, invalid side, unregistered address. The
    // message must not reveal whether the account exists.
    f03RegisteredUser();

    $wrongPassword = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
        'password' => 'WrongPassword',
    ]);
    $wrongPassword->assertSessionHasErrors('email');
    $wrongPasswordMessage = session('errors')->first('email');

    $unknownEmail = $this->post('/login', [
        'email' => 'nobody@itera.ac.id',
        'password' => 'Password123',
    ]);
    $unknownEmail->assertSessionHasErrors('email');

    expect(session('errors')->first('email'))->toBe($wrongPasswordMessage);
    $this->assertGuest();
});

test('FT-F03-04 - a mixed-case variant of a registered email is rejected', function () {
    // Partition: email case. Observed: the lookup is case-sensitive in this
    // environment, so the case-variant does not match the stored address.
    f03RegisteredUser();

    $response = $this->post('/login', [
        'email' => 'Alvin@ITERA.AC.ID',
        'password' => 'Password123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('FT-F03-05 - a missing email is rejected', function () {
    // Partition: email presence, invalid side (valid side is every accepted
    // login in this suite).
    f03RegisteredUser();

    $response = $this->post('/login', [
        'password' => 'Password123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('FT-F03-06 - a malformed email is rejected', function () {
    // Partition: email format, invalid side.
    $response = $this->post('/login', [
        'email' => 'not-an-email',
        'password' => 'Password123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('FT-F03-07 - a missing password is rejected', function () {
    // Partition: password presence, invalid side.
    f03RegisteredUser();

    $response = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
    ]);

    $response->assertSessionHasErrors('password');
    $this->assertGuest();
});

test('FT-F03-08 - a correct login still succeeds after four failed attempts', function () {
    // Boundary: one below the attempt limit. A legitimate user who mistyped
    // four times can still sign in; the success also clears the counter,
    // proven by a fresh run of five failures that is not locked out.
    $user = f03RegisteredUser();

    for ($attempt = 1; $attempt <= 4; $attempt++) {
        $this->post('/login', [
            'email' => 'alvin@itera.ac.id',
            'password' => 'WrongPassword',
        ]);
    }

    $response = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
        'password' => 'Password123',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('home', absolute: false));

    $this->post('/logout');

    $last = null;

    for ($attempt = 1; $attempt <= 5; $attempt++) {
        $last = $this->post('/login', [
            'email' => 'alvin@itera.ac.id',
            'password' => 'WrongPassword',
        ]);
    }

    $last->assertSessionHasErrors('email');
    expect(session('errors')->first('email'))->not->toContain('Too many login attempts');
    $this->assertGuest();
});

test('FT-F03-09 - the fifth consecutive failure is still a normal rejection', function () {
    // Boundary: exactly at the attempt limit. The fifth failure must report
    // the generic credentials error, not the throttle message.
    f03RegisteredUser();

    $first = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
        'password' => 'WrongPassword',
    ]);
    $first->assertSessionHasErrors('email');
    $genericMessage = session('errors')->first('email');

    $last = null;

    for ($attempt = 2; $attempt <= 5; $attempt++) {
        $last = $this->post('/login', [
            'email' => 'alvin@itera.ac.id',
            'password' => 'WrongPassword',
        ]);
    }

    $last->assertSessionHasErrors('email');
    expect(session('errors')->first('email'))->toBe($genericMessage);
    $this->assertGuest();
});

test('FT-F03-10 - the sixth attempt is locked out even with correct credentials', function () {
    // Boundary: one above the attempt limit. The lockout is about the attempt
    // count, not the credentials, so the correct password is still refused.
    f03RegisteredUser();

    $first = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
        'password' => 'WrongPassword',
    ]);
    $first->assertSessionHasErrors('email');
    $genericMessage = session('errors')->first('email');

    for ($attempt = 2; $attempt <= 5; $attempt++) {
        $this->post('/login', [
            'email' => 'alvin@itera.ac.id',
            'password' => 'WrongPassword',
        ]);
    }

    $lockedOut = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
        'password' => 'Password123',
    ]);

    $lockedOut->assertSessionHasErrors('email');
    expect(session('errors')->first('email'))
        ->not->toBe($genericMessage)
        ->toContain('Too many login attempts');
    $this->assertGuest();
});

test('FT-F03-11 - locking one account does not lock another from the same client', function () {
    // Partition: attempt-limit scope. The counter belongs to the email+IP
    // pair, so a second account is unaffected.
    f03RegisteredUser(['email' => 'alvin@itera.ac.id']);
    $other = f03RegisteredUser(['email' => 'budi@itera.ac.id']);

    for ($attempt = 1; $attempt <= 5; $attempt++) {
        $this->post('/login', [
            'email' => 'alvin@itera.ac.id',
            'password' => 'WrongPassword',
        ]);
    }

    $response = $this->post('/login', [
        'email' => 'budi@itera.ac.id',
        'password' => 'Password123',
    ]);

    $this->assertAuthenticatedAs($other);
    $response->assertRedirect(route('home', absolute: false));
});

test('FT-F03-12 - an authenticated user is redirected away from the login screen', function () {
    // Partition: visitor state, invalid side (valid side: guest, exercised
    // by every other case). Observed redirect target: the dashboard route.
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/login');

    $response->assertRedirect(route('dashboard'));
});

test('FT-F03-13 - logging in with remember sets a persistent-login cookie', function () {
    // Partition: remember flag, true (the false side is every other accepted
    // login in this suite). Observed: the response carries a remember_* cookie.
    $user = f03RegisteredUser();

    $response = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
        'password' => 'Password123',
        'remember' => true,
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('home', absolute: false));

    $rememberCookie = collect($response->headers->getCookies())
        ->first(fn ($cookie) => str_starts_with($cookie->getName(), 'remember_'));

    expect($rememberCookie)->not->toBeNull();
});

test('FT-F03-14 - a guest returns to the requested page after logging in', function () {
    // Partition: intended URL, present. The guest asks for a protected page,
    // is sent to the login screen, and lands back on that page - not on the
    // role home - after authenticating.
    $user = f03RegisteredUser();

    $this->get('/courses')->assertRedirect('/login');

    $response = $this->post('/login', [
        'email' => 'alvin@itera.ac.id',
        'password' => 'Password123',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect('/courses');
});

/**
 * A registered, verified account the login cases authenticate against.
 *
 * @param  array<string, mixed>  $attributes
 */
function f03RegisteredUser(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'email' => 'alvin@itera.ac.id',
        'password' => 'Password123',
    ], $attributes));
}
