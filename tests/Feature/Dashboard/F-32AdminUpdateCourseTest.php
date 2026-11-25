<?php

/**
 * F-32 - Fungsi mengubah informasi kursus oleh admin
 *
 * Feature tests for the admin's course-metadata save: PUT /dashboard/courses/
 * {course} (route dashboard.courses.update), behind the auth -> verified ->
 * admin gate. The editor submits the whole payload in one call - title,
 * category, status, short description, long description, and the cover image
 * (a retained stored cover, a fresh upload, or a removal).
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
 * | target            | an existing course                             | an unknown id                                          |
 * | title             | 1..255 characters                              | missing, 256+ characters                               |
 * | category          | the three Category enum values                 | any value outside the enum                             |
 * | status            | draft, published                               | any other string                                       |
 * | short_description | 1..255 characters                              | missing, 256+ characters                               |
 * | long_description  | present                                        | missing                                                |
 * | cover image       | retained stored cover, fresh upload            | none when the course has none, removed without a       |
 * |                   |                                                | replacement, non-image file, over 2048 KB              |
 * | slug              | preserved across a rename                      | regenerated on a rename                                |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F32-01 | success baseline; slug preserved            | full payload, retained cover       | redirect to list; fields updated; slug unchanged          |
 * | FT-F32-02 | title length - 255 / 256                    | 255 chars / 256 chars              | accepted / rejected on title                              |
 * | FT-F32-03 | category - enum member / outsider           | valid value / Science              | accepted / rejected on category                           |
 * | FT-F32-04 | status - member / outsider                  | draft / archived                   | accepted / rejected on status                             |
 * | FT-F32-05 | short_description - 255 / 256               | 255 chars / 256 chars              | accepted / rejected on short_description                  |
 * | FT-F32-06 | long_description - present / missing        | text / omitted                     | accepted / rejected on long_description                   |
 * | FT-F32-07 | cover - none stored, none uploaded          | course with null image_url         | rejected on image; row untouched                          |
 * | FT-F32-08 | cover - removal without a replacement       | remove_image=1, no upload          | rejected on image; stored cover kept                      |
 * | FT-F32-09 | cover - fresh upload replaces the stored    | stored courses/old.png + upload    | new stored path; old file deleted                         |
 * | FT-F32-10 | cover - retained without an upload          | stored cover, plain save           | accepted; stored path unchanged                           |
 * | FT-F32-11 | cover - non-image file                      | application/pdf                    | rejected on image                                         |
 * | FT-F32-12 | cover - size 2048 / 2049 KB                 | 2048 KB / 2049 KB image            | accepted / rejected on image                              |
 * | FT-F32-13 | access - student (invalid side)             | student PUT                        | 403; row unchanged                                        |
 * | FT-F32-14 | access - guest (invalid side)               | logged-out PUT                     | redirect to login; row unchanged                          |
 * | FT-F32-15 | target - unknown id (invalid side)          | PUT on a non-existent course       | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * CoursesManagementTest already covers the success baseline, the empty-title
 * rejection, the student rejection, and the cover quartet (required when none,
 * upload, replacement, removal without replacement, non-image rejection).
 * F-32 deliberately repeats those so the feature file is self-contained; the
 * new content is the title/short-description length boundaries, the category
 * and status membership pairs, the long-description requirement, the size
 * boundary, the slug-preservation observation, the guest PUT, and the
 * unknown-id 404.
 *
 * The listing the save returns to is F-31's subject; the editor page itself is
 * F-35's subject. The gate ordering is F-04's subject; this route shares the
 * same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Update takes the full payload; it is not a partial patch.
 * - The cover is required unless the course already has one and the save
 *   keeps it. Removing without a replacement is rejected and the stored cover
 *   survives the rejected request.
 * - A fresh upload replaces the stored file: the previous file under the
 *   courses/ prefix is deleted. External cover URLs pass through untouched.
 * - The slug is generated once from the first title and is not regenerated by
 *   later renames, so published URLs survive.
 * - Validation failures leave the stored row exactly as it was.
 */

