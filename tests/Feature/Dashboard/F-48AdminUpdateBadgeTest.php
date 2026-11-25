<?php

/**
 * F-48 - Fungsi mengubah kriteria lencana oleh admin
 *
 * Feature tests for the admin's badge save: PUT /dashboard/badges/{badge}
 * (route dashboard.badges.update), behind the auth -> verified -> admin gate.
 * The editor submits the whole payload - the metadata, the optional icon, the
 * AND/OR logic, and the earning conditions - in one call; the conditions are
 * stored as the badge's normalized requirements tree.
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
 * | target            | an existing badge                              | an unknown id                                          |
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
 * | FT-F48-01 | success baseline; requirements stored       | OR logic, two conditions           | redirect to the listing; metadata, tree, and cover kept   |
 * | FT-F48-02 | title length - 255 / 256                    | 255 / 256 chars                    | accepted / rejected on title                              |
 * | FT-F48-03 | description - missing (invalid side)        | omitted                            | rejected on description; row unchanged                    |
 * | FT-F48-04 | logic - member / outsider                   | AND / XOR                          | accepted / rejected on logic                              |
 * | FT-F48-05 | conditions - empty (invalid side)           | []                                 | rejected on conditions                                    |
 * | FT-F48-06 | type - member / outsider                    | path / badge                       | accepted / rejected on conditions.0.type                  |
 * | FT-F48-07 | operator - member / outsider                | = / !=                             | accepted / rejected on conditions.0.operator              |
 * | FT-F48-08 | value - missing (invalid side)              | value omitted                      | rejected on conditions.0.value                            |
 * | FT-F48-09 | icon - fresh upload replaces the stored     | stored badges/old.png + upload     | new stored path; old file deleted                         |
 * | FT-F48-10 | icon - removal                              | remove_icon=1                      | accepted; icon_url null; stored file deleted              |
 * | FT-F48-11 | icon - non-image file                       | application/pdf                    | rejected on icon                                          |
 * | FT-F48-12 | icon - size 2048 / 2049 KB                  | 2048 / 2049 KB image               | accepted / rejected on icon                               |
 * | FT-F48-13 | access - student (invalid side)             | student PUT                        | 403; row unchanged                                        |
 * | FT-F48-14 | access - guest (invalid side)               | logged-out PUT                     | redirect to login; row unchanged                          |
 * | FT-F48-15 | target - unknown id (invalid side)          | PUT on a non-existent badge        | 404                                                       |
 *
 * == Relation to the existing suites =========================================
 *
 * BadgesManagementTest already covers the success save with a fresh icon, the
 * remove_icon clearing, the one-condition minimum, and the student rejection.
 * F-48 deliberately repeats those so the feature file is self-contained; the
 * new content is the title length boundary, the description requirement, the
 * logic membership pair, the condition type and operator membership pairs,
 * the missing value rejection, the size boundary, and the guest PUT with the
 * unknown-id 404.
 *
 * The listing the save returns to is F-47's subject; the create flow is F-46's
 * and the delete F-49's. The avatar counterpart is F-52 with the same rules.
 * The badge icons are optional, so unlike the course/challenge/path covers
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
 * - Only files under the badges/ prefix are deleted; external URLs pass
 *   through untouched.
 * - Validation failures leave the stored row exactly as it was.
 */

use App\Models\Badge;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = f48Admin();
});

test('FT-F48-01 - an admin updates the badge and stores its requirements', function () {
    // Boundary: success baseline. The metadata lands, the requirements tree is
    // stored normalized, the recipient counter survives, and the external
    // cover is kept.
    $badge = f48Badge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload())
        ->assertRedirect(route('dashboard.badges'));

    $badge->refresh();

    expect($badge->title)->toBe('Updated Badge')
        ->and($badge->description)->toBe('An updated description.')
        ->and($badge->icon_url)->toBe('https://example.com/badge.png')
        ->and($badge->recipients_count)->toBe(3)
        ->and($badge->requirements)->toBe([
            'logic' => 'OR',
            'conditions' => [
                ['type' => 'points', 'operator' => '>=', 'value' => '100'],
                ['type' => 'quiz', 'operator' => '>=', 'value' => '5'],
            ],
        ]);
});

