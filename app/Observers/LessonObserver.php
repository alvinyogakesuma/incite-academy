<?php

namespace App\Observers;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;

class LessonObserver
{
    /**
     * A directly created lesson bumps both denormalized lesson
     * counters and folds its duration and points into the course
     * and module sums. Blank lessons carry null stats, so the
     * fold is a no-op until their first content save.
     */
    public function created(Lesson $lesson): void
    {
        Course::query()->whereKey($lesson->course_id)->increment('lessons_count');
        Module::query()->whereKey($lesson->module_id)->increment('lessons_count');

        $this->adjustSums($lesson, (int) ($lesson->duration ?? 0), (int) ($lesson->points ?? 0));
    }

    /**
     * A lesson save that changed its derived stats shifts the
     * course and module sums by the delta — renames and reorders
     * change nothing and skip the extra writes.
     */
    public function updated(Lesson $lesson): void
    {
        $durationDelta = (int) ($lesson->duration ?? 0) - (int) ($lesson->getOriginal('duration') ?? 0);
        $pointsDelta = (int) ($lesson->points ?? 0) - (int) ($lesson->getOriginal('points') ?? 0);

        if ($durationDelta !== 0 || $pointsDelta !== 0) {
            $this->adjustSums($lesson, $durationDelta, $pointsDelta);
        }
    }

    /**
     * Mirror the decrements when a lesson row is deleted through
     * Eloquent. Cascade deletes never reach this — they are raw
     * database deletes, and the owning module's observer settles
     * those tallies instead.
     */
    public function deleted(Lesson $lesson): void
    {
        Course::query()->whereKey($lesson->course_id)->decrement('lessons_count');
        Module::query()->whereKey($lesson->module_id)->decrement('lessons_count');

        $this->adjustSums($lesson, -(int) ($lesson->duration ?? 0), -(int) ($lesson->points ?? 0));
    }

    /**
     * Shift the denormalized duration and point sums by the
     * lesson's delta — negative deltas decrement.
     */
    private function adjustSums(Lesson $lesson, int $durationDelta, int $pointsDelta): void
    {
        if ($durationDelta !== 0) {
            Course::query()->whereKey($lesson->course_id)->increment('total_duration', $durationDelta);
        }

        if ($pointsDelta !== 0) {
            Course::query()->whereKey($lesson->course_id)->increment('total_points', $pointsDelta);
            Module::query()->whereKey($lesson->module_id)->increment('total_points', $pointsDelta);
        }
    }
}
