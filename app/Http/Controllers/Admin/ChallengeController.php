<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Category;
use App\Enums\Difficulty;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ChallengeUpdateRequest;
use App\Models\Challenge;
use App\Models\ChallengeAnswer;
use App\Models\ChallengeQuestion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ChallengeController extends Controller
{
    /**
     * Display the challenges listing (search, filtering, sorting,
     * and pagination are handled client-side).
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', Challenge::class);

        $challenges = Challenge::query()
            ->withCount('questions')
            ->orderBy('title')
            ->get()
            ->map(fn (Challenge $challenge) => [
                'id' => $challenge->id,
                'title' => $challenge->title,
                'description' => $challenge->description,
                'category' => $challenge->category?->value,
                'difficulty' => $challenge->difficulty?->value,
                'points' => (int) $challenge->points,
                'duration' => (int) $challenge->duration,
                'image_url' => $challenge->image_url && str_starts_with($challenge->image_url, 'challenges/')
                    ? Storage::disk('public')->url($challenge->image_url)
                    : $challenge->image_url,
                'questions_count' => (int) $challenge->questions_count,
            ]);

        return Inertia::render('Dashboard/Challenges', [
            'challenges' => $challenges,
            'categories' => array_column(Category::cases(), 'value'),
        ]);
    }

    /**
     * Create a blank challenge row and open the editor with it —
     * the same blank-draft flow the course and lesson editors
     * use; the metadata save fills the real values.
     */
    public function store(): RedirectResponse
    {
        Gate::authorize('create', Challenge::class);

        $challenge = Challenge::create([
            'title' => 'Untitled Challenge',
            'category' => Category::ReadingComprehension,
            'difficulty' => Difficulty::Easy,
            'points' => 0,
            'duration' => 0,
        ]);

        return redirect()->route('dashboard.challenges.edit', $challenge);
    }

    /**
     * Show the challenge editor with its question/answer tree
     * loaded — the listing's edit button routes here.
     */
    public function edit(Challenge $challenge): Response
    {
        Gate::authorize('view', $challenge);

        $challenge->load([
            'questions' => fn ($query) => $query->orderBy('order_index'),
            'questions.answers' => fn ($query) => $query->orderBy('order_index'),
        ]);

        return Inertia::render('Dashboard/Challenges/Editor', [
            'challenge' => [
                'id' => $challenge->id,
                'title' => $challenge->title,
                'description' => $challenge->description,
                'category' => $challenge->category?->value,
                'difficulty' => $challenge->difficulty?->value,
                'points' => (int) $challenge->points,
                'duration' => (int) $challenge->duration,
                'image_url' => $challenge->image_url && str_starts_with($challenge->image_url, 'challenges/')
                    ? Storage::disk('public')->url($challenge->image_url)
                    : $challenge->image_url,
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
                                'is_correct' => (bool) $answer->is_correct,
                            ])
                            ->all(),
                    ])
                    ->all(),
            ],
            'categories' => array_column(Category::cases(), 'value'),
            'difficulties' => array_column(Difficulty::cases(), 'value'),
        ]);
    }

    /**
     * Update the challenge — its metadata, its cover image, and
     * its question/answer tree, all in one whole-payload save
     * inside a single transaction, written sequentially.
     */
    public function update(ChallengeUpdateRequest $request, Challenge $challenge): RedirectResponse
    {
        Gate::authorize('update', $challenge);

        $validated = $request->validated();

        // The cover image is required unless one is already stored
        // and this save keeps it — the server twin of the form's
        // superRefine guard.
        if (! $request->hasFile('image') && (! $challenge->image_url || $request->boolean('remove_image'))) {
            return back()->withErrors(['image' => 'The challenge image is required.']);
        }

        DB::transaction(function () use ($request, $challenge, $validated): void {
            // The cover: a fresh upload replaces the stored one,
            // remove_image clears it, anything else keeps it —
            // only files under our challenges/ storage prefix are
            // ours to delete (seeded nulls pass through unharmed).
            $imageUrl = $challenge->image_url;

            if ($request->hasFile('image')) {
                if (str_starts_with((string) $challenge->image_url, 'challenges/')) {
                    Storage::disk('public')->delete($challenge->image_url);
                }

                $imageUrl = $request->file('image')->store('challenges', 'public');
            } elseif ($request->boolean('remove_image')) {
                if (str_starts_with((string) $challenge->image_url, 'challenges/')) {
                    Storage::disk('public')->delete($challenge->image_url);
                }

                $imageUrl = null;
            }

            $challenge->update([
                'title' => $validated['title'],
                'description' => $validated['description'],
                'category' => $validated['category'],
                'difficulty' => $validated['difficulty'],
                'points' => $validated['points'],
                'duration' => $validated['duration'],
                'image_url' => $imageUrl,
            ]);

            // ── The question tree sync, written sequentially:
            // rows carrying one of the challenge's stored ids
            // update in place, rows without one create, stored
            // questions missing from the payload delete with
            // their cascaded answers, and each field is written
            // in order.
            $rows = $validated['questions'] ?? [];

            $keptQuestionIds = collect($rows)->pluck('id')->filter()->values()->all();

            $challenge->questions()->whereNotIn('id', $keptQuestionIds)->delete();

            $storedQuestions = $challenge->questions()->get()->keyBy('id');

            foreach ($rows as $index => $row) {
                $question = $storedQuestions->get($row['id'] ?? null)
                    ?? $challenge->questions()->make();

                // Audio: a fresh upload replaces the stored file, a
                // type switch away from listening drops it, the
                // remove flag drops it, anything else keeps it.
                $audioUrl = $question->audio_url;

                if ($row['type'] !== 'listening') {
                    $this->deleteStoredAudio($audioUrl);

                    $audioUrl = null;
                } elseif ($file = $request->file("questions.{$index}.audio")) {
                    $this->deleteStoredAudio($audioUrl);

                    $audioUrl = $file->store('challenges/audio', 'public');
                } elseif (filter_var($row['remove_audio'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                    $this->deleteStoredAudio($audioUrl);

                    $audioUrl = null;
                }

                $question->type = $row['type'];
                $question->question_content = $row['question_content'];
                $question->audio_url = $audioUrl;
                $question->order_index = $index;
                $question->save();

                // Answers — the same kept/create/drop semantics on
                // the nested rows.
                $keptAnswerIds = collect($row['answers'])->pluck('id')->filter()->values()->all();

                $question->answers()->whereNotIn('id', $keptAnswerIds)->delete();

                $storedAnswers = $question->answers()->get()->keyBy('id');

                foreach ($row['answers'] as $answerIndex => $answerRow) {
                    $answer = $storedAnswers->get($answerRow['id'] ?? null)
                        ?? $question->answers()->make();

                    $answer->answer_content = $answerRow['answer_content'];
                    $answer->is_correct = filter_var($answerRow['is_correct'] ?? false, FILTER_VALIDATE_BOOLEAN);
                    $answer->order_index = $answerIndex;
                    $answer->save();
                }
            }
        });

        // The save lands on the parent page — the challenges
        // listing.
        return redirect()->route('dashboard.challenges');
    }

    /**
     * Delete the challenge — the cascading foreign keys take its
     * question and answer tree, so only the stored files need
     * manual cleanup.
     */
    public function destroy(Challenge $challenge): RedirectResponse
    {
        Gate::authorize('delete', $challenge);

        if (str_starts_with((string) $challenge->image_url, 'challenges/')) {
            Storage::disk('public')->delete($challenge->image_url);
        }

        $challenge->questions()->each(function (ChallengeQuestion $question): void {
            $this->deleteStoredAudio($question->audio_url);
        });

        $challenge->delete();

        return redirect()->route('dashboard.challenges');
    }

    /**
     * Delete a stored audio file — only files under our
     * challenges/audio prefix are ours to remove.
     */
    private function deleteStoredAudio(?string $audioUrl): void
    {
        if ($audioUrl && str_starts_with($audioUrl, 'challenges/audio/')) {
            Storage::disk('public')->delete($audioUrl);
        }
    }
}
