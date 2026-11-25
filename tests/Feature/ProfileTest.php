<?php

use App\Models\Avatar;
use App\Models\Badge;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\MajorDepartement;
use App\Models\Module;
use App\Models\User;
use App\Models\UserAvatar;
use App\Models\UserBadge;
use Illuminate\Support\Facades\Storage;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/profile');

    $response->assertOk();
});

test('guests are redirected from the profile page', function () {
    $this->get('/profile')
        ->assertRedirect(route('login'));
});

test('the profile page carries the progress and badge showcase', function () {
    $user = User::factory()->create();

    $badge = Badge::factory()->pointsBased()->create([
        'title' => 'Rising Star',
        'description' => 'Awarded for earning 1,000 points.',
    ]);
    UserBadge::create([
        'user_id' => $user->id,
        'badge_id' => $badge->id,
        'is_equipped' => true,
        'awarded_at' => now(),
    ]);

    // An enrolled course, half completed.
    $course = Course::factory()->create(['lessons_count' => 0]);
    $module = Module::factory()->for($course)->create();
    $first = Lesson::factory()->for($course)->for($module)->article()->create();
    Lesson::factory()->for($course)->for($module)->article()->create();
    Enrollment::factory()->for($user)->for($course)->create();
    LessonCompletion::factory()->for($user)->for($course)->for($first)->create();

    // An enrolled learning path holding the same course.
    $path = LearningPath::factory()->create(['title' => 'Complete Preparation']);
    $path->courses()->attach([$course->id => ['order_index' => 0]]);
    LearningPathEnrollment::factory()->for($user)->for($path)->create();

    $this->actingAs($user)
        ->get('/profile')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('majorDepartements')
            ->has('badges', 1, fn ($scope) => $scope
                ->where('id', $badge->id)
                ->where('title', 'Rising Star')
                ->where('description', 'Awarded for earning 1,000 points.')
                ->where('icon_url', null)
                ->where('isAwarded', true)
                ->where('isEquipped', true))
            ->has('courses', 1, fn ($scope) => $scope
                ->where('id', $course->id)
                ->where('slug', $course->slug)
                ->where('title', $course->title)
                ->where('description', $course->short_description)
                ->where('category', $course->category->value)
                ->where('completed', 1)
                ->where('total', 2)
                ->where('progress', 50))
            ->has('paths', 1, fn ($scope) => $scope
                ->where('id', $path->id)
                ->where('title', 'Complete Preparation')
                ->where('description', $path->description)
                ->where('level', 'All Levels')
                ->where('progress', 50)));
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $user->refresh();

    $this->assertSame('Test User', $user->name);
    $this->assertSame('test@example.com', $user->email);
    $this->assertNull($user->email_verified_at);
});

test('profile information can be updated with student details', function () {
    $user = User::factory()->create();
    $major = MajorDepartement::query()->create([
        'name' => 'Teknik Informatika',
        'major_departement_domain' => 'ti',
        'major_departement_code' => '135',
    ]);

    $this->actingAs($user)
        ->patch('/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'nim_nip' => '121140089',
            'major_departement_id' => $major->id,
            'biography' => 'Preparing for the ITERA English proficiency test.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $user->refresh();

    expect($user)
        ->nim_nip->toBe('121140089')
        ->biography->toBe('Preparing for the ITERA English proficiency test.')
        ->major_departement_id->toBe($major->id);
});

test('profile update rejects an unknown program studi', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch('/profile', [
            'name' => 'Test User',
            'email' => $user->email,
            'major_departement_id' => 999999,
        ])
        ->assertSessionHasErrors(['major_departement_id']);

    expect($user->fresh()->major_departement_id)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/profile', [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/profile');

    $this->assertNotNull($user->refresh()->email_verified_at);
});

test('a student can toggle an earned badge in their showcase', function () {
    $user = User::factory()->create();
    $badge = Badge::factory()->create();

    UserBadge::create([
        'user_id' => $user->id,
        'badge_id' => $badge->id,
        'awarded_at' => now(),
    ]);

    $this->actingAs($user)
        ->from('/profile')
        ->post(route('profile.badges.toggle', $badge))
        ->assertRedirect('/profile');

    expect(UserBadge::first()->is_equipped)->toBeTrue();

    $this->actingAs($user)
        ->from('/profile')
        ->post(route('profile.badges.toggle', $badge))
        ->assertRedirect('/profile');

    expect(UserBadge::first()->is_equipped)->toBeFalse();
});

