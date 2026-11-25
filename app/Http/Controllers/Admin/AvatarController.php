<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AvatarUpdateRequest;
use App\Models\Avatar;
use App\Models\Challenge;
use App\Models\Course;
use App\Models\LearningPath;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AvatarController extends Controller
{
    /**
     * Display the avatars listing (search and pagination are
     * handled client-side).
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', Avatar::class);

        $avatars = Avatar::query()
            ->orderBy('title')
            ->get()
            ->map(fn (Avatar $avatar) => [
                'id' => $avatar->id,
                'title' => $avatar->title,
                'description' => $avatar->description,
                // Stored avatars/ uploads resolve to storage URLs;
                // seeded public paths pass through untouched.
                'icon_url' => $avatar->icon_url && str_starts_with($avatar->icon_url, 'avatars/')
                    ? Storage::disk('public')->url($avatar->icon_url)
                    : $avatar->icon_url,
                'conditions_count' => count($avatar->requirements['conditions'] ?? []),
                'condition_type' => $avatar->requirements['conditions'][0]['type'] ?? null,
                'recipients_count' => (int) $avatar->recipients_count,
            ]);

        return Inertia::render('Dashboard/Avatars', [
            'avatars' => $avatars,
        ]);
    }

    /**
     * Create a blank avatar row and open the editor with it — the
     * same blank-draft flow the other editors use; the metadata
     * save fills the real values.
     */
    public function store(): RedirectResponse
    {
        Gate::authorize('create', Avatar::class);

        $avatar = Avatar::create([
            'title' => 'Untitled Avatar',
            'description' => '',
            'requirements' => [
                'logic' => 'AND',
                'conditions' => [],
            ],
            'recipients_count' => 0,
        ]);

        return redirect()->route('dashboard.avatars.edit', $avatar);
    }

    /**
     * Show the avatar editor with its unlock requirements loaded —
     * the listing's edit action routes here.
     */
    public function edit(Avatar $avatar): Response
    {
        Gate::authorize('view', $avatar);

        return Inertia::render('Dashboard/Avatars/Editor', [
            'avatar' => [
                'id' => $avatar->id,
                'title' => $avatar->title,
                'description' => $avatar->description,
                'icon_url' => $avatar->icon_url && str_starts_with($avatar->icon_url, 'avatars/')
                    ? Storage::disk('public')->url($avatar->icon_url)
                    : $avatar->icon_url,
                'logic' => $avatar->requirements['logic'] ?? 'AND',
                'conditions' => collect($avatar->requirements['conditions'] ?? [])
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
     * Update the avatar — its metadata, its optional icon, and its
     * unlock requirements, all in one whole-payload save inside a
     * single transaction, written sequentially.
     */
    public function update(AvatarUpdateRequest $request, Avatar $avatar): RedirectResponse
    {
        Gate::authorize('update', $avatar);

        $validated = $request->validated();

        DB::transaction(function () use ($request, $avatar, $validated): void {
            // The icon: a fresh upload replaces the stored one,
            // remove_icon clears it, anything else keeps it —
            // only files under our avatars/ storage prefix are ours
            // to delete (seeded nulls pass through unharmed).
            $iconUrl = $avatar->icon_url;

            if ($request->hasFile('icon')) {
                if (str_starts_with((string) $avatar->icon_url, 'avatars/')) {
                    Storage::disk('public')->delete($avatar->icon_url);
                }

                $iconUrl = $request->file('icon')->store('avatars', 'public');
            } elseif ($request->boolean('remove_icon')) {
                if (str_starts_with((string) $avatar->icon_url, 'avatars/')) {
                    Storage::disk('public')->delete($avatar->icon_url);
                }

                $iconUrl = null;
            }

            $avatar->update([
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

        // The save lands on the parent page — the avatars listing.
        return redirect()->route('dashboard.avatars');
    }

    /**
     * Delete the avatar — the cascading pivot rows take its awards,
     * so only the stored icon needs manual cleanup.
     */
    public function destroy(Avatar $avatar): RedirectResponse
    {
        Gate::authorize('delete', $avatar);

        if (str_starts_with((string) $avatar->icon_url, 'avatars/')) {
            Storage::disk('public')->delete($avatar->icon_url);
        }

        $avatar->delete();

        return redirect()->route('dashboard.avatars');
    }
}
