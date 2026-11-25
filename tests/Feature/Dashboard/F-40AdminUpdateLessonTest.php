<?php

/**
 * F-40 - Fungsi mengubah unit pelajaran oleh admin
 *
 * Feature tests for the admin's lesson save: PUT /dashboard/courses/{course}/
 * lessons/{lesson} (route dashboard.courses.lessons.update), behind the auth ->
 * verified -> admin gate. The lesson editor submits the whole payload - the
 * metadata, the content branch (article body or question tree), and the
 * optional exam time limit - and the server derives the duration and points
 * that the outline displays.
 *
 * Method: equivalence partitioning (EP) per input domain, then robust boundary
 * value analysis (BVA) - every identified boundary carries both a valid-side
 * and an invalid-side input.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain                | Valid classes                            | Invalid classes                              |
 * |-----------------------|------------------------------------------|----------------------------------------------|
 * | access                | admin                                    | student, guest                               |
 * | target                | a lesson of the course                   | an unknown id, a lesson of another course    |
 * | type                  | article, quiz, exam                      | any other value                              |
 * | article content       | 0 words, 1..149, 150, 151+ words         | -                                            |
 * | article duration      | ceil(words / 150), floored at 1          | a stale manual duration                      |
 * | article points        | ceil(words / 10), floored at 1           | stale question-based points                  |
 * | exam duration         | an integer of at least 1                 | 0, missing                                   |
 * | quiz/exam points      | 10 per question                          | stale article points                         |
 * | title                 | 1..255 characters                        | missing, 256+ characters                     |
 * | content branch        | body for article, tree for quiz/exam     | a tree surviving an article save             |
 * | question type         | text, listening                          | any other value                              |
 * | question content      | present                                  | missing                                      |
 * | answers count         | 2..6 per question                        | 1, 7                                        |
 * | tree state            | empty, stored rows present               | stored rows wiped by the add                 |
 * | audio                 | listening with audio_duration, no file   | an audio_url invented without an upload      |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F40-01 | article baseline - 150 words                | 150 words                          | body stored; duration 1; points 15                        |
 * | FT-F40-02 | article duration - 150 / 151 words          | 150 / 151 words                    | 1 minute / 2 minutes                                      |
 * | FT-F40-03 | article points - 10 / 11 words              | 10 / 11 words                      | 1 point / 2 points                                        |
 * | FT-F40-04 | article content - empty body                | tags only                          | duration 1; points 1                                      |
 * | FT-F40-05 | exam duration - 1 / 0                       | 1 / 0                              | accepted / rejected on duration                           |
 * | FT-F40-06 | exam duration - missing (invalid side)      | omitted                            | rejected on duration                                      |
 * | FT-F40-07 | exam - manual duration and question points  | 2 questions, duration 45           | duration 45; points 20                                    |
 * | FT-F40-08 | quiz duration - per-question reading time   | 2 x 150-word questions             | duration 2; points 20                                     |
 * | FT-F40-09 | type - outsider (invalid side)              | video                              | rejected on type; row unchanged                           |
 * | FT-F40-10 | content branch - switch to article          | a stored quiz tree                 | tree wiped; body stored; stats from the words             |
 * | FT-F40-11 | title length - 255 / 256                    | 255 / 256 characters               | accepted / rejected on title                              |
 * | FT-F40-12 | access - student (invalid side)             | student PUT                        | 403; row unchanged                                        |
 * | FT-F40-13 | access - guest (invalid side)               | logged-out PUT                     | redirect to login; row unchanged                          |
 * | FT-F40-14 | target - unknown and foreign lesson         | unknown id / other course's lesson | 404 / 404                                                 |
 * | FT-F40-15 | question add baseline                       | text question + 2 answers          | question and answers created; points 10; duration 1       |
 * | FT-F40-16 | answers count - min-1 (invalid side)        | 1 answer                           | rejected on questions.0.answers; no question created      |
 * | FT-F40-17 | answers count - max (valid side)            | 6 answers                          | accepted; six answer rows created                         |
 * | FT-F40-18 | answers count - max+1 (invalid side)        | 7 answers                          | rejected on questions.0.answers; no question created      |
 * | FT-F40-19 | question content - missing (invalid side)   | question_content omitted           | rejected on questions.0.question_content                  |
 * | FT-F40-20 | question type - outsider (invalid side)     | video                              | rejected on questions.0.type                              |
 * | FT-F40-21 | tree state - stored rows plus a new row     | one stored question + one new      | both rows survive; new row ordered after the stored one;  |
 * |           |                                             |                                    | points 20                                                 |
 * | FT-F40-22 | listening question without a file           | audio_duration 30, 150 words       | audio_url null; duration 2; points 10                     |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already covers the article baseline (150 words - one
 * minute, fifteen points), the exam time limit (required and stored), the
 * empty quiz tree floor, the switch to article wiping the tree, the whole-tree
 * sync, the audio rules, and the student rejection. F-40 deliberately repeats
 * the article baseline, the type switch, and the mixed-tree save so the
 * feature file is self-contained; the new content is the duration boundary
 * (150/151 words), the points boundary (10/11 words), the empty-body floor,
 * the exam minimum (1/0), the exam's question-derived points, the quiz
 * reading time across two questions, the outsider type, the title length
 * boundary, the answer-count quartet (2..6), the missing-content and
 * invalid-type rejections, the listening question without a file, the guest
 * PUT, and the unknown/foreign 404s.
 *
 * The question-tree cases were first drafted under F-39; when the story scope
 * was corrected - F-39 is the lesson-list view - they were folded here, since
 * the question tree rides this lesson save. The lesson list itself is F-39's
 * subject; the lesson editor page and the outline are F-35's subject. The
 * gate ordering is F-04's subject; this route shares the same middleware
 * group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Article duration is ceil(words / 150) and points is ceil(words / 10),
 *   both floored at one; HTML tags are stripped before counting, so an empty
 *   body still saves with one minute and one point.
 * - Quiz duration is the sum of each question's reading time (words / 150)
 *   plus its audio (seconds / 60), rounded up and floored at one minute;
 *   quiz points are ten per question.
 * - Exam duration is the submitted manual limit (required, at least one);
 *   exam points still follow the question count.
 * - Saving as article wipes the stored question tree; saving as quiz or exam
 *   clears the article body.
 * - A row without an id creates a new question with its answers; a stored row
 *   missing from the payload is deleted. Every question requires 2 to 6
 *   answers.
 * - A listening question may carry audio_duration without an uploaded file in
 *   this save; audio_url stays null until a file is uploaded.
 * - Validation failures leave the stored row exactly as it was.
 */

