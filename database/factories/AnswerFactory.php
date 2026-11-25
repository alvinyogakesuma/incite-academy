<?php

namespace Database\Factories;

use App\Models\Answer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Answer>
 */
class AnswerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'question_id' => QuestionFactory::new(),
            'answer_content' => fake()->sentence(),
            'is_true' => false,
            // Append after the last sibling so (question_id, order_index)
            // stays unique without every call site sequencing by hand.
            'order_index' => fn (array $attributes) => (Answer::query()->where('question_id', $attributes['question_id'])->max('order_index') ?? -1) + 1,
        ];
    }

    /**
     * The row marked as its question's correct answer.
     */
    public function correct(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_true' => true,
        ]);
    }
}
