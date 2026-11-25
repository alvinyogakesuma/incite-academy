<?php

use App\Models\Avatar;
use App\Models\Badge;
use App\Models\Challenge;
use App\Models\ChallengeAttempt;
use App\Models\Course;
use App\Models\LearningPath;
use App\Models\Lesson;
use App\Models\LessonAttempt;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\User;
use App\Models\UserAvatar;
use App\Models\UserBadge;

test('a challenge attempt crossing a points threshold awards the badge and its avatar', function () {
    $user = User::factory()->create(['total_points' => 0]);

    $badge = Badge::factory()->create([
        'recipients_count' => 0,
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
            ],
        ],
    ]);
    $avatar = Avatar::factory()->create([
        'recipients_count' => 0,
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
            ],
        ],
    ]);

    $challenge = Challenge::factory()->create(['points' => 100]);
    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 100,
    ]);

    $award = UserBadge::query()->first();

    expect($user->fresh()->total_points)->toBe(100)
        ->and(UserBadge::count())->toBe(1)
        ->and($award->badge_id)->toBe($badge->id)
        ->and($award->awarded_at)->not->toBeNull()
        ->and($badge->fresh()->recipients_count)->toBe(1)
        ->and(UserAvatar::count())->toBe(1)
        ->and(UserAvatar::query()->first()->avatar_id)->toBe($avatar->id)
        ->and($avatar->fresh()->recipients_count)->toBe(1);
});

test('a zero-score challenge attempt still announces progress', function () {
    $user = User::factory()->create(['total_points' => 0]);

    Badge::factory()->create([
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'challenge', 'operator' => '=', 'value' => 'Weekly Warmup'],
            ],
        ],
    ]);

    $challenge = Challenge::factory()->create(['title' => 'Weekly Warmup']);
    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 0,
    ]);

    expect($user->fresh()->total_points)->toBe(0)
        ->and(UserBadge::count())->toBe(1);
});

test('a quiz score condition awards at the best attempt percentage', function () {
    $user = User::factory()->create();

    Badge::factory()->create([
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'quiz', 'operator' => '>=', 'value' => '80'],
            ],
        ],
    ]);

    $course = Course::factory()->create(['lessons_count' => 0]);
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($course)->for($module)->quiz()->create();

    LessonAttempt::factory()->for($user)->for($course)->for($lesson)->create([
        'percentage' => 80,
    ]);

    expect(UserBadge::count())->toBe(1);
});

test('a course condition unlocks when its last lesson completes', function () {
    $user = User::factory()->create();

    Badge::factory()->create([
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'course', 'operator' => '=', 'value' => 'Pemrograman Web'],
            ],
        ],
    ]);

    $course = Course::factory()->create(['title' => 'Pemrograman Web', 'lessons_count' => 0]);
    $module = Module::factory()->for($course)->create();
    $first = Lesson::factory()->for($course)->for($module)->article()->create();
    $second = Lesson::factory()->for($course)->for($module)->article()->create();

    LessonCompletion::factory()->for($user)->for($course)->for($first)->create();

    expect(UserBadge::count())->toBe(0);

    LessonCompletion::factory()->for($user)->for($course)->for($second)->create();

    expect(UserBadge::count())->toBe(1);
});

test('a course condition with an unknown title stays locked', function () {
    $user = User::factory()->create();

    Badge::factory()->create([
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'course', 'operator' => '=', 'value' => 'No Such Course'],
            ],
        ],
    ]);

    $challenge = Challenge::factory()->create();
    ChallengeAttempt::factory()->for($user)->for($challenge)->create();

    expect(UserBadge::count())->toBe(0);
});

test('a path condition unlocks when every course in the path completes', function () {
    $user = User::factory()->create();

    Badge::factory()->create([
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'path', 'operator' => '=', 'value' => 'TOEIC Mastery'],
            ],
        ],
    ]);

    $path = LearningPath::factory()->create(['title' => 'TOEIC Mastery']);

    $firstCourse = Course::factory()->create(['lessons_count' => 0]);
    $firstModule = Module::factory()->for($firstCourse)->create();
    $firstLesson = Lesson::factory()->for($firstCourse)->for($firstModule)->article()->create();

    $secondCourse = Course::factory()->create(['lessons_count' => 0]);
    $secondModule = Module::factory()->for($secondCourse)->create();
    $secondLesson = Lesson::factory()->for($secondCourse)->for($secondModule)->article()->create();

    $path->courses()->attach([
        $firstCourse->id => ['order_index' => 0],
        $secondCourse->id => ['order_index' => 1],
    ]);

    LessonCompletion::factory()->for($user)->for($firstCourse)->for($firstLesson)->create();

    expect(UserBadge::count())->toBe(0);

    LessonCompletion::factory()->for($user)->for($secondCourse)->for($secondLesson)->create();

    expect(UserBadge::count())->toBe(1);
});

test('an AND badge stays locked until every condition is met', function () {
    $user = User::factory()->create(['total_points' => 0]);

    Badge::factory()->create([
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
                ['type' => 'challenge', 'operator' => '=', 'value' => 'Weekly Warmup'],
            ],
        ],
    ]);

    $challenge = Challenge::factory()->create(['title' => 'Weekly Warmup', 'points' => 100]);

    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 50,
    ]);

    expect(UserBadge::count())->toBe(0);

    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 100,
    ]);

    expect($user->fresh()->total_points)->toBe(100)
        ->and(UserBadge::count())->toBe(1);
});

test('an OR badge unlocks on any single condition', function () {
    $user = User::factory()->create(['total_points' => 0]);

    Badge::factory()->create([
        'requirements' => [
            'logic' => 'OR',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '5000'],
                ['type' => 'challenge', 'operator' => '=', 'value' => 'Weekly Warmup'],
            ],
        ],
    ]);

    $challenge = Challenge::factory()->create(['title' => 'Weekly Warmup']);
    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 50,
    ]);

    expect($user->fresh()->total_points)->toBe(50)
        ->and(UserBadge::count())->toBe(1);
});

test('repeated evaluations never double-award', function () {
    $user = User::factory()->create(['total_points' => 0]);

    $badge = Badge::factory()->create([
        'recipients_count' => 0,
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
            ],
        ],
    ]);

    $challenge = Challenge::factory()->create(['points' => 100]);

    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 100,
    ]);

    $award = UserBadge::query()->first();

    // A later attempt fires another evaluation — the existing
    // award must survive it untouched.
    ChallengeAttempt::factory()->for($user)->for($challenge)->create([
        'score' => 100,
    ]);

    expect(UserBadge::count())->toBe(1)
        ->and(UserBadge::query()->first()->awarded_at->format('Y-m-d H:i:s'))->toBe($award->awarded_at->format('Y-m-d H:i:s'))
        ->and($badge->fresh()->recipients_count)->toBe(1);
});

test('an avatar with empty requirements never unlocks', function () {
    $user = User::factory()->create();

    $avatar = Avatar::factory()->create([
        'recipients_count' => 0,
        'requirements' => ['logic' => 'AND', 'conditions' => []],
    ]);

    $challenge = Challenge::factory()->create();
    ChallengeAttempt::factory()->for($user)->for($challenge)->create();

    expect(UserAvatar::count())->toBe(0)
        ->and($avatar->fresh()->recipients_count)->toBe(0);
});
