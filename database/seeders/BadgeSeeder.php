<?php

namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

class BadgeSeeder extends Seeder
{
    public function run(): void
    {
        $now = now()->toDateTimeString();

        $badges = [
            [
                'id' => 1,
                'title' => 'First Steps',
                'description' => 'Awarded for earning your first 100 points on the platform.',
                'icon_url' => null,
                'recipients_count' => 0,
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '100'],
                    ],
                ],
            ],
            [
                'id' => 2,
                'title' => 'Rising Star',
                'description' => 'Awarded for earning 1,000 points across all courses.',
                'icon_url' => null,
                'recipients_count' => 0,
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '1000'],
                    ],
                ],
            ],
            [
                'id' => 3,
                'title' => 'Course Conqueror',
                'description' => 'Awarded for completing 3 courses from start to finish.',
                'icon_url' => null,
                'recipients_count' => 0,
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'course', 'operator' => '=', 'value' => 'Complete 3 courses'],
                    ],
                ],
            ],
            [
                'id' => 6,
                'title' => 'Scholar',
                'description' => 'Awarded for earning 5,000 points and mastering the curriculum.',
                'icon_url' => null,
                'recipients_count' => 0,
                'requirements' => [
                    'logic' => 'AND',
                    'conditions' => [
                        ['type' => 'points', 'operator' => '>=', 'value' => '5000'],
                    ],
                ],
            ],
        ];

        foreach ($badges as $badgeData) {
            $badgeData['created_at'] = $now;
            $badgeData['updated_at'] = $now;

            Badge::create($badgeData);
        }
    }
}
