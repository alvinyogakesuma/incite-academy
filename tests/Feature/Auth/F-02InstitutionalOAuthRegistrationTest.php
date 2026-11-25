<?php

/**
 * F-02 - Sistem pendaftaran OAuth dengan email institusi
 *
 * Feature tests for App\Http\Controllers\Auth\GoogleAuthController
 * (routes GET /auth/google/redirect and GET /auth/google/callback, behind
 * the `guest` middleware).
 *
 * Method: equivalence partitioning (EP) per input domain, then robust boundary
 * value analysis (BVA) - every identified boundary carries both a valid-side
 * and an invalid-side input.
 *
 * The Google identity is supplied at the provider seam: the tests replace the
 * OAuth provider's user lookup with a fake identity (test infrastructure), then
 * assert only what a user of the system can observe - HTTP redirects, flash
 * messages, session authentication state, and the resulting user row.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                 | Invalid classes                                       |
 * |-------------------|-----------------------------------------------|-------------------------------------------------------|
 * | email: domain     | @itera.ac.id, @sub.itera.ac.id                | foreign domain, suffix attack, look-alike domain      |
 * | email: case       | any case - normalized to lowercase (observed) | (none - the channel lowercases before checking)       |
 * | email: presence   | provider returns an address                   | provider returns no address                           |
 * | account linkage   | new identity, returning google_id, same email | (none - both resolve to a single account)             |
 * | visitor state     | guest                                         | authenticated (redirected away)                       |
 * | provider name     | present                                       | missing (the account cannot be created)               |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                      | Expected outcome                                     |
 * |-----------|---------------------------------------------|----------------------------|------------------------------------------------------|
 * | FT-F02-01 | email domain - root (valid side)            | alvin@itera.ac.id          | account created, authenticated, redirect /home       |
 * | FT-F02-02 | email domain - subdomain (valid side)       | alvin@student.itera.ac.id  | account created, one row                             |
 * | FT-F02-03 | email case - mixed-case input               | Alvin@ITERA.AC.ID          | accepted and stored lowercase                        |
 * | FT-F02-04 | email domain - foreign (invalid side)       | alvin@gmail.com            | redirect /login + error flash, no account, guest     |
 * | FT-F02-05 | email presence - provider returns none      | null email                 | rejected like FT-F02-04                              |
 * | FT-F02-06 | email domain - suffix attack (invalid side) | student@itera.ac.id.evil.com | rejected, no account                               |
 * | FT-F02-07 | email domain - look-alike (invalid side)    | alvin@notitera.ac.id       | rejected, no account                                 |
 * | FT-F02-08 | linkage - returning OAuth identity          | google_id already stored   | logged into the same account, still one row          |
 * | FT-F02-09 | linkage - existing email, no google_id      | form-registered user       | account linked and verified, still one row           |
 * | FT-F02-10 | visitor state - guest on redirect endpoint  | GET /auth/google/redirect  | 302 to the Google consent screen                     |
 * | FT-F02-11 | visitor state - authenticated               | same GET while logged in   | redirected to route('dashboard')                     |
 * | FT-F02-12 | callback without OAuth handshake            | direct GET .../callback    | error response (observed 500), no account            |
 * | FT-F02-13 | post-login destination - admin              | admin identity via OAuth   | redirect /dashboard                                  |
 * | FT-F02-14 | provider name missing                       | null name                  | error response (observed 500), no account            |
 *
 * == Relation to the existing suites =========================================
 *
 * No other suite covers the Google OAuth flow, so F-02 is the only coverage
 * for these routes and has no deliberate overlap to declare.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The OAuth channel lowercases the provider address before checking and
 *   storing it, unlike the form channel which rejects mixed case. Observed:
 *   Alvin@ITERA.AC.ID registers an account stored as alvin@itera.ac.id.
 * - The institutional-domain check originally accepted any address that
 *   merely ended with itera.ac.id, so alvin@notitera.ac.id registered as a
 *   valid institutional account. The boundary walk in this suite identified
 *   the class; the check was corrected to the anchored contract the form
 *   channel already enforces, and FT-F02-07 locks the corrected behavior.
 * - A callback without a completed OAuth handshake has no state in the
 *   session and ends in an error response (500) rather than a redirect.
 * - An identity with no name cannot be stored because accounts require a
 *   name; that request also ends in an error response (500).
 * - OAuth accounts never enter the app's email-verification flow: a
 *   successful Google sign-in marks the address verified for both newly
 *   created accounts and existing accounts linked by email, because Google
 *   has already proved ownership. The original creation path attempted to
 *   store the verification timestamp but it was not persisted, so OAuth
 *   accounts were still treated as unverified; FT-F02-01 and FT-F02-09 lock
 *   the corrected behavior.
 * - OAuth-created accounts carry a null nim_nip and the default Mahasiswa
 *   academic status.
 * - Admin accounts land on /dashboard; regular accounts land on /home.
 */

