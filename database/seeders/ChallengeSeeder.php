<?php

namespace Database\Seeders;

use App\Enums\Category;
use App\Models\Challenge;
use App\Models\ChallengeAnswer;
use App\Models\ChallengeQuestion;
use Illuminate\Database\Seeder;

class ChallengeSeeder extends Seeder
{
    public function run(): void
    {
        $now = now()->toDateTimeString();

        Challenge::insert([
            [
                'id' => 1,
                'title' => 'Grammar Challenge',
                'description' => 'Test your grammar knowledge in this timed reading challenge.',
                'category' => Category::ReadingComprehension->value,
                'difficulty' => 'Easy',
                'points' => 100,
                'duration' => 15,
                'image_url' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 2,
                'title' => 'Rapid Listening Duel',
                'description' => 'Catch every detail in fast-paced audio clips under time pressure.',
                'category' => Category::ListeningComprehension->value,
                'difficulty' => 'Medium',
                'points' => 150,
                'duration' => 10,
                'image_url' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 3,
                'title' => 'Sentence Structure Sprint',
                'description' => 'Fix the trickiest written expressions before the clock runs out.',
                'category' => Category::StructureAndWritingExpression->value,
                'difficulty' => 'Hard',
                'points' => 200,
                'duration' => 20,
                'image_url' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        // The Grammar Challenge's example question tree, ported
        // from the deprecated seeder.
        ChallengeQuestion::insert([
            [
                'id' => 1,
                'challenge_id' => 1,
                'type' => 'text',
                'question_content' => 'Which sentence uses the present perfect tense correctly?',
                'audio_url' => null,
                'order_index' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 2,
                'challenge_id' => 1,
                'type' => 'text',
                'question_content' => 'Choose the correct past participle form of "write".',
                'audio_url' => null,
                'order_index' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        ChallengeAnswer::insert([
            ['id' => 1, 'challenge_question_id' => 1, 'answer_content' => 'I have finish my homework', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 2, 'challenge_question_id' => 1, 'answer_content' => 'I have finished my homework', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 3, 'challenge_question_id' => 1, 'answer_content' => 'I has finished my homework', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 4, 'challenge_question_id' => 1, 'answer_content' => 'I have finishing my homework', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 5, 'challenge_question_id' => 2, 'answer_content' => 'Wrote', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 6, 'challenge_question_id' => 2, 'answer_content' => 'Writed', 'is_correct' => false, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 7, 'challenge_question_id' => 2, 'answer_content' => 'Written', 'is_correct' => true, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 8, 'challenge_question_id' => 2, 'answer_content' => 'Writing', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
}
