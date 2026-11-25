<?php

namespace Database\Factories;

use App\Models\Challenge;
use App\Models\ChallengeAttempt;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChallengeAttempt>
 */
class ChallengeAttemptFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'challenge_id' => Challenge::factory(),
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