use App\Models\Answer;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Question;
use App\Models\User;

beforeEach(function () {
    $this->admin = f40Admin();
});

test('FT-F40-01 - an admin saves a 150-word article with derived stats', function () {
    // Boundary: article baseline. One hundred fifty words are one minute of
    // reading and fifteen points.
    $lesson = f40Lesson();
    $content = '<p>'.trim(str_repeat('word ', 150)).'</p>';

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'article',
            'duration' => null,
            'article_content' => $content,
        ])
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh())
        ->title->toBe('Skimming Basics')
        ->type->toBe('article')
        ->article_content->toBe($content)
        ->duration->toBe(1)
        ->points->toBe(15);
});

test('FT-F40-02 - the article duration boundary is 150 words', function () {
    // Boundary: 150 words round to one minute; 151 words round up to two.
    $lesson = f40Lesson();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
            'article_content' => '<p>'.trim(str_repeat('word ', 150)).'</p>',
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh()->duration)->toBe(1);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
            'article_content' => '<p>'.trim(str_repeat('word ', 151)).'</p>',
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh()->duration)->toBe(2);
});

test('FT-F40-03 - the article points boundary is 10 words', function () {
    // Boundary: ten words are one point; eleven words round up to two.
    $lesson = f40Lesson();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
            'article_content' => '<p>'.trim(str_repeat('word ', 10)).'</p>',
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh()->points)->toBe(1)
        ->and($lesson->fresh()->duration)->toBe(1);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
            'article_content' => '<p>'.trim(str_repeat('word ', 11)).'</p>',
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh()->points)->toBe(2)
        ->and($lesson->fresh()->duration)->toBe(1);
});