use App\Enums\Category;
use App\Models\Course;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f32Admin();
});

test('FT-F32-01 - an admin updates the course metadata and keeps the slug', function () {
    // Boundary: success baseline. The slug was derived from the original title
    // and survives the rename.
    $course = f32Course(['title' => 'Old Title']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload())
        ->assertRedirect(route('dashboard.courses'));

    $course->refresh();

    expect($course->title)->toBe('Reading Comprehension Mastery')
        ->and($course->category?->value)->toBe(Category::ReadingComprehension->value)
        ->and($course->status)->toBe('published')
        ->and($course->short_description)->toBe('Develop critical reading skills')
        ->and($course->long_description)->toBe('A comprehensive reading curriculum.')
        ->and($course->slug)->toBe('old-title')
        ->and($course->image_url)->toBe('https://example.com/cover.png');
});

test('FT-F32-02 - the title boundary is 255 characters', function () {
    // Boundary: title max / max+1.
    $course = f32Course();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload([
            'title' => str_repeat('a', 255),
        ]))
        ->assertRedirect(route('dashboard.courses'));

    expect($course->fresh()->title)->toHaveLength(255);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload([
            'title' => str_repeat('a', 256),
        ]))
        ->assertSessionHasErrors(['title']);

    expect($course->fresh()->title)->toHaveLength(255);
});

test('FT-F32-03 - the category must be a member of the enum', function () {
    // Partition: category. A member is stored; an outsider is rejected.
    $course = f32Course();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload([
            'category' => Category::ListeningComprehension->value,
        ]))
        ->assertRedirect(route('dashboard.courses'));

    expect($course->fresh()->category?->value)->toBe(Category::ListeningComprehension->value);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload([
            'category' => 'Science',
        ]))
        ->assertSessionHasErrors(['category']);

    expect($course->fresh()->category?->value)->toBe(Category::ListeningComprehension->value);
});

test('FT-F32-04 - the status must be draft or published', function () {
    // Partition: status. A member is stored; an outsider is rejected.
    $course = f32Course();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload(['status' => 'draft']))
        ->assertRedirect(route('dashboard.courses'));

    expect($course->fresh()->status)->toBe('draft');

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload(['status' => 'archived']))
        ->assertSessionHasErrors(['status']);

    expect($course->fresh()->status)->toBe('draft');
});

test('FT-F32-05 - the short description boundary is 255 characters', function () {
    // Boundary: short_description max / max+1.
    $course = f32Course();

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload([
            'short_description' => str_repeat('b', 255),
        ]))
        ->assertRedirect(route('dashboard.courses'));

    expect($course->fresh()->short_description)->toHaveLength(255);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload([
            'short_description' => str_repeat('b', 256),
        ]))
        ->assertSessionHasErrors(['short_description']);

    expect($course->fresh()->short_description)->toHaveLength(255);
});

test('FT-F32-06 - the long description is required', function () {
    // Partition: long_description, invalid side (missing).
    $course = f32Course(['long_description' => 'Original long description.']);

    $payload = f32Payload();
    unset($payload['long_description']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), $payload)
        ->assertSessionHasErrors(['long_description']);

    expect($course->fresh()->long_description)->toBe('Original long description.');
});

test('FT-F32-07 - a cover is required when the course has none', function () {
    // Boundary: cover, invalid side (none stored, none uploaded).
    $course = f32Course(['image_url' => null]);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload())
        ->assertSessionHasErrors(['image']);

    expect($course->fresh()->image_url)->toBeNull();
});

test('FT-F32-08 - removing the cover without a replacement is rejected', function () {
    // Boundary: cover, invalid side (remove_image without an upload). The
    // stored cover survives the rejected request.
    Storage::fake('public');
    Storage::disk('public')->put('courses/old.png', 'old cover');
    $course = f32Course(['image_url' => 'courses/old.png']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload(['remove_image' => true]))
        ->assertSessionHasErrors(['image']);

    expect($course->fresh()->image_url)->toBe('courses/old.png');
    Storage::disk('public')->assertExists('courses/old.png');
});

