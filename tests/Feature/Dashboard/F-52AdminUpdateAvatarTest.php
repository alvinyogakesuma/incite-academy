<?php

/**
 * F-52 - Fungsi mengubah properti avatar oleh admin
 *
 * Feature tests for the admin's avatar save: PUT /dashboard/avatars/{avatar}
 * (route dashboard.avatars.update), behind the auth -> verified -> admin gate.
 * The editor submits the whole payload - the metadata, the optional icon, the
 * AND/OR logic, and the unlock conditions - in one call; the conditions are
 * stored as the avatar's normalized requirements tree.
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
 * | target            | an existing avatar                             | an unknown id                                          |
 * | title             | 1..255 characters                              | missing, 256+ characters                               |
 * | description       | present                                        | missing                                                |
 * | logic             | AND, OR                                        | any other value                                        |
 * | conditions        | 1.. conditions                                 | an empty list                                          |
 * | condition type    | points, quiz, course, path, challenge          | any value outside the five                             |
 * | condition operator| >=, <=, >, <, =                                | any value outside the five                             |
 * | condition value   | present                                        | missing                                                |
 * | icon              | retained, fresh upload, removal, absent        | non-image file, over 2048 KB                           |
 *
 * == Boundaries (BVA) ========================================================
 *
 * | Code      | Boundary / partition                        | Value                              | Expected outcome                                          |
 * |-----------|---------------------------------------------|------------------------------------|-----------------------------------------------------------|
 * | FT-F52-01 | success baseline; requirements stored       | OR logic, two conditions           | redirect to the listing; metadata, tree, and icon kept    |
 * | FT-F52-02 | title length - 255 / 256                    | 255 / 256 chars                    | accepted / rejected on title                              |
 * | FT-F52-03 | description - missing (invalid side)        | omitted                            | rejected on description; row unchanged                    |
 * | FT-F52-04 | logic - member / outsider                   | AND / XOR                          | accepted / rejected on logic                              |
 * | FT-F52-05 | conditions - empty (invalid side)           | []                                 | rejected on conditions                                    |
 * | FT-F52-06 | type - member / outsider                    | course / badge                     | accepted / rejected on conditions.0.type                  |
 * | FT-F52-07 | operator - member / outsider                | > / !=                             | accepted / rejected on conditions.0.operator              |
 * | FT-F52-08 | value - missing (invalid side)              | value omitted                      | rejected on conditions.0.value                            |
 * | FT-F52-09 | icon - fresh upload replaces the stored     | stored avatars/old.png + upload    | new stored path; old file deleted                         |
 * | FT-F52-10 | icon - removal                              | remove_icon=1                      | accepted; icon_url null; stored file deleted              |
 * | FT-F52-11 | icon - non-image file                       | application/pdf                    | rejected on icon                                          |
 * | FT-F52-12 | icon - size 2048 / 2049 KB                  | 2048 / 2049 KB image               | accepted / rejected on icon                               |
 * | FT-F52-13 | access - student (invalid side)             | student PUT                        | 403; row unchanged                                        |
 * | FT-F52-14 | access - guest (invalid side)               | logged-out PUT                     | redirect to login; row unchanged                          |
 * | FT-F52-15 | target - unknown id (invalid side)          | PUT on a non-existent avatar       | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * AvatarsManagementTest already covers the success save with a fresh icon, the
 * remove_icon clearing, the one-condition minimum, and the student rejection.
 * F-52 deliberately repeats those so the feature file is self-contained; the
 * new content is the title length boundary, the description requirement, the
 * logic membership pair, the condition type and operator membership pairs,
 * the missing value rejection, the size boundary, and the guest PUT with the
 * unknown-id 404.
 *
 * The listing the save returns to is F-51's subject; the create flow is F-50's
 * and the delete F-53's. The badge counterpart is F-48 with the same rules.
 * The avatar icons are optional, so unlike the course/challenge/path covers
 * there is no "required when none" rule to test. The gate ordering is F-04's
 * subject; this route shares the same middleware group.
 *
 * == Observed behaviors (black-box notes) ====================================
 *
 * Every expected outcome in this suite was settled by observing the running
 * system (submit the request, read the response and the database), not by
 * reading source code. Notes:
 *
 * - Update takes the full payload and replaces the requirements tree whole:
 *   the stored JSON is exactly the submitted logic plus the submitted
 *   conditions, each normalized to type, operator, and value.
 * - The recipient counter is not part of the save and survives untouched.
 * - An icon is optional: a save without an upload keeps the stored icon, an
 *   upload replaces it and deletes the old stored file, and remove_icon clears
 *   both the column and the stored file.
 * - Only files under the avatars/ prefix are deleted; external URLs pass
 *   through untouched.
 * - Validation failures leave the stored row exactly as it was.
 */

