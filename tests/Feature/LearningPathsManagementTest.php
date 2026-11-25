<?php

use App\Models\Course;
use App\Models\LearningPath;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ]);
});

test('admin can view the learning paths management page', function () {
    $this->actingAs($this->admin)
        ->get(route('dashboard.learning-paths'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('learningPaths')
            ->has('levels', 4));
});

test('the learning path listing maps fields for the admin card', function () {
    Storage::fake('public');

    $path = LearningPath::factory()->allLevels()->create([
        'title' => 'Complete Preparation',
        'description' => 'A comprehensive learning path.',
        'courses_count' => 3,
        'total_duration' => 481,
        'image_url' => 'learning-paths/cover.png',
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.learning-paths'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('learningPaths', 1, fn ($page) => $page
                ->where('id', $path->id)
                ->where('title', 'Complete Preparation')
                ->where('description', 'A comprehensive learning path.')
                ->where('level', 'All Levels')
                ->where('courses_count', 3)
                ->where('total_duration', 481)
                ->where('image_url', Storage::disk('public')->url('learning-paths/cover.png'))));
});

test('guests are redirected from the learning paths management page', function () {
    $this->get(route('dashboard.learning-paths'))
        ->assertRedirect(route('login'));
});

test('students are forbidden from the learning paths management page', function () {
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.learning-paths'))
        ->assertForbidden();
});

test('admin can delete a learning path with its course sequence', function () {
    Storage::fake('public');
    Storage::disk('public')->put('learning-paths/cover.png', 'cover');

    $path = LearningPath::factory()->create([
        'image_url' => 'learning-paths/cover.png',
    ]);
    $course = Course::factory()->create();
    $path->courses()->attach([$course->id => ['order_index' => 0]]);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.learning-paths.destroy', $path))
        ->assertRedirect(route('dashboard.learning-paths'));

    expect(LearningPath::count())->toBe(0)
        ->and(DB::table('course_learning_path')->count())->toBe(0);

    Storage::disk('public')->assertMissing('learning-paths/cover.png');
});

test('students are forbidden from deleting a learning path', function () {
    $student = User::factory()->create(['role' => 'student']);
    $path = LearningPath::factory()->create(['title' => 'Safe Path']);

    $this->actingAs($student)
        ->delete(route('dashboard.learning-paths.destroy', $path))
        ->assertForbidden();

    expect(LearningPath::count())->toBe(1);
});

test('admin can create a new blank learning path and is redirected to its editor', function () {
    $this->actingAs($this->admin)
        ->post(route('dashboard.learning-paths.store'))
        ->assertRedirect(route('dashboard.learning-paths.edit', LearningPath::query()->latest('id')->first()));

    $path = LearningPath::query()->latest('id')->first();

    expect($path)
        ->title->toBe('Untitled Learning Path')
        ->description->toBe('')
        ->level->toBe('All Levels')
        ->image_url->toBeNull()
        ->courses_count->toBe(0)
        ->total_duration->toBe(0);
});

test('admin can open the learning path editor with its course sequence', function () {
    $path = LearningPath::factory()->allLevels()->create([
        'title' => 'Complete Preparation',
    ]);
    $first = Course::factory()->create(['title' => 'First Course', 'total_duration' => 120, 'modules_count' => 2]);
    $second = Course::factory()->create(['title' => 'Second Course', 'total_duration' => 60, 'modules_count' => 1]);
    $path->courses()->attach([
        $first->id => ['order_index' => 0],
        $second->id => ['order_index' => 1],
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.learning-paths.edit', $path))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('learningPath', fn ($page) => $page
                ->where('id', $path->id)
                ->where('title', 'Complete Preparation')
                ->where('description', $path->description)
                ->where('level', 'All Levels')
                ->where('image_url', null)
                ->has('courses', 2, fn ($scope) => $scope
                    ->where('id', $first->id)
                    ->where('title', 'First Course')
                    ->where('duration', 120)
                    ->where('modules', 2)))
            ->where('learningPath.courses.1.id', $second->id)
            ->has('availableCourses', 2)
            ->has('levels', 4));
});

test('admin can update the learning path metadata with a fresh cover', function () {
    Storage::fake('public');
    Storage::disk('public')->put('learning-paths/old.png', 'old cover');

    $path = LearningPath::factory()->create([
        'title' => 'Old Title',
        // A retained stored cover satisfies the image rule.
        'image_url' => 'learning-paths/old.png',
    ]);
    $course = Course::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('dashboard.learning-paths.update', $path), [
            '_method' => 'put',
            'title' => 'Renamed Path',
            'description' => 'A refurbished path.',
            'level' => 'Beginner',
            'image' => UploadedFile::fake()->image('new.png'),
            'courses' => [$course->id],
        ])
        ->assertRedirect(route('dashboard.learning-paths'));

    $path->refresh();

    expect($path)
        ->title->toBe('Renamed Path')
        ->description->toBe('A refurbished path.')
        ->level->toBe('Beginner')
        ->image_url->toStartWith('learning-paths/')->not->toBe('learning-paths/old.png');

    Storage::disk('public')->assertMissing('learning-paths/old.png');
    Storage::disk('public')->assertExists($path->image_url);
});

