<?php

namespace App\Http\Controllers;

use App\Actions\Gamification\RecordLeaderboardPoints;
use App\Models\User;
use App\Models\UserBadge;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * @phpstan-type LeaderboardRow array{id: int, name: string, organization: ?string, points: int, rank: int, isCurrentUser: bool, avatarUrl: ?string}
 */
class LeaderboardController extends Controller
{
    private const int TOP_COUNT = 5;

    private const int TAIL_COUNT = 5;

    /**
     * The leaderboard — the top of the board plus a window that
     * follows the visiting student: the five leaders, then either
     * the literal next five or, for a student ranked outside the
     * ten, themselves and the four that follow.
     */
    public function index(Request $request): Response
    {
        $period = in_array($request->query('period'), ['weekly', 'monthly', 'yearly'], true)
            ? (string) $request->query('period')
            : 'allTime';

        $anchor = match ($period) {
            'weekly' => RecordLeaderboardPoints::weekStart(now()),
            'monthly' => RecordLeaderboardPoints::monthStart(now()),
            'yearly' => RecordLeaderboardPoints::yearStart(now()),
            default => null,
        };

        $rows = $this->periodRows($period, $anchor);

        $ranked = $rows->map(fn (array $row, int $index) => [
            'id' => $row['id'],
            'name' => $row['name'],
            'organization' => $row['organization'],
            'points' => $row['points'],
            'avatarUrl' => $row['avatarUrl'],
            'rank' => $index + 1,
            'isCurrentUser' => $row['id'] === (int) $request->user()->id,
        ])->values();

        $userIndex = $ranked->search(
            fn (array $row) => $row['isCurrentUser'],
        );

        $lastUpdated = $rows->max('updated_at');

        return Inertia::render('Leaderboard', [
            'rankings' => $this->window($ranked, $userIndex),
            'period' => $period,
            'currentUserRank' => $userIndex === false ? null : $userIndex + 1,
            'totalStudents' => $ranked->count(),
            'lastUpdated' => $lastUpdated !== null
                ? Carbon::parse($lastUpdated)->diffForHumans()
                : null,
        ]);
    }

    /**
     * One student's public profile card as seen from the board —
     * admins never appear.
     */
    public function show(User $user): Response
    {
        if ($user->role !== 'student') {
            abort(404);
        }

        $badges = UserBadge::query()
            ->join('badges', 'badges.id', '=', 'user_badges.badge_id')
            ->where('user_badges.user_id', $user->id)
            ->where('user_badges.is_equipped', true)
            ->orderBy('badges.title')
            ->get(['badges.id', 'badges.title', 'badges.icon_url'])
            ->map(fn ($badge) => [
                'id' => $badge->id,
                'title' => $badge->title,
                'icon_url' => $badge->icon_url && str_starts_with($badge->icon_url, 'badges/')
                    ? Storage::disk('public')->url($badge->icon_url)
                    : $badge->icon_url,
            ]);

        return Inertia::render('Leaderboard/Detail', [
            'student' => [
                'id' => $user->id,
                'name' => $user->name,
                'nimNip' => $user->nim_nip,
                'organization' => $user->majorDepartement?->name,
                'points' => (int) $user->total_points,
                'joinedDate' => $user->created_at->format('M d, Y'),
                'biography' => $user->biography,
                'avatarUrl' => $user->equippedAvatarUrl(),
                'badges' => $badges,
            ],
        ]);
    }

    /**
     * The current period's earners, students only, ordered by
     * points with a deterministic tiebreak — each row carrying
     * the equipped character where one is worn.
     *
     * @return Collection<int, array{id: int, name: string, organization: ?string, points: int, avatarUrl: ?string, updated_at: ?string}>
     */
    private function periodRows(string $period, ?string $anchor): Collection
    {
        $table = match ($period) {
            'weekly' => 'weekly_leaderboard',
            'monthly' => 'monthly_leaderboard',
            'yearly' => 'yearly_leaderboard',
            default => 'alltime_leaderboard',
        };

        return DB::table($table)
            ->join('users', 'users.id', '=', "{$table}.user_id")
            ->leftJoin('majors_departements', 'majors_departements.id', '=', 'users.major_departement_id')
            ->leftJoin('user_avatars', function ($join) use ($table): void {
                $join->on('user_avatars.user_id', '=', "{$table}.user_id")
                    ->where('user_avatars.is_equipped', true);
            })
            ->leftJoin('avatars', 'avatars.id', '=', 'user_avatars.avatar_id')
            ->where('users.role', 'student')
            ->where("{$table}.points", '>', 0)
            ->when($anchor !== null, fn ($query) => $query->where("{$table}.period_start", $anchor))
            ->orderByDesc("{$table}.points")
            ->orderBy("{$table}.user_id")
            ->get([
                'users.id as id',
                'users.name as name',
                'majors_departements.name as organization',
                "{$table}.points as points",
                "{$table}.updated_at as updated_at",
                'avatars.icon_url as avatar_icon',
            ])
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'organization' => $row->organization,
                'points' => (int) $row->points,
                'avatarUrl' => $row->avatar_icon !== null && str_starts_with($row->avatar_icon, 'avatars/')
                    ? Storage::disk('public')->url($row->avatar_icon)
                    : $row->avatar_icon,
                'updated_at' => $row->updated_at,
            ]);
    }

    /**
     * The display window — the leaders, then either the literal
     * next five or, for a student ranked outside them, the
     * student and the four that follow.
     *
     * @param  Collection<int, LeaderboardRow>  $ranked
     * @return array<int, LeaderboardRow>
     */
    private function window(Collection $ranked, int|false|null $userIndex): array
    {
        $tailStart = $userIndex !== false && $userIndex !== null && $userIndex >= self::TOP_COUNT + self::TAIL_COUNT
            ? $userIndex
            : self::TOP_COUNT;

        return $ranked
            ->slice(0, self::TOP_COUNT)
            ->merge($ranked->slice($tailStart, self::TAIL_COUNT))
            ->values()
            ->all();
    }
}
