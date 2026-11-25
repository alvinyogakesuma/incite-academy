<?php

/**
 * F-05 - Sistem logout dari sistem
 *
 * Feature tests for App\Http\Controllers\Auth\AuthenticatedSessionController::
 * destroy() (route POST /logout, behind the `auth` middleware).
 *
 * Method: equivalence partitioning (EP) over the caller/effect domains, then
 * boundary value analysis (BVA) of the logout effects - each boundary carries
 * both the valid-side and the invalid-side observation.
 *
 * Logout has a thin input surface, so the analysis focuses on its observable
 * effects: the session must be destroyed (not merely marked logged out), and
 * a remembered login must be revoked on both the client and the server.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                              | Invalid classes                                  |
 * |-------------------|--------------------------------------------|--------------------------------------------------|
 * | caller state      | authenticated                              | guest (nothing to destroy)                       |
 * | role              | student, admin (logout is role-blind)      | (none)                                           |
 * | session effect    | old session invalidated, cookie re-issued  | old session surviving logout                     |
 * | remember effect   | cookie expired + stored token rotated      | stale cookie still able to authenticate          |
 * | post-logout access| (none)                                     | protected page closed again                      |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                             | Expected outcome                                |
 * |-----------|---------------------------------------------|-----------------------------------|-------------------------------------------------|
 * | FT-F05-01 | caller - authenticated (valid side)         | POST /logout while logged in      | guest, redirect /                               |
 * | FT-F05-02 | caller - role independence                  | admin logs out                    | same outcome as FT-F05-01                       |
 * | FT-F05-03 | caller - guest (invalid side)               | POST /logout while logged out     | redirect to login                               |
 * | FT-F05-04 | session effect - invalidation               | old session cookie replayed       | a different session cookie is issued            |
 * | FT-F05-05 | remember effect - client side               | remember login, then logout       | response expires the remember_* cookie          |
 * | FT-F05-06 | remember effect - server side               | remember login, then logout       | stored remember token rotated                   |
 * | FT-F05-07 | post-logout access                          | GET /dashboard after logout       | redirect to login                               |
 *
 * == Relation to the existing suites =========================================
 *
 * AuthenticationTest already proves one happy-path logout (guest + redirect
 * /), and F-04-10 proves the dashboard closes after logout. F-05 deliberately
 * repeats both so the full effect set is self-contained; the new content is
 * the guest caller, role independence, the session re-issue, and the
 * remembered-login revocation pair.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - Logout ends the session and redirects to the landing page / for every
 *   authenticated role; the role makes no difference to the outcome.
 * - The session is genuinely invalidated: replaying the pre-logout session
 *   cookie produces a different session cookie on the logout response, so the
 *   old session cannot be resumed.
 * - A remembered login is revoked on both sides: the logout response expires
 *   the remember_* cookie, and the stored remember token is rotated, so the
 *   old cookie can never authenticate again.
 * - A guest calling POST /logout is sent to the login screen; there is no
 *   session to destroy.
 * - After logout, protected pages send the client back to login.
 */

use App\Models\User;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Cookie;

test('FT-F05-01 - an authenticated user logs out and lands on the landing page', function () {
    // Boundary: caller state, valid side (baseline).
    $user = f05User();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});

test('FT-F05-02 - an admin logs out with the same outcome', function () {
    // Partition: role. Logout is role-blind - the admin gets exactly the
    // student outcome.
    $admin = f05User(['email' => 'admin@itera.ac.id', 'role' => 'admin']);

    $response = $this->actingAs($admin)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});

test('FT-F05-03 - a guest calling logout is sent to the login screen', function () {
    // Boundary: caller state, invalid side. There is no session to destroy.
    $response = $this->post('/logout');

    $response->assertRedirect(route('login'));
    $this->assertGuest();
});

test('FT-F05-04 - the old session is invalidated, not merely logged out', function () {
    // The default test session driver keeps sessions in memory and issues no
    // cookie; this case needs the browser-visible cookie, so it runs on the
    // application's default database driver.
    config(['session.driver' => 'database']);

    // Boundary: session effect. The pre-logout session cookie is replayed so
    // the request looks like the same browser; the logout response must issue
    // a different session cookie, proving the old session was destroyed.
    $user = f05User();

    $login = $this->post('/login', [
        'email' => $user->email,
        'password' => 'Password123',
    ]);
    $sessionBefore = f05Cookie($login, 'session');
    expect($sessionBefore)->not->toBeNull();

    $logout = $this->withUnencryptedCookie($sessionBefore->getName(), $sessionBefore->getValue())
        ->post('/logout');

    $this->assertGuest();

    $sessionAfter = f05Cookie($logout, 'session');
    expect($sessionAfter)->not->toBeNull();
    expect($sessionAfter->getValue())->not->toBe($sessionBefore->getValue());
});

test('FT-F05-05 - logging out expires the remember cookie', function () {
    // Boundary: remember effect, client side. The recaller cookie is replayed
    // so the browser-like request actually carries it; the response must
    // expire it.
    $user = f05User();

    $login = $this->post('/login', [
        'email' => $user->email,
        'password' => 'Password123',
        'remember' => true,
    ]);
    $rememberCookie = f05Cookie($login, 'remember_');
    expect($rememberCookie)->not->toBeNull();

    $logout = $this->withUnencryptedCookie($rememberCookie->getName(), $rememberCookie->getValue())
        ->post('/logout');

    $this->assertGuest();

    $expiredCookie = f05Cookie($logout, 'remember_');
    expect($expiredCookie)->not->toBeNull();
    expect($expiredCookie->getExpiresTime())->toBeLessThan(now()->getTimestamp());
});

test('FT-F05-06 - logging out rotates the stored remember token', function () {
    // Boundary: remember effect, server side. The credential issued at login
    // must be replaced, so the old cookie cannot authenticate again.
    $user = f05User(['remember_token' => null]);

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'Password123',
        'remember' => true,
    ]);

    $tokenAtLogin = $user->fresh()->remember_token;
    expect($tokenAtLogin)->not->toBeNull();

    $this->post('/logout');

    expect($user->fresh()->remember_token)->not->toBe($tokenAtLogin);
    $this->assertGuest();
});

test('FT-F05-07 - protected pages are closed again after logout', function () {
    // Partition: post-logout access. The same client is treated as a guest.
    $user = f05User();

    $this->actingAs($user)->post('/logout');
    $this->assertGuest();

    $this->get('/dashboard')->assertRedirect(route('login'));
});

/**
 * A registered, verified account the logout cases sign in with.
 *
 * @param  array<string, mixed>  $attributes
 */
function f05User(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'email' => 'alvin@itera.ac.id',
        'password' => 'Password123',
    ], $attributes));
}

/**
 * Find the first response cookie whose name contains the given fragment.
 */
function f05Cookie(TestResponse $response, string $fragment): ?Cookie
{
    return collect($response->headers->getCookies())
        ->first(fn (Cookie $cookie) => str_contains($cookie->getName(), $fragment));
}
