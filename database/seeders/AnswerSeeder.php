<?php

namespace Database\Seeders;

use App\Models\Answer;
use Illuminate\Database\Seeder;

class AnswerSeeder extends Seeder
{
    public function run(): void
    {
        $now = now()->toDateTimeString();

        Answer::insert([
            // Question 1
            ['question_id' => 1, 'answer_content' => 'To memorize all definitions and footnotes.', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 1, 'answer_content' => 'To identify the general layout, structure, and main ideas quickly.', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 1, 'answer_content' => 'To verify grammar rules and syntax patterns.', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 1, 'answer_content' => 'To translate the entire text word-for-word.', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 2
            ['question_id' => 2, 'answer_content' => 'The concluding sentence', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 2, 'answer_content' => 'The topic sentence', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 2, 'answer_content' => 'The supporting examples', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 2, 'answer_content' => 'The footnotes', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 3
            ['question_id' => 3, 'answer_content' => 'Furthermore', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 3, 'answer_content' => 'However', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 3, 'answer_content' => 'Consequently', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 3, 'answer_content' => 'On the other hand', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 4
            ['question_id' => 4, 'answer_content' => 'Consequently', 'is_correct' => true, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 4, 'answer_content' => 'Nevertheless', 'is_correct' => false, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 4, 'answer_content' => 'In addition', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 4, 'answer_content' => 'Alternatively', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 5
            ['question_id' => 5, 'answer_content' => 'To provide detailed evidence for each argument', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 5, 'answer_content' => 'To present the thesis and outline the structure of the essay', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 5, 'answer_content' => 'To summarize all counterarguments', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 5, 'answer_content' => 'To list all references and citations', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 6
            ['question_id' => 6, 'answer_content' => 'Skip the entire paragraph', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 6, 'answer_content' => 'Look for context clues in surrounding sentences', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 6, 'answer_content' => 'Immediately look up the word in a dictionary', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 6, 'answer_content' => 'Guess randomly and move on', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 7
            ['question_id' => 7, 'answer_content' => 'The author fully supports the policy.', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 7, 'answer_content' => 'The policy had good intentions but poor execution.', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 7, 'answer_content' => 'The policy should never have been created.', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 7, 'answer_content' => 'The author has no opinion on the policy.', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 8
            ['question_id' => 8, 'answer_content' => 'The temperature dropped to -5°C last night.', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 8, 'answer_content' => 'The character must have been feeling anxious based on the described behavior.', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 8, 'answer_content' => 'The meeting was scheduled for 2:00 PM.', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 8, 'answer_content' => 'The city has a population of 2 million.', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 14
            ['question_id' => 14, 'answer_content' => 'American English', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 14, 'answer_content' => 'British English (Received Pronunciation)', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 14, 'answer_content' => 'Australian English', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 14, 'answer_content' => 'Canadian English', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 15
            ['question_id' => 15, 'answer_content' => 'Dropping the "r" sound after vowels', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 15, 'answer_content' => 'Pronouncing the "r" sound after vowels', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 15, 'answer_content' => 'Using rising intonation for statements', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 15, 'answer_content' => 'Elongating all vowel sounds', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 16
            ['question_id' => 16, 'answer_content' => 'Every word the speaker says', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 16, 'answer_content' => 'Keywords, main ideas, and supporting details', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 16, 'answer_content' => 'Only the speaker\'s name and date', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 16, 'answer_content' => 'Your personal opinions about the topic', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 17
            ['question_id' => 17, 'answer_content' => 'The history of ancient Rome', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 17, 'answer_content' => 'Climate change effects on coastal cities', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 17, 'answer_content' => 'Modern art techniques', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 17, 'answer_content' => 'Space exploration programs', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 18
            ['question_id' => 18, 'answer_content' => 'Memorize vocabulary lists only', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 18, 'answer_content' => 'Practice with varied accents and take structured notes', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 18, 'answer_content' => 'Only listen to American English podcasts', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 18, 'answer_content' => 'Read transcripts without listening to audio', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 19
            ['question_id' => 19, 'answer_content' => 'Enthusiastic support', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 19, 'answer_content' => 'Cautious skepticism', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 19, 'answer_content' => 'Complete indifference', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 19, 'answer_content' => 'Angry opposition', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 20
            ['question_id' => 20, 'answer_content' => 'Stop listening and panic', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 20, 'answer_content' => 'Focus on the overall meaning and context around the word', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 20, 'answer_content' => 'Write down the unknown word and ignore the rest', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 20, 'answer_content' => 'Assume it is not important', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 26
            ['question_id' => 26, 'answer_content' => 'I have finish my homework.', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 26, 'answer_content' => 'I have finished my homework.', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 26, 'answer_content' => 'I has finished my homework.', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 26, 'answer_content' => 'I have finishing my homework.', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 27
            ['question_id' => 27, 'answer_content' => 'She read a book yesterday.', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 27, 'answer_content' => 'She was reading a book when I called.', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 27, 'answer_content' => 'She has been reading a book.', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 27, 'answer_content' => 'She will read a book tomorrow.', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 28
            ['question_id' => 28, 'answer_content' => 'will finish', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 28, 'answer_content' => 'will have finished', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 28, 'answer_content' => 'are finishing', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 28, 'answer_content' => 'finished', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 29
            ['question_id' => 29, 'answer_content' => 'No error exists', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 29, 'answer_content' => '"were" should be "was" (subject-verb agreement)', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 29, 'answer_content' => '"students" should be singular', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 29, 'answer_content' => '"schedule" is misspelled', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 30
            ['question_id' => 30, 'answer_content' => 'The report has been writing by the team.', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 30, 'answer_content' => 'The report has been written by the team.', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 30, 'answer_content' => 'The report has being written by the team.', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 30, 'answer_content' => 'The report has wrote by the team.', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],

            // Question 31
            ['question_id' => 31, 'answer_content' => '"tonight" should be "tomorrow"', 'is_correct' => false, 'order_index' => 0, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 31, 'answer_content' => '"who his" should be "whose"', 'is_correct' => true, 'order_index' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 31, 'answer_content' => '"won" should be "winned"', 'is_correct' => false, 'order_index' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['question_id' => 31, 'answer_content' => '"will speak" should be "speaks"', 'is_correct' => false, 'order_index' => 3, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
}
