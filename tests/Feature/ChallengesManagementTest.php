<?php

use App\Enums\Category;
use App\Enums\Difficulty;
use App\Models\Challenge;
use App\Models\ChallengeAnswer;
use App\Models\ChallengeQuestion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

/**
 * The metadata block every update payload carries — a retained
 * stored cover satisfies the image rule.
 */
function challengeMetadata(): array
{
    return [
        'title' => 'Challenge',
        'description' => 'A challenge.',
        'category' => Category::ReadingComprehension->value,
        'difficulty' => Difficulty::Easy->value,
        'points' => 100,
        'duration' => 15,
    ];
}

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ]);
});

test('admin can view the challenges management page', function () {
    $this->actingAs($this->admin)
        ->get(route('dashboard.challenges'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('challenges')
            ->has('categories'));
});

test('only admins may browse the challenge listing', function () {
    $student = User::factory()->create(['role' => 'student']);

    expect(Gate::forUser($student)->allows('viewAny', Challenge::class))->toBeFalse();
    expect(Gate::forUser($this->admin)->allows('viewAny', Challenge::class))->toBeTrue();
});

test('challenges are mapped to the card shape', function () {
    $challenge = Challenge::factory()->reading()->easy()->create([
        'title' => 'Grammar Challenge',
        'description' => 'Test your grammar knowledge in this timed reading challenge.',
        'points' => 100,
        'duration' => 15,
        'image_url' => null,
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.challenges'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('challenges', 1, fn ($page) => $page
                ->where('id', $challenge->id)
                ->where('title', 'Grammar Challenge')
                ->where('description', 'Test your grammar knowledge in this timed reading challenge.')
                ->where('category', Category::ReadingComprehension->value)
                ->where('difficulty', Difficulty::Easy->value)
                ->where('points', 100)
                ->where('duration', 15)
                ->where('image_url', null)
                ->where('questions_count', 0)));
});

test('students are forbidden from the challenges management page', function () {
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.challenges'))
        ->assertForbidden();
});

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard.challenges'))
        ->assertRedirect(route('login'));
});

test('admin can delete a challenge', function () {
    $challenge = Challenge::factory()->create(['title' => 'Doomed Challenge']);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.challenges.destroy', $challenge))
        ->assertRedirect(route('dashboard.challenges'));

    expect(Challenge::count())->toBe(0);
});

test('students are forbidden from deleting a challenge', function () {
    $student = User::factory()->create(['role' => 'student']);
    $challenge = Challenge::factory()->create(['title' => 'Safe Challenge']);

    $this->actingAs($student)
        ->delete(route('dashboard.challenges.destroy', $challenge))
        ->assertForbidden();

    expect(Challenge::count())->toBe(1);
});

test('admin can create a new blank challenge and is redirected to its editor', function () {
    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.store'))
        ->assertRedirect(route('dashboard.challenges.edit', Challenge::query()->latest('id')->first()));

    $challenge = Challenge::query()->latest('id')->first();

    expect($challenge)
        ->title->toBe('Untitled Challenge')
        ->description->toBeNull()
        ->category->value->toBe(Category::ReadingComprehension->value)
        ->difficulty->value->toBe(Difficulty::Easy->value)
        ->points->toBe(0)
        ->duration->toBe(0)
        ->image_url->toBeNull();
});

