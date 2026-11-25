<?php

use App\Actions\Gamification\RecordLeaderboardPoints;
use App\Models\AllTimeLeaderboard;
use App\Models\Challenge;
use App\Models\ChallengeAttempt;
use App\Models\MonthlyLeaderboard;
use App\Models\User;
use App\Models\WeeklyLeaderboard;
use App\Models\YearlyLeaderboard;
use Illuminate\Support\Facades\Artisan;

test('a challenge attempt fans out to all four leaderboard tables', function () {
    $user = User::factory()->create();
    $challenge = Challenge::factory()->create(['points' => 50]);

    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 50,
    ]);

    expect(AllTimeLeaderboard::query()->where('user_id', $user->id)->value('points'))->toBe(50)
        ->and(WeeklyLeaderboard::query()->where('user_id', $user->id)->value('points'))->toBe(50)
        ->and(MonthlyLeaderboard::query()->where('user_id', $user->id)->value('points'))->toBe(50)
        ->and(YearlyLeaderboard::query()->where('user_id', $user->id)->value('points'))->toBe(50)
        ->and(
            WeeklyLeaderboard::query()->where('user_id', $user->id)->value('period_start'),
        )->toBe(RecordLeaderboardPoints::weekStart(now()));
});

test('awards land in the period they were earned', function () {
    $user = User::factory()->create();
    $challenge = Challenge::factory()->create(['points' => 100]);
    $old = now()->subDays(14);

    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 40,
        'attempted_at' => $old,
    ]);

    expect(
        WeeklyLeaderboard::query()->where('user_id', $user->id)->value('period_start'),
    )->toBe(RecordLeaderboardPoints::weekStart($old))
        ->and(MonthlyLeaderboard::query()->where('user_id', $user->id)->count())->toBe(1);

    // The award sits in last week's row — this week's board has
    // no earners yet.
    $this->actingAs($user)
        ->get('/leaderboard?period=weekly')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('period', 'weekly')
            ->where('totalStudents', 0));
});

test('the board lists the period earners ordered by points and skips admins', function () {
    $viewer = User::factory()->create();
    $low = User::factory()->create(['name' => 'Low Points']);
    $mid = User::factory()->create(['name' => 'Mid Points']);
    $top = User::factory()->create(['name' => 'Top Points']);
    $admin = User::factory()->create(['role' => 'admin', 'name' => 'Admin Points']);

    $record = app(RecordLeaderboardPoints::class);
    $record($low, 50);
    $record($mid, 75);
    $record($top, 100);
    $record($admin, 999);

    $this->actingAs($viewer)
        ->get('/leaderboard')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('period', 'allTime')
            ->where('totalStudents', 3)
            ->where('rankings.0.name', 'Top Points')
            ->where('rankings.1.name', 'Mid Points')
            ->where('rankings.2.name', 'Low Points'));
});

test('the window anchors the tail to the visiting student', function () {
    $users = User::factory()->count(15)->create();
    $viewer = $users->get(10);

    $users->each(fn (User $user, int $index) => app(RecordLeaderboardPoints::class)($user, 150 - $index * 10));

    $this->actingAs($viewer)
        ->get('/leaderboard')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('rankings', 10)
            ->where('rankings.5.rank', 11)
            ->where('rankings.5.isCurrentUser', true)
            ->where('rankings.9.rank', 15)
            ->where('currentUserRank', 11)
            ->where('totalStudents', 15));
});

test('a student inside the top ten sees the literal six to ten', function () {
    $users = User::factory()->count(12)->create();
    $viewer = $users->get(7);

    $users->each(fn (User $user, int $index) => app(RecordLeaderboardPoints::class)($user, 120 - $index * 10));

    $this->actingAs($viewer)
        ->get('/leaderboard')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('rankings', 10)
            ->where('rankings.5.rank', 6)
            ->where('rankings.9.rank', 10)
            ->where('rankings.7.isCurrentUser', true)
            ->where('currentUserRank', 8));
});

test('an unranked student sees the top ten with a null rank', function () {
    $viewer = User::factory()->create();
    $students = User::factory()->count(12)->create();

    $students->each(fn (User $user, int $index) => app(RecordLeaderboardPoints::class)($user, 120 - $index * 10));

    $this->actingAs($viewer)
        ->get('/leaderboard')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('rankings', 10)
            ->where('rankings.9.rank', 10)
            ->where('currentUserRank', null));
});

test('invalid periods fall back to all time', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/leaderboard?period=nonsense')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('period', 'allTime'));
});

test('deleting an attempt claws the recorded points back', function () {
    $user = User::factory()->create();
    $challenge = Challenge::factory()->create(['points' => 50]);

    $attempt = ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 50,
    ]);

    expect(WeeklyLeaderboard::query()->where('user_id', $user->id)->value('points'))->toBe(50);

    $attempt->delete();

    expect(AllTimeLeaderboard::query()->where('user_id', $user->id)->value('points'))->toBe(0)
        ->and(WeeklyLeaderboard::query()->where('user_id', $user->id)->value('points'))->toBe(0);

    $this->actingAs($user)
        ->get('/leaderboard?period=weekly')
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('totalStudents', 0));
});

test('the detail page shows a student profile', function () {
    $viewer = User::factory()->create();
    $student = User::factory()->create([
        'name' => 'Top Scorer',
        'nim_nip' => '13520001',
        'biography' => 'An avid English learner.',
    ]);

    $this->actingAs($viewer)
        ->get("/leaderboard/student/{$student->id}")
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('student', fn ($scope) => $scope
                ->where('name', 'Top Scorer')
                ->where('nimNip', '13520001')
                ->where('biography', 'An avid English learner.')
                ->where('avatarUrl', null)
                ->has('badges')
                ->etc()));
});

test('the detail page 404s for admins and missing students', function () {
    $viewer = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($viewer)
        ->get("/leaderboard/student/{$admin->id}")
        ->assertNotFound();

    $this->actingAs($viewer)
        ->get('/leaderboard/student/99999')
        ->assertNotFound();
});

test('leaderboard rebuild repopulates the tables from history', function () {
    $user = User::factory()->create();
    $challenge = Challenge::factory()->create(['points' => 100]);
    $old = now()->subDays(14);

    // The first attempt earns 30; the later one only adds its
    // improvement over the running best — 20 more.
    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 30,
        'attempted_at' => $old,
    ]);
    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 50,
        'attempted_at' => now(),
    ]);

    Artisan::call('leaderboard:rebuild');

    $weekly = WeeklyLeaderboard::query()->where('user_id', $user->id)->orderBy('period_start')->get();

    expect(AllTimeLeaderboard::query()->where('user_id', $user->id)->value('points'))->toBe(50)
        ->and($weekly)->toHaveCount(2)
        ->and($weekly->first()->points)->toBe(30)
        ->and($weekly->last()->points)->toBe(20);
});
