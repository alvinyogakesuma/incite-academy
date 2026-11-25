<?php

namespace Database\Factories;

use App\Models\Lesson;
use App\Models\LessonAttempt;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LessonAttempt>
 */
class LessonAttemptFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'lesson_id' => Lesson::factory(),
            'course_id' => fn (array $attributes) => Lesson::find($attributes['lesson_id'])->course_id,
            'score' => fake()->numberBetween(0, 50),
            'points_awarded' => 0,
            'total_points' => fake()->numberBetween(10, 50),
            'correct_count' => fake()->numberBetween(0, 5),
            'total_questions' => 5,
            'percentage' => fake()->numberBetween(0, 100),
            'attempted_at' => now(),
        ];
    }
}
