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
            // Append after the last sibling so (lesson_id, order_index)
            // stays unique without every call site sequencing by hand.
            'order_index' => fn (array $attributes) => (Question::query()->where('lesson_id', $attributes['lesson_id'])->max('order_index') ?? -1) + 1,
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
