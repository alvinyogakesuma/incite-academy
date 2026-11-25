<?php

use App\Enums\Category;
use App\Models\Answer;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Question;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ]);
});

test('admin can view the courses management page', function () {
    $this->actingAs($this->admin)
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('courses')
            ->has('categories'));
});

test('only admins may browse the course listing', function () {
    $student = User::factory()->create(['role' => 'student']);

    expect(Gate::forUser($student)->allows('viewAny', Course::class))->toBeFalse();
    expect(Gate::forUser($this->admin)->allows('viewAny', Course::class))->toBeTrue();
});

test('courses are mapped to the card shape', function () {
    $course = Course::factory()->reading()->create([
        'title' => 'Reading Comprehension Mastery',
        'short_description' => 'Develop critical reading skills',
        'image_url' => null,
        'status' => 'published',
        'total_duration' => 234,
        'modules_count' => 3,
        'lessons_count' => 9,
        'total_points' => 160,
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.courses'))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->has('courses', 1)
            ->where('courses.0.id', $course->id)
            ->where('courses.0.title', 'Reading Comprehension Mastery')
            ->where('courses.0.category', Category::ReadingComprehension->value)
            ->where('courses.0.short_description', 'Develop critical reading skills')
            ->where('courses.0.image_url', null)
            ->where('courses.0.status', 'published')
            ->where('courses.0.total_duration', 234)
            ->where('courses.0.modules_count', 3)
            ->where('courses.0.lessons_count', 9)
            ->where('courses.0.total_points', 160));
});

test('students are forbidden from the courses management page', function () {
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->get(route('dashboard.courses'))
        ->assertForbidden();
});

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard.courses'))
        ->assertRedirect(route('login'));
});

test('admin can create a new empty course and is redirected to its editor', function () {
    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.store'))
        ->assertRedirect(route('dashboard.courses.edit', Course::query()->latest('id')->first()));

    $course = Course::query()->latest('id')->first();

    expect($course)
        ->title->toBeNull()
        ->category->toBeNull()
        ->short_description->toBeNull()
        ->image_url->toBeNull()
        ->status->toBe('draft')
        ->total_duration->toBe(0)
        ->modules_count->toBe(0)
        ->lessons_count->toBe(0)
        ->total_points->toBe(0);
});

test('students are forbidden from creating a course', function () {
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->post(route('dashboard.courses.store'))
        ->assertForbidden();

    expect(Course::query()->count())->toBe(0);
});

test('admin can delete a course with its whole outline', function () {
    $course = Course::factory()->create(['title' => 'Doomed Course']);
    $module = Module::factory()->for($course)->create(['title' => 'Doomed Module']);
    $lesson = Lesson::factory()->for($course)->for($module)->article()->create(['title' => 'Doomed Lesson']);
    $question = Question::factory()->for($lesson)->create();
    Answer::factory()->for($question)->create();
    $student = User::factory()->create();
    Enrollment::factory()->for($student)->for($course)->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.courses.destroy', $course))
        ->assertRedirect(route('dashboard.courses'));

    expect(Course::count())->toBe(0)
        ->and(Module::count())->toBe(0)
        ->and(Lesson::count())->toBe(0)
        ->and(Question::count())->toBe(0)
        ->and(Answer::count())->toBe(0)
        ->and(Enrollment::count())->toBe(0);
});

test('deleting a course removes its stored cover image', function () {
    Storage::fake('public');
    Storage::disk('public')->put('courses/cover.png', 'pixels');

    $course = Course::factory()->create([
        'title' => 'Doomed Course',
        'image_url' => 'courses/cover.png',
    ]);

    $this->actingAs($this->admin)
        ->delete(route('dashboard.courses.destroy', $course))
        ->assertRedirect(route('dashboard.courses'));

    expect(Course::count())->toBe(0);
    Storage::disk('public')->assertMissing('courses/cover.png');
});