use App\Models\Avatar;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f52Admin();
});

test('FT-F52-01 - an admin updates the avatar and stores its requirements', function () {
    // Boundary: success baseline. The metadata lands, the requirements tree is
    // stored normalized, the recipient counter survives, and the external
    // icon is kept.
    $avatar = f52Avatar();

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload())
        ->assertRedirect(route('dashboard.avatars'));

    $avatar->refresh();

    expect($avatar->title)->toBe('Updated Avatar')
        ->and($avatar->description)->toBe('An updated description.')
        ->and($avatar->icon_url)->toBe('https://example.com/avatar.png')
        ->and($avatar->recipients_count)->toBe(5)
        ->and($avatar->requirements)->toBe([
            'logic' => 'OR',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
                ['type' => 'quiz', 'operator' => '>=', 'value' => '5'],
            ],
        ]);
});

test('FT-F52-02 - the title boundary is 255 characters', function () {
    // Boundary: title max / max+1.
    $avatar = f52Avatar();

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload([
            'title' => str_repeat('a', 255),
        ]))
        ->assertRedirect(route('dashboard.avatars'));

    expect($avatar->fresh()->title)->toHaveLength(255);

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload([
            'title' => str_repeat('a', 256),
        ]))
        ->assertSessionHasErrors(['title']);

    expect($avatar->fresh()->title)->toHaveLength(255);
});

test('FT-F52-03 - the description is required', function () {
    // Boundary: description, invalid side (missing).
    $avatar = f52Avatar();

    $payload = f52Payload();
    unset($payload['description']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), $payload)
        ->assertSessionHasErrors(['description']);

    expect($avatar->fresh()->description)->toBe('Original description.');
});

test('FT-F52-04 - the logic must be AND or OR', function () {
    // Partition: logic. A member is stored; an outsider is rejected.
    $avatar = f52Avatar();

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload([
            'logic' => 'AND',
            'conditions' => [['type' => 'points', 'operator' => '>=', 'value' => '50']],
        ]))
        ->assertRedirect(route('dashboard.avatars'));

    expect($avatar->fresh()->requirements['logic'])->toBe('AND');

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload([
            'logic' => 'XOR',
        ]))
        ->assertSessionHasErrors(['logic']);

    expect($avatar->fresh()->requirements['logic'])->toBe('AND');
});

test('FT-F52-05 - an avatar requires at least one condition', function () {
    // Boundary: conditions, invalid side (empty list).
    $avatar = f52Avatar();

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload(['conditions' => []]))
        ->assertSessionHasErrors(['conditions']);

    expect($avatar->fresh()->requirements['conditions'])->toHaveCount(1);
});

test('FT-F52-06 - the condition type must be one of the five', function () {
    // Partition: condition type. A member is stored; an outsider is rejected.
    $avatar = f52Avatar();

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload([
            'conditions' => [['type' => 'course', 'operator' => '=', 'value' => 'Reading Mastery']],
        ]))
        ->assertRedirect(route('dashboard.avatars'));

    expect($avatar->fresh()->requirements['conditions'][0]['type'])->toBe('course');

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload([
            'conditions' => [['type' => 'badge', 'operator' => '=', 'value' => 'Rising Star']],
        ]))
        ->assertSessionHasErrors(['conditions.0.type']);

    expect($avatar->fresh()->requirements['conditions'][0]['type'])->toBe('course');
});

test('FT-F52-07 - the condition operator must be one of the five', function () {
    // Partition: condition operator. A member is stored; an outsider is
    // rejected.
    $avatar = f52Avatar();

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload([
            'conditions' => [['type' => 'points', 'operator' => '>', 'value' => '10']],
        ]))
        ->assertRedirect(route('dashboard.avatars'));

    expect($avatar->fresh()->requirements['conditions'][0]['operator'])->toBe('>');

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload([
            'conditions' => [['type' => 'points', 'operator' => '!=', 'value' => '10']],
        ]))
        ->assertSessionHasErrors(['conditions.0.operator']);

    expect($avatar->fresh()->requirements['conditions'][0]['operator'])->toBe('>');
});

