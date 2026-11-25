<?php

/**
 * F-29 - Fungsi menghapus pengguna oleh admin
 *
 * Feature tests for the admin's delete-user flow: DELETE /dashboard/users/{user}
 * (route dashboard.users.destroy), behind the auth -> verified -> admin gate.
 * The delete action on the users page submits this endpoint and the response
 * returns the admin to the list.
 *
 * Method: equivalence partitioning (EP) over the delete request's domains,
 * then boundary value analysis (BVA) of the delete-only boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | admin                                          | student, guest                               |
 * | target role       | student, peer admin                            | -                                            |
 * | target            | another existing account                       | the acting admin, unknown id                 |
 * | persistence       | the row is hard-deleted                        | the row survives a rejected request          |
 * | side effects      | target's sessions removed; actor's untouched   | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                                | Expected outcome                                        |
 * |-----------|---------------------------------------------|--------------------------------------|---------------------------------------------------------|
 * | FT-F29-01 | success baseline; sessions                  | delete a student with sessions       | redirect to list; row gone; target sessions 0; actor 1  |
 * | FT-F29-02 | target role - peer admin (valid side)       | delete another admin                 | redirect to list; row gone                              |
 * | FT-F29-03 | target - self (invalid side)                | admin deletes own account            | 403; row survives                                       |
 * | FT-F29-04 | access - student (invalid side)             | student DELETE                       | 403; row survives                                       |
 * | FT-F29-05 | access - guest (invalid side)               | logged-out DELETE                    | redirect to login; row survives                         |
 * | FT-F29-06 | target - unknown id (invalid side)          | DELETE on a non-existent account     | 404                                                     |
 *
 * == Relation to the existing suites =========================================
 *
 * UsersManagementTest already covers the happy path (redirect and row gone),
 * the self-delete rejection, and the student rejection. F-29 deliberately
 * repeats those so the feature file is self-contained; the new content is the
 * peer-admin target, the guest DELETE, the unknown-id 404, and the session
 * side effects (the target's rows are removed while the actor's survive).
 *
 * The page the redirect returns to is F-26's subject; a deleted account is
 * simply absent from its `users` prop. The gate ordering is F-04's subject;
 * this route shares the same middleware group. F-28 already observed that an
 * unknown target id is a 404 and a guest is redirected for the update route;
 * F-29 re-observes both for the delete route rather than assuming they match.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Delete is hard: the row is gone, not flagged or hidden.
 * - The target's session rows are removed together with the account, so a
 *   deleted account cannot keep an authenticated session. The acting admin's
 *   own sessions are untouched.
 * - A peer admin is deletable. Only the acting admin's own account is
 *   protected, so there is no "last admin" guard beyond the self-delete rule:
 *   an admin may remove every other admin, and the final remaining admin is
 *   protected only by not being able to delete themselves.
 * - An unknown target id is a 404, not a validation error, and a rejected
 *   request leaves the target untouched.
 * - A guest is sent to the login screen and a student receives a 403; neither
 *   changes the database.
 */

use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->admin = f29Admin();
});

test('FT-F29-01 - an admin deletes a user and their sessions', function () {
    // Boundary: success baseline and the session side effects. The target's
    // rows disappear with the account; the actor's session survives.
    $target = User::factory()->create([
        'name' => 'Target Student',
        'email' => 'target@student.itera.ac.id',
        'role' => 'student',
    ]);
    f29Session($target);
    f29Session($this->admin);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.users.destroy', $target))
        ->assertRedirect(route('dashboard.users'));

    expect(User::query()->find($target->id))->toBeNull()
        ->and(DB::table('sessions')->where('user_id', $target->id)->count())->toBe(0)
        ->and(DB::table('sessions')->where('user_id', $this->admin->id)->count())->toBe(1);
});

test('FT-F29-02 - an admin can delete a peer admin', function () {
    // Boundary: target role, valid side. Only the acting admin's own account
    // is protected.
    $peer = User::factory()->create([
        'name' => 'Peer Admin',
        'email' => 'peer@itera.ac.id',
        'role' => 'admin',
    ]);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.users.destroy', $peer))
        ->assertRedirect(route('dashboard.users'));

    expect(User::query()->find($peer->id))->toBeNull();
});

test('FT-F29-03 - an admin cannot delete their own account', function () {
    // Boundary: target, invalid side (self).
    $this->actingAs($this->admin)
        ->delete(route('dashboard.users.destroy', $this->admin))
        ->assertForbidden();

    expect(User::query()->find($this->admin->id))->not->toBeNull();
});

test('FT-F29-04 - a student cannot delete a user', function () {
    // Boundary: access, invalid side (role).
    $student = User::factory()->create(['role' => 'student']);
    $target = User::factory()->create();

    $this->actingAs($student)
        ->delete(route('dashboard.users.destroy', $target))
        ->assertForbidden();

    expect(User::query()->find($target->id))->not->toBeNull();
});

test('FT-F29-05 - a guest cannot delete a user', function () {
    // Boundary: access, invalid side (authentication).
    $target = User::factory()->create();

    $this->delete(route('dashboard.users.destroy', $target))
        ->assertRedirect(route('login'));

    expect(User::query()->find($target->id))->not->toBeNull();
});

test('FT-F29-06 - deleting an unknown user is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->delete(route('dashboard.users.destroy', 999999))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f29Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * Record an active session row for the given account.
 */
function f29Session(User $user): void
{
    DB::table('sessions')->insert([
        'id' => 'f29-session-'.$user->id.'-'.uniqid(),
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'test',
        'payload' => 'test',
        'last_activity' => time(),
    ]);
}
