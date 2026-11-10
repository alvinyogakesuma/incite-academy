<?php

use App\Models\MajorDepartement;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ]);

    $this->majorDepartement = MajorDepartement::factory()->create([
        'name' => 'Teknik Informatika',
        'major_departement_domain' => 'if.itera.ac.id',
        'major_departement_code' => 14,
    ]);
});

/**
 * Valid update payload for the given user (validation runs before the
 * policy, so even 403 tests need a passing payload).
 */
function validUpdatePayload(User $user, array $overrides = []): array
{
    return [
        'name' => $user->name,
        'email' => $user->email,
        'role' => $user->role,
        'nim_nip' => $user->nim_nip ?? '555000111',
        'major_department' => 'Teknik Informatika',
        'total_points' => $user->total_points ?? 0,
        ...$overrides,
    ];
}

test('admin can view the users management page', function () {
    $this->actingAs($this->admin)
        ->get(route('dashboard.users'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('users')
            ->has('programStudi')
            ->has('upaUpt'));
});

test('students are forbidden from the users management page', function () {
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.users'))
        ->assertForbidden();
});

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard.users'))
        ->assertRedirect(route('login'));
});

test('admin can create a user', function () {
    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), [
            'name' => 'New User',
            'email' => 'new.user@student.itera.ac.id',
            'role' => 'student',
            'nim_nip' => '123456789',
            'major_department' => $this->majorDepartement->name,
            'total_points' => 100,
        ])
        ->assertRedirect(route('dashboard.users'));

    $user = User::query()->where('email', 'new.user@student.itera.ac.id')->first();

    expect($user)->not->toBeNull()
        ->and($user->major_departement_id)->toBe($this->majorDepartement->id)
        ->and($user->total_points)->toBe(100)
        ->and($user->password)->not->toBeNull();
});

test('store rejects invalid data', function (array $payload) {
    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), $payload)
        ->assertInvalid(array_keys($payload));
})->with([
    'missing name' => [['name' => '']],
    'invalid email' => [['email' => 'not-an-itera-email@gmail.com']],
    'invalid role' => [['role' => 'superadmin']],
    'non-numeric nim' => [['nim_nip' => 'abcdefghi']],
    'unknown department' => [['major_department' => 'Nonexistent Department']],
    'negative points' => [['total_points' => -5]],
]);

test('store rejects duplicate email', function () {
    $existing = User::factory()->create([
        'email' => 'taken@student.itera.ac.id',
    ]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.users.store'), [
            'name' => 'Duplicate',
            'email' => 'taken@student.itera.ac.id',
            'role' => 'student',
            'nim_nip' => '987654321',
            'major_department' => $this->majorDepartement->name,
            'total_points' => 0,
        ])
        ->assertInvalid('email');
});

test('admin can update a user', function () {
    $target = User::factory()->create([
        'role' => 'student',
        'email' => 'target.555000111@student.itera.ac.id',
        'nim_nip' => '555000111',
        'total_points' => 0,
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $target), validUpdatePayload($target, [
            'total_points' => 500,
        ]))
        ->assertRedirect(route('dashboard.users'));

    expect($target->fresh()->total_points)->toBe(500)
        ->and($target->fresh()->major_departement_id)->toBe($this->majorDepartement->id);
});

test('updating a users role clears their sessions', function () {
    $target = User::factory()->create([
        'role' => 'admin',
        'email' => 'target.555000112@student.itera.ac.id',
        'nim_nip' => '555000112',
        'total_points' => 0,
    ]);

    // Simulate an active session for the target
    DB::table('sessions')->insert([
        'id' => 'test-session-id',
        'user_id' => $target->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'test',
        'payload' => 'test',
        'last_activity' => time(),
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $target), validUpdatePayload($target, [
            'role' => 'student',
        ]));

    expect(DB::table('sessions')->where('user_id', $target->id)->count())->toBe(0);
});

test('admin cannot update themselves', function () {
    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $this->admin), validUpdatePayload($this->admin))
        ->assertForbidden();
});

test('the last admin cannot be demoted', function () {
    $otherAdmin = User::factory()->create([
        'role' => 'admin',
        'nim_nip' => '555000113',
        'total_points' => 0,
    ]);

    // Deleting the other admin leaves only $this->admin
    $otherAdmin->delete();

    $this->actingAs($this->admin)
        ->put(route('dashboard.users.update', $this->admin), validUpdatePayload($this->admin, [
            'role' => 'student',
        ]))
        ->assertForbidden();
});

test('admin can delete a user', function () {
    $target = User::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.users.destroy', $target))
        ->assertRedirect(route('dashboard.users'));

    expect($target->fresh())->toBeNull();
});

test('admin cannot delete themselves', function () {
    $this->actingAs($this->admin)
        ->delete(route('dashboard.users.destroy', $this->admin))
        ->assertForbidden();

    expect($this->admin->fresh())->not->toBeNull();
});

test('students cannot delete users', function () {
    $student = User::factory()->create(['role' => 'student']);
    $target = User::factory()->create();

    $this->actingAs($student)
        ->delete(route('dashboard.users.destroy', $target))
        ->assertForbidden();
});
