<?php

/**
 * F-04 - Sistem login admin ke halaman dashboard
 *
 * Feature tests for the admin's path from the login screen to the dashboard:
 * POST /login (App\Http\Controllers\Auth\AuthenticatedSessionController) and
 * GET /dashboard (behind the auth -> verified -> admin middleware chain, then
 * redirected to /dashboard/users).
 *
 * Method: equivalence partitioning (EP) per input domain, then boundary value
 * analysis (BVA) over the gate matrix - each boundary carries both a
 * valid-side and an invalid-side input.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain             | Valid classes                          | Invalid classes                          |
 * |--------------------|----------------------------------------|------------------------------------------|
 * | role               | admin (administrator)                  | student (non-administrator)              |
 * | verification state | verified                               | unverified                               |
 * | authentication     | authenticated                          | guest                                    |
 * | login destination  | admin -> /dashboard                    | student -> /home (not the dashboard)     |
 * | session state      | active                                 | ended by logout                          |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                          | Expected outcome                            |
 * |-----------|---------------------------------------------|--------------------------------|---------------------------------------------|
 * | FT-F04-01 | role - admin login destination (valid)      | admin + correct credentials    | authenticated, redirect /dashboard          |
 * | FT-F04-02 | end-to-end admin journey                    | login followed to the page     | users management page renders               |
 * | FT-F04-03 | role - student login destination (invalid)  | student + correct credentials  | authenticated, redirect /home               |
 * | FT-F04-04 | authentication - guest (invalid side)       | GET /dashboard logged out      | redirect to login                           |
 * | FT-F04-05 | gate matrix - verified admin                | GET /dashboard                 | redirect /dashboard/users                   |
 * | FT-F04-06 | gate matrix - verified student              | GET /dashboard                 | 403                                         |
 * | FT-F04-07 | gate matrix - unverified admin              | login + GET /dashboard         | redirect to the verification notice         |
 * | FT-F04-08 | gate matrix - unverified student            | GET /dashboard                 | verification notice, not 403                |
 * | FT-F04-09 | intended URL - admin                        | guest asks /dashboard, logs in | redirect /dashboard                         |
 * | FT-F04-10 | session ended                               | admin logs out, asks dashboard | redirect to login                           |
 *
 * == Relation to the existing suites =========================================
 *
 * AuthenticationTest already proves the admin login destination (/dashboard)
 * and the student destination (/home). DashboardTest already proves the
 * verified-admin redirect (/dashboard/users), the verified-student 403, and
 * the guest login redirect. UsersManagementTest already proves the users page
 * renders for admins. F-04 deliberately repeats those single cells so the
 * auth x verified x role matrix is self-contained and traceable; the new
 * content is the unverified column (gate ordering), the end-to-end journey,
 * the intended-URL return, and the post-logout check.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response), not by reading source code.
 * Notes:
 *
 * - The dashboard gates run in the order auth -> verified -> admin, and the
 *   order is observable: an unverified student is sent to the verification
 *   notice instead of receiving the 403 that a verified student gets.
 * - The login destination is role-based: an admin is sent to /dashboard and
 *   a student to /home. An unverified admin's login itself succeeds and
 *   points at /dashboard, but the following dashboard request is intercepted
 *   by the verification gate.
 * - /dashboard is a landing redirect; the rendered dashboard page is
 *   /dashboard/users.
 * - A guest's requested /dashboard is remembered, so the admin returns to it
 *   after logging in.
 * - Logging out closes the dashboard again: the same client is sent back to
 *   the login screen.
 */

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('FT-F04-01 - an admin with correct credentials is sent to the dashboard', function () {
    // Boundary: role, valid side for dashboard access.
    $admin = f04Admin();

    $response = $this->post('/login', [
        'email' => $admin->email,
        'password' => 'Password123',
    ]);

    $this->assertAuthenticatedAs($admin);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('FT-F04-02 - the admin journey ends on the rendered users management page', function () {
    // End-to-end: login, follow the /dashboard landing redirect, and observe
    // the actual dashboard page.
    $admin = f04Admin();

    $response = $this->followingRedirects()->post('/login', [
        'email' => $admin->email,
        'password' => 'Password123',
    ]);

    $this->assertAuthenticatedAs($admin);
    $response->assertOk();
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->has('users')
        ->has('majorDepartements'));
});

test('FT-F04-03 - a student is sent home, not to the dashboard', function () {
    // Boundary: role, invalid side for dashboard access. The login itself
    // succeeds; only the destination differs.
    $student = f04User();

    $response = $this->post('/login', [
        'email' => $student->email,
        'password' => 'Password123',
    ]);

    $this->assertAuthenticatedAs($student);
    $response->assertRedirect(route('home', absolute: false));
});

test('FT-F04-04 - a guest is sent to the login screen from the dashboard', function () {
    // Partition: authentication state, invalid side.
    $this->get('/dashboard')->assertRedirect(route('login'));
});

test('FT-F04-05 - a verified admin reaches the dashboard landing redirect', function () {
    // Gate matrix cell: verified admin (valid side). /dashboard itself is a
    // landing redirect to the rendered page.
    $admin = f04Admin();

    $this->actingAs($admin)
        ->get('/dashboard')
        ->assertRedirect('/dashboard/users');
});

test('FT-F04-06 - a verified student is forbidden from the dashboard', function () {
    // Gate matrix cell: verified student (invalid side).
    $student = f04User();

    $this->actingAs($student)
        ->get('/dashboard')
        ->assertForbidden();
});

test('FT-F04-07 - an unverified admin is sent to the verification notice', function () {
    // Gate matrix cell: unverified admin. The login succeeds and points at
    // the dashboard, but the verification gate answers the dashboard request.
    $admin = User::factory()->unverified()->create([
        'email' => 'admin@itera.ac.id',
        'password' => 'Password123',
        'role' => 'admin',
    ]);

    $login = $this->post('/login', [
        'email' => $admin->email,
        'password' => 'Password123',
    ]);

    $this->assertAuthenticatedAs($admin);
    $login->assertRedirect(route('dashboard', absolute: false));

    $this->get('/dashboard')->assertRedirect(route('verification.notice'));
});

test('FT-F04-08 - an unverified student gets the verification notice, not a 403', function () {
    // Gate matrix cell: unverified student. Proves the verification gate runs
    // before the role gate - the student never reaches the 403.
    $student = User::factory()->unverified()->create([
        'role' => 'student',
    ]);

    $this->actingAs($student)
        ->get('/dashboard')
        ->assertRedirect(route('verification.notice'));
});

test('FT-F04-09 - a guest asking for the dashboard returns there after logging in', function () {
    // Partition: intended URL, present. The literal feature story: an admin
    // goes to /dashboard, is asked to log in, and lands back on /dashboard.
    $admin = f04Admin();

    $this->get('/dashboard')->assertRedirect(route('login'));

    $response = $this->post('/login', [
        'email' => $admin->email,
        'password' => 'Password123',
    ]);

    $this->assertAuthenticatedAs($admin);
    $response->assertRedirect('/dashboard');
});

test('FT-F04-10 - the dashboard is closed again after logout', function () {
    // Partition: session state, ended. Logout invalidates the session, so the
    // same client is treated as a guest again.
    $admin = f04Admin();

    $this->actingAs($admin)->post('/logout');
    $this->assertGuest();

    $this->get('/dashboard')->assertRedirect(route('login'));
});

/**
 * A verified registered account; students are the default role.
 *
 * @param  array<string, mixed>  $attributes
 */
function f04User(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'email' => 'alvin@itera.ac.id',
        'password' => 'Password123',
        'role' => 'student',
    ], $attributes));
}

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f04Admin(array $attributes = []): User
{
    return f04User(array_merge(['role' => 'admin'], $attributes));
}
