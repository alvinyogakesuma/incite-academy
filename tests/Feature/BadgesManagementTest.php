<?php

use App\Models\Badge;
use App\Models\Challenge;
use App\Models\Course;
use App\Models\LearningPath;
use App\Models\User;
use App\Models\UserBadge;
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

test('admin can view the badges management page', function () {
    $this->actingAs($this->admin)
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert->has('badges'));
});

test('the badge listing maps fields for the admin card', function () {
    Storage::fake('public');

    $badge = Badge::factory()->pointsBased(1000)->create([
        'title' => 'Rising Star',
        'description' => 'Awarded for earning 1,000 points.',
        'icon_url' => 'badges/rising-star.png',
        'recipients_count' => 12,
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.badges'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('badges', 1, fn ($page) => $page
                ->where('id', $badge->id)
                ->where('title', 'Rising Star')
                ->where('description', 'Awarded for earning 1,000 points.')
                ->where('icon_url', Storage::disk('public')->url('badges/rising-star.png'))
                ->where('conditions_count', 1)
                ->where('condition_type', 'points')
                ->where('recipients_count', 12)));
});

test('guests are redirected from the badges management page', function () {
    $this->get(route('dashboard.badges'))
        ->assertRedirect(route('login'));
});

test('students are forbidden from the badges management page', function () {
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.badges'))
        ->assertForbidden();
});

test('admin can delete a badge with its awards and stored icon', function () {
    Storage::fake('public');
    Storage::disk('public')->put('badges/rising-star.png', 'icon');

    $badge = Badge::factory()->create([
        'icon_url' => 'badges/rising-star.png',
    ]);
    $user = User::factory()->create();
    DB::table('user_badges')->insert([
        'user_id' => $user->id,
        'badge_id' => $badge->id,
        'is_equipped' => false,
        'awarded_at' => now(),
    ]);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.badges.destroy', $badge))
        ->assertRedirect(route('dashboard.badges'));

    expect(Badge::count())->toBe(0)
        ->and(DB::table('user_badges')->count())->toBe(0);

    Storage::disk('public')->assertMissing('badges/rising-star.png');
});

test('students are forbidden from deleting a badge', function () {
    $student = User::factory()->create(['role' => 'student']);
    $badge = Badge::factory()->create(['title' => 'Safe Badge']);

    $this->actingAs($student)
        ->delete(route('dashboard.badges.destroy', $badge))
        ->assertForbidden();

    expect(Badge::count())->toBe(1);
});

test('awarding a badge counts its recipient', function () {
    $badge = Badge::factory()->create(['recipients_count' => 0]);
    $user = User::factory()->create();

    UserBadge::create([
        'user_id' => $user->id,
        'badge_id' => $badge->id,
        'awarded_at' => now(),
    ]);

    expect($badge->fresh()->recipients_count)->toBe(1);

    UserBadge::query()->first()->delete();

    expect($badge->fresh()->recipients_count)->toBe(0);
});

test('admin can create a new blank badge and is redirected to its editor', function () {
    $this->actingAs($this->admin)
        ->post(route('dashboard.badges.store'))
        ->assertRedirect(route('dashboard.badges.edit', Badge::query()->latest('id')->first()));

    $badge = Badge::query()->latest('id')->first();

    expect($badge)
        ->title->toBe('Untitled Badge')
        ->description->toBe('')
        ->icon_url->toBeNull()
        ->recipients_count->toBe(0)
        ->requirements->toBe(['logic' => 'AND', 'conditions' => []]);
});

test('admin can open the badge editor with its requirements', function () {
    $badge = Badge::factory()->pointsBased(1000)->create([
        'title' => 'Rising Star',
    ]);
    Course::factory()->count(2)->create();
    LearningPath::factory()->create();
    Challenge::factory()->create();

    $this->actingAs($this->admin)
        ->get(route('dashboard.badges.edit', $badge))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('badge', fn ($page) => $page
                ->where('id', $badge->id)
                ->where('title', 'Rising Star')
                ->where('description', $badge->description)
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

test('admin can update the badge metadata with a fresh icon', function () {
    Storage::fake('public');
    Storage::disk('public')->put('badges/old.png', 'old icon');

    $badge = Badge::factory()->create([
        'title' => 'Old Title',
        'icon_url' => 'badges/old.png',
    ]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.badges.update', $badge), [
            '_method' => 'put',
            'title' => 'Renamed Badge',
            'description' => 'A refurbished badge.',
            'icon' => UploadedFile::fake()->image('new.png'),
            'logic' => 'OR',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '500'],
            ],
        ])
        ->assertRedirect(route('dashboard.badges'));

    $badge->refresh();

    expect($badge)
        ->title->toBe('Renamed Badge')
        ->description->toBe('A refurbished badge.')
        ->icon_url->toStartWith('badges/')->not->toBe('badges/old.png')
        ->requirements->toBe([
            'logic' => 'OR',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '500'],
            ],
        ]);

    Storage::disk('public')->assertMissing('badges/old.png');
    Storage::disk('public')->assertExists($badge->icon_url);
});

test('remove_icon clears the stored badge icon', function () {
    Storage::fake('public');
    Storage::disk('public')->put('badges/old.png', 'old icon');

    $badge = Badge::factory()->create(['icon_url' => 'badges/old.png']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.badges.update', $badge), [
            '_method' => 'put',
            'title' => 'Badge',
            'description' => 'A badge.',
            'remove_icon' => '1',
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
            ],
        ])
        ->assertRedirect(route('dashboard.badges'));

    expect($badge->fresh()->icon_url)->toBeNull();
    Storage::disk('public')->assertMissing('badges/old.png');
});

test('a badge requires at least one earning condition', function () {
    $badge = Badge::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('dashboard.badges.update', $badge), [
            '_method' => 'put',
            'title' => 'Badge',
            'description' => 'A badge.',
            'logic' => 'AND',
            'conditions' => [],
        ])
        ->assertSessionHasErrors(['conditions']);

    expect($badge->fresh()->title)->toBe($badge->title);
});

test('students are forbidden from the badge editor endpoints', function () {
    $student = User::factory()->create(['role' => 'student']);
    $badge = Badge::factory()->create();

    $this->actingAs($student)
        ->post(route('dashboard.badges.store'))
        ->assertForbidden();

    $this->actingAs($student)
        ->get(route('dashboard.badges.edit', $badge))
        ->assertForbidden();

    $this->actingAs($student)
        ->post(route('dashboard.badges.update', $badge), [
            '_method' => 'put',
            'title' => 'Badge',
            'description' => 'A badge.',
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
            ],
        ])
        ->assertForbidden();

    expect(Badge::count())->toBe(1);
});

test('guests are redirected from the badge editor', function () {
    $badge = Badge::factory()->create();

    $this->get(route('dashboard.badges.edit', $badge))
        ->assertRedirect(route('login'));
});
