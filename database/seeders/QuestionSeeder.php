<?php

namespace Database\Seeders;

use App\Models\Question;
use Illuminate\Database\Seeder;

class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        $now = now()->toDateTimeString();

        Question::insert([
            // Lesson 1003: Skimming Speed Test Assessment (quiz)
            ['id' => 1, 'lesson_id' => 1003, 'type' => 'text', 'question_content' => 'What is the primary objective of skimming an academic passage?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 2, 'lesson_id' => 1003, 'type' => 'text', 'question_content' => 'Which part of a paragraph should you focus on first when skimming?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 3, 'lesson_id' => 1003, 'type' => 'listening', 'question_content' => 'Listen to the lecture and identify the main transition signpost word highlighted.', 'audio_url' => '/audio/skimming_lecture.mp3', 'audio_duration' => 45, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],

            // Lesson 2004: First Passage Mastery Exam (exam)
            ['id' => 4, 'lesson_id' => 2004, 'type' => 'text', 'question_content' => 'Which sentence structure marker indicates a cause-and-effect transition?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 5, 'lesson_id' => 2004, 'type' => 'text', 'question_content' => 'In academic writing, what is the primary function of the introductory paragraph?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 6, 'lesson_id' => 2004, 'type' => 'text', 'question_content' => 'What is the best strategy when encountering an unfamiliar word in a reading passage?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],

            // Lesson 3002: Inference and Implication Practice (quiz)
            ['id' => 7, 'lesson_id' => 3002, 'type' => 'text', 'question_content' => 'An author writes: "While the policy was well-intentioned, its implementation revealed significant flaws." What can be inferred?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 8, 'lesson_id' => 3002, 'type' => 'text', 'question_content' => 'Which of the following is an inference, not an explicit statement?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],

            // Lesson 6003: Accent Recognition Exercise (quiz)
            ['id' => 14, 'lesson_id' => 6003, 'type' => 'listening', 'question_content' => 'Listen to the audio clip. Which accent is the speaker using?', 'audio_url' => '/audio/british_sample.mp3', 'audio_duration' => 30, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 15, 'lesson_id' => 6003, 'type' => 'text', 'question_content' => 'Which feature is characteristic of rhotic accents?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],

            // Lesson 7002: Keyword Mapping Under Time Pressure (quiz)
            ['id' => 16, 'lesson_id' => 7002, 'type' => 'text', 'question_content' => 'When taking notes during a lecture, you should primarily record:', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 17, 'lesson_id' => 7002, 'type' => 'listening', 'question_content' => 'Listen to the short lecture and identify the main topic.', 'audio_url' => '/audio/lecture_main_topic.mp3', 'audio_duration' => 40, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],

            // Lesson 8002: Listening Comprehension Final Exam (exam)
            ['id' => 18, 'lesson_id' => 8002, 'type' => 'text', 'question_content' => 'What is the most effective way to prepare for the listening section of ITERA?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 19, 'lesson_id' => 8002, 'type' => 'listening', 'question_content' => 'Listen to the dialog. What is the speaker\'s attitude toward the proposal?', 'audio_url' => '/audio/speaker_attitude.mp3', 'audio_duration' => 35, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 20, 'lesson_id' => 8002, 'type' => 'text', 'question_content' => 'When a listening passage contains unfamiliar vocabulary, the best strategy is to:', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],

            // Lesson 11002: Tense Consistency Exercise (quiz)
            ['id' => 26, 'lesson_id' => 11002, 'type' => 'text', 'question_content' => 'Which sentence uses the present perfect tense correctly?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 27, 'lesson_id' => 11002, 'type' => 'text', 'question_content' => 'Select the sentence in the past continuous tense:', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 28, 'lesson_id' => 11002, 'type' => 'text', 'question_content' => 'Complete: "By next month, we ________ this project."', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],

            // Lesson 12002: Error Recognition Final Exam (exam)
            ['id' => 29, 'lesson_id' => 12002, 'type' => 'text', 'question_content' => 'Identify the error: "Neither the students nor the teacher were aware of the schedule change."', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 30, 'lesson_id' => 12002, 'type' => 'text', 'question_content' => 'Which is the correct passive voice construction?', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 31, 'lesson_id' => 12002, 'type' => 'text', 'question_content' => 'Identify the relative clause error: "The professor who his research won the award will speak tonight."', 'audio_url' => null, 'audio_duration' => null, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
}
