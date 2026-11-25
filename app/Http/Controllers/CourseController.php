<?php

namespace App\Http\Controllers;

use App\Enums\Category;
use App\Models\Answer;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonAttempt;
use App\Models\LessonCompletion;
use App\Models\Module;
use App\Models\Question;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    /**
     * Display the student-facing course catalog. Only published
     * courses are listed — every aggregate the cards display is a
     * stored column, so this stays a single flat query plus the
     * signed-in student's completion tally per course.
     */
    public function index(): Response
    {
        $user = request()->user();

        // Completed lessons per course for the signed-in student.
        $completedByCourse = LessonCompletion::query()
            ->where('user_id', $user->id)
            ->selectRaw('course_id, count(*) as cnt')
            ->groupBy('course_id')
            ->pluck('cnt', 'course_id');

        $courses = Course::query()
            ->where('status', 'published')
            ->orderBy('title')
            ->get()
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'title' => $course->title,
                'slug' => $course->slug,
                'category' => $course->category?->value,
                'short_description' => $course->short_description,
                'image_url' => $course->image_url && str_starts_with($course->image_url, 'courses/')
                    ? Storage::disk('public')->url($course->image_url)
                    : $course->image_url,
                'total_duration' => (int) $course->total_duration,
                'modules_count' => (int) $course->modules_count,
                'lessons_count' => (int) $course->lessons_count,
                'total_points' => (int) $course->total_points,
                'progress' => $this->progressPercent(
                    (int) ($completedByCourse[$course->id] ?? 0),
                    (int) $course->lessons_count,
                ),
            ]);

        return Inertia::render('Courses', [
            'courses' => $courses,
            'categories' => array_column(Category::cases(), 'value'),
        ]);
    }

    /**
     * Display one published course with its module/lesson outline
     * for the student, carrying each lesson's completion flag for
     * the signed-in student and the course's overall progress.
     */
    public function show(Course $course): Response
    {
        abort_unless($course->status === 'published', 404);

        $course->load([
            'modules' => fn ($query) => $query->orderBy('order_index'),
            'modules.lessons' => fn ($query) => $query->orderBy('order_index'),
        ]);

        $completedIds = $this->completedLessonIds($course->id);

        return Inertia::render('Courses/Detail', [
            'course' => [
                'id' => $course->id,
                'slug' => $course->slug,
                'title' => $course->title,
                'description' => $course->short_description,
                'about' => $course->long_description,
                'image' => $course->image_url && str_starts_with($course->image_url, 'courses/')
                    ? Storage::disk('public')->url($course->image_url)
                    : $course->image_url,
                'duration' => (int) $course->total_duration,
                'lessons' => (int) $course->lessons_count,
                'progress' => $this->progressPercent(count($completedIds), (int) $course->lessons_count),
            ],
            'sections' => $this->completedSections($course, $completedIds),
        ]);
    }

    /**
     * The student lesson room. Quiz and exam lessons open their
     * own rooms with their questions count and attempt history;
     * articles render the reading room — a lesson without content
     * shows the prepared placeholder.
     */
    public function showLesson(Course $course, Lesson $lesson): Response
    {
        abort_unless($course->status === 'published', 404);

        $course->load([
            'modules' => fn ($query) => $query->orderBy('order_index'),
            'modules.lessons' => fn ($query) => $query->orderBy('order_index'),
        ]);

        $completedIds = $this->completedLessonIds($course->id);

        $attempts = in_array($lesson->type, ['quiz', 'exam'])
            ? LessonAttempt::query()
                ->where('user_id', request()->user()->id)
                ->where('lesson_id', $lesson->id)
                ->orderByDesc('attempted_at')
                ->get()
                ->map(fn (LessonAttempt $attempt) => [
                    'score' => (int) $attempt->score,
                    'total' => (int) $attempt->total_points,
                    'percentage' => (int) $attempt->percentage,
                    'correct' => (int) $attempt->correct_count,
                    'total_questions' => (int) $attempt->total_questions,
                    'attempted_at' => $attempt->attempted_at->format('M j, Y \a\t g:i A'),
                ])
                ->all()
            : [];

        if ($lesson->type === 'quiz') {
            return Inertia::render('Courses/RoomQuiz', [
                'course' => [
                    'id' => $course->id,
                    'slug' => $course->slug,
                    'title' => $course->title,
                ],
                'lesson' => [
                    'id' => $lesson->id,
                    'title' => $lesson->title,
                    'type' => $lesson->type,
                    'points' => (int) $lesson->points,
                    'questions_count' => (int) $lesson->questions()->count(),
                ],
                'sections' => $this->completedSections($course, $completedIds),
                'completed' => in_array($lesson->id, $completedIds, true),
                'attempts' => $attempts,
            ]);
        }

        if ($lesson->type === 'exam') {
            return Inertia::render('Courses/RoomExam', [
                'course' => [
                    'id' => $course->id,
                    'slug' => $course->slug,
                    'title' => $course->title,
                ],
                'lesson' => [
                    'id' => $lesson->id,
                    'title' => $lesson->title,
                    'type' => $lesson->type,
                    'points' => (int) $lesson->points,
                    'duration' => (int) $lesson->duration,
                    'questions_count' => (int) $lesson->questions()->count(),
                ],
                'sections' => $this->completedSections($course, $completedIds),
                'completed' => in_array($lesson->id, $completedIds, true),
                'attempts' => $attempts,
            ]);
        }

        return Inertia::render('Courses/Room', [
            'course' => [
                'id' => $course->id,
                'slug' => $course->slug,
                'title' => $course->title,
            ],
            'lesson' => [
                'id' => $lesson->id,
                'title' => $lesson->title,
                'type' => $lesson->type,
                'article_content' => $lesson->article_content,
            ],
            'sections' => $this->completedSections($course, $completedIds),
            'completed' => in_array($lesson->id, $completedIds, true),
        ]);
    }

    /**
     * Mark the lesson complete for the signed-in student — the
     * first completion enrolls them in the course, and article
     * points flow to their running total through the completion
     * observer. Repeat calls stay no-ops.
     */
    public function completeLesson(Request $request, Course $course, Lesson $lesson): RedirectResponse
    {
        abort_unless($course->status === 'published', 404);

        DB::transaction(function () use ($request, $course, $lesson): void {
            Enrollment::ensureFor($request->user(), $course->id);

            LessonCompletion::firstOrCreate([
                'user_id' => $request->user()->id,
                'lesson_id' => $lesson->id,
                'course_id' => $course->id,
            ]);
        });

        return redirect()->back();
    }

    /**
     * The assessment take screen — the lesson's questions with
     * their answers. Quiz take ships the correct flags so the
     * client can give instant feedback; exam take keeps the answer
     * key server-side, and only the submitted answers ever meet
     * it. The finished attempt's chosen answer ids go to the
     * submit endpoint for authoritative server scoring.
     */
    public function takeLesson(Course $course, Lesson $lesson): Response
    {
        abort_unless($course->status === 'published', 404);
        abort_unless(in_array($lesson->type, ['quiz', 'exam']), 404);

        $course->load([
            'modules' => fn ($query) => $query->orderBy('order_index'),
            'modules.lessons' => fn ($query) => $query->orderBy('order_index'),
        ]);

        $lesson->load([
            'questions' => fn ($query) => $query->orderBy('order_index'),
            'questions.answers' => fn ($query) => $query->orderBy('order_index'),
        ]);

        $completedIds = $this->completedLessonIds($course->id);

        $answersMap = $lesson->type === 'exam'
            ? fn (Answer $answer) => [
                'id' => $answer->id,
                'answer_content' => $answer->answer_content,
            ]
            : fn (Answer $answer) => [
                'id' => $answer->id,
                'answer_content' => $answer->answer_content,
                'is_correct' => (bool) $answer->is_true,
            ];

        return Inertia::render($lesson->type === 'exam' ? 'Courses/RoomExamStart' : 'Courses/RoomQuizStart', [
            'course' => [
                'id' => $course->id,
                'slug' => $course->slug,
                'title' => $course->title,
            ],
            'lesson' => [
                'id' => $lesson->id,
                'title' => $lesson->title,
                'type' => $lesson->type,
                'points' => (int) $lesson->points,
                'duration' => (int) $lesson->duration,
            ],
            'questions' => $lesson->questions
                ->map(fn (Question $question) => [
                    'id' => $question->id,
                    'type' => $question->type,
                    'question_content' => $question->question_content,
                    'audio_url' => $question->audio_url && str_starts_with($question->audio_url, 'questions/')
                        ? Storage::disk('public')->url($question->audio_url)
                        : $question->audio_url,
                    'answers' => $question->answers
                        ->map($answersMap)
                        ->all(),
                ])
                ->all(),
            'sections' => $this->completedSections($course, $completedIds),
            'result' => session('quiz_result'),
        ]);
    }

    /**
     * Score a finished quiz or exam attempt. The quiz client
     * checks answers for instant feedback, the exam client stays
     * in the dark until the score arrives — either way the score
     * here is authoritative: only the lesson's own questions
     * count, correctness comes from the stored rows, and the
     * attempt, the enrollment, and the lesson completion settle
     * in one transaction before the result flashes back to the
     * take screen.
     */
    public function submitLesson(Request $request, Course $course, Lesson $lesson): RedirectResponse
    {
        abort_unless($course->status === 'published', 404);
        abort_unless(in_array($lesson->type, ['quiz', 'exam']), 404);

        $validated = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*' => ['required', 'integer'],
        ]);

        $lesson->load(['questions.answers']);

        $answers = $validated['answers'];
        $correctCount = 0;

        foreach ($lesson->questions as $question) {
            $submittedAnswerId = $answers[$question->id] ?? null;

            if ($submittedAnswerId === null) {
                continue;
            }

            $answer = $question->answers->firstWhere('id', (int) $submittedAnswerId);

            if ($answer !== null && $answer->is_true) {
                $correctCount++;
            }
        }

        $totalQuestions = $lesson->questions->count();
        $pointsPerQuestion = $totalQuestions > 0 ? $lesson->points / $totalQuestions : 0;
        $score = (int) round($correctCount * $pointsPerQuestion);
        $percentage = $totalQuestions > 0 ? (int) round(($correctCount / $totalQuestions) * 100) : 0;

        DB::transaction(function () use ($request, $course, $lesson, $score, $percentage, $correctCount, $totalQuestions): void {
            Enrollment::ensureFor($request->user(), $course->id);

            LessonAttempt::create([
                'user_id' => $request->user()->id,
                'lesson_id' => $lesson->id,
                'course_id' => $course->id,
                'score' => $score,
                'total_points' => (int) $lesson->points,
                'correct_count' => $correctCount,
                'total_questions' => $totalQuestions,
                'percentage' => $percentage,
                'attempted_at' => now(),
            ]);

            LessonCompletion::firstOrCreate([
                'user_id' => $request->user()->id,
                'lesson_id' => $lesson->id,
                'course_id' => $course->id,
            ]);
        });

        return redirect()
            ->back()
            ->with('quiz_result', [
                'score' => $score,
                'total_points' => (int) $lesson->points,
                'correct_count' => $correctCount,
                'total_questions' => $totalQuestions,
                'percentage' => $percentage,
            ]);
    }

    /**
     * The signed-in student's completed lesson ids within the
     * course.
     *
     * @return array<int, int>
     */
    private function completedLessonIds(int $courseId): array
    {
        return LessonCompletion::query()
            ->where('user_id', request()->user()->id)
            ->where('course_id', $courseId)
            ->pluck('lesson_id')
            ->all();
    }

    /**
     * The percentage of the course's lessons the student has
     * completed.
     */
    private function progressPercent(int $completed, int $total): int
    {
        return $total > 0 ? (int) round(($completed / $total) * 100) : 0;
    }

    /**
     * The course outline with each lesson's completion flag for
     * the given student.
     *
     * @param  array<int, int>  $completedIds
     */
    private function completedSections(Course $course, array $completedIds): array
    {
        return $course->modules
            ->map(fn (Module $module) => [
                'id' => $module->id,
                'title' => $module->title,
                'lessonsCount' => $module->lessons->count(),
                'duration' => (int) $module->lessons->sum('duration'),
                'lessons' => $module->lessons
                    ->map(fn (Lesson $lesson) => [
                        'id' => $lesson->id,
                        'title' => $lesson->title,
                        'type' => $lesson->type,
                        'duration' => (int) $lesson->duration,
                        'completed' => in_array($lesson->id, $completedIds, true),
                    ])
                    ->all(),
            ])
            ->all();
    }
}
