<?php

namespace Database\Factories;

use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Module>
 */
class ModuleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'course_id' => CourseFactory::new(),
            'title' => fake()->words(3, true),
            // Append after the last sibling so (course_id, order_index)
            // stays unique without every call site sequencing by hand.
            'order_index' => fn (array $attributes) => (Module::query()->where('course_id', $attributes['course_id'])->max('order_index') ?? -1) + 1,
            'total_points' => fake()->numberBetween(20, 100),
        ];
    }
}
