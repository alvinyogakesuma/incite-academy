<?php

namespace Database\Factories;

use App\Enums\Category;
use App\Enums\Difficulty;
use App\Models\Challenge;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Challenge>
 */
class ChallengeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->words(4, true),
            'description' => fake()->sentence(),
            'category' => fake()->randomElement(Category::cases())->value,
            'difficulty' => fake()->randomElement(Difficulty::cases())->value,
            'points' => fake()->numberBetween(50, 250),
            'duration' => fake()->numberBetween(5, 30),
            'image_url' => null,
        ];
    }

    public function reading(): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => Category::ReadingComprehension->value,
        ]);
    }

    public function listening(): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => Category::ListeningComprehension->value,
        ]);
    }

    public function structure(): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => Category::StructureAndWritingExpression->value,
        ]);
    }

    public function easy(): static
    {
        return $this->state(fn (array $attributes) => [
            'difficulty' => Difficulty::Easy->value,
        ]);
    }

    public function medium(): static
    {
        return $this->state(fn (array $attributes) => [
            'difficulty' => Difficulty::Medium->value,
        ]);
    }

    public function hard(): static
    {
        return $this->state(fn (array $attributes) => [
            'difficulty' => Difficulty::Hard->value,
        ]);
    }
}
