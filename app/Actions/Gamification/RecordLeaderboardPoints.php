<?php

namespace App\Actions\Gamification;

use App\Models\AllTimeLeaderboard;
use App\Models\MonthlyLeaderboard;
use App\Models\User;
use App\Models\WeeklyLeaderboard;
use App\Models\YearlyLeaderboard;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Fans a points delta out to the four materialized leaderboard
 * tables. The all-time mirror takes the delta directly; the three
 * calendar periods anchor to the award's own timestamp, so
 * clawbacks settle against the period the points were earned in.
 * A negative delta only touches existing rows — there is nothing
 * to claw back from awards that predate the tables.
 */
class RecordLeaderboardPoints
{
    public function __invoke(User $user, int $delta, ?CarbonInterface $at = null): void
    {
        if ($delta === 0) {
            return;
        }

        $at ??= CarbonImmutable::now();

        $this->bump(AllTimeLeaderboard::query(), $user->id, $delta);
        $this->bump(WeeklyLeaderboard::query(), $user->id, $delta, self::weekStart($at));
        $this->bump(MonthlyLeaderboard::query(), $user->id, $delta, self::monthStart($at));
        $this->bump(YearlyLeaderboard::query(), $user->id, $delta, self::yearStart($at));
    }

    /**
     * The Monday opening the timestamp's week.
     */
    public static function weekStart(CarbonInterface $at): string
    {
        return CarbonImmutable::instance($at)->startOfWeek()->toDateString();
    }

    /**
     * The first day of the timestamp's month.
     */
    public static function monthStart(CarbonInterface $at): string
    {
        return CarbonImmutable::instance($at)->startOfMonth()->toDateString();
    }

    /**
     * The first day of the timestamp's year.
     */
    public static function yearStart(CarbonInterface $at): string
    {
        return CarbonImmutable::instance($at)->startOfYear()->toDateString();
    }

    /**
     * Move one table's row by the delta — creating it for fresh
     * awards, never for clawbacks.
     *
     * @param  array<string, mixed>|null  $periodStart
     */
    private function bump(Builder $query, int $userId, int $delta, ?string $periodStart = null): void
    {
        $keys = ['user_id' => $userId];

        if ($periodStart !== null) {
            $keys['period_start'] = $periodStart;
        }

        /** @var Model $row */
        $row = $query->where($keys)->first();

        if ($row === null) {
            if ($delta < 0) {
                return;
            }

            $query->create([...$keys, 'points' => $delta]);

            return;
        }

        $row->forceFill(['points' => max(0, (int) $row->points + $delta)])->save();
    }
}
