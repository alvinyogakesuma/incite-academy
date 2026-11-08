<?php

use App\Models\User;
use Database\Seeders\MajorDepartementSeeder;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;

test('registration screen can be rendered', function () {
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->get('/register');

    $response->assertStatus(200);

    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->has('majorDepartements', 47));
});

test('new users can register', function () {
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', [
        'name' => 'Alvin Yoga Kesuma',
        'email' => 'alvin.121140154@student.itera.ac.id',
        'nim_nip' => '121140154',
        'major_departement' => 'Teknik Informatika',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));

    $user = User::where('email', 'alvin.121140154@student.itera.ac.id')->first();

    expect($user->nim_nip)->toBe('121140154');
    expect($user->major_departement_id)->not->toBeNull();
    expect($user->role)->toBe('student');
});

test('registration sends an email verification notification', function () {
    Notification::fake();
    $this->seed(MajorDepartementSeeder::class);

    $this->post('/register', [
        'name' => 'Alvin Yoga Kesuma',
        'email' => 'alvin.121140154@student.itera.ac.id',
        'nim_nip' => '121140154',
        'major_departement' => 'Teknik Informatika',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $user = User::where('email', 'alvin.121140154@student.itera.ac.id')->first();

    expect($user->hasVerifiedEmail())->toBeFalse();
    Notification::assertSentTo($user, VerifyEmail::class);
});

test('registration requires an itera domain email', function () {
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@gmail.com',
        'nim_nip' => '121140154',
        'major_departement' => 'Teknik Informatika',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $response->assertInvalid(['email']);
    expect(User::count())->toBe(0);
});

test('registration rejects nim that is too short or too long', function (string $nimNip) {
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@student.itera.ac.id',
        'nim_nip' => $nimNip,
        'major_departement' => 'Teknik Informatika',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $response->assertInvalid(['nim_nip']);
})->with([
    '8 digits' => ['12345678'],
    '19 digits' => ['1234567890123456789'],
]);

test('registration rejects a non numeric nim', function () {
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@student.itera.ac.id',
        'nim_nip' => '12a456789',
        'major_departement' => 'Teknik Informatika',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $response->assertInvalid(['nim_nip']);
});

test('registration rejects an unknown major departement', function () {
    $this->seed(MajorDepartementSeeder::class);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@student.itera.ac.id',
        'nim_nip' => '121140154',
        'major_departement' => 'Teknik Kriptografi',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $response->assertInvalid(['major_departement']);
});

test('registration rejects a duplicate nim', function () {
    $this->seed(MajorDepartementSeeder::class);
    User::factory()->create(['nim_nip' => '121140154']);

    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@student.itera.ac.id',
        'nim_nip' => '121140154',
        'major_departement' => 'Teknik Informatika',
        'password' => 'Password123',
        'password_confirmation' => 'Password123',
    ]);

    $response->assertInvalid(['nim_nip']);
});