use App\Models\User;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

test('FT-F02-01 - an OAuth identity with a root institutional email registers', function () {
    // Boundary: institutional domain, valid side, exactly the root domain.
    f02FakeGoogle(f02GoogleUser('alvin@itera.ac.id'));

    $response = $this->get('/auth/google/callback');

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));

    $user = User::where('email', 'alvin@itera.ac.id')->first();

    expect($user)->not->toBeNull()
        ->and($user->google_id)->toBe('google-123')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->nim_nip)->toBeNull()
        ->and($user->academic_status)->toBe('Mahasiswa');
    expect(User::count())->toBe(1);
});

test('FT-F02-02 - an OAuth identity with a subdomain institutional email registers', function () {
    // Boundary: institutional domain, valid side, one subdomain label deep.
    f02FakeGoogle(f02GoogleUser('alvin@student.itera.ac.id'));

    $response = $this->get('/auth/google/callback');

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
    expect(User::where('email', 'alvin@student.itera.ac.id')->exists())->toBeTrue();
    expect(User::count())->toBe(1);
});

test('FT-F02-03 - a mixed-case institutional email is accepted and stored lowercase', function () {
    // Partition: email case. Observed: unlike the form channel, the OAuth
    // channel normalizes the provider address instead of rejecting it.
    f02FakeGoogle(f02GoogleUser('Alvin@ITERA.AC.ID'));

    $response = $this->get('/auth/google/callback');

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
    expect(User::where('email', 'alvin@itera.ac.id')->exists())->toBeTrue();
    expect(User::count())->toBe(1);
});

test('FT-F02-04 - an OAuth identity with a foreign-domain email is rejected', function () {
    // Boundary: institutional domain, invalid side, a well-formed non-ITERA
    // address.
    f02FakeGoogle(f02GoogleUser('alvin@gmail.com'));

    $response = $this->get('/auth/google/callback');

    $response->assertRedirect('/login');
    $response->assertSessionHas('error', 'Only ITERA institutional Google accounts (@itera.ac.id) may sign in.');
    $this->assertGuest();
    expect(User::count())->toBe(0);
});

test('FT-F02-05 - an OAuth identity without an email address is rejected', function () {
    // Partition: email presence, invalid side (valid side is every accepted
    // identity in this suite).
    f02FakeGoogle(f02GoogleUser(null));

    $response = $this->get('/auth/google/callback');

    $response->assertRedirect('/login');
    $response->assertSessionHas('error');
    $this->assertGuest();
    expect(User::count())->toBe(0);
});

test('FT-F02-06 - an email with an institutional suffix followed by another domain is rejected', function () {
    // Boundary: institutional domain, invalid side. The check is anchored at
    // the end of the address, so a domain after itera.ac.id must not pass.
    f02FakeGoogle(f02GoogleUser('student@itera.ac.id.evil.com'));

    $response = $this->get('/auth/google/callback');

    $response->assertRedirect('/login');
    $response->assertSessionHas('error');
    $this->assertGuest();
    expect(User::count())->toBe(0);
});

test('FT-F02-07 - a look-alike domain that merely ends with itera.ac.id is rejected', function () {
    // Boundary: institutional domain, invalid side, the adjacent label is
    // "notitera" rather than "itera". Observed before the correction: this
    // address registered as a valid institutional account (defect). The
    // corrected check rejects it, which this case locks in.
    f02FakeGoogle(f02GoogleUser('alvin@notitera.ac.id'));

    $response = $this->get('/auth/google/callback');

    $response->assertRedirect('/login');
    $response->assertSessionHas('error');
    $this->assertGuest();
    expect(User::count())->toBe(0);
});

