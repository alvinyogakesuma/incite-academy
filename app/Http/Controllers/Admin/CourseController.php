<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Category;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    /**
     * Display the list of courses (search, filtering, sorting, and
     * pagination are handled client-side).
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', Course::class);

        $courses = Course::query()
            ->orderBy('title')
            ->get()
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'title' => $course->title,
                'category' => $course->category?->value,
                'short_description' => $course->short_description,
                'image_url' => $course->image_url && str_starts_with($course->image_url, 'courses/')
                    ? Storage::disk('public')->url($course->image_url)
                    : $course->image_url,
                'status' => $course->status,
                'total_duration' => (int) $course->total_duration,
                'modules_count' => (int) $course->modules_count,
                'lessons_count' => (int) $course->lessons_count,
                'total_points' => (int) $course->total_points,
            ]);

        return Inertia::render('Dashboard/Courses', [
            'courses' => $courses,
            'categories' => array_column(Category::cases(), 'value'),
        ]);
    }

    /**
     * Create a blank draft course row and open the editor with it.
     */
    public function store(): RedirectResponse
    {
        Gate::authorize('create', Course::class);

        $course = Course::create();

        return redirect()->route('dashboard.courses.edit', $course);
    }

    /**
     * Show the course editor with the module/lesson outline loaded
     * (questions and answers belong to the lesson editor).
     */
    public function edit(Course $course): Response
    {
        Gate::authorize('view', $course);

        $course->load([
            'modules' => fn ($query) => $query->orderBy('order_index'),
            'modules.lessons' => fn ($query) => $query->orderBy('order_index'),
        ]);

        return Inertia::render('Dashboard/Courses/Editor', [
            'course' => [
                'id' => $course->id,
                'title' => $course->title,
                'category' => $course->category?->value,
                'short_description' => $course->short_description,
                'long_description' => $course->long_description,
                'image_url' => $course->image_url && str_starts_with($course->image_url, 'courses/')
                    ? Storage::disk('public')->url($course->image_url)
                    : $course->image_url,
                'status' => $course->status,
                'total_duration' => (int) $course->total_duration,
                'total_points' => (int) $course->total_points,
                'modules' => $course->modules
                    ->map(fn (Module $module) => [
                        'id' => $module->id,
                        'title' => $module->title,
                        'lessons' => $module->lessons
                            ->map(fn (Lesson $lesson) => [
                                'id' => $lesson->id,
                                'title' => $lesson->title,
                                'type' => $lesson->type,
                            ])
                            ->all(),
                    ])
                    ->all(),
            ],
            'categories' => array_column(Category::cases(), 'value'),
        ]);
    }

    /**
     * Update the course's metadata and cover image (the outline
     * tree joins the save flow in a later phase of the rebuild).
     */
    public function update(Request $request, Course $course): RedirectResponse
    {
        Gate::authorize('update', $course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::enum(Category::class)],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'short_description' => ['required', 'string', 'max:255'],
            'long_description' => ['required', 'string'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2048'],
            'remove_image' => ['nullable', 'boolean'],
        ]);

        // The cover image is required unless one is already stored
        // and this save keeps it — the server twin of the form's
        // superRefine guard.
        if (! $request->hasFile('image') && (! $course->image_url || $request->boolean('remove_image'))) {
            return back()->withErrors(['image' => 'The course image is required.']);
        }

        // A fresh upload replaces the stored one, remove_image
        // clears it, anything else keeps it — only files under our
        // courses/ storage prefix are ours to delete (fake URLs
        // from seeding pass through unharmed).
        $imageUrl = $course->image_url;

        if ($request->hasFile('image')) {
            if (str_starts_with((string) $course->image_url, 'courses/')) {
                Storage::disk('public')->delete($course->image_url);
            }

            $imageUrl = $request->file('image')->store('courses', 'public');
        } elseif ($request->boolean('remove_image')) {
            if (str_starts_with((string) $course->image_url, 'courses/')) {
                Storage::disk('public')->delete($course->image_url);
            }

            $imageUrl = null;
        }

        $course->update([
            ...$validated,
            'image_url' => $imageUrl,
        ]);

        // The save lands on the parent page — the courses listing.
        return redirect()->route('dashboard.courses');
    }

    /**
     * Delete the course — the cascading foreign keys take its
     * modules, lessons, questions, answers, and enrollments with
     * it, so no manual tree cleanup is needed.
     */
    public function destroy(Course $course): RedirectResponse
    {
        Gate::authorize('delete', $course);

        if (str_starts_with((string) $course->image_url, 'courses/')) {
            Storage::disk('public')->delete($course->image_url);
        }

        $course->delete();

        return redirect()->route('dashboard.courses');
    }
}