test('saving a learning path syncs its course sequence and stats', function () {
    $path = LearningPath::factory()->create(['image_url' => 'learning-paths/cover.png']);
    $kept = Course::factory()->create(['total_duration' => 120, 'modules_count' => 2]);
    $dropped = Course::factory()->create(['total_duration' => 60, 'modules_count' => 1]);
    $fresh = Course::factory()->create(['total_duration' => 90, 'modules_count' => 3]);
    $path->courses()->attach([
        $kept->id => ['order_index' => 0],
        $dropped->id => ['order_index' => 1],
    ]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.learning-paths.update', $path), [
            '_method' => 'put',
            'title' => 'Path',
            'description' => 'A path.',
            'level' => 'All Levels',
            'courses' => [$fresh->id, $kept->id],
        ])
        ->assertRedirect(route('dashboard.learning-paths'));

    // The sequence is fresh first, kept second, and the dropped
    // course detached — the payload order carrying the pivot.
    expect($path->courses()->pluck('courses.id')->all())->toBe([$fresh->id, $kept->id]);

    $path->refresh();

    // The stored aggregates derive from the attached courses.
    expect($path)
        ->courses_count->toBe(2)
        ->total_duration->toBe(210);
});

test('the learning path image is required when none is stored', function () {
    $path = LearningPath::factory()->create(['image_url' => null]);
    $course = Course::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('dashboard.learning-paths.update', $path), [
            '_method' => 'put',
            'title' => 'Path',
            'description' => 'A path.',
            'level' => 'All Levels',
            'courses' => [$course->id],
        ])
        ->assertSessionHasErrors(['image']);

    expect($path->fresh()->title)->toBe($path->title);
});

test('a learning path rejects duplicate courses in its sequence', function () {
    $path = LearningPath::factory()->create(['image_url' => 'learning-paths/cover.png']);
    $course = Course::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('dashboard.learning-paths.update', $path), [
            '_method' => 'put',
            'title' => 'Path',
            'description' => 'A path.',
            'level' => 'All Levels',
            'courses' => [$course->id, $course->id],
        ])
        ->assertSessionHasErrors();

    expect($path->courses()->count())->toBe(0);
});

test('students are forbidden from the learning path editor endpoints', function () {
    $student = User::factory()->create(['role' => 'student']);
    $path = LearningPath::factory()->create();

    $this->actingAs($student)
        ->post(route('dashboard.learning-paths.store'))
        ->assertForbidden();

    $this->actingAs($student)
        ->get(route('dashboard.learning-paths.edit', $path))
        ->assertForbidden();

    $this->actingAs($student)
        ->post(route('dashboard.learning-paths.update', $path), [
            '_method' => 'put',
            'title' => 'Path',
            'description' => 'A path.',
            'level' => 'All Levels',
            'courses' => [Course::factory()->create()->id],
        ])
        ->assertForbidden();

    expect(LearningPath::count())->toBe(1);
});

test('guests are redirected from the learning path editor', function () {
    $path = LearningPath::factory()->create();

    $this->get(route('dashboard.learning-paths.edit', $path))
        ->assertRedirect(route('login'));
});