test('FT-F52-08 - a condition without a value is rejected', function () {
    // Boundary: condition value, invalid side (missing).
    $avatar = f52Avatar();

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload([
            'conditions' => [['type' => 'points', 'operator' => '>=']],
        ]))
        ->assertSessionHasErrors(['conditions.0.value']);
});

test('FT-F52-09 - a fresh icon upload replaces the stored one', function () {
    // Boundary: icon, valid side (fresh upload). The old stored file is
    // deleted.
    Storage::fake('public');
    Storage::disk('public')->put('avatars/old.png', 'old icon');
    $avatar = f52Avatar(['icon_url' => 'avatars/old.png']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.avatars.update', $avatar), [
            '_method' => 'put',
            ...f52Payload(),
            'icon' => UploadedFile::fake()->image('new.png'),
        ])
        ->assertRedirect(route('dashboard.avatars'));

    $avatar->refresh();

    expect($avatar->icon_url)->toStartWith('avatars/')
        ->and($avatar->icon_url)->not->toBe('avatars/old.png');

    Storage::disk('public')->assertExists($avatar->icon_url);
    Storage::disk('public')->assertMissing('avatars/old.png');
});

test('FT-F52-10 - remove_icon clears the stored icon', function () {
    // Boundary: icon, removal. Icons are optional, so the cleared save is
    // accepted and the stored file is deleted.
    Storage::fake('public');
    Storage::disk('public')->put('avatars/old.png', 'old icon');
    $avatar = f52Avatar(['icon_url' => 'avatars/old.png']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload(['remove_icon' => true]))
        ->assertRedirect(route('dashboard.avatars'));

    expect($avatar->fresh()->icon_url)->toBeNull();
    Storage::disk('public')->assertMissing('avatars/old.png');
});

test('FT-F52-11 - a non-image icon is rejected', function () {
    // Boundary: icon, invalid side (mime).
    $avatar = f52Avatar(['icon_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.avatars.update', $avatar), [
            '_method' => 'put',
            ...f52Payload(),
            'icon' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors(['icon']);

    expect($avatar->fresh()->icon_url)->toBeNull();
});

test('FT-F52-12 - the icon size boundary is 2048 KB', function () {
    // Boundary: icon size max / max+1.
    Storage::fake('public');
    $avatar = f52Avatar(['icon_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.avatars.update', $avatar), [
            '_method' => 'put',
            ...f52Payload(),
            'icon' => UploadedFile::fake()->image('max.png')->size(2048),
        ])
        ->assertRedirect(route('dashboard.avatars'));

    expect($avatar->fresh()->icon_url)->toStartWith('avatars/');

    $this->actingAs($this->admin)
        ->post(route('dashboard.avatars.update', $avatar), [
            '_method' => 'put',
            ...f52Payload(),
            'icon' => UploadedFile::fake()->image('over.png')->size(2049),
        ])
        ->assertSessionHasErrors(['icon']);
});

test('FT-F52-13 - a student cannot update an avatar', function () {
    // Boundary: access, invalid side (role).
    $avatar = f52Avatar();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->put(route('dashboard.avatars.update', $avatar), f52Payload(['title' => 'Hacked Avatar']))
        ->assertForbidden();

    expect($avatar->fresh()->title)->toBe('Old Avatar');
});

test('FT-F52-14 - a guest cannot update an avatar', function () {
    // Boundary: access, invalid side (authentication).
    $avatar = f52Avatar();

    $this->put(route('dashboard.avatars.update', $avatar), f52Payload(['title' => 'Hacked Avatar']))
        ->assertRedirect(route('login'));

    expect($avatar->fresh()->title)->toBe('Old Avatar');
});

test('FT-F52-15 - updating an unknown avatar is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->put(route('dashboard.avatars.update', 999999), f52Payload())
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f52Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * An avatar with a retained external icon and one stored condition.
 *
 * @param  array<string, mixed>  $attributes
 */
function f52Avatar(array $attributes = []): Avatar
{
    return Avatar::factory()->create(array_merge([
        'title' => 'Old Avatar',
        'description' => 'Original description.',
        'icon_url' => 'https://example.com/avatar.png',
        'recipients_count' => 5,
        'requirements' => [
            'logic' => 'AND',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '25'],
            ],
        ],
    ], $attributes));
}

/**
 * A valid whole-payload save.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function f52Payload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Updated Avatar',
        'description' => 'An updated description.',
        'logic' => 'OR',
        'conditions' => [
            ['type' => 'points', 'operator' => '>=', 'value' => '100'],
            ['type' => 'quiz', 'operator' => '>=', 'value' => '5'],
        ],
    ], $overrides);
}
