<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        $now = now()->toDateTimeString();

        Module::insert([
            ['id' => 10, 'course_id' => 1, 'title' => 'Introduction to Skimming & Scanning', 'order_index' => 0, 'total_points' => 45, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 20, 'course_id' => 1, 'title' => 'Paragraph Structure & Layout Mapping', 'order_index' => 1, 'total_points' => 80, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 30, 'course_id' => 1, 'title' => 'Advanced Reading Techniques', 'order_index' => 2, 'total_points' => 35, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 60, 'course_id' => 3, 'title' => 'Acoustic Foundations', 'order_index' => 0, 'total_points' => 45, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 70, 'course_id' => 3, 'title' => 'Lecture Note-Taking Systems', 'order_index' => 1, 'total_points' => 35, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 80, 'course_id' => 3, 'title' => 'Conversation & Dialog Analysis', 'order_index' => 2, 'total_points' => 60, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 110, 'course_id' => 5, 'title' => 'Tenses & Voice Concordance', 'order_index' => 0, 'total_points' => 35, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 120, 'course_id' => 5, 'title' => 'Clauses & Sentence Patterns', 'order_index' => 1, 'total_points' => 60, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
}
