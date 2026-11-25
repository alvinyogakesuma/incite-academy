<?php

namespace Database\Seeders;

use App\Models\LearningPath;
use Illuminate\Database\Seeder;

class LearningPathSeeder extends Seeder
{
    public function run(): void
    {
        $now = now()->toDateTimeString();

        $paths = [
            [
                'id' => 1,
                'title' => 'Complete Preparation',
                'description' => 'A comprehensive learning path covering all aspects of the ITERA English proficiency test',
                'level' => 'All Levels',
                'courses_count' => 3,
                'total_duration' => 481,
                'image_url' => null,
                // The seeder courses in sequence order.
                'course_ids' => [1, 2, 3],
            ],
        ];

        foreach ($paths as $pathData) {
            $courseIds = $pathData['course_ids'];
            unset($pathData['course_ids']);

            $pathData['created_at'] = $now;
            $pathData['updated_at'] = $now;

            $path = LearningPath::create($pathData);

            $pivotData = [];
            foreach ($courseIds as $orderIndex => $courseId) {
                $pivotData[$courseId] = ['order_index' => $orderIndex];
            }

            $path->courses()->attach($pivotData);
        }
    }
}