test('FT-F40-04 - an empty article body floors the stats at one', function () {
    // Boundary: zero words. Tags are stripped before counting, so the floor
    // applies and the body is still stored as submitted.
    $lesson = f40Lesson();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
            'article_content' => '<p></p>',
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh())
        ->article_content->toBe('<p></p>')
        ->duration->toBe(1)
        ->points->toBe(1);
});

test('FT-F40-05 - the exam duration minimum is one minute', function () {
    // Boundary: exam duration 1 / 0. The rejected save leaves the stored
    // duration alone.
    $lesson = f40Lesson();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ExamPayload(1))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh()->duration)->toBe(1);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ExamPayload(0))
        ->assertSessionHasErrors(['duration']);

    expect($lesson->fresh()->duration)->toBe(1);
});

test('FT-F40-06 - an exam without a duration is rejected', function () {
    // Boundary: exam duration, invalid side (missing). The stored type and
    // duration are untouched.
    $lesson = f40Lesson();
    $payload = f40ExamPayload(30);
    unset($payload['duration']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), $payload)
        ->assertSessionHasErrors(['duration']);

    expect($lesson->fresh()->type)->toBe('article');
});

test('FT-F40-07 - an exam keeps its manual duration and derives points from questions', function () {
    // Boundary: exam duration and the question-based points. Two questions
    // are twenty points; the manual forty-five minutes survive.
    $lesson = f40Lesson();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ExamPayload(45, [
            f40Question('First exam question?'),
            f40Question('Second exam question?'),
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh())
        ->type->toBe('exam')
        ->duration->toBe(45)
        ->points->toBe(20)
        ->article_content->toBeNull();

    expect(Question::query()->where('lesson_id', $lesson->id)->count())->toBe(2);
});

test('FT-F40-08 - quiz duration sums the reading time of every question', function () {
    // Boundary: two 150-word questions are two minutes; points are ten per
    // question.
    $lesson = f40Lesson();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), [
            'title' => 'Quiz Lesson',
            'type' => 'quiz',
            'duration' => null,
            'questions' => [
                f40Question(trim(str_repeat('word ', 150))),
                f40Question(trim(str_repeat('word ', 150))),
            ],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh())
        ->duration->toBe(2)
        ->points->toBe(20);
});

test('FT-F40-09 - an unknown lesson type is rejected', function () {
    // Boundary: type, invalid side (outside article/quiz/exam).
    $lesson = f40Lesson();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), [
            'title' => 'Video Lesson',
            'type' => 'video',
            'duration' => null,
        ])
        ->assertSessionHasErrors(['type']);

    expect($lesson->fresh())
        ->type->toBe('article')
        ->title->not->toBe('Video Lesson');
});

test('FT-F40-10 - switching a quiz to an article wipes its question tree', function () {
    // Boundary: content branch. The stored tree is deleted, the body is
    // stored, and the stats follow the words.
    $lesson = f40Lesson('quiz');
    $question = Question::factory()->for($lesson)->text()->create();
    Answer::factory()->for($question)->create();
    Answer::factory()->for($question)->correct()->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
            'article_content' => '<p>'.trim(str_repeat('word ', 150)).'</p>',
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect(Question::query()->where('lesson_id', $lesson->id)->count())->toBe(0)
        ->and(Answer::query()->where('question_id', $question->id)->count())->toBe(0)
        ->and($lesson->fresh())
        ->type->toBe('article')
        ->duration->toBe(1)
        ->points->toBe(15);
});

