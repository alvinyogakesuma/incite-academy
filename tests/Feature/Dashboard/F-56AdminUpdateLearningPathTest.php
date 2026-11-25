<?php

/**
 * F-56 - Fungsi mengubah detail jalur pembelajaran oleh admin
 *
 * Feature tests for the admin's learning path save: PUT /dashboard/learning-
 * paths/{learning_path} (route dashboard.learning-paths.update), behind the
 * auth -> verified -> admin gate. The editor submits the whole payload - the
 * metadata, the cover image (a retained stored cover, a fresh upload, or a
 * removal), and the course sequence - in one call.
 *
 * Method: equivalence partitioning (EP) per input domain, then robust boundary
 * value analysis (BVA) - every identified boundary carries both a valid-side
 * and an invalid-side input.
 *
 * == Input domains and partitions ============================================
 *
 * | Domain            | Valid classes                                  | Invalid classes                                        |
 * |-------------------|------------------------------------------------|--------------------------------------------------------|
 * | access            | admin                                          | student, guest                                         |
 * | target            | an existing learning path                      | an unknown id                                          |
 * | title             | 1..255 characters                              | missing, 256+ characters                               |
 * | description       | present                                        | missing                                                |
 * | level             | the four LEVELS values                         | any value outside the constant                         |
 * | cover image       | retained stored cover, fresh upload            | none when the path has none, removed without a         |
 * |                   |                                                | replacement, non-image file, over 2048 KB              |
 * | course sequence   | 1.. distinct, existing course ids              | empty, duplicates, an unknown id                       |
 * | sequence order    | payload position becomes the pivot order_index | attach order                                           |
 * | stats             | courses_count and summed total_duration        | stale aggregates                                       |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F56-01 | success baseline; retained cover            | full payload, two courses          | redirect to the listing; fields, sequence, stats updated  |
 * | FT-F56-02 | title length - 255 / 256                    | 255 / 256 chars                    | accepted / rejected on title                              |
 * | FT-F56-03 | description - missing (invalid side)        | omitted                            | rejected on description; row unchanged                    |
 * | FT-F56-04 | level - member / outsider                   | Beginner / Expert                  | accepted / rejected on level                              |
 * | FT-F56-05 | cover - none stored, none uploaded          | null image_url                     | rejected on image; row untouched                          |
 * | FT-F56-06 | cover - removal without a replacement       | remove_image=1, no upload          | rejected on image; stored cover kept                      |
 * | FT-F56-07 | cover - fresh upload replaces the stored    | stored learning-paths/old.png      | new stored path; old file deleted                         |
 * | FT-F56-08 | cover - non-image file                      | application/pdf                    | rejected on image                                         |
 * | FT-F56-09 | cover - size 2048 / 2049 KB                 | 2048 / 2049 KB image               | accepted / rejected on image                              |
 * | FT-F56-10 | courses - empty (invalid side)              | courses omitted / []               | rejected on courses                                       |
 * | FT-F56-11 | courses - duplicate (invalid side)          | the same course twice              | rejected on courses; sequence untouched                   |
 * | FT-F56-12 | courses - unknown id (invalid side)         | 999999                             | rejected on courses.0; sequence untouched                 |
 * | FT-F56-13 | sequence order and stats                    | three courses, payload order B,A,C | pivot orders 0,1,2; count 3; duration summed              |
 * | FT-F56-14 | access - student (invalid side)             | student PUT                        | 403; row unchanged                                        |
 * | FT-F56-15 | access - guest (invalid side)               | logged-out PUT                     | redirect to login; row unchanged                          |
 * | FT-F56-16 | target - unknown id (invalid side)          | PUT on a non-existent path         | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * LearningPathsManagementTest already covers the success baseline with a
 * fresh cover, the cover-required rejection, the sequence sync with stats,
 * the duplicate rejection, and the student rejection. F-56 deliberately
 * repeats the baseline, the cover-required case, and the duplicate rejection
 * so the feature file is self-contained; the new content is the title limit,
 * the description requirement, the level membership pair, the removal rule,
 * the size boundary, the empty and unknown-course rejections, the pivot order
 * pinned through the sequence, and the guest PUT with the unknown-id 404.
 *
 * The listing the save returns to is F-55's subject; the create flow is F-54's
 * and the delete F-57's. The student detail that renders the sequence is F-08.
 * The cover rules mirror the challenge save (F-44) with the learning-paths/
 * prefix. The gate ordering is F-04's subject; this route shares the same
 * middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Update takes the full payload; it is not a partial patch.
 * - The sequence requires at least one course; duplicates and unknown ids are
 *   rejected before any pivot write, so a rejected save leaves the stored
 *   sequence exactly as it was.
 * - The payload position becomes the pivot's order_index, which is the order
 *   the student's detail page renders.
 * - After the sync the stored aggregates are refreshed: courses_count is the
 *   attached count and total_duration is the sum of the courses' durations.
 * - The cover is required unless the path already has one and the save keeps
 *   it. Removing without a replacement is rejected; a fresh upload replaces
 *   the stored file and deletes the old one; external URLs pass through.
 * - Validation failures leave the stored row and its sequence untouched.
 */

