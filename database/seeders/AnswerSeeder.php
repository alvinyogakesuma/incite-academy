<?php

namespace Database\Seeders;

use App\Models\Answer;
use Illuminate\Database\Seeder;

class AnswerSeeder extends Seeder
{
    public function run(): void
    {
        $now = now()->toDateTimeString();

        // [question_id, answer_content, is_true, order_index]
        $rows = [
            // Question 1
            [1, 'To memorize all definitions and footnotes.', false, 0],
            [1, 'To identify the general layout, structure, and main ideas quickly.', true, 1],
            [1, 'To verify grammar rules and syntax patterns.', false, 2],
            [1, 'To translate the entire text word-for-word.', false, 3],

            // Question 2
            [2, 'The concluding sentence', false, 0],
            [2, 'The topic sentence', true, 1],
            [2, 'The supporting examples', false, 2],
            [2, 'The footnotes', false, 3],

            // Question 3
            [3, 'Furthermore', false, 0],
            [3, 'However', true, 1],
            [3, 'Consequently', false, 2],
            [3, 'On the other hand', false, 3],

            // Question 4
            [4, 'Consequently', true, 0],
            [4, 'Nevertheless', false, 1],
            [4, 'In addition', false, 2],
            [4, 'Alternatively', false, 3],

            // Question 5
            [5, 'To provide detailed evidence for each argument', false, 0],
            [5, 'To present the thesis and outline the structure of the essay', true, 1],
            [5, 'To summarize all counterarguments', false, 2],
            [5, 'To list all references and citations', false, 3],

            // Question 6
            [6, 'Skip the entire paragraph', false, 0],
            [6, 'Look for context clues in surrounding sentences', true, 1],
            [6, 'Immediately look up the word in a dictionary', false, 2],
            [6, 'Guess randomly and move on', false, 3],

            // Question 7
            [7, 'The author fully supports the policy.', false, 0],
            [7, 'The policy had good intentions but poor execution.', true, 1],
            [7, 'The policy should never have been created.', false, 2],
            [7, 'The author has no opinion on the policy.', false, 3],

            // Question 8
            [8, 'The temperature dropped to -5°C last night.', false, 0],
            [8, 'The character must have been feeling anxious based on the described behavior.', true, 1],
            [8, 'The meeting was scheduled for 2:00 PM.', false, 2],
            [8, 'The city has a population of 2 million.', false, 3],

            // Question 9
            [9, 'American English', false, 0],
            [9, 'British English (Received Pronunciation)', true, 1],
            [9, 'Australian English', false, 2],
            [9, 'Canadian English', false, 3],

            // Question 10
            [10, 'Dropping the "r" sound after vowels', false, 0],
            [10, 'Pronouncing the "r" sound after vowels', true, 1],
            [10, 'Using rising intonation for statements', false, 2],
            [10, 'Elongating all vowel sounds', false, 3],

            // Question 11
            [11, 'Every word the speaker says', false, 0],
            [11, 'Keywords, main ideas, and supporting details', true, 1],
            [11, 'Only the speaker\'s name and date', false, 2],
            [11, 'Your personal opinions about the topic', false, 3],

            // Question 12
            [12, 'The history of ancient Rome', false, 0],
            [12, 'Climate change effects on coastal cities', true, 1],
            [12, 'Modern art techniques', false, 2],
            [12, 'Space exploration programs', false, 3],

            // Question 13
            [13, 'Memorize vocabulary lists only', false, 0],
            [13, 'Practice with varied accents and take structured notes', true, 1],
            [13, 'Only listen to American English podcasts', false, 2],
            [13, 'Read transcripts without listening to audio', false, 3],

            // Question 14
            [14, 'Enthusiastic support', false, 0],
            [14, 'Cautious skepticism', true, 1],
            [14, 'Complete indifference', false, 2],
            [14, 'Angry opposition', false, 3],

            // Question 15
            [15, 'Stop listening and panic', false, 0],
            [15, 'Focus on the overall meaning and context around the word', true, 1],
            [15, 'Write down the unknown word and ignore the rest', false, 2],
            [15, 'Assume it is not important', false, 3],

            // Question 16
            [16, 'I have finish my homework.', false, 0],
            [16, 'I have finished my homework.', true, 1],
            [16, 'I has finished my homework.', false, 2],
            [16, 'I have finishing my homework.', false, 3],

            // Question 17
            [17, 'She read a book yesterday.', false, 0],
            [17, 'She was reading a book when I called.', true, 1],
            [17, 'She has been reading a book.', false, 2],
            [17, 'She will read a book tomorrow.', false, 3],

            // Question 18
            [18, 'will finish', false, 0],
            [18, 'will have finished', true, 1],
            [18, 'are finishing', false, 2],
            [18, 'finished', false, 3],

            // Question 19
            [19, 'No error exists', false, 0],
            [19, '"were" should be "was" (subject-verb agreement)', true, 1],
            [19, '"students" should be singular', false, 2],
            [19, '"schedule" is misspelled', false, 3],

            // Question 20
            [20, 'The report has been writing by the team.', false, 0],
            [20, 'The report has been written by the team.', true, 1],
            [20, 'The report has being written by the team.', false, 2],
            [20, 'The report has wrote by the team.', false, 3],

            // Question 21
            [21, '"tonight" should be "tomorrow"', false, 0],
            [21, '"who his" should be "whose"', true, 1],
            [21, '"won" should be "winned"', false, 2],
            [21, '"will speak" should be "speaks"', false, 3],
        ];

        foreach ($rows as [$questionId, $content, $isTrue, $orderIndex]) {
            Answer::create([
                'question_id' => $questionId,
                'answer_content' => $content,
                'is_true' => $isTrue,
                'order_index' => $orderIndex,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
