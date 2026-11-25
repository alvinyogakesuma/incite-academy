<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LearningPathUpdateRequest;
use App\Models\Course;
use App\Models\LearningPath;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class LearningPathController extends Controller
{
    /**
     * Display the learning paths listing (search, filtering,
     * sorting, and pagination are handled client-side).
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', LearningPath::class);

        $learningPaths = LearningPath::query()
            ->orderBy('title')
            ->get()
            ->map(fn (LearningPath $path) => [
                'id' => $path->id,
                'title' => $path->title,
                'description' => $path->description,
                'level' => $path->level,
                'image_url' => $path->image_url && str_starts_with($path->image_url, 'learning-paths/')
                    ? Storage::disk('public')->url($path->image_url)
                    : $path->image_url,
                'courses_count' => (int) $path->courses_count,
                'total_duration' => (int) $path->total_duration,
            ]);

        return Inertia::render('Dashboard/LearningPaths', [
            'learningPaths' => $learningPaths,
            'levels' => LearningPath::LEVELS,
        ]);
    }

    /**
     * Create a blank learning path row and open the editor with
     * it — the same blank-draft flow the course, lesson, and
     * challenge editors use; the metadata save fills the real
     * values.
     */
    public function store(): RedirectResponse
    {
        Gate::authorize('create', LearningPath::class);

        $learningPath = LearningPath::create([
            'title' => 'Untitled Learning Path',
            'description' => '',
            'level' => 'All Levels',
        ]);

        return redirect()->route('dashboard.learning-paths.edit', $learningPath);
    }

    /**
     * Show the learning path editor with its course sequence
     * loaded — the listing's edit action routes here.
     */
    public function edit(LearningPath $learningPath): Response
    {
        Gate::authorize('view', $learningPath);

        return Inertia::render('Dashboard/LearningPaths/Editor', [
            'learningPath' => [
                'id' => $learningPath->id,
                'title' => $learningPath->title,
                'description' => $learningPath->description,
                'level' => $learningPath->level,
                'image_url' => $learningPath->image_url && str_starts_with($learningPath->image_url, 'learning-paths/')
                    ? Storage::disk('public')->url($learningPath->image_url)
                    : $learningPath->image_url,
                'courses' => $learningPath->courses
                    ->map(fn (Course $course) => [
                        'id' => $course->id,
                        'title' => $course->title,
                        'duration' => (int) $course->total_duration,
                        'modules' => (int) $course->modules_count,
                    ])
                    ->all(),
            ],
            'availableCourses' => Course::query()
                ->orderBy('title')
                ->get()
                ->map(fn (Course $course) => [
                    'id' => $course->id,
                    'title' => $course->title,
                    'duration' => (int) $course->total_duration,
                    'modules' => (int) $course->modules_count,
                ]),
            'levels' => LearningPath::LEVELS,
        ]);
    }

    /**
     * Update the learning path — its metadata, its cover image,
     * and its course sequence, all in one whole-payload save
     * inside a single transaction, written sequentially.
     */
    public function update(LearningPathUpdateRequest $request, LearningPath $learningPath): RedirectResponse
    {
        Gate::authorize('update', $learningPath);

        $validated = $request->validated();

        // The cover image is required unless one is already stored
        // and this save keeps it — the server twin of the form's
        // superRefine guard.
        if (! $request->hasFile('image') && (! $learningPath->image_url || $request->boolean('remove_image'))) {
            return back()->withErrors(['image' => 'The learning path image is required.']);
        }

        DB::transaction(function () use ($request, $learningPath, $validated): void {
            // The cover: a fresh upload replaces the stored one,
            // remove_image clears it, anything else keeps it —
            // only files under our learning-paths/ storage prefix
            // are ours to delete (seeded nulls pass through
            // unharmed).
            $imageUrl = $learningPath->image_url;

            if ($request->hasFile('image')) {
                if (str_starts_with((string) $learningPath->image_url, 'learning-paths/')) {
                    Storage::disk('public')->delete($learningPath->image_url);
                }

                $imageUrl = $request->file('image')->store('learning-paths', 'public');
            } elseif ($request->boolean('remove_image')) {
                if (str_starts_with((string) $learningPath->image_url, 'learning-paths/')) {
                    Storage::disk('public')->delete($learningPath->image_url);
                }

                $imageUrl = null;
            }

            $learningPath->update([
                'title' => $validated['title'],
                'description' => $validated['description'],
                'level' => $validated['level'],
                'image_url' => $imageUrl,
            ]);

            // The course sequence sync, written inline: each
            // payload position becomes the pivot's order_index.
            $pivotData = [];

            foreach ($validated['courses'] as $orderIndex => $courseId) {
                $pivotData[$courseId] = ['order_index' => $orderIndex];
            }

            $learningPath->courses()->sync($pivotData);

            $learningPath->recalculateStats();
        });

        // The save lands on the parent page — the learning path
        // listing.
        return redirect()->route('dashboard.learning-paths');
    }

    /**
     * Delete the learning path — the cascading pivot rows take
     * its course sequence, so only the stored cover needs manual
     * cleanup.
     */
    public function destroy(LearningPath $learningPath): RedirectResponse
    {
        Gate::authorize('delete', $learningPath);

        if (str_starts_with((string) $learningPath->image_url, 'learning-paths/')) {
            Storage::disk('public')->delete($learningPath->image_url);
        }

        $learningPath->delete();

        return redirect()->route('dashboard.learning-paths');
    }
}
