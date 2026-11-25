<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\LessonCompletion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class LearningPathController extends Controller
{
    /**
     * Display the student-facing learning paths listing — the
     * structured journeys the admin sequences, each card carrying
     * its cover, level, duration, and course count.
     */
    public function index(): Response
    {
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
                'total_duration' => (int) $path->total_duration,
                'courses_count' => (int) $path->courses_count,
            ]);

        return Inertia::render('LearningPaths', [
            'learningPaths' => $learningPaths,
            'levels' => LearningPath::LEVELS,
        ]);
    }

    /**
     * Show one learning path with its course sequence for the
     * student — each course carrying its completion tally for the
     * signed-in student, the overall path progress, and their
     * enrollment flag. The listing's view action routes here.
     */
    public function show(LearningPath $learningPath): Response
    {
        $user = request()->user();

        $isEnrolled = LearningPathEnrollment::query()
            ->where('user_id', $user->id)
            ->where('learning_path_id', $learningPath->id)
            ->exists();

        // The signed-in student's completed lessons per course —
        // the totals roll into the path's overall progress.
        $completedByCourse = LessonCompletion::query()
            ->where('user_id', $user->id)
            ->whereIn('course_id', $learningPath->courses()->pluck('courses.id'))
            ->selectRaw('course_id, count(*) as cnt')
            ->groupBy('course_id')
            ->pluck('cnt', 'course_id');

        $totalCompleted = 0;
        $totalLessons = 0;

        $courses = $learningPath->courses
            ->map(function (Course $course) use ($completedByCourse, &$totalCompleted, &$totalLessons) {
                $completed = (int) ($completedByCourse[$course->id] ?? 0);

                $totalCompleted += $completed;
                $totalLessons += (int) $course->lessons_count;

                return [
                    'id' => $course->id,
                    'slug' => $course->slug,
                    'title' => $course->title,
                    'description' => $course->short_description,
                    'category' => $course->category?->value,
                    'duration' => (int) $course->total_duration,
                    'lessons' => (int) $course->lessons_count,
                ];
            })
            ->all();

        $progress = $totalLessons > 0
            ? (int) round(($totalCompleted / $totalLessons) * 100)
            : 0;

        return Inertia::render('LearningPaths/Detail', [
            'learningPath' => [
                'id' => $learningPath->id,
                'title' => $learningPath->title,
                'description' => $learningPath->description,
                'level' => $learningPath->level,
                'image_url' => $learningPath->image_url && str_starts_with($learningPath->image_url, 'learning-paths/')
                    ? Storage::disk('public')->url($learningPath->image_url)
                    : $learningPath->image_url,
                'duration' => (int) $learningPath->total_duration,
                'coursesCount' => (int) $learningPath->courses_count,
            ],
            'courses' => $courses,
            'progress' => $progress,
            'isEnrolled' => $isEnrolled,
        ]);
    }

    /**
     * Toggle the signed-in student's enrollment in the path —
     * enrolling creates the row, re-calling drops it.
     */
    public function enroll(Request $request, LearningPath $learningPath): RedirectResponse
    {
        $existing = LearningPathEnrollment::query()
            ->where('user_id', $request->user()->id)
            ->where('learning_path_id', $learningPath->id)
            ->first();

        if ($existing !== null) {
            $existing->delete();
        } else {
            LearningPathEnrollment::create([
                'user_id' => $request->user()->id,
                'learning_path_id' => $learningPath->id,
                'enrolled_at' => now(),
            ]);
        }

        return redirect()->back();
    }
}