test('students are forbidden from deleting a course', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create(['title' => 'Safe Course']);

    $this->actingAs($student)
        ->delete(route('dashboard.courses.destroy', $course))
        ->assertForbidden();

    expect(Course::count())->toBe(1);
});

test('admin can open the course editor with its outline', function () {
    $course = Course::factory()->reading()->create([
        'title' => 'Reading Comprehension Mastery',
        'total_duration' => 234,
        'total_points' => 160,
    ]);
    $module = Module::factory()->for($course)->create(['title' => 'Foundations']);
    // Zero stats keep the course's stored totals at the values the
    // assertions expect.
    Lesson::factory()->for($module)->article()->create(['title' => 'Skimming Basics', 'duration' => 0, 'points' => 0]);
    Lesson::factory()->for($module)->quiz()->create(['title' => 'Skimming Practice', 'duration' => 0, 'points' => 0]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('course.id', $course->id)
            ->where('course.title', 'Reading Comprehension Mastery')
            ->where('course.category', Category::ReadingComprehension->value)
            ->where('course.total_duration', 234)
            ->where('course.total_points', 160)
            ->has('course.modules', 1)
            ->where('course.modules.0.title', 'Foundations')
            ->has('course.modules.0.lessons', 2)
            ->where('course.modules.0.lessons.0.title', 'Skimming Basics')
            ->where('course.modules.0.lessons.0.type', 'article')
            ->where('course.modules.0.lessons.1.title', 'Skimming Practice')
            ->where('course.modules.0.lessons.1.type', 'quiz')
            ->has('categories'));
});

test('admin can open the editor for a fresh draft course', function () {
    $course = Course::factory()->draft()->create();

    $this->actingAs($this->admin)
        ->get(route('dashboard.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('course.title', null)
            ->where('course.status', 'draft')
            ->where('course.modules', []));
});

test('students are forbidden from the course editor', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create();

    $this->actingAs($student)
        ->get(route('dashboard.courses.edit', $course))
        ->assertForbidden();
});

test('admin can update the course metadata', function () {
    $course = Course::factory()->create([
        'title' => 'Old Title',
        // A retained stored cover satisfies the image rule.
        'image_url' => 'https://example.com/cover.png',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), [
            'title' => 'Reading Comprehension Mastery',
            'category' => Category::ReadingComprehension->value,
            'status' => 'published',
            'short_description' => 'Develop critical reading skills',
            'long_description' => 'A comprehensive reading curriculum.',
        ])
        ->assertRedirect(route('dashboard.courses'));

    $course->refresh();

    expect($course)
        ->title->toBe('Reading Comprehension Mastery')
        ->category->value->toBe(Category::ReadingComprehension->value)
        ->status->toBe('published')
        ->short_description->toBe('Develop critical reading skills')
        ->long_description->toBe('A comprehensive reading curriculum.')
        ->image_url->toBe('https://example.com/cover.png');
});

test('update validation errors are returned to the form', function () {
    $course = Course::factory()->create(['title' => 'Old Title']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), [
            'title' => '',
            'category' => Category::ReadingComprehension->value,
            'status' => 'published',
            'short_description' => 'Develop critical reading skills',
            'long_description' => 'A comprehensive reading curriculum.',
        ])
        ->assertSessionHasErrors(['title']);

    expect($course->fresh()->title)->toBe('Old Title');
});

test('students are forbidden from updating a course', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create(['title' => 'Old Title']);

    $this->actingAs($student)
        ->put(route('dashboard.courses.update', $course), [
            'title' => 'Hacked Title',
            'category' => Category::ReadingComprehension->value,
            'status' => 'published',
            'short_description' => 'Nope',
            'long_description' => 'Nope',
        ])
        ->assertForbidden();

    expect($course->fresh()->title)->toBe('Old Title');
});

