<?php

namespace Database\Factories;

use App\Models\Question;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Question>
 */
class QuestionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'lesson_id' => LessonFactory::new(),
            'type' => fake()->randomElement(['text', 'listening']),
            'question_content' => fake()->paragraph(),
            'audio_url' => fn (array $attributes) => ($attributes['type'] ?? 'text') === 'listening' ? fake()->imageUrl() : null,
            'order_index' => fake()->numberBetween(0, 10),
        ];
    }

    public function text(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'text',
            'audio_url' => null,
        ]);
    }

    public function listening(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'listening',
            'audio_url' => fake()->imageUrl(),
        ]);
    }
}
