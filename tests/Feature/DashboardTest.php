<?php

use App\Models\User;

test('dashboard redirects admins to the users management', function () {
    $user = User::factory()->create([
        'role' => 'admin',
    ]);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertRedirect('/dashboard/users');
});

test('student users are forbidden from the dashboard page', function () {
    $user = User::factory()->create([
        'role' => 'student',
    ]);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(403);
});

test('guests are redirected to the login page from the dashboard', function () {
    $response = $this->get('/dashboard');

    $response->assertRedirect(route('login'));
});