test('admin can upload a course cover image', function () {
    Storage::fake('public');
    $course = Course::factory()->create(['image_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.update', $course), [
            '_method' => 'put',
            'title' => 'With Cover',
            'category' => Category::ReadingComprehension->value,
            'status' => 'published',
            'short_description' => 'Develop critical reading skills',
            'long_description' => 'A comprehensive reading curriculum.',
            'image' => UploadedFile::fake()->image('cover.png'),
        ])
        ->assertRedirect(route('dashboard.courses'));

    $course->refresh();

    expect($course->image_url)->toStartWith('courses/');
    Storage::disk('public')->assertExists($course->image_url);
});

test('uploading a new cover replaces the stored one', function () {
    Storage::fake('public');
    Storage::disk('public')->put('courses/old.png', 'old cover');
    $course = Course::factory()->create(['image_url' => 'courses/old.png']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.update', $course), [
            '_method' => 'put',
            'title' => 'New Cover',
            'category' => Category::ReadingComprehension->value,
            'status' => 'published',
            'short_description' => 'Develop critical reading skills',
            'long_description' => 'A comprehensive reading curriculum.',
            'image' => UploadedFile::fake()->image('new.png'),
        ])
        ->assertRedirect(route('dashboard.courses'));

    $course->refresh();

    // The new upload lands under courses/ with a fresh hashed name.
    expect($course->image_url)->toStartWith('courses/')->not->toBe('courses/old.png');
    Storage::disk('public')->assertExists($course->image_url);
    Storage::disk('public')->assertMissing('courses/old.png');
});

test('remove_image without a replacement is a validation error', function () {
    Storage::fake('public');
    Storage::disk('public')->put('courses/old.png', 'old cover');
    $course = Course::factory()->create(['image_url' => 'courses/old.png']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.update', $course), [
            '_method' => 'put',
            'title' => 'No Cover',
            'category' => Category::ReadingComprehension->value,
            'status' => 'published',
            'short_description' => 'Develop critical reading skills',
            'long_description' => 'A comprehensive reading curriculum.',
            'remove_image' => '1',
        ])
        ->assertSessionHasErrors(['image']);

    // The cover is required unless retained — removing without a
    // replacement keeps the stored one.
    expect($course->fresh()->image_url)->toBe('courses/old.png');
    Storage::disk('public')->assertExists('courses/old.png');
});

test('the cover image is required when the course has none', function () {
    $course = Course::factory()->create(['image_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.update', $course), [
            '_method' => 'put',
            'title' => 'No Cover',
            'category' => Category::ReadingComprehension->value,
            'status' => 'published',
            'short_description' => 'Develop critical reading skills',
            'long_description' => 'A comprehensive reading curriculum.',
        ])
        ->assertSessionHasErrors(['image']);

    expect($course->fresh()->title)->toBe($course->title);
});

