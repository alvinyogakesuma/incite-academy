<?php

namespace Database\Factories;

use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lesson>
 */
class LessonFactory extends Factory
{
    public function definition(): array
    {
        return [
            'module_id' => ModuleFactory::new(),
            'course_id' => fn (array $attributes) => Module::find($attributes['module_id'])->course_id,
            'title' => fake()->words(4, true),
            'type' => fake()->randomElement(['article', 'quiz', 'exam']),
            'article_content' => fn (array $attributes) => ($attributes['type'] ?? 'article') === 'article' ? fake()->paragraphs(2, true) : null,
            'duration' => fake()->numberBetween(5, 60),
            'points' => fake()->numberBetween(10, 50),
            'order_index' => fake()->numberBetween(0, 10),
        ];
    }

    public function article(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'article',
            'article_content' => fake()->paragraphs(2, true),
        ]);
    }

    public function quiz(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'quiz',
            'article_content' => null,
        ]);
    }

    public function exam(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'exam',
            'article_content' => null,
        ]);
    }
}
