<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LessonUpdateRequest;
use App\Models\Answer;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Question;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LessonController extends Controller
{
    /**
     * Preview formulas — the server twin of the editor's stats.
     * Articles derive from word count, quizzes from question
     * reading time plus listening audio; points come from words or
     * the question count.
     */
    private const WORDS_PER_MINUTE = 150;

    private const WORDS_PER_POINT = 10;

    private const POINTS_PER_QUESTION = 10;

    /**
     * Create a blank lesson appended to the module's outline — the
     * module header's Add Item button. Stats recalculation is
     * deliberately left out; the denormalized counters are
     * refreshed by a later phase of the rebuild.
     */
    public function store(Request $request, Module $module): RedirectResponse
    {
        Gate::authorize('update', $module->course);

        Lesson::create([
            'course_id' => $module->course_id,
            'module_id' => $module->id,
            'title' => 'Untitled Lesson',
            'type' => 'article',
            'order_index' => (int) (Lesson::where('module_id', $module->id)->max('order_index') ?? -1) + 1,
        ]);

        return redirect()->route('dashboard.courses.edit', $module->course);
    }

    /**
     * Rename the lesson — the outline's inline title editor. The
     * full metadata save stays on the lesson editor's
     * whole-payload update.
     */
    public function rename(Request $request, Lesson $lesson): RedirectResponse
    {
        Gate::authorize('update', $lesson->course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $lesson->update($validated);

        return redirect()->route('dashboard.courses.edit', $lesson->course);
    }

    /**
     * Show the lesson editor with its questions and answers loaded
     * — the pencil button on the lesson bar routes here.
     */
    public function edit(Course $course, Lesson $lesson): Response
    {
        Gate::authorize('view', $course);

        $lesson->load([
            'questions' => fn ($query) => $query->orderBy('order_index'),
            'questions.answers' => fn ($query) => $query->orderBy('order_index'),
        ]);

        return Inertia::render('Dashboard/Lesson/Editor', [
            'courseId' => $course->id,
            'lesson' => [
                'id' => $lesson->id,
                'title' => $lesson->title,
                'type' => $lesson->type,
                'article_content' => $lesson->article_content,
                'duration' => $lesson->duration,
                'questions' => $lesson->questions
                    ->map(fn (Question $question) => [
                        'id' => $question->id,
                        'type' => $question->type,
                        'question_content' => $question->question_content,
                        'audio_url' => $question->audio_url && str_starts_with($question->audio_url, 'questions/')
                            ? Storage::disk('public')->url($question->audio_url)
                            : $question->audio_url,
                        'audio_duration' => $question->audio_duration,
                        'answers' => $question->answers
                            ->map(fn (Answer $answer) => [
                                'id' => $answer->id,
                                'answer_content' => $answer->answer_content,
                                'is_true' => (bool) $answer->is_true,
                            ])
                            ->all(),
                    ])
                    ->all(),
            ],
        ]);
    }

    /**
     * Update the lesson — its metadata, its content branch (the
     * article body, or the question/answer tree), and the derived
     * duration and points, all in one whole-payload save inside a
     * single transaction.
     */
    public function update(LessonUpdateRequest $request, Course $course, Lesson $lesson): RedirectResponse
    {
        Gate::authorize('update', $course);

        $validated = $request->validated();

        DB::transaction(function () use ($request, $lesson, $validated): void {
            $lesson->update([
                'title' => $validated['title'],
                'type' => $validated['type'],
                // Exams keep their time limit; article/quiz
                // durations are derived from the content.
                'duration' => $this->deriveDuration($validated),
                'points' => $this->derivePoints($validated),
                'article_content' => $validated['type'] === 'article'
                    ? ($validated['article_content'] ?? null)
                    : null,
            ]);

            // Articles carry their body — the question tree rides
            // only for quizzes and exams (a type switch wipes the
            // stored rows).
            $rows = $validated['type'] === 'article' ? [] : ($validated['questions'] ?? []);

            // ── Step 1 — filter the tree down to the payload's
            // kept rows (stored questions missing from the payload
            // delete, answers cascade), then lift every survivor
            // into a parking range above the current maximum with
            // one bulk write. The (lesson_id, order_index) unique
            // constraint then never sees a duplicate during the
            // sequential index writes below.
            $keptQuestionIds = collect($rows)->pluck('id')->filter()->values()->all();

            $lesson->questions()->whereNotIn('id', $keptQuestionIds)->delete();

            $parkAbove = (int) ($lesson->questions()->max('order_index') ?? -1) + 1;

            $lesson->questions()->update([
                'order_index' => DB::raw('order_index + '.$parkAbove),
            ]);

            // ── Step 2 — iterate the payload rows sequentially:
            // rows carrying one of the lesson's stored ids update
            // in place, rows without one create, and each field is
            // written in order.
            $storedQuestions = $lesson->questions()->get()->keyBy('id');

            foreach ($rows as $index => $row) {
                $question = $storedQuestions->get($this->rowId($row))
                    ?? $lesson->questions()->make();

                // Audio: a fresh upload replaces the stored file, a
                // type switch away from listening drops it, anything
                // else keeps it. Only files under our questions/
                // prefix are ours to delete (fake URLs from seeding
                // pass through unharmed).
                $audioUrl = $question->audio_url;

                if ($row['type'] !== 'listening') {
                    $this->deleteStoredAudio($audioUrl);

                    $audioUrl = null;
                } elseif ($file = $request->file("questions.{$index}.audio")) {
                    $this->deleteStoredAudio($audioUrl);

                    $audioUrl = $file->store('questions', 'public');
                }

                $question->type = $row['type'];
                $question->question_content = $row['question_content'];
                $question->audio_url = $audioUrl;
                $question->audio_duration = $row['audio_duration'] ?? null;
                $question->order_index = $index;
                $question->save();

                // Answers — same two steps: filter with one bulk
                // lift, then write each row sequentially.
                $keptAnswerIds = collect($row['answers'])->pluck('id')->filter()->values()->all();

                $question->answers()->whereNotIn('id', $keptAnswerIds)->delete();

                $parkAnswersAbove = (int) ($question->answers()->max('order_index') ?? -1) + 1;

                $question->answers()->update([
                    'order_index' => DB::raw('order_index + '.$parkAnswersAbove),
                ]);

                $storedAnswers = $question->answers()->get()->keyBy('id');

                foreach ($row['answers'] as $answerIndex => $answerRow) {
                    $answer = $storedAnswers->get($this->rowId($answerRow))
                        ?? $question->answers()->make();

                    $answer->answer_content = $answerRow['answer_content'];
                    $answer->is_true = filter_var($answerRow['is_true'] ?? false, FILTER_VALIDATE_BOOLEAN);
                    $answer->order_index = $answerIndex;
                    $answer->save();
                }
            }
        });

        // The save lands on the parent page — the course outline
        // the editor was opened from.
        return redirect()->route('dashboard.courses.edit', $course);
    }

    /**
     * Remove the lesson — its questions and answers cascade via
     * the foreign keys.
     */
    public function destroy(Lesson $lesson): RedirectResponse
    {
        Gate::authorize('update', $lesson->course);

        $course = $lesson->course;

        $lesson->delete();

        return redirect()->route('dashboard.courses.edit', $course);
    }

    /**
     * Rewrite the module's lesson order — the outline's drag
     * handle. The payload must cover every lesson exactly once; a
     * foreign or partial list never reorders another module's
     * rows.
     */
    public function reorder(Request $request, Module $module): RedirectResponse
    {
        Gate::authorize('update', $module->course);

        $validated = $request->validate([
            'lesson_order' => ['required', 'array', 'min:1'],
            'lesson_order.*' => ['required', 'integer'],
        ]);

        $requestedIds = collect($validated['lesson_order'])->map(fn ($id) => (int) $id)->all();

        $moduleLessonIds = $module->lessons()->orderBy('id')->pluck('id')->all();

        if (collect($requestedIds)->sort()->values()->all() !== $moduleLessonIds) {
            throw ValidationException::withMessages([
                'lesson_order' => 'The lesson order must cover every lesson exactly once.',
            ]);
        }

        DB::transaction(function () use ($module, $requestedIds): void {
            $lessons = $module->lessons()->get()->keyBy('id');

            // Park every row above the current maximum first — the
            // (module_id, order_index) unique constraint must never
            // see a duplicate during the shuffle.
            $parkAbove = (int) ($module->lessons()->max('order_index') ?? -1) + 1;

            foreach ($requestedIds as $index => $lessonId) {
                $lessons[$lessonId]->update(['order_index' => $parkAbove + $index]);
            }

            foreach ($requestedIds as $index => $lessonId) {
                $lessons[$lessonId]->update(['order_index' => $index]);
            }
        });

        return redirect()->route('dashboard.courses.edit', $module->course);
    }

    /**
     * The lesson's duration — the server twin of the editor's
     * preview: articles by word count, quizzes by question reading
     * time plus listening audio, exams by their manual time limit.
     *
     * @param  array<string, mixed>  $validated
     */
    private function deriveDuration(array $validated): ?int
    {
        if ($validated['type'] === 'article') {
            $words = $this->countWords((string) ($validated['article_content'] ?? ''));

            return max(1, (int) ceil($words / self::WORDS_PER_MINUTE));
        }

        if ($validated['type'] === 'exam') {
            return (int) $validated['duration'];
        }

        $minutes = collect($validated['questions'] ?? [])->sum(function (array $question): float {
            return $this->countWords((string) $question['question_content']) / self::WORDS_PER_MINUTE
                + ((int) ($question['audio_duration'] ?? 0)) / 60;
        });

        return max(1, (int) ceil($minutes));
    }

    /**
     * The lesson's points — articles by word count, quiz/exam by
     * the question count.
     *
     * @param  array<string, mixed>  $validated
     */
    private function derivePoints(array $validated): int
    {
        if ($validated['type'] === 'article') {
            $words = $this->countWords((string) ($validated['article_content'] ?? ''));

            return max(1, (int) ceil($words / self::WORDS_PER_POINT));
        }

        return count($validated['questions'] ?? []) * self::POINTS_PER_QUESTION;
    }

    /**
     * The row's stored id — null when the row is new (or its id is
     * foreign to this lesson, in which case it creates).
     *
     * @param  array<string, mixed>  $row
     */
    private function rowId(array $row): ?int
    {
        return isset($row['id']) && $row['id'] !== '' && $row['id'] !== null
            ? (int) $row['id']
            : null;
    }

    /**
     * Delete a stored audio file — only files under our questions/
     * prefix are ours to remove.
     */
    private function deleteStoredAudio(?string $audioUrl): void
    {
        if ($audioUrl && str_starts_with($audioUrl, 'questions/')) {
            Storage::disk('public')->delete($audioUrl);
        }
    }

    /**
     * Word count for WYSIWYG content — tags stripped, the
     * remaining text splits on whitespace runs.
     */
    private function countWords(string $content): int
    {
        $text = trim(strip_tags($content));

        return $text === '' ? 0 : count(preg_split('/\s+/', $text));
    }
}