test('cover validation rejects non-image files', function () {
    $course = Course::factory()->create(['image_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.update', $course), [
            '_method' => 'put',
            'title' => 'Bad Cover',
            'category' => Category::ReadingComprehension->value,
            'status' => 'published',
            'short_description' => 'Develop critical reading skills',
            'long_description' => 'A comprehensive reading curriculum.',
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors(['image']);
});

test('admin can add a module to a course', function () {
    $course = Course::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.modules.store', $course))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect(Module::query()->where('course_id', $course->id)->count())->toBe(1);

    $module = Module::query()->where('course_id', $course->id)->first();

    expect($module)
        ->title->toBe('Untitled Module')
        ->order_index->toBe(0);
});

test('module order_index sequences after existing modules', function () {
    $course = Course::factory()->create();
    Module::factory()->for($course)->create(['order_index' => 0]);
    Module::factory()->for($course)->create(['order_index' => 1]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.modules.store', $course))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    $module = Module::query()
        ->where('course_id', $course->id)
        ->orderByDesc('order_index')
        ->first();

    expect($module->order_index)->toBe(2);
});

test('students are forbidden from adding a module', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create();

    $this->actingAs($student)
        ->post(route('dashboard.courses.modules.store', $course))
        ->assertForbidden();

    expect(Module::query()->where('course_id', $course->id)->count())->toBe(0);
});

test('admin can add a lesson to a module', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    $this->actingAs($this->admin)
        ->post(route('dashboard.modules.lessons.store', $module))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    $lesson = Lesson::query()->where('module_id', $module->id)->first();

    expect($lesson)
        ->course_id->toBe($course->id)
        ->title->toBe('Untitled Lesson')
        ->type->toBe('article')
        ->order_index->toBe(0);
});

test('lesson order_index sequences after existing lessons', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    Lesson::factory()->for($module)->create(['order_index' => 0]);
    Lesson::factory()->for($module)->create(['order_index' => 1]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.modules.lessons.store', $module))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    $lesson = Lesson::query()
        ->where('module_id', $module->id)
        ->orderByDesc('order_index')
        ->first();

    expect($lesson->order_index)->toBe(2);
});

test('students are forbidden from adding a lesson', function () {
    $student = User::factory()->create(['role' => 'student']);
    $module = Module::factory()->for(Course::factory())->create();

    $this->actingAs($student)
        ->post(route('dashboard.modules.lessons.store', $module))
        ->assertForbidden();

    expect(Lesson::query()->where('module_id', $module->id)->count())->toBe(0);
});

test('admin can delete a module with its lessons cascading', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->create();

    $this->actingAs($this->admin)
        ->delete(route('dashboard.modules.destroy', $module))
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect(Module::query()->find($module->id))->toBeNull();
    expect(Lesson::query()->find($lesson->id))->toBeNull();
});

test('students are forbidden from deleting a module', function () {
    $student = User::factory()->create(['role' => 'student']);
    $module = Module::factory()->for(Course::factory())->create();

    $this->actingAs($student)
        ->delete(route('dashboard.modules.destroy', $module))
        ->assertForbidden();

    expect(Module::query()->find($module->id))->not->toBeNull();
});

test('admin can open the lesson editor with its questions and answers', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->create([
        'title' => 'Skimming Basics',
        'type' => 'quiz',
    ]);
    $question = Question::factory()->for($lesson)->text()->create([
        'question_content' => 'What is the primary objective of skimming?',
    ]);
    Answer::factory()->for($question)->create([
        'answer_content' => 'To memorize all definitions.',
    ]);
    Answer::factory()->correct()->for($question)->create([
        'answer_content' => 'To identify the main ideas quickly.',
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.courses.lessons.edit', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('lesson.id', $lesson->id)
            ->where('lesson.title', 'Skimming Basics')
            ->where('lesson.type', 'quiz')
            ->has('lesson.questions', 1)
            ->where('lesson.questions.0.id', $question->id)
            ->where('lesson.questions.0.type', 'text')
            ->where('lesson.questions.0.question_content', 'What is the primary objective of skimming?')
            ->has('lesson.questions.0.answers', 2)
            ->where('lesson.questions.0.answers.0.answer_content', 'To memorize all definitions.')
            ->where('lesson.questions.0.answers.0.is_true', false)
            ->where('lesson.questions.0.answers.1.answer_content', 'To identify the main ideas quickly.')
            ->where('lesson.questions.0.answers.1.is_true', true));
});

test('admin can open the lesson editor for a bare lesson', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->article()->create();

    $this->actingAs($this->admin)
        ->get(route('dashboard.courses.lessons.edit', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('lesson.id', $lesson->id)
            ->where('lesson.type', 'article')
            ->where('lesson.questions', []));
});

test('students are forbidden from the lesson editor', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->create();

    $this->actingAs($student)
        ->get(route('dashboard.courses.lessons.edit', [$course, $lesson]))
        ->assertForbidden();
});

test('admin can update the lesson information', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->article()->create([
        'title' => 'Old Title',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'exam',
            'duration' => 30,
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    $lesson->refresh();

    expect($lesson)
        ->title->toBe('Skimming Basics')
        ->type->toBe('exam')
        ->duration->toBe(30);
});

test('exam lessons require a time limit', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->article()->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'exam',
            'duration' => null,
        ])
        ->assertSessionHasErrors(['duration']);

    expect($lesson->fresh()->type)->toBe('article');
});

