<?php

namespace Database\Seeders;

use App\Models\Avatar;
use Illuminate\Database\Seeder;

class AvatarSeeder extends Seeder
{
    public function run(): void
    {
        // The character roster from the Kenney mini-characters pack —
        // one avatar per named archetype, each rendered from its model
        // and placed in storage by the avatar render script.
        $avatars = [
            [
                'title' => 'Worker',
                'description' => 'Earn 100 points to unlock the worker avatar.',
                'icon_url' => 'avatars/worker.png',
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '100'],
                    ],
                ],
            ],
            [
                'title' => 'Soldier',
                'description' => 'Earn 250 points to unlock the soldier avatar.',
                'icon_url' => 'avatars/soldier.png',
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '250'],
                    ],
                ],
            ],
            [
                'title' => 'Knight',
                'description' => 'Earn 500 points to unlock the knight avatar.',
                'icon_url' => 'avatars/knight.png',
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '500'],
                    ],
                ],
            ],
            [
                'title' => 'Raider',
                'description' => 'Earn 1,000 points to unlock the raider avatar.',
                'icon_url' => 'avatars/raider.png',
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '1000'],
                    ],
                ],
            ],
            [
                'title' => 'Robot',
                'description' => 'Earn 2,500 points to unlock the robot avatar.',
                'icon_url' => 'avatars/robot.png',
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '2500'],
                    ],
                ],
            ],
            [
                'title' => 'Zombie',
                'description' => 'Earn 5,000 points to unlock the zombie avatar.',
                'icon_url' => 'avatars/zombie.png',
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '5000'],
                    ],
                ],
            ],
            [
                'title' => 'Alien',
                'description' => 'Earn 10,000 points to unlock the alien avatar.',
                'icon_url' => 'avatars/alien.png',
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '10000'],
                    ],
                ],
            ],
        ];

        foreach ($avatars as $avatarData) {
            // recipients_count stays out of the values — the
            // column defaults to zero at creation, and a re-run
            // must not reset the live count. updateOrCreate also
            // maintains the timestamps itself.
            Avatar::updateOrCreate(
                ['title' => $avatarData['title']],
                $avatarData,
            );
        }

        // The roster is the source of truth — seeding converges the
        // table to exactly these characters, dropping any avatar
        // outside it (the awards and equips of dropped rows cascade
        // away with them).
        Avatar::query()
            ->whereNotIn('title', array_column($avatars, 'title'))
            ->delete();
    }
}
