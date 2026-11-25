<?php

namespace Database\Factories;

use App\Models\Avatar;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Avatar>
 */
class AvatarFactory extends Factory
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
            'icon_url' => null,
            'recipients_count' => fake()->numberBetween(0, 50),
            'requirements' => [
                'logic' => fake()->randomElement(['AND', 'OR']),
                'conditions' => [
                    [
                        'type' => fake()->randomElement(['points', 'quiz', 'course']),
                        'operator' => '>=',
                        'value' => (string) fake()->numberBetween(50, 5000),
                    ],
                ],
            ],
        ];
    }

    /**
     * An avatar unlocked at a points threshold.
     */
    public function pointsBased(int $threshold = 1000): static
    {
        return $this->state(fn (array $attributes) => [
            'requirements' => [
                'logic' => 'AND',
                'conditions' => [
                    ['type' => 'points', 'operator' => '>=', 'value' => (string) $threshold],
                ],
            ],
        ]);
    }

    /**
     * An avatar unlocked by completing courses.
     */
    public function courseCompletion(int $threshold = 3): static
    {
        return $this->state(fn (array $attributes) => [
            'requirements' => [
                'logic' => 'AND',
                'conditions' => [
                    ['type' => 'course', 'operator' => '=', 'value' => fake()->words(2, true)],
                ],
            ],
        ]);
    }
}