test('FT-F40-11 - the lesson title boundary is 255 characters', function () {
    // Boundary: title max / max+1.
    $lesson = f40Lesson();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
            'title' => str_repeat('l', 255),
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect($lesson->fresh()->title)->toHaveLength(255);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
            'title' => str_repeat('l', 256),
        ]))
        ->assertSessionHasErrors(['title']);

    expect($lesson->fresh()->title)->toHaveLength(255);
});

test('FT-F40-12 - a student cannot update a lesson', function () {
    // Boundary: access, invalid side (role).
    $lesson = f40Lesson();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
            'title' => 'Hacked Title',
        ]))
        ->assertForbidden();

    expect($lesson->fresh()->title)->not->toBe('Hacked Title');
});

test('FT-F40-13 - a guest cannot update a lesson', function () {
    // Boundary: access, invalid side (authentication).
    $lesson = f40Lesson();

    $this->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40ArticlePayload([
        'title' => 'Hacked Title',
    ]))->assertRedirect(route('login'));

    expect($lesson->fresh()->title)->not->toBe('Hacked Title');
});

test('FT-F40-14 - unknown and foreign lessons are not found', function () {
    // Boundary: target, invalid side. A lesson of another course is not
    // reachable through this course's URL.
    $lesson = f40Lesson();
    $foreign = f40Lesson();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, 999999]), f40ArticlePayload())
        ->assertNotFound();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $foreign]), f40ArticlePayload())
        ->assertNotFound();
});