test('FT-F48-02 - the title boundary is 255 characters', function () {
    // Boundary: title max / max+1.
    $badge = f48Badge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload([
            'title' => str_repeat('b', 255),
        ]))
        ->assertRedirect(route('dashboard.badges'));

    expect($badge->fresh()->title)->toHaveLength(255);

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload([
            'title' => str_repeat('b', 256),
        ]))
        ->assertSessionHasErrors(['title']);

    expect($badge->fresh()->title)->toHaveLength(255);
});

test('FT-F48-03 - the description is required', function () {
    // Boundary: description, invalid side (missing).
    $badge = f48Badge();

    $payload = f48Payload();
    unset($payload['description']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), $payload)
        ->assertSessionHasErrors(['description']);

    expect($badge->fresh()->description)->toBe('Original description.');
});

test('FT-F48-04 - the logic must be AND or OR', function () {
    // Partition: logic. A member is stored; an outsider is rejected.
    $badge = f48Badge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload([
            'logic' => 'AND',
            'conditions' => [['type' => 'points', 'operator' => '>=', 'value' => '50']],
        ]))
        ->assertRedirect(route('dashboard.badges'));

    expect($badge->fresh()->requirements['logic'])->toBe('AND');

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload([
            'logic' => 'XOR',
        ]))
        ->assertSessionHasErrors(['logic']);

    expect($badge->fresh()->requirements['logic'])->toBe('AND');
});

test('FT-F48-05 - a badge requires at least one condition', function () {
    // Boundary: conditions, invalid side (empty list).
    $badge = f48Badge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload(['conditions' => []]))
        ->assertSessionHasErrors(['conditions']);

    expect($badge->fresh()->requirements['conditions'])->toHaveCount(1);
});

test('FT-F48-06 - the condition type must be one of the five', function () {
    // Partition: condition type. A member is stored; an outsider is rejected.
    $badge = f48Badge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload([
            'conditions' => [['type' => 'path', 'operator' => '=', 'value' => 'Reading Journey']],
        ]))
        ->assertRedirect(route('dashboard.badges'));

    expect($badge->fresh()->requirements['conditions'][0]['type'])->toBe('path');

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload([
            'conditions' => [['type' => 'badge', 'operator' => '=', 'value' => 'Rising Star']],
        ]))
        ->assertSessionHasErrors(['conditions.0.type']);

    expect($badge->fresh()->requirements['conditions'][0]['type'])->toBe('path');
});

test('FT-F48-07 - the condition operator must be one of the five', function () {
    // Partition: condition operator. A member is stored; an outsider is
    // rejected.
    $badge = f48Badge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload([
            'conditions' => [['type' => 'points', 'operator' => '=', 'value' => '10']],
        ]))
        ->assertRedirect(route('dashboard.badges'));

    expect($badge->fresh()->requirements['conditions'][0]['operator'])->toBe('=');

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload([
            'conditions' => [['type' => 'points', 'operator' => '!=', 'value' => '10']],
        ]))
        ->assertSessionHasErrors(['conditions.0.operator']);

    expect($badge->fresh()->requirements['conditions'][0]['operator'])->toBe('=');
});

test('FT-F48-08 - a condition without a value is rejected', function () {
    // Boundary: condition value, invalid side (missing).
    $badge = f48Badge();

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload([
            'conditions' => [['type' => 'points', 'operator' => '>=']],
        ]))
        ->assertSessionHasErrors(['conditions.0.value']);
});

test('FT-F48-09 - a fresh icon upload replaces the stored one', function () {
    // Boundary: icon, valid side (fresh upload). The old stored file is
    // deleted.
    Storage::fake('public');
    Storage::disk('public')->put('badges/old.png', 'old icon');
    $badge = f48Badge(['icon_url' => 'badges/old.png']);

    $this->actingAs($this->admin)
        ->post(route('dashboard.badges.update', $badge), [
            '_method' => 'put',
            ...f48Payload(),
            'icon' => UploadedFile::fake()->image('new.png'),
        ])
        ->assertRedirect(route('dashboard.badges'));

    $badge->refresh();

    expect($badge->icon_url)->toStartWith('badges/')
        ->and($badge->icon_url)->not->toBe('badges/old.png');

    Storage::disk('public')->assertExists($badge->icon_url);
    Storage::disk('public')->assertMissing('badges/old.png');
});

