<?php

/**
 * F-17 - Halaman leaderboard
 *
 * Feature tests for the student leaderboard: GET /leaderboard (route
 * leaderboard) and the public student card GET /leaderboard/student/{user}
 * (route leaderboard.student), both behind the auth -> verified gate. The
 * board lists the period's earners, ordered by points with a deterministic
 * tiebreak, and shows the top five plus a window that follows the visiting
 * student.
 *
 * Method: equivalence partitioning (EP) over the board's domains, then
 * boundary value analysis (BVA) of the window and period boundaries - each
 * boundary carries both the valid-side and the invalid-side observation.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                              |
 * |-------------------|------------------------------------------------|----------------------------------------------|
 * | access            | verified student                               | guest, unverified                            |
 * | period            | allTime, weekly, monthly, yearly               | an unknown period (falls back to allTime)    |
 * | earners           | students with points > 0                       | admins, zero-point students                  |
 * | ordering          | points descending, user id ascending on ties   | creation order, name order                   |
 * | window            | top five + the next five                       | a tail that ignores the visitor              |
 * | viewer position   | inside the top ten, outside it, unranked       | -                                            |
 * | detail            | a student card, an admin, an unknown id        | -                                            |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F17-01 | access - verified student (valid side)      | student GET                        | 200 with rankings, period, rank, total, lastUpdated       |
 * | FT-F17-02 | access - guest (invalid side)               | logged-out GET                     | redirect to login                                         |
 * | FT-F17-03 | access - unverified (invalid side)          | unverified GET                     | redirect to the verification notice                       |
 * | FT-F17-04 | period - default and fallback               | no query / an unknown period       | allTime / allTime                                         |
 * | FT-F17-05 | period - weekly anchor                      | an award from two weeks ago        | absent from the current weekly board                      |
 * | FT-F17-06 | ordering - points then user id              | two equal scores                   | the lower user id ranks first                             |
 * | FT-F17-07 | earners - admins skipped                    | an admin with 999 points           | the admin never appears                                   |
 * | FT-F17-08 | earners - zero points skipped               | a student with no awards           | absent; totalStudents counts earners only                 |
 * | FT-F17-09 | window - viewer inside the top ten          | 12 students, viewer rank 8         | ranks 1..10; the visitor flagged at rank 8                |
 * | FT-F17-10 | window - viewer outside the top ten         | 15 students, viewer rank 11        | ranks 1..5 then 11..15; visitor flagged                   |
 * | FT-F17-11 | window - unranked viewer                    | a viewer with zero points          | ranks 1..10; currentUserRank null                         |
 * | FT-F17-12 | detail - student card                       | equipped badges and avatar         | the card fields; only equipped badges, title-ordered      |
 * | FT-F17-13 | detail - admin and unknown (invalid side)   | an admin id, a missing id          | 404 / 404                                                 |
 * | FT-F17-14 | board - empty (boundary)                    | no earners                         | empty rankings; null rank and lastUpdated                 |
 *
 * == Relation to the existing suites =========================================
 *
 * LeaderboardTest already proves the fan-out, the period anchoring, the
 * ordering with admins skipped, both window modes, the unranked viewer, the
 * invalid-period fallback, and the detail card. F-17 deliberately repeats the
 * core so the feature file is self-contained; the new content is the access
 * trio (including the unverified redirect), the tiebreak by user id, the
 * zero-point filter, the empty-board boundary, and the admin-detail 404.
 *
 * The student profile pages are F-18..F-25's subjects; the admin challenge
 * awards that feed the board are F-44's, and the gamification observers are
 * covered by LessonAttemptTest and ChallengeAttemptTest. The gate ordering is
 * F-04's subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - The board reads the materialized period tables, so an award lands in the
 *   period it was earned; an old award does not appear on the current weekly
 *   board.
 * - Only students with positive points are ranked; admins never appear even
 *   when they hold points, and a student with no awards is unranked.
 * - Ties break by the user id, so the earlier account ranks first.
 * - The window is the top five plus either the literal next five or, for a
 *   student ranked outside the ten, the student and the four that follow.
 * - The detail card exposes the public student fields and only the equipped
 *   badges, title-ordered; an admin or a missing student is a 404.
 * - An empty board reports zero students, a null current-user rank, and a
 *   null last-updated stamp.
 */

use App\Actions\Gamification\RecordLeaderboardPoints;
use App\Models\Avatar;
use App\Models\Badge;
use App\Models\MajorDepartement;
use App\Models\User;
use App\Models\UserAvatar;
use App\Models\UserBadge;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

