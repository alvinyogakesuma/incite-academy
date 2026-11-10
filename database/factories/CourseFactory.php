<?php

namespace Database\Factories;

use App\Models\Course;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->words(4, true),
            'category' => fake()->randomElement([
                'Reading Comprehension',
                'Listening Comprehension',
                'Structure and Writing Expression',
            ]),
            'short_description' => fake()->sentence(),
            'long_description' => fake()->paragraphs(3, true),
            'image_url' => fake()->optional()->imageUrl(),
            'total_duration' => fake()->numberBetween(60, 300),
            'modules_count' => fake()->numberBetween(1, 5),
            'lessons_count' => fake()->numberBetween(3, 15),
            'total_points' => fake()->numberBetween(50, 300),
        ];
    }

    public function reading(): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => 'Reading Comprehension',
        ]);
    }

    public function listening(): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => 'Listening Comprehension',
        ]);
    }

    public function structure(): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => 'Structure and Writing Expression',
        ]);
    }
}
