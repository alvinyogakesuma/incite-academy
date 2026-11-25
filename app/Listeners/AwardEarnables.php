<?php

namespace App\Listeners;

use App\Events\StudentProgressed;
use App\Models\Avatar;
use App\Models\Badge;
use App\Models\ChallengeAttempt;
use App\Models\Course;
use App\Models\LearningPath;
use App\Models\LessonAttempt;
use App\Models\LessonCompletion;
use App\Models\User;
use App\Models\UserAvatar;
use App\Models\UserBadge;

/**
 * The earnables backbone — evaluates every unearned badge and
 * avatar against the student's progress and awards the ones whose
 * requirements are finally met. Awards are one-way: once the row
 * exists the item is never re-evaluated and never revoked, and
 * firstOrCreate keeps a repeated evaluation from double awarding.
 * The handle type-hint wires this listener through event
 * discovery. Ported from the deprecated app's AwardEarnables
 * action onto the event-listener seam.
 */
class AwardEarnables
{
    /**
     * Handle the event.
     */
    public function handle(StudentProgressed $event): void
    {
        $this->checkBadges($event->user);
        $this->checkAvatars($event->user);
    }

    /**
     * Award every badge whose requirements the student now
     * satisfies, skipping the ones already earned.
     */
    private function checkBadges(User $user): void
    {
        $awardedIds = UserBadge::query()
            ->where('user_id', $user->id)
            ->pluck('badge_id');

        foreach (Badge::query()->get() as $badge) {
            if ($awardedIds->contains($badge->id)) {
                continue;
            }

            if ($this->satisfies($user, $badge->requirements)) {
                UserBadge::firstOrCreate([
                    'user_id' => $user->id,
                    'badge_id' => $badge->id,
                ], ['awarded_at' => now()]);
            }
        }
    }

    /**
     * Award every avatar whose requirements the student now
     * satisfies, skipping the ones already earned.
     */
    private function checkAvatars(User $user): void
    {
        $awardedIds = UserAvatar::query()
            ->where('user_id', $user->id)
            ->pluck('avatar_id');

        foreach (Avatar::query()->get() as $avatar) {
            if ($awardedIds->contains($avatar->id)) {
                continue;
            }

            if ($this->satisfies($user, $avatar->requirements)) {
                UserAvatar::firstOrCreate([
                    'user_id' => $user->id,
                    'avatar_id' => $avatar->id,
                ], ['awarded_at' => now()]);
            }
        }
    }

    /**
     * Whether the student satisfies a requirements set — an
     * empty one can never be auto-earned, an AND set demands
     * every condition, an OR set any single one.
     *
     * @param  array{logic?: string, conditions?: array<int, array{type?: string, operator?: string, value?: string}>}|null  $requirements
     */
    private function satisfies(User $user, ?array $requirements): bool
    {
        if (empty($requirements) || empty($requirements['conditions'])) {
            return false;
        }

        $logic = $requirements['logic'] ?? 'AND';

        foreach ($requirements['conditions'] as $condition) {
            $met = $this->evaluateCondition($user, $condition);

            if ($logic === 'AND' && ! $met) {
                return false;
            }

            if ($logic === 'OR' && $met) {
                return true;
            }
        }

        return $logic === 'AND';
    }

    /**
     * Whether the student meets one condition — a threshold for
     * the numeric types, a completion pick for the entity types.
     *
     * @param  array{type?: string, operator?: string, value?: string}  $condition
     */
    private function evaluateCondition(User $user, array $condition): bool
    {
        $type = $condition['type'] ?? '';
        $operator = $condition['operator'] ?? '>=';
        $value = $condition['value'] ?? '0';

        $userValue = match ($type) {
            'points' => (int) $user->total_points,
            'quiz' => (int) (LessonAttempt::query()
                ->where('user_id', $user->id)
                ->max('percentage') ?? 0),
            'course' => $this->isCourseCompleted($user, (string) $value) ? 1 : 0,
            'path' => $this->isPathCompleted($user, (string) $value) ? 1 : 0,
            'challenge' => $this->hasChallengeAttempt($user, (string) $value) ? 1 : 0,
            default => 0,
        };

        $target = in_array($type, ['course', 'path', 'challenge'], true) ? 1 : (int) $value;

        return $this->matchOperator($userValue, $operator, $target);
    }

    /**
     * Whether the titled course's every lesson is completed by
     * the student.
     */
    private function isCourseCompleted(User $user, string $courseTitle): bool
    {
        if ($courseTitle === '') {
            return false;
        }

        $course = Course::query()->where('title', $courseTitle)->first();

        if ($course === null || (int) $course->lessons_count === 0) {
            return false;
        }

        $completed = LessonCompletion::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->count();

        return $completed >= (int) $course->lessons_count;
    }

    /**
     * Whether every course in the titled path is fully completed
     * by the student.
     */
    private function isPathCompleted(User $user, string $pathTitle): bool
    {
        if ($pathTitle === '') {
            return false;
        }

        $path = LearningPath::query()->with('courses')->where('title', $pathTitle)->first();

        if ($path === null || $path->courses->isEmpty()) {
            return false;
        }

        foreach ($path->courses as $course) {
            if ((int) $course->lessons_count === 0) {
                return false;
            }

            $completed = LessonCompletion::query()
                ->where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->count();

            if ($completed < (int) $course->lessons_count) {
                return false;
            }
        }

        return true;
    }

    /**
     * Whether the student has attempted the titled challenge at
     * all — the score is irrelevant, attempting is enough.
     */
    private function hasChallengeAttempt(User $user, string $challengeTitle): bool
    {
        if ($challengeTitle === '') {
            return false;
        }

        return ChallengeAttempt::query()
            ->where('user_id', $user->id)
            ->whereHas('challenge', fn ($query) => $query->where('title', $challengeTitle))
            ->exists();
    }

    /**
     * Compare a measured value against its target.
     */
    private function matchOperator(int $userValue, string $operator, int $target): bool
    {
        return match ($operator) {
            '>=' => $userValue >= $target,
            '<=' => $userValue <= $target,
            '>' => $userValue > $target,
            '<' => $userValue < $target,
            '=' => $userValue === $target,
            default => false,
        };
    }
}
