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
            'order_index' => fake()->numberBetween(0, 10),
            'total_points' => fake()->numberBetween(20, 100),
        ];
    }
}