test('admin can open the challenge editor with its question tree', function () {
    Storage::fake('public');

    $challenge = Challenge::factory()->reading()->easy()->create([
        'title' => 'Grammar Challenge',
        'points' => 100,
        'duration' => 15,
    ]);
    $first = ChallengeQuestion::factory()->for($challenge)->text()->create([
        'question_content' => 'First question',
    ]);
    $wrong = ChallengeAnswer::factory()->for($first)->create(['answer_content' => 'Wrong']);
    ChallengeAnswer::factory()->correct()->for($first)->create(['answer_content' => 'Right']);

    $second = ChallengeQuestion::factory()->for($challenge)->listening()->create([
        'question_content' => 'Second question',
        'audio_url' => 'challenges/audio/stored-clip.wav',
    ]);
    ChallengeAnswer::factory()->for($second)->create();
    ChallengeAnswer::factory()->correct()->for($second)->create();

    $this->actingAs($this->admin)
        ->get(route('dashboard.challenges.edit', $challenge))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('challenge', fn ($page) => $page
                ->where('id', $challenge->id)
                ->where('title', 'Grammar Challenge')
                ->where('description', $challenge->description)
                ->where('category', Category::ReadingComprehension->value)
                ->where('difficulty', Difficulty::Easy->value)
                ->where('points', 100)
                ->where('duration', 15)
                ->where('image_url', null)
                ->has('questions', 2, fn ($qpage) => $qpage
                    ->where('id', $first->id)
                    ->where('type', 'text')
                    ->where('question_content', 'First question')
                    ->where('audio_url', null)
                    ->has('answers', 2, fn ($scope) => $scope
                        ->where('id', $wrong->id)
                        ->where('answer_content', 'Wrong')
                        ->where('is_correct', false))))
            ->where('challenge.questions.1.type', 'listening')
            ->where('challenge.questions.1.audio_url', Storage::disk('public')->url('challenges/audio/stored-clip.wav'))
            ->has('categories', 3)
            ->has('difficulties', 3));
});

test('admin can update the challenge metadata with a fresh cover', function () {
    Storage::fake('public');
    Storage::disk('public')->put('challenges/old.png', 'old cover');

    $challenge = Challenge::factory()->create([
        'title' => 'Old Title',
        // A retained stored cover satisfies the image rule.
        'image_url' => 'challenges/old.png',
    ]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            'title' => 'Renamed Challenge',
            'description' => 'A refurbished challenge.',
            'category' => Category::ListeningComprehension->value,
            'difficulty' => Difficulty::Hard->value,
            'points' => 120,
            'duration' => 12,
            'image' => UploadedFile::fake()->image('new.png'),
        ])
        ->assertRedirect(route('dashboard.challenges'));

    $challenge->refresh();

    expect($challenge)
        ->title->toBe('Renamed Challenge')
        ->description->toBe('A refurbished challenge.')
        ->category->value->toBe(Category::ListeningComprehension->value)
        ->difficulty->value->toBe(Difficulty::Hard->value)
        ->points->toBe(120)
        ->duration->toBe(12)
        ->image_url->toStartWith('challenges/')->not->toBe('challenges/old.png');

    Storage::disk('public')->assertMissing('challenges/old.png');
    Storage::disk('public')->assertExists($challenge->image_url);
});

test('the challenge image is required when none is stored', function () {
    $challenge = Challenge::factory()->create(['image_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...challengeMetadata(),
        ])
        ->assertSessionHasErrors(['image']);

    expect($challenge->fresh()->title)->toBe($challenge->title);
});