test('lesson title is required', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->article()->create([
        'title' => 'Old Title',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => '',
            'type' => 'article',
            'duration' => null,
        ])
        ->assertSessionHasErrors(['title']);

    expect($lesson->fresh()->title)->toBe('Old Title');
});

test('quiz durations are derived from the question tree', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->exam()->create([
        'duration' => 45,
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'quiz',
            'duration' => 45,
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    // An empty tree floors at one minute — the stale exam time
    // limit is gone.
    expect($lesson->fresh())
        ->duration->toBe(1)
        ->points->toBe(0);
});

test('students are forbidden from updating a lesson', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->article()->create([
        'title' => 'Old Title',
    ]);

    $this->actingAs($student)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Hacked Title',
            'type' => 'article',
            'duration' => null,
        ])
        ->assertForbidden();

    expect($lesson->fresh()->title)->toBe('Old Title');
});

test('admin can save the article content with derived stats', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->article()->create();

    $content = '<p>'.trim(str_repeat('word ', 150)).'</p>';

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'article',
            'duration' => null,
            'article_content' => $content,
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    // 150 words — one minute of reading, fifteen points.
    expect($lesson->fresh())
        ->article_content->toBe($content)
        ->duration->toBe(1)
        ->points->toBe(15);
});

test('admin can sync the question tree of a quiz lesson', function () {
    Storage::fake('public');

    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->quiz()->create();

    // The stored 150-word original, and a distinct 150-word rewrite
    // — the rewrite keeps the content update observable while the
    // quiz duration derivation still sees one minute of reading.
    $longContent = trim(str_repeat('word ', 150));
    $rewrittenContent = 'Rewritten question '.trim(str_repeat('word ', 148));

    $keptQuestion = Question::factory()->for($lesson)->text()->create([
        'question_content' => $longContent,
    ]);
    $keptAnswer = Answer::factory()->for($keptQuestion)->create([
        'answer_content' => 'Old choice',
    ]);
    Answer::factory()->correct()->for($keptQuestion)->create([
        'answer_content' => 'Old correct',
    ]);

    $droppedQuestion = Question::factory()->for($lesson)->text()->create();
    // Created one call at a time — the factory's order_index
    // closure queries the DB, which count() would race.
    Answer::factory()->for($droppedQuestion)->create();
    Answer::factory()->for($droppedQuestion)->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'quiz',
            'duration' => null,
            'questions' => [
                [
                    'id' => $keptQuestion->id,
                    'type' => 'text',
                    'question_content' => $rewrittenContent,
                    'answers' => [
                        [
                            'id' => $keptAnswer->id,
                            'answer_content' => 'Renamed choice',
                            'is_true' => '0',
                        ],
                        [
                            'answer_content' => 'Fresh correct choice',
                            'is_true' => '1',
                        ],
                    ],
                ],
                [
                    'type' => 'listening',
                    'question_content' => 'Fresh listening question',
                    'audio' => UploadedFile::fake()->createWithContent('clip.wav', wavFileBytes()),
                    'audio_duration' => 30,
                    'remove_audio' => '0',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_true' => '0'],
                        ['answer_content' => 'Right', 'is_true' => '1'],
                    ],
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    // The dropped question is gone with its cascaded answers.
    expect($droppedQuestion->fresh())->toBeNull();
    expect(Answer::query()->where('question_id', $droppedQuestion->id)->count())->toBe(0);

    // The kept row updated in place — content, order, answers.
    $keptQuestion->refresh();

    expect($keptQuestion)
        ->question_content->toBe($rewrittenContent)
        ->order_index->toBe(0);

    $keptAnswer->refresh();

    expect($keptAnswer)
        ->answer_content->toBe('Renamed choice')
        ->is_true->toBe(false)
        ->order_index->toBe(0);

    expect(Answer::query()->where('question_id', $keptQuestion->id)->count())->toBe(2);
    expect(Answer::query()->where('question_id', $keptQuestion->id)->where('is_true', true)->count())->toBe(1);

    // The new listening question stored its audio on the public disk.
    $freshQuestion = Question::query()
        ->where('lesson_id', $lesson->id)
        ->where('type', 'listening')
        ->first();

    expect($freshQuestion)
        ->order_index->toBe(1)
        ->audio_duration->toBe(30)
        ->audio_url->toStartWith('questions/');

    Storage::disk('public')->assertExists($freshQuestion->audio_url);

    // Quiz stats derived from the tree: 150-word text question
    // (one minute) plus 30 seconds of listening audio (half a
    // minute) → two minutes, twenty points.
    expect($lesson->fresh())
        ->duration->toBe(2)
        ->points->toBe(20);
});

test('switching a lesson to article wipes its question tree', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->quiz()->create();
    $question = Question::factory()->for($lesson)->text()->create();
    // Created one call at a time — the factory's order_index
    // closure queries the DB, which count() would race.
    Answer::factory()->for($question)->create();
    Answer::factory()->for($question)->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'article',
            'duration' => null,
            'article_content' => '<p>The rewritten article body.</p>',
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect(Question::query()->where('lesson_id', $lesson->id)->count())->toBe(0);

    expect($lesson->fresh())
        ->type->toBe('article')
        ->article_content->toBe('<p>The rewritten article body.</p>');
});

