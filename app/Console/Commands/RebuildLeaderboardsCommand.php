<?php

namespace App\Console\Commands;

use App\Actions\Gamification\RecordLeaderboardPoints;
use App\Models\AllTimeLeaderboard;
use App\Models\ChallengeAttempt;
use App\Models\LessonAttempt;
use App\Models\LessonCompletion;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

class RebuildLeaderboardsCommand extends Command
{
    /**
     * Repopulate the four materialized leaderboard tables from the
     * points history — the attempts' and completions' points_awarded
     * columns feed the three period tables, and the users' running
     * totals feed the all-time mirror. Safe to re-run any time: the
     * tables are the cache, the sources are the truth.
     */
    protected $signature = 'leaderboard:rebuild';

    protected $description = 'Rebuild the materialized leaderboard tables from the points history';

    public function handle(): void
    {
        $sources = collect()
            ->merge(
                LessonCompletion::query()
                    ->where('points_awarded', '!=', 0)
                    ->get(['user_id', 'points_awarded', 'completed_at'])
                    ->map(fn (LessonCompletion $row) => [
                        'user_id' => $row->user_id,
                        'points' => (int) $row->points_awarded,
                        'at' => $row->completed_at,
                    ]),
            )
            ->merge(
                LessonAttempt::query()
                    ->where('points_awarded', '!=', 0)
                    ->get(['user_id', 'points_awarded', 'attempted_at'])
                    ->map(fn (LessonAttempt $row) => [
                        'user_id' => $row->user_id,
                        'points' => (int) $row->points_awarded,
                        'at' => $row->attempted_at,
                    ]),
            )
            ->merge(
                ChallengeAttempt::query()
                    ->where('points_awarded', '!=', 0)
                    ->get(['user_id', 'points_awarded', 'attempted_at'])
                    ->map(fn (ChallengeAttempt $row) => [
                        'user_id' => $row->user_id,
                        'points' => (int) $row->points_awarded,
                        'at' => $row->attempted_at,
                    ]),
            );

        $this->rebuildPeriod('weekly', $sources, fn ($at) => RecordLeaderboardPoints::weekStart($at));
        $this->rebuildPeriod('monthly', $sources, fn ($at) => RecordLeaderboardPoints::monthStart($at));
        $this->rebuildPeriod('yearly', $sources, fn ($at) => RecordLeaderboardPoints::yearStart($at));

        AllTimeLeaderboard::query()->delete();

        foreach (User::query()->where('total_points', '>', 0)->get(['id', 'total_points']) as $user) {
            AllTimeLeaderboard::query()->create([
                'user_id' => $user->id,
                'points' => (int) $user->total_points,
            ]);
        }

        $this->info('Leaderboard tables rebuilt.');
    }

    /**
     * Wipe one period table and re-aggregate the sources into it,
     * grouped by student and the period's opening date.
     *
     * @param  Collection<int, array{user_id: int, points: int, at: CarbonInterface}>  $sources
     */
    private function rebuildPeriod(string $period, $sources, callable $anchor): void
    {
        $model = 'App\\Models\\'.ucfirst($period).'Leaderboard';

        $model::query()->delete();

        $sources
            ->groupBy(fn (array $source) => $source['user_id'].'|'.$anchor($source['at']))
            ->each(function ($rows) use ($model, $anchor): void {
                $first = $rows->first();

                $model::query()->create([
                    'user_id' => $first['user_id'],
                    'period_start' => $anchor($first['at']),
                    'points' => $rows->sum('points'),
                ]);
            });
    }
}