test('the showcase holds at most three badges', function () {
    $user = User::factory()->create();

    $equipped = Badge::factory()->count(3)->create();
    $fourth = Badge::factory()->create();

    $equipped->each(function (Badge $badge) use ($user) {
        UserBadge::create([
            'user_id' => $user->id,
            'badge_id' => $badge->id,
            'is_equipped' => true,
            'awarded_at' => now(),
        ]);
    });

    UserBadge::create([
        'user_id' => $user->id,
        'badge_id' => $fourth->id,
        'awarded_at' => now(),
    ]);

    $this->actingAs($user)
        ->from('/profile')
        ->post(route('profile.badges.toggle', $fourth))
        ->assertSessionHasErrors(['badge']);

    expect(
        UserBadge::query()->where('user_id', $user->id)->where('is_equipped', true)->count()
    )->toBe(3);
});

test('unearned badges cannot join the showcase', function () {
    $user = User::factory()->create();
    $badge = Badge::factory()->create();

    $this->actingAs($user)
        ->from('/profile')
        ->post(route('profile.badges.toggle', $badge))
        ->assertSessionHasErrors(['badge']);

    expect(UserBadge::count())->toBe(0);
});

test('the profile page carries the avatar grid and equipped pick', function () {
    Storage::fake('public');

    $user = User::factory()->create();

    $scholar = Avatar::factory()->create([
        'title' => 'Scholar',
        'icon_url' => null,
    ]);
    $warrior = Avatar::factory()->create([
        'title' => 'Warrior',
        'icon_url' => 'avatars/warrior.png',
    ]);

    UserAvatar::create([
        'user_id' => $user->id,
        'avatar_id' => $warrior->id,
        'is_equipped' => true,
        'awarded_at' => now(),
    ]);

    $this->actingAs($user)
        ->get('/profile')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('avatars', 2, fn ($scope) => $scope
                ->where('id', $scholar->id)
                ->where('title', 'Scholar')
                ->where('description', $scholar->description)
                ->where('icon_url', null)
                ->where('isAwarded', false)
                ->where('isEquipped', false))
            ->where('avatars.1.id', $warrior->id)
            ->where('avatars.1.isAwarded', true)
            ->where('avatars.1.isEquipped', true)
            ->where(
                'avatars.1.icon_url',
                Storage::disk('public')->url('avatars/warrior.png'),
            )
            ->where(
                'equippedAvatar',
                Storage::disk('public')->url('avatars/warrior.png'),
            ));
});

test('equipping an avatar clears the previous pick', function () {
    $user = User::factory()->create();
    $warrior = Avatar::factory()->create();
    $scholar = Avatar::factory()->create();

    UserAvatar::create([
        'user_id' => $user->id,
        'avatar_id' => $warrior->id,
        'is_equipped' => true,
        'awarded_at' => now(),
    ]);
    UserAvatar::create([
        'user_id' => $user->id,
        'avatar_id' => $scholar->id,
        'is_equipped' => false,
        'awarded_at' => now(),
    ]);

    $this->actingAs($user)
        ->from('/profile')
        ->post(route('profile.avatars.equip', $scholar))
        ->assertRedirect('/profile');

    expect(UserAvatar::query()->where('avatar_id', $warrior->id)->first()->is_equipped)->toBeFalse()
        ->and(UserAvatar::query()->where('avatar_id', $scholar->id)->first()->is_equipped)->toBeTrue();
});

test('unearned avatars cannot take the profile slot', function () {
    $user = User::factory()->create();
    $avatar = Avatar::factory()->create();

    $this->actingAs($user)
        ->from('/profile')
        ->post(route('profile.avatars.equip', $avatar))
        ->assertSessionHasErrors(['avatar']);

    expect(UserAvatar::count())->toBe(0);
});

test('guests are redirected from the avatar equip action', function () {
    $avatar = Avatar::factory()->create();

    $this->post(route('profile.avatars.equip', $avatar))
        ->assertRedirect(route('login'));

    expect(UserAvatar::count())->toBe(0);
});

test('the equipped avatar is shared with every page request', function () {
    Storage::fake('public');

    $user = User::factory()->create();

    $avatar = Avatar::factory()->create([
        'title' => 'Knight',
        'icon_url' => 'avatars/knight.png',
    ]);

    UserAvatar::create([
        'user_id' => $user->id,
        'avatar_id' => $avatar->id,
        'is_equipped' => true,
        'awarded_at' => now(),
    ]);

    $this->actingAs($user)
        ->get('/profile')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where(
                'auth.equippedAvatarUrl',
                Storage::disk('public')->url('avatars/knight.png'),
            ));
});

test('the equipped avatar share is null without an equipped pick', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/profile')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('auth.equippedAvatarUrl', null));
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete('/profile', [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    $this->assertNull($user->fresh());
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/profile')
        ->delete('/profile', [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/profile');

    $this->assertNotNull($user->fresh());
});