test('FT-F02-08 - a returning OAuth identity logs into the same account', function () {
    // Partition: account linkage, returning google_id (valid side). The
    // second sign-in must reuse the row instead of creating a duplicate.
    $user = User::factory()->create([
        'email' => 'alvin@itera.ac.id',
        'google_id' => 'google-123',
    ]);

    f02FakeGoogle(f02GoogleUser('alvin@itera.ac.id', 'google-123'));

    $response = $this->get('/auth/google/callback');

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('home', absolute: false));
    expect(User::count())->toBe(1);
});

test('FT-F02-09 - an existing form-registered user is linked to the OAuth identity', function () {
    // Partition: account linkage, same email without a google_id (valid
    // side). The account must be linked in place, not duplicated; Google's
    // proof of ownership also satisfies the app's verification requirement.
    $user = User::factory()->unverified()->create([
        'email' => 'alvin@itera.ac.id',
        'google_id' => null,
    ]);

    f02FakeGoogle(f02GoogleUser('alvin@itera.ac.id', 'google-999'));

    $response = $this->get('/auth/google/callback');

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('home', absolute: false));
    expect(User::count())->toBe(1);
    expect($user->fresh()->google_id)->toBe('google-999');
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

test('FT-F02-10 - a guest is redirected to the Google consent screen', function () {
    // Partition: visitor state, valid side (guest). Uses the real provider
    // redirect; no network call is made, only the consent URL is built.
    $response = $this->get('/auth/google/redirect');

    $response->assertStatus(302);
    expect($response->headers->get('Location'))->toContain('accounts.google.com');
});

test('FT-F02-11 - an authenticated user is redirected away from the Google redirect endpoint', function () {
    // Partition: visitor state, invalid side. Observed redirect target: the
    // same admin dashboard route the register screen uses.
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/auth/google/redirect');

    $response->assertRedirect(route('dashboard'));
});

test('FT-F02-12 - a callback without an OAuth handshake fails', function () {
    // Partition: callback reached outside the provider flow. Observed: the
    // request ends in an error response instead of a friendly redirect, and
    // no account is created.
    $response = $this->get('/auth/google/callback');

    $response->assertStatus(500);
    expect(User::count())->toBe(0);
});

test('FT-F02-13 - an admin OAuth identity lands on the dashboard', function () {
    // Partition: post-login destination, admin (valid side). Contrasts with
    // FT-F02-01/02 where a regular account lands on /home.
    $admin = User::factory()->create([
        'email' => 'admin@itera.ac.id',
        'google_id' => 'google-admin',
        'role' => 'admin',
    ]);

    f02FakeGoogle(f02GoogleUser('admin@itera.ac.id', 'google-admin'));

    $response = $this->get('/auth/google/callback');

    $this->assertAuthenticatedAs($admin);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('FT-F02-14 - an OAuth identity without a name cannot be registered', function () {
    // Partition: provider data completeness, invalid side. Observed: accounts
    // require a name, so the request ends in an error response and no account
    // is created.
    f02FakeGoogle(f02GoogleUser('alvin@itera.ac.id', 'google-123', null));

    $response = $this->get('/auth/google/callback');

    $response->assertStatus(500);
    expect(User::count())->toBe(0);
});

/**
 * Build the identity the OAuth provider would return for a completed
 * handshake - only the fields the system consumes are populated.
 */
function f02GoogleUser(?string $email, string $id = 'google-123', ?string $name = 'Alvin Yoga Kesuma'): SocialiteUser
{
    return SocialiteUser::fake([
        'id' => $id,
        'email' => $email,
        'name' => $name,
    ]);
}

/**
 * Replace the OAuth provider's user lookup with the given identity. This is
 * test infrastructure only: the fake sits at the external provider seam, so
 * every assertion still observes the application through HTTP and the DB.
 */
function f02FakeGoogle(SocialiteUser $googleUser): void
{
    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('user')->once()->andReturn($googleUser);

    Socialite::shouldReceive('driver')
        ->once()
        ->with('google')
        ->andReturn($provider);
}