test('FT-F48-10 - remove_icon clears the stored icon', function () {
    // Boundary: icon, removal. Icons are optional, so the cleared save is
    // accepted and the stored file is deleted.
    Storage::fake('public');
    Storage::disk('public')->put('badges/old.png', 'old icon');
    $badge = f48Badge(['icon_url' => 'badges/old.png']);

    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', $badge), f48Payload(['remove_icon' => true]))
        ->assertRedirect(route('dashboard.badges'));

    expect($badge->fresh()->icon_url)->toBeNull();
    Storage::disk('public')->assertMissing('badges/old.png');
});

test('FT-F48-11 - a non-image icon is rejected', function () {
    // Boundary: icon, invalid side (mime).
    $badge = f48Badge(['icon_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.badges.update', $badge), [
            '_method' => 'put',
            ...f48Payload(),
            'icon' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors(['icon']);

    expect($badge->fresh()->icon_url)->toBeNull();
});

test('FT-F48-12 - the icon size boundary is 2048 KB', function () {
    // Boundary: icon size max / max+1.
    Storage::fake('public');
    $badge = f48Badge(['icon_url' => null]);

    $this->actingAs($this->admin)
        ->post(route('dashboard.badges.update', $badge), [
            '_method' => 'put',
            ...f48Payload(),
            'icon' => UploadedFile::fake()->image('max.png')->size(2048),
        ])
        ->assertRedirect(route('dashboard.badges'));

    expect($badge->fresh()->icon_url)->toStartWith('badges/');

    $this->actingAs($this->admin)
        ->post(route('dashboard.badges.update', $badge), [
            '_method' => 'put',
            ...f48Payload(),
            'icon' => UploadedFile::fake()->image('over.png')->size(2049),
        ])
        ->assertSessionHasErrors(['icon']);
});

test('FT-F48-13 - a student cannot update a badge', function () {
    // Boundary: access, invalid side (role).
    $badge = f48Badge();
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)
        ->put(route('dashboard.badges.update', $badge), f48Payload(['title' => 'Hacked Badge']))
        ->assertForbidden();

    expect($badge->fresh()->title)->toBe('Old Badge');
});

test('FT-F48-14 - a guest cannot update a badge', function () {
    // Boundary: access, invalid side (authentication).
    $badge = f48Badge();

    $this->put(route('dashboard.badges.update', $badge), f48Payload(['title' => 'Hacked Badge']))
        ->assertRedirect(route('login'));

    expect($badge->fresh()->title)->toBe('Old Badge');
});

test('FT-F48-15 - updating an unknown badge is not found', function () {
    // Boundary: target, invalid side (unknown id).
    $this->actingAs($this->admin)
        ->put(route('dashboard.badges.update', 999999), f48Payload())
        ->assertNotFound();
});

/**
 * A verified administrator account.
 *
 * @param  array<string, mixed>  $attributes
 */
function f48Admin(array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role' => 'admin',
        'email' => 'admin@itera.ac.id',
        'nim_nip' => '100000001',
        'total_points' => 0,
    ], $attributes));
}

/**
 * A badge with a retained external icon and one stored condition.
 *
 * @param  array<string, mixed>  $attributes
 */
function f48Badge(array $attributes = []): Badge
{
    return Badge::factory()->create(array_merge([
        'title' => 'Old Badge',
        'description' => 'Original description.',
        'icon_url' => 'https://example.com/badge.png',
        'recipients_count' => 3,
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
function f48Payload(array $overrides = []): array
{
    return array_merge([
        'title' => 'Updated Badge',
        'description' => 'An updated description.',
        'logic' => 'OR',
        'conditions' => [
            ['type' => 'points', 'operator' => '>=', 'value' => '100'],
            ['type' => 'quiz', 'operator' => '>=', 'value' => '5'],
        ],
    ], $overrides);
}
