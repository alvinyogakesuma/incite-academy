<?php

namespace Database\Seeders;

use App\Models\Course;
use Illuminate\Database\Seeder;

class CourseSeeder extends Seeder
{
    public function run(): void
    {
        $now = now()->toDateTimeString();

        Course::insert([
            [
                'id' => 1,
                'title' => 'Reading Comprehension Mastery',
                'category' => 'Reading Comprehension',
                'short_description' => 'Develop critical reading skills for the ITERA reading section',
                'long_description' => "This comprehensive Reading Comprehension course is designed specifically for students preparing for the ITERA test. Through carefully structured modules, you'll develop essential skills to tackle any reading passage with confidence.\n\nOur expert-designed curriculum covers everything from basic comprehension strategies to advanced techniques for inference and vocabulary questions. Each lesson includes interactive exercises and practice tests that mirror the actual ITERA test format.",
                'image_url' => null,
                'total_duration' => 234,
                'modules_count' => 3,
                'lessons_count' => 9,
                'total_points' => 160,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 3,
                'title' => 'Advanced Listening Strategies',
                'category' => 'Listening Comprehension',
                'short_description' => 'Master speed-listening and note-taking for the listening assessment',
                'long_description' => "Master fast-paced spoken English, conversation transitions, speaker attitudes, and quick notation skills under examination stress. This course prepares you for every listening scenario the ITERA test presents.\n\nFrom academic lectures to casual conversations, you will train your ear to catch keywords, identify distractors, and map spoken information efficiently.",
                'image_url' => null,
                'total_duration' => 142,
                'modules_count' => 3,
                'lessons_count' => 7,
                'total_points' => 140,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 5,
                'title' => 'Grammar & Sentence Structure',
                'category' => 'Structure and Writing Expression',
                'short_description' => 'Deep dive into active/passive voice, conditional clauses, and complex tenses',
                'long_description' => "Master advanced syntactic variations, grammar clauses, sentence correction practices, and relative clauses rules. This course covers every structure question type found in the ITERA examination.\n\nThrough systematic error analysis and pattern recognition, you will learn to spot and fix grammatical mistakes with speed and accuracy.",
                'image_url' => null,
                'total_duration' => 105,
                'modules_count' => 2,
                'lessons_count' => 4,
                'total_points' => 95,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
