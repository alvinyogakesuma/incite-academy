<?php

namespace App\Observers;

use App\Actions\Gamification\RecordLeaderboardPoints;
use App\Events\StudentProgressed;
use App\Models\LessonAttempt;
use App\Models\User;

class LessonAttemptObserver
{
    /**
     * An attempt earns only what it adds to the student's best
     * score on the lesson — a retry below the personal best awards
     * nothing, and beating it awards the improvement. The award is
     * recorded on the attempt row. Every attempt, moving points or
     * not, also announces the student's progress so the earnables
     * listener can evaluate what it unlocked.
     */
    public function created(LessonAttempt $attempt): void
    {
        $bestBefore = (int) (LessonAttempt::query()
            ->where('user_id', $attempt->user_id)
            ->where('lesson_id', $attempt->lesson_id)
            ->where('id', '!=', $attempt->id)
            ->max('score') ?? 0);

        $delta = max(0, (int) $attempt->score - $bestBefore);

        $user = User::find($attempt->user_id);

        if ($user === null) {
            return;
        }

        if ($delta > 0) {
            $user->increment('total_points', $delta);
            $attempt->update(['points_awarded' => $delta]);

            app(RecordLeaderboardPoints::class)($user, $delta, $attempt->attempted_at);
        }

        StudentProgressed::dispatch($user);
    }

    /**
     * Removing an attempt settles the score against the remaining
     * ones — when the removed row was the best, the student's
     * total drops to the new best.
     */
    public function deleting(LessonAttempt $attempt): void
    {
        $oldBest = (int) (LessonAttempt::query()
            ->where('user_id', $attempt->user_id)
            ->where('lesson_id', $attempt->lesson_id)
            ->max('score') ?? 0);

        if ((int) $attempt->score < $oldBest) {
            // The removed row was not the best — nothing to settle.
            return;
        }

        $newBest = (int) (LessonAttempt::query()
            ->where('user_id', $attempt->user_id)
            ->where('lesson_id', $attempt->lesson_id)
            ->where('id', '!=', $attempt->id)
            ->max('score') ?? 0);

        $delta = $newBest - $oldBest;

        if ($delta !== 0) {
            $user = User::find($attempt->user_id);

            if ($user !== null) {
                $user->increment('total_points', $delta);

                app(RecordLeaderboardPoints::class)($user, $delta, $attempt->attempted_at);
            }
        }
    }
}