use App\Models\Course;
use App\Models\LearningPath;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f56Admin();
});

test('FT-F56-01 - an admin updates the path metadata and keeps the cover', function () {
    // Boundary: success baseline. The metadata lands, the two courses sync,
    // the aggregates refresh, and the retained external cover stays.
    $path = f56Path();
    $first = f56Course(100);
    $second = f56Course(50);

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'courses' => [$first->id, $second->id],
        ]))
        ->assertRedirect(route('dashboard.learning-paths'));

    $path->refresh();

    expect($path->title)->toBe('Updated Path')
        ->and($path->description)->toBe('An updated description.')
        ->and($path->level)->toBe('Beginner')
        ->and($path->image_url)->toBe('https://example.com/cover.png')
        ->and($path->courses_count)->toBe(2)
        ->and($path->total_duration)->toBe(150);
});

test('FT-F56-02 - the title boundary is 255 characters', function () {
    // Boundary: title max / max+1.
    $path = f56Path();
    $course = f56Course(30);

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'title' => str_repeat('p', 255),
            'courses' => [$course->id],
        ]))
        ->assertRedirect(route('dashboard.learning-paths'));

    expect($path->fresh()->title)->toHaveLength(255);

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'title' => str_repeat('p', 256),
            'courses' => [$course->id],
        ]))
        ->assertSessionHasErrors(['title']);

    expect($path->fresh()->title)->toHaveLength(255);
});

test('FT-F56-03 - the description is required', function () {
    // Boundary: description, invalid side (missing).
    $path = f56Path();
    $course = f56Course(30);

    $payload = f56Payload(['courses' => [$course->id]]);
    unset($payload['description']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), $payload)
        ->assertSessionHasErrors(['description']);

    expect($path->fresh()->description)->toBe('Original description.');
});

test('FT-F56-04 - the level must be one of the four constants', function () {
    // Partition: level. A member is stored; an outsider is rejected.
    $path = f56Path();
    $course = f56Course(30);

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'level' => 'Beginner',
            'courses' => [$course->id],
        ]))
        ->assertRedirect(route('dashboard.learning-paths'));

    expect($path->fresh()->level)->toBe('Beginner');

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'level' => 'Expert',
            'courses' => [$course->id],
        ]))
        ->assertSessionHasErrors(['level']);

    expect($path->fresh()->level)->toBe('Beginner');
});

test('FT-F56-05 - a cover is required when the path has none', function () {
    // Boundary: cover, invalid side (none stored, none uploaded).
    $path = f56Path(['image_url' => null]);
    $course = f56Course(30);

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'courses' => [$course->id],
        ]))
        ->assertSessionHasErrors(['image']);

    expect($path->fresh()->image_url)->toBeNull();
});

test('FT-F56-06 - removing the cover without a replacement is rejected', function () {
    // Boundary: cover, invalid side (remove_image without an upload). The
    // stored cover survives the rejected request.
    Storage::fake('public');
    Storage::disk('public')->put('learning-paths/old.png', 'old cover');
    $path = f56Path(['image_url' => 'learning-paths/old.png']);
    $course = f56Course(30);

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'remove_image' => true,
            'courses' => [$course->id],
        ]))
        ->assertSessionHasErrors(['image']);

    expect($path->fresh()->image_url)->toBe('learning-paths/old.png');
    Storage::disk('public')->assertExists('learning-paths/old.png');
});

test('FT-F56-07 - a fresh upload replaces the stored cover', function () {
    // Boundary: cover, valid side (fresh upload). The new file replaces the
    // stored one and the old file is deleted.
    Storage::fake('public');
    Storage::disk('public')->put('learning-paths/old.png', 'old cover');
    $path = f56Path(['image_url' => 'learning-paths/old.png']);
    $course = f56Course(30);

    $this->actingAs($this->admin)
        ->post(route('dashboard.learning-paths.update', $path), [
            '_method' => 'put',
            ...f56Payload(['courses' => [$course->id]]),
            'image' => UploadedFile::fake()->image('new.png'),
        ])
        ->assertRedirect(route('dashboard.learning-paths'));

    $path->refresh();

    expect($path->image_url)->toStartWith('learning-paths/')
        ->and($path->image_url)->not->toBe('learning-paths/old.png');

    Storage::disk('public')->assertExists($path->image_url);
    Storage::disk('public')->assertMissing('learning-paths/old.png');
});

