<?php

namespace Database\Factories;

use App\Models\LearningPath;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LearningPath>
 */
class LearningPathFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->words(3, true),
            'description' => fake()->paragraph(),
            'level' => 'All Levels',
            'courses_count' => fake()->numberBetween(2, 5),
            'total_duration' => fake()->numberBetween(6, 16),
        ];
    }

    /**
     * Indicate that the learning path is for beginners.
     */
    public function beginner(): static
    {
        return $this->state(fn (array $attributes) => [
            'level' => 'Beginner',
        ]);
    }

    /**
     * Indicate that the learning path is intermediate level.
     */
    public function intermediate(): static
    {
        return $this->state(fn (array $attributes) => [
            'level' => 'Intermediate',
        ]);
    }

    /**
     * Indicate that the learning path is advanced level.
     */
    public function advanced(): static
    {
        return $this->state(fn (array $attributes) => [
            'level' => 'Advanced',
        ]);
    }

    /**
     * Indicate that the learning path is for all levels.
     */
    public function allLevels(): static
    {
        return $this->state(fn (array $attributes) => [
            'level' => 'All Levels',
        ]);
    }
}