test('a listening question switched to text drops its stored audio', function () {
    Storage::fake('public');
    Storage::disk('public')->put('questions/stored-clip.wav', 'stub');

    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->quiz()->create();
    $question = Question::factory()->for($lesson)->listening()->create([
        'audio_url' => 'questions/stored-clip.wav',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'quiz',
            'duration' => null,
            'questions' => [
                [
                    'id' => $question->id,
                    'type' => 'text',
                    'question_content' => 'Now a text question',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_true' => '0'],
                        ['answer_content' => 'Right', 'is_true' => '1'],
                    ],
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($question->fresh()->audio_url)->toBeNull();
    Storage::disk('public')->assertMissing('questions/stored-clip.wav');
});

test('a kept listening question keeps its stored audio', function () {
    Storage::fake('public');
    Storage::disk('public')->put('questions/stored-clip.wav', 'stub');

    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->quiz()->create();
    $question = Question::factory()->for($lesson)->listening()->create([
        'audio_url' => 'questions/stored-clip.wav',
        'audio_duration' => 42,
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'quiz',
            'duration' => null,
            'questions' => [
                [
                    'id' => $question->id,
                    'type' => 'listening',
                    'question_content' => 'Still a listening question',
                    'remove_audio' => '0',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_true' => '0'],
                        ['answer_content' => 'Right', 'is_true' => '1'],
                    ],
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($question->fresh()->audio_url)->toBe('questions/stored-clip.wav');
    Storage::disk('public')->assertExists('questions/stored-clip.wav');
});

test('a fresh upload replaces the stored audio file', function () {
    Storage::fake('public');
    Storage::disk('public')->put('questions/stored-clip.wav', 'stub');

    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->quiz()->create();
    $question = Question::factory()->for($lesson)->listening()->create([
        'audio_url' => 'questions/stored-clip.wav',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'quiz',
            'duration' => null,
            'questions' => [
                [
                    'id' => $question->id,
                    'type' => 'listening',
                    'question_content' => 'Still a listening question',
                    'audio' => UploadedFile::fake()->createWithContent('clip.wav', wavFileBytes()),
                    'audio_duration' => 12,
                    // A pending removal riding with its replacement.
                    'remove_audio' => '1',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_true' => '0'],
                        ['answer_content' => 'Right', 'is_true' => '1'],
                    ],
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($question->fresh()->audio_url)
        ->toStartWith('questions/')
        ->not->toBe('questions/stored-clip.wav');

    Storage::disk('public')->assertMissing('questions/stored-clip.wav');
    Storage::disk('public')->assertExists($question->fresh()->audio_url);
});

test('exam lessons keep their manual time limit and derive points from questions', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->exam()->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Final Exam',
            'type' => 'exam',
            'duration' => 30,
            'questions' => [
                [
                    'type' => 'text',
                    'question_content' => 'First question',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_true' => '0'],
                        ['answer_content' => 'Right', 'is_true' => '1'],
                    ],
                ],
                [
                    'type' => 'text',
                    'question_content' => 'Second question',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_true' => '0'],
                        ['answer_content' => 'Right', 'is_true' => '1'],
                    ],
                ],
                [
                    'type' => 'text',
                    'question_content' => 'Third question',
                    'answers' => [
                        ['answer_content' => 'Wrong', 'is_true' => '0'],
                        ['answer_content' => 'Right', 'is_true' => '1'],
                    ],
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($lesson->fresh())
        ->duration->toBe(30)
        ->points->toBe(30);
});

test('the lesson editor maps stored audio to public disk urls', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->quiz()->create();

    Question::factory()->for($lesson)->listening()->create([
        'audio_url' => 'questions/stored-clip.wav',
    ]);
    Question::factory()->for($lesson)->listening()->create([
        'audio_url' => 'https://example.com/seeding-passes-through.wav',
    ]);

    $this->actingAs($this->admin)
        ->get(route('dashboard.courses.lessons.edit', [$course, $lesson]))
        ->assertOk()
        ->assertInertia(fn ($assert) => $assert
            ->where('lesson.questions.0.audio_url', Storage::disk('public')->url('questions/stored-clip.wav'))
            ->where('lesson.questions.1.audio_url', 'https://example.com/seeding-passes-through.wav'));
});

test('saving a quiz lesson reorders existing questions', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->quiz()->create();

    $firstQuestion = Question::factory()->for($lesson)->text()->create([
        'question_content' => 'First question',
    ]);
    $secondQuestion = Question::factory()->for($lesson)->text()->create([
        'question_content' => 'Second question',
    ]);

    $answerRows = [
        ['answer_content' => 'Wrong', 'is_true' => '0'],
        ['answer_content' => 'Right', 'is_true' => '1'],
    ];

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.lessons.update', [$course, $lesson]), [
            'title' => 'Skimming Basics',
            'type' => 'quiz',
            'duration' => null,
            'questions' => [
                [
                    'id' => $secondQuestion->id,
                    'type' => 'text',
                    'question_content' => 'Second question',
                    'answers' => $answerRows,
                ],
                [
                    'id' => $firstQuestion->id,
                    'type' => 'text',
                    'question_content' => 'First question',
                    'answers' => $answerRows,
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    // The swap exercises the parking pass — a direct index write
    // would collide on the (lesson_id, order_index) constraint.
    expect($secondQuestion->fresh()->order_index)->toBe(0);
    expect($firstQuestion->fresh()->order_index)->toBe(1);
});

test('admin can reorder the modules of a course', function () {
    $course = Course::factory()->create();
    $moduleA = Module::factory()->for($course)->create();
    $moduleB = Module::factory()->for($course)->create();
    $moduleC = Module::factory()->for($course)->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.modules.reorder', $course), [
            'module_order' => [$moduleC->id, $moduleA->id, $moduleB->id],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($moduleC->fresh()->order_index)->toBe(0)
        ->and($moduleA->fresh()->order_index)->toBe(1)
        ->and($moduleB->fresh()->order_index)->toBe(2);
});

test('module reorders reject foreign module ids', function () {
    $course = Course::factory()->create();
    $moduleA = Module::factory()->for($course)->create();
    $moduleB = Module::factory()->for($course)->create();
    $foreignModule = Module::factory()->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.modules.reorder', $course), [
            'module_order' => [$moduleA->id, $foreignModule->id],
        ])
        ->assertSessionHasErrors(['module_order']);

    expect($moduleA->fresh()->order_index)->toBe(0)
        ->and($moduleB->fresh()->order_index)->toBe(1)
        ->and($foreignModule->fresh()->order_index)->toBe(0);
});

test('admin can reorder the lessons of a module', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lessonA = Lesson::factory()->for($module)->create();
    $lessonB = Lesson::factory()->for($module)->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.lessons.reorder', $module), [
            'lesson_order' => [$lessonB->id, $lessonA->id],
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($lessonB->fresh()->order_index)->toBe(0)
        ->and($lessonA->fresh()->order_index)->toBe(1);
});

test('lesson reorders reject foreign lesson ids', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $otherModule = Module::factory()->for($course)->create();
    $lessonA = Lesson::factory()->for($module)->create();
    $lessonB = Lesson::factory()->for($module)->create();
    $foreignLesson = Lesson::factory()->for($otherModule)->create();

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.lessons.reorder', $module), [
            'lesson_order' => [$lessonA->id, $foreignLesson->id],
        ])
        ->assertSessionHasErrors(['lesson_order']);

    expect($lessonA->fresh()->order_index)->toBe(0)
        ->and($lessonB->fresh()->order_index)->toBe(1)
        ->and($foreignLesson->fresh()->order_index)->toBe(0);
});

test('students are forbidden from reordering modules', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();

    $this->actingAs($student)
        ->put(route('dashboard.courses.modules.reorder', $course), [
            'module_order' => [$module->id],
        ])
        ->assertForbidden();

    expect($module->fresh()->order_index)->toBe(0);
});

test('students are forbidden from reordering lessons', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->create();

    $this->actingAs($student)
        ->put(route('dashboard.modules.lessons.reorder', $module), [
            'lesson_order' => [$lesson->id],
        ])
        ->assertForbidden();

    expect($lesson->fresh()->order_index)->toBe(0);
});