test('FT-F40-15 - an admin adds a text question with two answers', function () {
    // Boundary: question add baseline. The new row and its answers are created
    // and the derived stats follow the question count.
    $lesson = f40Lesson('quiz');

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40QuizPayload([
            f40Question(),
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    $question = Question::query()->sole();
    $answers = $question->answers()->orderBy('order_index')->get();

    expect($question->lesson_id)->toBe($lesson->id)
        ->and($question->type)->toBe('text')
        ->and($question->order_index)->toBe(0)
        ->and($answers)->toHaveCount(2)
        ->and((bool) $answers[0]->is_true)->toBeTrue()
        ->and((bool) $answers[1]->is_true)->toBeFalse()
        ->and($lesson->fresh()->points)->toBe(10)
        ->and($lesson->fresh()->duration)->toBe(1);
});

test('FT-F40-16 - one answer is below the minimum', function () {
    // Boundary: answers count, min-1.
    $lesson = f40Lesson('quiz');

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40QuizPayload([
            f40Question(answers: 1),
        ]))
        ->assertSessionHasErrors(['questions.0.answers']);

    expect(Question::count())->toBe(0);
});

test('FT-F40-17 - six answers are accepted', function () {
    // Boundary: answers count, max (valid side).
    $lesson = f40Lesson('quiz');

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40QuizPayload([
            f40Question(answers: 6),
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    expect(Question::query()->sole()->answers()->count())->toBe(6);
});

test('FT-F40-18 - seven answers are above the maximum', function () {
    // Boundary: answers count, max+1.
    $lesson = f40Lesson('quiz');

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40QuizPayload([
            f40Question(answers: 7),
        ]))
        ->assertSessionHasErrors(['questions.0.answers']);

    expect(Question::count())->toBe(0);
});

test('FT-F40-19 - a question without content is rejected', function () {
    // Boundary: question content, invalid side (missing).
    $lesson = f40Lesson('quiz');
    $question = f40Question();
    unset($question['question_content']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40QuizPayload([$question]))
        ->assertSessionHasErrors(['questions.0.question_content']);

    expect(Question::count())->toBe(0);
});

test('FT-F40-20 - an unknown question type is rejected', function () {
    // Boundary: question type, invalid side (outside text/listening).
    $lesson = f40Lesson('quiz');

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40QuizPayload([
            f40Question(type: 'video'),
        ]))
        ->assertSessionHasErrors(['questions.0.type']);

    expect(Question::count())->toBe(0);
});

test('FT-F40-21 - adding a row keeps the stored question and its answers', function () {
    // Boundary: tree state. The stored row rides the payload with its ids;
    // the new row is appended after it.
    $lesson = f40Lesson('quiz');
    $stored = Question::factory()->for($lesson)->text()->create([
        'question_content' => 'Stored question?',
        'order_index' => 0,
    ]);
    $storedCorrect = Answer::factory()->for($stored)->correct()->create(['answer_content' => 'Stored correct']);
    $storedWrong = Answer::factory()->for($stored)->create(['answer_content' => 'Stored wrong']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40QuizPayload([
            [
                'id' => $stored->id,
                'type' => 'text',
                'question_content' => 'Stored question?',
                'answers' => [
                    ['id' => $storedCorrect->id, 'answer_content' => 'Stored correct', 'is_true' => '1'],
                    ['id' => $storedWrong->id, 'answer_content' => 'Stored wrong', 'is_true' => '0'],
                ],
            ],
            f40Question('New question?'),
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    $created = Question::query()->whereKeyNot($stored->id)->sole();

    expect(Question::count())->toBe(2)
        ->and($stored->fresh())->not->toBeNull()
        ->and($created->order_index)->toBe(1)
        ->and(Answer::count())->toBe(4)
        ->and($lesson->fresh()->points)->toBe(20);
});

test('FT-F40-22 - a listening question may carry audio duration without a file', function () {
    // Partition: audio. The duration feeds the derived reading time even when
    // no file is uploaded, and the audio url stays null.
    $lesson = f40Lesson('quiz');

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$lesson->course, $lesson]), f40QuizPayload([
            f40Question(
                content: trim(str_repeat('word ', 150)),
                type: 'listening',
                extra: ['audio_duration' => 30],
            ),
        ]))
        ->assertRedirect(route('dashboard.courses.edit', $lesson->course));

    $question = Question::query()->sole();

    expect($question->type)->toBe('listening')
        ->and($question->audio_url)->toBeNull()
        ->and($question->audio_duration)->toBe(30)
        ->and($lesson->fresh()->duration)->toBe(2)
        ->and($lesson->fresh()->points)->toBe(10);
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f40Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * A lesson inside its own course and module, ready for a whole-payload save.
 */
function f40Lesson(string $type = 'article'): Lesson
{
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    return Lesson::factory()->for($module)->{$type}()->create([
        'title' => 'Original Lesson',
    ]);
}

/**
 * A valid article save.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function f40ArticlePayload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Skimming Basics',
        'type' => 'article',
        'duration' => null,
        'article_content' => '<p>'.trim(str_repeat('word ', 150)).'</p>',
    ], $overrides);
}

/**
 * A valid exam save carrying the manual limit and the question rows.
 *
 * @param  array<int, array<string, mixed>>  $questions
 * @return array<string, mixed>
 */
function f40ExamPayload(int $duration, array $questions = []): array
{
    return [
        'title' => 'Exam Lesson',
        'type' => 'exam',
        'duration' => $duration,
        'questions' => $questions,
    ];
}

/**
 * A valid quiz save carrying the given question rows.
 *
 * @param  array<int, array<string, mixed>>  $questions
 * @return array<string, mixed>
 */
function f40QuizPayload(array $questions): array
{
    return [
        'title' => 'Quiz Lesson',
        'type' => 'quiz',
        'duration' => null,
        'questions' => $questions,
    ];
}

/**
 * A new question row with the given content, answer count, and type.
 *
 * @param  array<string, mixed>  $extra
 * @return array<string, mixed>
 */
function f40Question(
    string $content = 'What is the capital of Indonesia?',
    int $answers = 2,
    string $type = 'text',
    array $extra = [],
): array {
    return array_merge([
        'type' => $type,
        'question_content' => $content,
        'answers' => f40Answers($answers),
    ], $extra);
}

/**
 * The answer rows for one question, the first marked correct.
 *
 * @return array<int, array<string, string>>
 */
function f40Answers(int $count): array
{
    return collect(range(1, $count))
        ->map(fn (int $index): array => [
            'answer_content' => 'Choice '.$index,
            'is_true' => $index === 1 ? '1' : '0',
        ])
        ->all();
}
