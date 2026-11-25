<?php

namespace App\Observers;

use App\Actions\Gamification\RecordLeaderboardPoints;
use App\Events\StudentProgressed;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\User;

class LessonCompletionObserver
{
    /**
     * Completing an article lesson awards its points to the
     * student's running total and records the award on the
     * completion row. Quiz and exam lessons score their points
     * through their own assessment flows. Every completion also
     * announces the student's progress so the earnables listener
     * can evaluate what it unlocked.
     */
    public function created(LessonCompletion $completion): void
    {
        $user = User::find($completion->user_id);
        $lesson = Lesson::find($completion->lesson_id);

        if ($user !== null && $lesson !== null && $lesson->type === 'article') {
            $user->increment('total_points', (int) $lesson->points);
            $completion->update(['points_awarded' => (int) $lesson->points]);

            app(RecordLeaderboardPoints::class)($user, (int) $lesson->points, $completion->completed_at);
        }

        if ($user !== null) {
            StudentProgressed::dispatch($user);
        }
    }

    /**
     * Mirror the clawback when a completion row is removed.
     */
    public function deleted(LessonCompletion $completion): void
    {
        $user = User::find($completion->user_id);
        $lesson = Lesson::find($completion->lesson_id);

        if ($user !== null && $lesson !== null && $lesson->type === 'article') {
            $user->decrement('total_points', (int) $lesson->points);

            app(RecordLeaderboardPoints::class)($user, -(int) $lesson->points, $completion->completed_at);
        }
    }
}