test('admin can rename a module', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create([
        'title' => 'Old Module Title',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.rename', $module), [
            'title' => 'Renamed Module',
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($module->fresh()->title)->toBe('Renamed Module');
});

test('module renames require a title', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create([
        'title' => 'Old Module Title',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.modules.rename', $module), [
            'title' => '',
        ])
        ->assertSessionHasErrors(['title']);

    expect($module->fresh()->title)->toBe('Old Module Title');
});

test('students are forbidden from renaming a module', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create([
        'title' => 'Old Module Title',
    ]);

    $this->actingAs($student)
        ->put(route('dashboard.modules.rename', $module), [
            'title' => 'Hacked Module',
        ])
        ->assertForbidden();

    expect($module->fresh()->title)->toBe('Old Module Title');
});

test('admin can rename a lesson', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->create([
        'title' => 'Old Lesson Title',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.lessons.rename', $lesson), [
            'title' => 'Renamed Lesson',
        ])
        ->assertRedirect(route('dashboard.courses.edit', $course));

    expect($lesson->fresh()->title)->toBe('Renamed Lesson');
});

test('lesson renames require a title', function () {
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->create([
        'title' => 'Old Lesson Title',
    ]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.lessons.rename', $lesson), [
            'title' => '',
        ])
        ->assertSessionHasErrors(['title']);

    expect($lesson->fresh()->title)->toBe('Old Lesson Title');
});

test('students are forbidden from renaming a lesson', function () {
    $student = User::factory()->create(['role' => 'student']);
    $course = Course::factory()->create();
    $module = Module::factory()->for($course)->create();
    $lesson = Lesson::factory()->for($module)->create([
        'title' => 'Old Lesson Title',
    ]);

    $this->actingAs($student)
        ->put(route('dashboard.lessons.rename', $lesson), [
            'title' => 'Hacked Lesson',
        ])
        ->assertForbidden();

    expect($lesson->fresh()->title)->toBe('Old Lesson Title');
});
