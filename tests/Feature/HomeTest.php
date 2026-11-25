<?php

use App\Models\User;

test('home redirects to the course catalog', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/home');

    $response->assertRedirect('/courses');
});

test('guests are redirected to the login page', function () {
    $response = $this->get('/home');

    $response->assertRedirect(route('login'));
});

test('unverified users are redirected to the verification page', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->get('/home');

    $response->assertRedirect(route('verification.notice'));
});
