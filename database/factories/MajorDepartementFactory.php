<?php

namespace Database\Factories;

use App\Models\MajorDepartement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MajorDepartement>
 */
class MajorDepartementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
        ];
    }
}
