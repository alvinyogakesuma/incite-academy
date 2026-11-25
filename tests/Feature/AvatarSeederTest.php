<?php

use App\Models\Avatar;
use App\Models\User;
use App\Models\UserAvatar;
use Database\Seeders\AvatarSeeder;

test('seeding builds the seven-character roster', function () {
    $this->seed(AvatarSeeder::class);

    $roster = Avatar::query()->orderBy('id')->get();

    $tiers = [
        'Worker' => ['avatars/worker.png', '100'],
        'Soldier' => ['avatars/soldier.png', '250'],
        'Knight' => ['avatars/knight.png', '500'],
        'Raider' => ['avatars/raider.png', '1000'],
        'Robot' => ['avatars/robot.png', '2500'],
        'Zombie' => ['avatars/zombie.png', '5000'],
        'Alien' => ['avatars/alien.png', '10000'],
    ];

    expect($roster)->toHaveCount(7)
        ->and($roster->pluck('title')->all())->toBe(array_keys($tiers));

    foreach ($tiers as $title => [$iconUrl, $threshold]) {
        $avatar = $roster->firstWhere('title', $title);

        expect($avatar->icon_url)->toBe($iconUrl)
            ->and($avatar->requirements['logic'])->toBe('AND')
            ->and($avatar->requirements['conditions'][0]['type'])->toBe('points')
            ->and($avatar->requirements['conditions'][0]['operator'])->toBe('>=')
            ->and($avatar->requirements['conditions'][0]['value'])->toBe($threshold);
    }
});

test('re-seeding is idempotent and preserves live counters', function () {
    $this->seed(AvatarSeeder::class);

    // A live award on a roster member, plus a stray avatar the
    // roster should converge away.
    $user = User::factory()->create();
    $worker = Avatar::query()->where('title', 'Worker')->first();

    UserAvatar::create([
        'user_id' => $user->id,
        'avatar_id' => $worker->id,
        'is_equipped' => true,
        'awarded_at' => now(),
    ]);
    Avatar::factory()->create(['title' => 'Leftover']);

    expect($worker->fresh()->recipients_count)->toBe(1);

    $this->seed(AvatarSeeder::class);

    expect(Avatar::count())->toBe(7)
        ->and(Avatar::query()->where('title', 'Leftover')->exists())->toBeFalse()
        ->and(
            Avatar::query()->where('title', 'Worker')->first()->recipients_count,
        )->toBe(1)
        ->and(UserAvatar::count())->toBe(1);
});
