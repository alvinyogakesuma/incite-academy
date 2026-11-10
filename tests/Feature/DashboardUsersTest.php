<?php

use App\Models\User;

test('dashboard users page is displayed for admin users', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
        'email_verified_at' => now(),
    ]);

    $response = $this->actingAs($admin)->get('/dashboard/users');

    $response->assertStatus(200);
});

test('students are forbidden from the dashboard users page', function () {
    $student = User::factory()->create();

    $response = $this->actingAs($student)->get('/dashboard/users');

    $response->assertForbidden();
});

test('guests are redirected to the login page', function () {
    $response = $this->get('/dashboard/users');

    $response->assertRedirect(route('login'));
});