test('FT-F17-01 - a verified student opens the leaderboard', function () {
    // Boundary: access, valid side (baseline).
    $viewer = f17Student();
    f17Record(f17Student(), 50);

    $this->actingAs($viewer)
        ->get(route('leaderboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Leaderboard', false)
            ->has('rankings')
            ->where('period', 'allTime')
            ->where('totalStudents', 1)
            ->has('lastUpdated'));
});

test('FT-F17-02 - a guest is sent to the login screen', function () {
    // Boundary: access, invalid side (authentication).
    $this->get(route('leaderboard'))->assertRedirect(route('login'));
});

test('FT-F17-03 - an unverified student is sent to the verification notice', function () {
    // Boundary: access, invalid side (verification).
    $student = User::factory()->unverified()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('leaderboard'))
        ->assertRedirect(route('verification.notice'));
});

test('FT-F17-04 - the period defaults to all time and falls back on garbage', function () {
    // Boundary: period. No query is all time; an unknown value falls back to
    // the same board instead of failing.
    $viewer = f17Student();
    f17Record(f17Student(), 50);

    $this->actingAs($viewer)
        ->get(route('leaderboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('period', 'allTime'));

    $this->actingAs($viewer)
        ->get(route('leaderboard', ['period' => 'daily']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('period', 'allTime'));
});

test('FT-F17-05 - an old award is absent from the current weekly board', function () {
    // Boundary: period anchoring. The award sits in the week it was earned.
    $viewer = f17Student();
    f17Record(f17Student(), 40, now()->subDays(14));

    $this->actingAs($viewer)
        ->get(route('leaderboard', ['period' => 'weekly']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('period', 'weekly')
            ->where('totalStudents', 0)
            ->has('rankings', 0));
});

test('FT-F17-06 - ties break by the user id', function () {
    // Boundary: ordering. Two equal scores; the earlier account ranks first.
    $first = f17Student(['name' => 'First Account']);
    $second = f17Student(['name' => 'Second Account']);
    f17Record($first, 50);
    f17Record($second, 50);

    $this->actingAs($first)
        ->get(route('leaderboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('rankings.0.id', $first->id)
            ->where('rankings.1.id', $second->id)
            ->where('rankings.0.rank', 1)
            ->where('rankings.1.rank', 2));
});

test('FT-F17-07 - an admin with points never appears', function () {
    // Boundary: earners. Only students are ranked.
    $viewer = f17Student();
    $student = f17Student(['name' => 'Ranked Student']);
    $admin = User::factory()->create(['role' => 'admin', 'name' => 'Admin']);
    f17Record($student, 50);
    f17Record($admin, 999);

    $this->actingAs($viewer)
        ->get(route('leaderboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('totalStudents', 1)
            ->where('rankings.0.name', 'Ranked Student'));
});

test('FT-F17-08 - a student without awards is unranked', function () {
    // Boundary: earners. Zero points never reach the board.
    $viewer = f17Student();
    $earner = f17Student(['name' => 'Earner']);
    f17Record($earner, 30);

    $this->actingAs($viewer)
        ->get(route('leaderboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('totalStudents', 1)
            ->where('rankings.0.name', 'Earner'));
});

test('FT-F17-09 - a viewer inside the top ten sees the literal six to ten', function () {
    // Boundary: window, top-ten case. Twelve students; the viewer ranks 8th.
    $students = User::factory()->count(12)->create(['role' => 'student']);
    $viewer = $students->get(7);
    $students->each(fn (User $student, int $index) => f17Record($student, 120 - $index * 10));

    $this->actingAs($viewer)
        ->get(route('leaderboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('rankings', 10)
            ->where('rankings.5.rank', 6)
            ->where('rankings.9.rank', 10)
            ->where('rankings.7.isCurrentUser', true)
            ->where('currentUserRank', 8));
});

test('FT-F17-10 - a viewer outside the top ten anchors the tail', function () {
    // Boundary: window, outside case. Fifteen students; the viewer ranks 11th,
    // so the tail starts at the viewer instead of the literal six.
    $students = User::factory()->count(15)->create(['role' => 'student']);
    $viewer = $students->get(10);
    $students->each(fn (User $student, int $index) => f17Record($student, 150 - $index * 10));

    $this->actingAs($viewer)
        ->get(route('leaderboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('rankings', 10)
            ->where('rankings.5.rank', 11)
            ->where('rankings.5.isCurrentUser', true)
            ->where('rankings.9.rank', 15)
            ->where('currentUserRank', 11)
            ->where('totalStudents', 15));
});

test('FT-F17-11 - an unranked viewer sees a null current rank', function () {
    // Boundary: window, unranked case. The board still shows the top ten.
    $viewer = f17Student();
    $students = User::factory()->count(12)->create(['role' => 'student']);
    $students->each(fn (User $student, int $index) => f17Record($student, 120 - $index * 10));

    $this->actingAs($viewer)
        ->get(route('leaderboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('rankings', 10)
            ->where('rankings.9.rank', 10)
            ->where('currentUserRank', null));
});

test('FT-F17-12 - the detail card carries the public student fields', function () {
    // Boundary: detail, valid side. Only the equipped badges ride the card,
    // title-ordered, and the equipped avatar is the header icon.
    Storage::fake('public');
    $major = f17Major('Teknik Informatika');
    $student = f17Student([
        'name' => 'Ayu Lestari',
        'nim_nip' => '121140089',
        'biography' => 'Preparing for the ITERA English test.',
        'major_departement_id' => $major->id,
        'total_points' => 120,
    ]);
    $avatar = Avatar::factory()->create(['title' => 'Knight', 'icon_url' => 'avatars/knight.png']);
    UserAvatar::create([
        'user_id' => $student->id,
        'avatar_id' => $avatar->id,
        'is_equipped' => true,
        'awarded_at' => now(),
    ]);
    $zulu = Badge::factory()->create(['title' => 'Zulu Badge', 'icon_url' => null]);
    $alpha = Badge::factory()->create(['title' => 'Alpha Badge', 'icon_url' => null]);
    $hidden = Badge::factory()->create(['title' => 'Hidden Badge', 'icon_url' => null]);
    f17Badge($student, $zulu, true);
    f17Badge($student, $alpha, true);
    f17Badge($student, $hidden);

    $this->actingAs(f17Student())
        ->get(route('leaderboard.student', $student))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Leaderboard/Detail', false)
            ->where('student.id', $student->id)
            ->where('student.name', 'Ayu Lestari')
            ->where('student.nimNip', '121140089')
            ->where('student.organization', 'Teknik Informatika')
            ->where('student.points', 120)
            ->where('student.joinedDate', $student->created_at->format('M d, Y'))
            ->where('student.biography', 'Preparing for the ITERA English test.')
            ->where('student.avatarUrl', Storage::disk('public')->url('avatars/knight.png'))
            ->has('student.badges', 2)
            ->where('student.badges', fn ($badges) => collect($badges)->pluck('title')->all() === [
                'Alpha Badge',
                'Zulu Badge',
            ]));
});

test('FT-F17-13 - an admin and an unknown student are not found', function () {
    // Boundary: detail, invalid side. Only student cards exist.
    $admin = User::factory()->create(['role' => 'admin']);
    $viewer = f17Student();

    $this->actingAs($viewer)
        ->get(route('leaderboard.student', $admin))
        ->assertNotFound();

    $this->actingAs($viewer)
        ->get(route('leaderboard.student', 999999))
        ->assertNotFound();
});

test('FT-F17-14 - an empty board reports empty aggregates', function () {
    // Boundary: empty board. No earners means no rows, a null current rank,
    // and a null last-updated stamp.
    $this->actingAs(f17Student())
        ->get(route('leaderboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('rankings', 0)
            ->where('totalStudents', 0)
            ->where('currentUserRank', null)
            ->where('lastUpdated', null));
});

/**
 * A verified student account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f17Student(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'student',
    ], $attributes));
}

/**
 * Record leaderboard points for the user.
 */
function f17Record(User $user, int $points, mixed $at = null): void
{
    app(RecordLeaderboardPoints::class)($user, $points, $at);
}

/**
 * A study program row with its display name.
 */
function f17Major(string $name): MajorDepartement
{
    return MajorDepartement::query()->create([
        'name' => $name,
        'major_departement_domain' => strtolower(str_replace(' ', '-', $name)),
        'major_departement_code' => '135',
    ]);
}

/**
 * Award a badge to the student with the given equipped state.
 */
function f17Badge(User $student, Badge $badge, bool $equipped = false): UserBadge
{
    return UserBadge::create([
        'user_id' => $student->id,
        'badge_id' => $badge->id,
        'is_equipped' => $equipped,
        'awarded_at' => now(),
    ]);
}
