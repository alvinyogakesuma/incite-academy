<?php

namespace App\Observers;

use App\Models\Course;
use App\Models\Module;

class ModuleObserver
{
    /**
     * A new module bumps the course's denormalized module count.
     */
    public function created(Module $module): void
    {
        Course::query()->whereKey($module->course_id)->increment('modules_count');
    }

    /**
     * The module's lessons cascade at the database level inside
     * the same DELETE — no lesson model events fire — so their
     * count and their duration/point sums must be captured
     * before the row disappears.
     */
    public function deleting(Module $module): void
    {
        $stats = $module->lessons()
            ->selectRaw('count(*) as cnt, coalesce(sum(duration), 0) as dur, coalesce(sum(points), 0) as pts')
            ->first();

        $module->deletedLessonsCount = (int) $stats->cnt;
        $module->deletedLessonsDuration = (int) $stats->dur;
        $module->deletedLessonsPoints = (int) $stats->pts;
    }

    /**
     * A removed module drops the course's module count and,
     * through the stashed tallies, the lessons the cascade took
     * with it.
     */
    public function deleted(Module $module): void
    {
        Course::query()->whereKey($module->course_id)->decrement('modules_count');
        Course::query()->whereKey($module->course_id)->decrement('lessons_count', $module->deletedLessonsCount ?? 0);
        Course::query()->whereKey($module->course_id)->increment('total_duration', -($module->deletedLessonsDuration ?? 0));
        Course::query()->whereKey($module->course_id)->increment('total_points', -($module->deletedLessonsPoints ?? 0));
    }
}
