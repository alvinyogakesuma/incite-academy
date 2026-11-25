<?php

namespace App\Http\Controllers;

use App\Enums\Category;
use App\Models\Challenge;
use App\Models\ChallengeAnswer;
use App\Models\ChallengeAttempt;
use App\Models\ChallengeQuestion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ChallengeController extends Controller
{
    /**
     * Display the student-facing challenges listing — the timed
     * duels the admin manages, each card carrying its cover and
     * question count.
     */
    public function index(): Response
    {
        $challenges = Challenge::query()
            ->withCount('questions')
            ->orderBy('title')
            ->get()
            ->map(fn (Challenge $challenge) => [
                'id' => $challenge->id,
                'title' => $challenge->title,
                'description' => $challenge->description,
                'image_url' => $challenge->image_url && str_starts_with($challenge->image_url, 'challenges/')
                    ? Storage::disk('public')->url($challenge->image_url)
                    : $challenge->image_url,
                'category' => $challenge->category?->value,
                'difficulty' => $challenge->difficulty?->value,
                'points' => (int) $challenge->points,
                'duration' => (int) $challenge->duration,
                'questions_count' => (int) $challenge->questions_count,
            ]);

        return Inertia::render('Challenges', [
            'challenges' => $challenges,
            'categories' => array_column(Category::cases(), 'value'),
        ]);
    }

    /**
     * Show one challenge with the signed-in student's attempt
     * history, the newest first — the listing's view action routes
     * here.
     */
    public function show(Challenge $challenge): Response
    {
        $challenge->loadCount('questions');

        $attempts = ChallengeAttempt::query()
            ->where('user_id', request()->user()->id)
            ->where('challenge_id', $challenge->id)
            ->orderByDesc('attempted_at')
            ->get()
            ->map(fn (ChallengeAttempt $attempt) => [
                'score' => (int) $attempt->score,
                'total' => (int) $attempt->total_points,
                'percentage' => (int) $attempt->percentage,
                'attempted_at' => $attempt->attempted_at->format('M j, Y \a\t g:i A'),
            ])
            ->all();

        return Inertia::render('Challenges/Detail', [
            'challenge' => [
                'id' => $challenge->id,
                'title' => $challenge->title,
                'description' => $challenge->description,
                'category' => $challenge->category?->value,
                'difficulty' => $challenge->difficulty?->value,
                'points' => (int) $challenge->points,
                'duration' => (int) $challenge->duration,
                'questions_count' => (int) $challenge->questions_count,
            ],
            'attempts' => $attempts,
        ]);
    }

    /**
     * The challenge take screen — its questions with their
     * answers, ordered. The answer key never ships: only the
     * server scores, and only the submitted answer ids ever meet
     * the stored correctness.
     */
    public function take(Challenge $challenge): Response
    {
        $challenge->load([
            'questions' => fn ($query) => $query->orderBy('order_index'),
            'questions.answers' => fn ($query) => $query->orderBy('order_index'),
        ]);

        return Inertia::render('Challenges/Room', [
            'challenge' => [
                'id' => $challenge->id,
                'title' => $challenge->title,
                'duration' => (int) $challenge->duration,
                'points' => (int) $challenge->points,
            ],
            'questions' => $challenge->questions
                ->map(fn (ChallengeQuestion $question) => [
                    'id' => $question->id,
                    'type' => $question->type,
                    'question_content' => $question->question_content,
                    'audio_url' => $question->audio_url && str_starts_with($question->audio_url, 'challenges/')
                        ? Storage::disk('public')->url($question->audio_url)
                        : $question->audio_url,
                    'answers' => $question->answers
                        ->map(fn (ChallengeAnswer $answer) => [
                            'id' => $answer->id,
                            'answer_content' => $answer->answer_content,
                        ])
                        ->all(),
                ])
                ->all(),
            'result' => session('challenge_result'),
        ]);
    }

    /**
     * Score a finished challenge attempt. The score here is
     * authoritative: correctness comes from the stored rows, the
     * attempt's points ride the observer's best-score awarding,
     * and the result flashes back to the take screen.
     */
    public function submit(Request $request, Challenge $challenge): RedirectResponse
    {
        $validated = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*' => ['required', 'integer'],
        ]);

        $challenge->load(['questions.answers']);

        $answers = $validated['answers'];
        $correctCount = 0;

        foreach ($challenge->questions as $question) {
            $submittedAnswerId = $answers[$question->id] ?? null;

            if ($submittedAnswerId === null) {
                continue;
            }

            $answer = $question->answers->firstWhere('id', (int) $submittedAnswerId);

            if ($answer !== null && $answer->is_correct) {
                $correctCount++;
            }
        }

        $totalQuestions = $challenge->questions->count();
        $percentage = $totalQuestions > 0 ? (int) round(($correctCount / $totalQuestions) * 100) : 0;
        $score = (int) round(($challenge->points * $percentage) / 100);

        ChallengeAttempt::create([
            'user_id' => $request->user()->id,
            'challenge_id' => $challenge->id,
            'score' => $score,
            'total_points' => (int) $challenge->points,
            'correct_count' => $correctCount,
            'total_questions' => $totalQuestions,
            'percentage' => $percentage,
            'attempted_at' => now(),
        ]);

        return redirect()
            ->back()
            ->with('challenge_result', [
                'score' => $score,
                'total_points' => (int) $challenge->points,
                'correct_count' => $correctCount,
                'total_questions' => $totalQuestions,
                'percentage' => $percentage,
            ]);
    }
}