test('FT-F32-09 - a fresh upload replaces the stored cover', function () {
    // Boundary: cover, valid side (fresh upload). The new file replaces the
    // stored one and the old file is deleted.
    Storage::fake('public');
    Storage::disk('public')->put('courses/old.png', 'old cover');
    $course = f32Course(['image_url' => 'courses/old.png']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.update', $course), [
            '_method' => 'put',
            ...f32Payload(),
            'image' => UploadedFile::fake()->image('new.png'),
        ])
        ->assertRedirect(route('dashboard.courses'));

    $course->refresh();

    expect($course->image_url)->toStartWith('courses/')
        ->and($course->image_url)->not->toBe('courses/old.png');

    Storage::disk('public')->assertExists($course->image_url);
    Storage::disk('public')->assertMissing('courses/old.png');
});

test('FT-F32-10 - a plain save retains the stored cover', function () {
    // Boundary: cover, valid side (retained). No upload and no removal keeps
    // the stored file and path.
    Storage::fake('public');
    Storage::disk('public')->put('courses/keep.png', 'kept cover');
    $course = f32Course(['image_url' => 'courses/keep.png']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', $course), f32Payload(['title' => 'Retitled Course']))
        ->assertRedirect(route('dashboard.courses'));

    expect($course->fresh()->image_url)->toBe('courses/keep.png');
    Storage::disk('public')->assertExists('courses/keep.png');
});

test('FT-F32-11 - a non-image cover is rejected', function () {
    // Boundary: cover, invalid side (mime).
    $course = f32Course(['image_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.update', $course), [
            '_method' => 'put',
            ...f32Payload(),
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors(['image']);

    expect($course->fresh()->image_url)->toBeNull();
});

test('FT-F32-12 - the cover size boundary is 2048 KB', function () {
    // Boundary: cover size max / max+1.
    Storage::fake('public');
    $course = f32Course(['image_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.update', $course), [
            '_method' => 'put',
            ...f32Payload(),
            'image' => UploadedFile::fake()->image('max.png')->size(2048),
        ])
        ->assertRedirect(route('dashboard.courses'));

    expect($course->fresh()->image_url)->toStartWith('courses/');

    $this->actingAs($this->admin)
        ->post(route('dashboard.courses.update', $course), [
            '_method' => 'put',
            ...f32Payload(),
            'image' => UploadedFile::fake()->image('over.png')->size(2049),
        ])
        ->assertSessionHasErrors(['image']);
});

test('FT-F32-13 - a student cannot update a course', function () {
    // Boundary: access, invalid side (role).
    $course = f32Course();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->put(route('dashboard.courses.update', $course), f32Payload(['title' => 'Hacked Title']))
        ->assertForbidden();

    expect($course->fresh()->title)->toBe('Old Title');
});

test('FT-F32-14 - a guest cannot update a course', function () {
    // Boundary: access, invalid side (authentication).
    $course = f32Course();

    $this->put(route('dashboard.courses.update', $course), f32Payload(['title' => 'Hacked Title']))
        ->assertRedirect(route('login'));

    expect($course->fresh()->title)->toBe('Old Title');
});

test('FT-F32-15 - updating an unknown course is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->put(route('dashboard.courses.update', 999999), f32Payload())
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f32Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * A course with a retained external cover, so the image rule is satisfied
 * without touching the disk.
 *
 * @param  array<string, mixed>  $attributes
 */
function f32Course(array $attributes = []): Course
{
    return Course::factory()->create(array_merge([
        'title' => 'Old Title',
        'image_url' => 'https://example.com/cover.png',
    ], $attributes));
}

/**
 * A valid whole-payload save.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function f32Payload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Reading Comprehension Mastery',
        'category' => Category::ReadingComprehension->value,
        'status' => 'published',
        'short_description' => 'Develop critical reading skills',
        'long_description' => 'A comprehensive reading curriculum.',
    ], $overrides);
}