test('FT-F56-08 - a non-image cover is rejected', function () {
    // Boundary: cover, invalid side (mime).
    $path = f56Path(['image_url' => null]);
    $course = f56Course(30);

    $this->actingAs($this->admin)
        ->post(route('dashboard.learning-paths.update', $path), [
            '_method' => 'put',
            ...f56Payload(['courses' => [$course->id]]),
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors(['image']);

    expect($path->fresh()->image_url)->toBeNull();
});

test('FT-F56-09 - the cover size boundary is 2048 KB', function () {
    // Boundary: cover size max / max+1.
    Storage::fake('public');
    $path = f56Path(['image_url' => null]);
    $course = f56Course(30);

    $this->actingAs($this->admin)
        ->post(route('dashboard.learning-paths.update', $path), [
            '_method' => 'put',
            ...f56Payload(['courses' => [$course->id]]),
            'image' => UploadedFile::fake()->image('max.png')->size(2048),
        ])
        ->assertRedirect(route('dashboard.learning-paths'));

    expect($path->fresh()->image_url)->toStartWith('learning-paths/');

    $this->actingAs($this->admin)
        ->post(route('dashboard.learning-paths.update', $path), [
            '_method' => 'put',
            ...f56Payload(['courses' => [$course->id]]),
            'image' => UploadedFile::fake()->image('over.png')->size(2049),
        ])
        ->assertSessionHasErrors(['image']);
});

test('FT-F56-10 - the course sequence cannot be empty', function () {
    // Boundary: sequence, invalid side (no courses).
    $path = f56Path();

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload(['courses' => []]))
        ->assertSessionHasErrors(['courses']);

    expect($path->fresh()->courses_count)->toBe(0);
});

test('FT-F56-11 - a duplicate course is rejected', function () {
    // Boundary: sequence, invalid side (distinct). The rejected save leaves
    // the stored sequence as it was.
    $path = f56Path();
    $course = f56Course(30);

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'courses' => [$course->id, $course->id],
        ]))
        ->assertSessionHasErrors();

    expect($path->fresh()->courses_count)->toBe(0);
});

test('FT-F56-12 - an unknown course id is rejected', function () {
    // Boundary: sequence, invalid side (exists).
    $path = f56Path();

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'courses' => [999999],
        ]))
        ->assertSessionHasErrors(['courses.0']);

    expect($path->fresh()->courses_count)->toBe(0);
});

test('FT-F56-13 - the payload order becomes the pivot order and the stats follow', function () {
    // Boundary: sequence order and stats. Three courses attached in one order
    // but submitted in another; the pivot keeps the payload positions.
    $path = f56Path();
    $first = f56Course(10);
    $second = f56Course(20);
    $third = f56Course(30);
    $path->courses()->attach($first->id, ['order_index' => 0]);
    $path->courses()->attach($second->id, ['order_index' => 1]);
    $path->courses()->attach($third->id, ['order_index' => 2]);
    $path->recalculateStats();

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'courses' => [$second->id, $first->id, $third->id],
        ]))
        ->assertRedirect(route('dashboard.learning-paths'));

    $pivot = DB::table('course_learning_path')
        ->where('learning_path_id', $path->id)
        ->pluck('order_index', 'course_id');

    expect((int) $pivot[$second->id])->toBe(0)
        ->and((int) $pivot[$first->id])->toBe(1)
        ->and((int) $pivot[$third->id])->toBe(2)
        ->and($path->fresh()->courses_count)->toBe(3)
        ->and($path->fresh()->total_duration)->toBe(60);
});

test('FT-F56-14 - a student cannot update a learning path', function () {
    // Boundary: access, invalid side (role).
    $path = f56Path();
    $course = f56Course(30);
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->put(route('dashboard.learning-paths.update', $path), f56Payload([
            'title' => 'Hacked Title',
            'courses' => [$course->id],
        ]))
        ->assertForbidden();

    expect($path->fresh()->title)->toBe('Old Path');
});

test('FT-F56-15 - a guest cannot update a learning path', function () {
    // Boundary: access, invalid side (authentication).
    $path = f56Path();
    $course = f56Course(30);

    $this->put(route('dashboard.learning-paths.update', $path), f56Payload([
        'title' => 'Hacked Title',
        'courses' => [$course->id],
    ]))->assertRedirect(route('login'));

    expect($path->fresh()->title)->toBe('Old Path');
});

test('FT-F56-16 - updating an unknown path is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $course = f56Course(30);

    $this->actingAs($this->admin)
        ->put(route('dashboard.learning-paths.update', 999999), f56Payload([
            'courses' => [$course->id],
        ]))
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f56Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * A learning path with a retained external cover.
 *
 * @param  array<string, mixed>  $attributes
 */
function f56Path(array $attributes = []): LearningPath
{
    return LearningPath::factory()->create(array_merge([
        'title' => 'Old Path',
        'description' => 'Original description.',
        'level' => 'All Levels',
        'image_url' => 'https://example.com/cover.png',
        'courses_count' => 0,
        'total_duration' => 0,
    ], $attributes));
}

/**
 * A course with a pinned duration.
 *
 * @param  array<string, mixed>  $attributes
 */
function f56Course(int $duration, array $attributes = []): Course
{
    return Course::factory()->create(array_merge([
        'total_duration' => $duration,
    ], $attributes));
}

/**
 * A valid whole-payload save.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function f56Payload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Updated Path',
        'description' => 'An updated description.',
        'level' => 'Beginner',
        'courses' => [],
    ], $overrides);
}