test('saving a challenge syncs its question tree', function () {
    $challenge = Challenge::factory()->create(['image_url' => 'challenges/cover.png']);
    $kept = ChallengeQuestion::factory()->for($challenge)->text()->create([
        'question_content' => 'Old kept text',
    ]);
    $keptAnswer = ChallengeAnswer::factory()->for($kept)->create([
        'answer_content' => 'Old kept choice',
    ]);
    ChallengeAnswer::factory()->correct()->for($kept)->create();
    ChallengeQuestion::factory()->for($challenge)->text()->create();

    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...challengeMetadata(),
            'questions' => [
                [
                    'id' => $kept->id,
                    'type' => 'text',
                    'question_content' => 'Rewritten kept text',
                    'answers' => [
                        ['id' => $keptAnswer->id, 'answer_content' => 'Rewritten kept choice', 'is_correct' => '0'],
                        ['answer_content' => 'Fresh correct choice', 'is_correct' => '1'],
                    ],
                ],
                [
                    'type' => 'text',
                    'question_content' => 'Fresh question',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_correct' => '0'],
                        ['answer_content' => 'Right', 'is_correct' => '1'],
                    ],
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.challenges'));

    expect(ChallengeQuestion::count())->toBe(2)
        ->and(ChallengeAnswer::count())->toBe(4);

    $kept->refresh();

    expect($kept)
        ->question_content->toBe('Rewritten kept text')
        ->order_index->toBe(0);

    $fresh = ChallengeQuestion::query()
        ->where('challenge_id', $challenge->id)
        ->where('id', '!=', $kept->id)
        ->first();

    expect($fresh->question_content)->toBe('Fresh question')
        ->and($fresh->order_index)->toBe(1);

    $keptAnswer->refresh();

    expect($keptAnswer)
        ->answer_content->toBe('Rewritten kept choice')
        ->is_correct->toBe(false);
});

test('a listening question keeps, replaces, and drops its stored audio', function () {
    Storage::fake('public');
    Storage::disk('public')->put('challenges/audio/stored-clip.wav', 'stub');

    $challenge = Challenge::factory()->create(['image_url' => 'challenges/cover.png']);
    $question = ChallengeQuestion::factory()->for($challenge)->listening()->create([
        'question_content' => 'The question',
        'audio_url' => 'challenges/audio/stored-clip.wav',
    ]);
    ChallengeAnswer::factory()->for($question)->create();
    ChallengeAnswer::factory()->correct()->for($question)->create();

    $answers = [
        ['answer_content' => 'Wrong', 'is_correct' => '0'],
        ['answer_content' => 'Right', 'is_correct' => '1'],
    ];

    // A kept listening question without a fresh upload keeps its
    // stored audio.
    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...challengeMetadata(),
            'questions' => [
                ['id' => $question->id, 'type' => 'listening', 'question_content' => 'The question', 'answers' => $answers],
            ],
        ]);

    expect($question->fresh()->audio_url)->toBe('challenges/audio/stored-clip.wav');

    // A fresh upload replaces the stored file.
    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...challengeMetadata(),
            'questions' => [
                [
                    'id' => $question->id,
                    'type' => 'listening',
                    'question_content' => 'The question',
                    'audio' => UploadedFile::fake()->createWithContent('clip.wav', wavFileBytes()),
                    'answers' => $answers,
                ],
            ],
        ]);

    $uploadedUrl = $question->fresh()->audio_url;

    expect($uploadedUrl)->toStartWith('challenges/audio/')->not->toBe('challenges/audio/stored-clip.wav');
    Storage::disk('public')->assertMissing('challenges/audio/stored-clip.wav');
    Storage::disk('public')->assertExists($uploadedUrl);

    // A type switch away from listening drops the stored audio.
    $this->actingAs($this->admin)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...challengeMetadata(),
            'questions' => [
                ['id' => $question->id, 'type' => 'text', 'question_content' => 'The question', 'answers' => $answers],
            ],
        ]);

    expect($question->fresh()->audio_url)->toBeNull();
    Storage::disk('public')->assertMissing($uploadedUrl);
});

test('students are forbidden from the challenge editor endpoints', function () {
    $student = User::factory()->create(['role' => 'student']);
    $challenge = Challenge::factory()->create();

    $this->actingAs($student)
        ->post(route('dashboard.challenges.store'))
        ->assertForbidden();

    $this->actingAs($student)
        ->get(route('dashboard.challenges.edit', $challenge))
        ->assertForbidden();

    $this->actingAs($student)
        ->post(route('dashboard.challenges.update', $challenge), [
            '_method' => 'put',
            ...challengeMetadata(),
        ])
        ->assertForbidden();

    expect(Challenge::count())->toBe(1);
});

test('guests are redirected from the challenge editor', function () {
    $challenge = Challenge::factory()->create();

    $this->get(route('dashboard.challenges.edit', $challenge))
        ->assertRedirect(route('login'));
});

test('deleting a challenge removes its stored files and question tree', function () {
    Storage::fake('public');
    Storage::disk('public')->put('challenges/cover.png', 'cover');
    Storage::disk('public')->put('challenges/audio/clip.wav', 'stub');

    $challenge = Challenge::factory()->create(['image_url' => 'challenges/cover.png']);
    $question = ChallengeQuestion::factory()->for($challenge)->listening()->create([
        'audio_url' => 'challenges/audio/clip.wav',
    ]);
    ChallengeAnswer::factory()->for($question)->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.challenges.destroy', $challenge))
        ->assertRedirect(route('dashboard.challenges'));

    expect(Challenge::count())->toBe(0)
        ->and(ChallengeQuestion::count())->toBe(0)
        ->and(ChallengeAnswer::count())->toBe(0);

    Storage::disk('public')->assertMissing('challenges/cover.png');
    Storage::disk('public')->assertMissing('challenges/audio/clip.wav');
});
