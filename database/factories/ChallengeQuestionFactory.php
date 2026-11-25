<?php

namespace Database\Factories;

use App\Models\ChallengeQuestion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChallengeQuestion>
 */
class ChallengeQuestionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'challenge_id' => ChallengeFactory::new(),
            'type' => fake()->randomElement(['text', 'listening']),
            'question_content' => fake()->paragraph(),
            'audio_url' => fn (array $attributes) => ($attributes['type'] ?? 'text') === 'listening' ? fake()->imageUrl() : null,
            // Append after the last sibling so call sites never
            // sequence by hand.
            'order_index' => fn (array $attributes) => (ChallengeQuestion::query()->where('challenge_id', $attributes['challenge_id'])->max('order_index') ?? -1) + 1,
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
