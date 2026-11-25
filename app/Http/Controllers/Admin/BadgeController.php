<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BadgeUpdateRequest;
use App\Models\Badge;
use App\Models\Challenge;
use App\Models\Course;
use App\Models\LearningPath;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BadgeController extends Controller
{
    /**
     * Display the badges listing (search and pagination are
     * handled client-side).
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', Badge::class);

        $badges = Badge::query()
            ->orderBy('title')
            ->get()
            ->map(fn (Badge $badge) => [
                'id' => $badge->id,
                'title' => $badge->title,
                'description' => $badge->description,
                // Stored badges/ uploads resolve to storage URLs;
                // seeded public paths pass through untouched.
                'icon_url' => $badge->icon_url && str_starts_with($badge->icon_url, 'badges/')
                    ? Storage::disk('public')->url($badge->icon_url)
                    : $badge->icon_url,
                'conditions_count' => count($badge->requirements['conditions'] ?? []),
                'condition_type' => $badge->requirements['conditions'][0]['type'] ?? null,
                'recipients_count' => (int) $badge->recipients_count,
            ]);

        return Inertia::render('Dashboard/Badges', [
            'badges' => $badges,
        ]);
    }

    /**
     * Create a blank badge row and open the editor with it — the
     * same blank-draft flow the other editors use; the metadata
     * save fills the real values.
     */
    public function store(): RedirectResponse
    {
        Gate::authorize('create', Badge::class);

        $badge = Badge::create([
            'title' => 'Untitled Badge',
            'description' => '',
            'requirements' => [
                'logic' => 'AND',
                'conditions' => [],
            ],
            'recipients_count' => 0,
        ]);

        return redirect()->route('dashboard.badges.edit', $badge);
    }

    /**
     * Show the badge editor with its earning requirements loaded —
     * the listing's edit action routes here.
     */
    public function edit(Badge $badge): Response
    {
        Gate::authorize('view', $badge);

        return Inertia::render('Dashboard/Badges/Editor', [
            'badge' => [
                'id' => $badge->id,
                'title' => $badge->title,
                'description' => $badge->description,
                'icon_url' => $badge->icon_url && str_starts_with($badge->icon_url, 'badges/')
                    ? Storage::disk('public')->url($badge->icon_url)
                    : $badge->icon_url,
                'logic' => $badge->requirements['logic'] ?? 'AND',
                'conditions' => collect($badge->requirements['conditions'] ?? [])
                    ->map(fn (array $condition) => [
                        'type' => $condition['type'],
                        'operator' => $condition['operator'],
                        'value' => $condition['value'],
                    ])
                    ->all(),
            ],
            'availableCourses' => Course::query()
                ->orderBy('title')
                ->get()
                ->map(fn (Course $course) => ['value' => $course->title, 'label' => $course->title]),
            'availablePaths' => LearningPath::query()
                ->orderBy('title')
                ->get()
                ->map(fn (LearningPath $path) => ['value' => $path->title, 'label' => $path->title]),
            'availableChallenges' => Challenge::query()
                ->orderBy('title')
                ->get()
                ->map(fn (Challenge $challenge) => ['value' => $challenge->title, 'label' => $challenge->title]),
        ]);
    }

    /**
     * Update the badge — its metadata, its optional icon, and its
     * earning requirements, all in one whole-payload save inside a
     * single transaction, written sequentially.
     */
    public function update(BadgeUpdateRequest $request, Badge $badge): RedirectResponse
    {
        Gate::authorize('update', $badge);

        $validated = $request->validated();

        DB::transaction(function () use ($request, $badge, $validated): void {
            // The icon: a fresh upload replaces the stored one,
            // remove_icon clears it, anything else keeps it —
            // only files under our badges/ storage prefix are ours
            // to delete (seeded nulls pass through unharmed).
            $iconUrl = $badge->icon_url;

            if ($request->hasFile('icon')) {
                if (str_starts_with((string) $badge->icon_url, 'badges/')) {
                    Storage::disk('public')->delete($badge->icon_url);
                }

                $iconUrl = $request->file('icon')->store('badges', 'public');
            } elseif ($request->boolean('remove_icon')) {
                if (str_starts_with((string) $badge->icon_url, 'badges/')) {
                    Storage::disk('public')->delete($badge->icon_url);
                }

                $iconUrl = null;
            }

            $badge->update([
                'title' => $validated['title'],
                'description' => $validated['description'],
                'icon_url' => $iconUrl,
                'requirements' => [
                    'logic' => $validated['logic'],
                    'conditions' => array_map(fn (array $condition) => [
                        'type' => $condition['type'],
                        'operator' => $condition['operator'],
                        'value' => $condition['value'],
                    ], $validated['conditions']),
                ],
            ]);
        });

        // The save lands on the parent page — the badges listing.
        return redirect()->route('dashboard.badges');
    }

    /**
     * Delete the badge — the cascading pivot rows take its awards,
     * so only the stored icon needs manual cleanup.
     */
    public function destroy(Badge $badge): RedirectResponse
    {
        Gate::authorize('delete', $badge);

        if (str_starts_with((string) $badge->icon_url, 'badges/')) {
            Storage::disk('public')->delete($badge->icon_url);
        }

        $badge->delete();

        return redirect()->route('dashboard.badges');
    }
}
