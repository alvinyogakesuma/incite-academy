<?php

namespace Database\Factories;

use App\Models\ChallengeAnswer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChallengeAnswer>
 */
class ChallengeAnswerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'challenge_question_id' => ChallengeQuestionFactory::new(),
            'answer_content' => fake()->sentence(),
            'is_correct' => false,
            // Append after the last sibling so call sites never
            // sequence by hand.
            'order_index' => fn (array $attributes) => (ChallengeAnswer::query()->where('challenge_question_id', $attributes['challenge_question_id'])->max('order_index') ?? -1) + 1,
        ];
    }

    /**
     * The row marked as its question's correct answer.
     */
    public function correct(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_correct' => true,
        ]);
    }
}
