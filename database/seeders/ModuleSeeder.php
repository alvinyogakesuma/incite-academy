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
            ['id' => 1, 'course_id' => 1, 'title' => 'Introduction to Skimming & Scanning', 'order_index' => 0, 'lessons_count' => 3, 'total_points' => 45, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 2, 'course_id' => 1, 'title' => 'Paragraph Structure & Layout Mapping', 'order_index' => 1, 'lessons_count' => 4, 'total_points' => 80, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 3, 'course_id' => 1, 'title' => 'Advanced Reading Techniques', 'order_index' => 2, 'lessons_count' => 2, 'total_points' => 35, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 4, 'course_id' => 2, 'title' => 'Acoustic Foundations', 'order_index' => 0, 'lessons_count' => 3, 'total_points' => 45, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 5, 'course_id' => 2, 'title' => 'Lecture Note-Taking Systems', 'order_index' => 1, 'lessons_count' => 2, 'total_points' => 35, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 6, 'course_id' => 2, 'title' => 'Conversation & Dialog Analysis', 'order_index' => 2, 'lessons_count' => 2, 'total_points' => 60, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 7, 'course_id' => 3, 'title' => 'Tenses & Voice Concordance', 'order_index' => 0, 'lessons_count' => 2, 'total_points' => 35, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 8, 'course_id' => 3, 'title' => 'Clauses & Sentence Patterns', 'order_index' => 1, 'lessons_count' => 2, 'total_points' => 60, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
}
