<?php

use App\Models\Avatar;
use App\Models\Challenge;
use App\Models\Course;
use App\Models\LearningPath;
use App\Models\User;
use App\Models\UserAvatar;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ]);
});

test('admin can view the avatars management page', function () {
    $this->actingAs($this->admin)
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert->has('avatars'));
});

test('the avatar listing maps fields for the admin card', function () {
    Storage::fake('public');

    $avatar = Avatar::factory()->pointsBased(1000)->create([
        'title' => 'Warrior',
        'description' => 'Earn 1,000 points to unlock the warrior avatar.',
        'icon_url' => 'avatars/warrior.png',
        'recipients_count' => 7,
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.avatars'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('avatars', 1, fn ($page) => $page
                ->where('id', $avatar->id)
                ->where('title', 'Warrior')
                ->where('description', 'Earn 1,000 points to unlock the warrior avatar.')
                ->where('icon_url', Storage::disk('public')->url('avatars/warrior.png'))
                ->where('conditions_count', 1)
                ->where('condition_type', 'points')
                ->where('recipients_count', 7)));
});

test('guests are redirected from the avatars management page', function () {
    $this->get(route('dashboard.avatars'))
        ->assertRedirect(route('login'));
});

test('students are forbidden from the avatars management page', function () {
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.avatars'))
        ->assertForbidden();
});

test('admin can delete an avatar with its awards and stored icon', function () {
    Storage::fake('public');
    Storage::disk('public')->put('avatars/warrior.png', 'icon');

    $avatar = Avatar::factory()->create([
        'icon_url' => 'avatars/warrior.png',
    ]);
    $user = User::factory()->create();
    DB::table('user_avatars')->insert([
        'user_id' => $user->id,
        'avatar_id' => $avatar->id,
        'is_equipped' => false,
        'awarded_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.avatars.destroy', $avatar))
        ->assertRedirect(route('dashboard.avatars'));

    expect(Avatar::count())->toBe(0)
        ->and(DB::table('user_avatars')->count())->toBe(0);

    Storage::disk('public')->assertMissing('avatars/warrior.png');
});

test('students are forbidden from deleting an avatar', function () {
    $student = User::factory()->create(['role' => 'student']);
    $avatar = Avatar::factory()->create(['title' => 'Safe Avatar']);

    $this->actingAs($student)
        ->delete(route('dashboard.avatars.destroy', $avatar))
        ->assertForbidden();

    expect(Avatar::count())->toBe(1);
});

test('awarding an avatar counts its recipient', function () {
    $avatar = Avatar::factory()->create(['recipients_count' => 0]);
    $user = User::factory()->create();

    UserAvatar::create([
        'user_id' => $user->id,
        'avatar_id' => $avatar->id,
        'awarded_at' => now(),
    ]);

    expect($avatar->fresh()->recipients_count)->toBe(1);

    UserAvatar::query()->first()->delete();

    expect($avatar->fresh()->recipients_count)->toBe(0);
});

test('admin can create a new blank avatar and is redirected to its editor', function () {
    $this->actingAs($this->admin)
        ->post(route('dashboard.avatars.store'))
        ->assertRedirect(route('dashboard.avatars.edit', Avatar::query()->latest('id')->first()));

    $avatar = Avatar::query()->latest('id')->first();

    expect($avatar)
        ->title->toBe('Untitled Avatar')
        ->description->toBe('')
        ->icon_url->toBeNull()
        ->recipients_count->toBe(0)
        ->requirements->toBe(['logic' => 'AND', 'conditions' => []]);
});

test('admin can open the avatar editor with its requirements', function () {
    $avatar = Avatar::factory()->pointsBased(1000)->create([
        'title' => 'Warrior',
    ]);
    Course::factory()->count(2)->create();
    LearningPath::factory()->create();
    Challenge::factory()->create();

    $this->actingAs($this->admin)
        ->get(route('dashboard.avatars.edit', $avatar))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('avatar', fn ($page) => $page
                ->where('id', $avatar->id)
                ->where('title', 'Warrior')
                ->where('description', $avatar->description)
                ->where('icon_url', null)
                ->where('logic', 'AND')
                ->has('conditions', 1, fn ($scope) => $scope
                    ->where('type', 'points')
                    ->where('operator', '>=')
                    ->where('value', '1000')))
            ->has('availableCourses', 2)
            ->has('availablePaths', 1)
            ->has('availableChallenges', 1));
});

test('admin can update the avatar metadata with a fresh icon', function () {
    Storage::fake('public');
    Storage::disk('public')->put('avatars/old.png', 'old icon');

    $avatar = Avatar::factory()->create([
        'title' => 'Old Title',
        'icon_url' => 'avatars/old.png',
    ]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.avatars.update', $avatar), [
            '_method' => 'put',
            'title' => 'Renamed Avatar',
            'description' => 'A refurbished avatar.',
            'icon' => UploadedFile::fake()->image('new.png'),
            'logic' => 'OR',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '500'],
            ],
        ])
        ->assertRedirect(route('dashboard.avatars'));

    $avatar->refresh();

    expect($avatar)
        ->title->toBe('Renamed Avatar')
        ->description->toBe('A refurbished avatar.')
        ->icon_url->toStartWith('avatars/')->not->toBe('avatars/old.png')
        ->requirements->toBe([
            'logic' => 'OR',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '500'],
            ],
        ]);

    Storage::disk('public')->assertMissing('avatars/old.png');
    Storage::disk('public')->assertExists($avatar->icon_url);
});

test('remove_icon clears the stored avatar icon', function () {
    Storage::fake('public');
    Storage::disk('public')->put('avatars/old.png', 'old icon');

    $avatar = Avatar::factory()->create(['icon_url' => 'avatars/old.png']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.avatars.update', $avatar), [
            '_method' => 'put',
            'title' => 'Avatar',
            'description' => 'An avatar.',
            'remove_icon' => '1',
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
            ],
        ])
        ->assertRedirect(route('dashboard.avatars'));

    expect($avatar->fresh()->icon_url)->toBeNull();
    Storage::disk('public')->assertMissing('avatars/old.png');
});

test('an avatar requires at least one earning condition', function () {
    $avatar = Avatar::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('dashboard.avatars.update', $avatar), [
            '_method' => 'put',
            'title' => 'Avatar',
            'description' => 'An avatar.',
            'logic' => 'AND',
            'conditions' => [],
        ])
        ->assertSessionHasErrors(['conditions']);

    expect($avatar->fresh()->title)->toBe($avatar->title);
});

test('students are forbidden from the avatar editor endpoints', function () {
    $student = User::factory()->create(['role' => 'student']);
    $avatar = Avatar::factory()->create();

    $this->actingAs($student)
        ->post(route('dashboard.avatars.store'))
        ->assertForbidden();

    $this->actingAs($student)
        ->get(route('dashboard.avatars.edit', $avatar))
        ->assertForbidden();

    $this->actingAs($student)
        ->post(route('dashboard.avatars.update', $avatar), [
            '_method' => 'put',
            'title' => 'Avatar',
            'description' => 'An avatar.',
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
            ],
        ])
        ->assertForbidden();

    expect(Avatar::count())->toBe(1);
});

test('guests are redirected from the avatar editor', function () {
    $avatar = Avatar::factory()->create();

    $this->get(route('dashboard.avatars.edit', $avatar))
        ->assertRedirect(route('login'));
});
