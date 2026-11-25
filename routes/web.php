<?php

use App\Http\Controllers\Admin\AvatarController;
use App\Http\Controllers\Admin\BadgeController;
use App\Http\Controllers\Admin\ChallengeController;
use App\Http\Controllers\Admin\CourseController;
use App\Http\Controllers\Admin\LearningPathController;
use App\Http\Controllers\Admin\LessonController;
use App\Http\Controllers\Admin\ModuleController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\ChallengeController as StudentChallengeController;
use App\Http\Controllers\CourseController as StudentCourseController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\LearningPathController as StudentLearningPathController;
use App\Http\Controllers\ProfileAvatarController;
use App\Http\Controllers\ProfileBadgeController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    // The home landing now points at the course catalog — the
    // name survives so post-login redirects keep working.
    Route::redirect('/home', '/courses')->name('home');

    Route::get('/courses', [StudentCourseController::class, 'index'])->name('courses');

    Route::get('/courses/{course:slug}', [StudentCourseController::class, 'show'])
        ->name('courses.show');

    Route::get('/courses/{course:slug}/lessons/{lesson}', [StudentCourseController::class, 'showLesson'])
        ->name('courses.lessons.show')
        ->scopeBindings();

    Route::post('/courses/{course:slug}/lessons/{lesson}/complete', [StudentCourseController::class, 'completeLesson'])
        ->name('courses.lessons.complete')
        ->scopeBindings();

    Route::get('/courses/{course:slug}/lessons/{lesson}/take', [StudentCourseController::class, 'takeLesson'])
        ->name('courses.lessons.take')
        ->scopeBindings();

    Route::post('/courses/{course:slug}/lessons/{lesson}/submit', [StudentCourseController::class, 'submitLesson'])
        ->name('courses.lessons.submit')
        ->scopeBindings();

    Route::get('/challenges', [StudentChallengeController::class, 'index'])->name('challenges');

    Route::get('/challenges/{challenge}', [StudentChallengeController::class, 'show'])->name('challenges.show');

    Route::get('/challenges/{challenge}/take', [StudentChallengeController::class, 'take'])->name('challenges.take');

    Route::post('/challenges/{challenge}/submit', [StudentChallengeController::class, 'submit'])->name('challenges.submit');

    Route::get('/learning-paths', [StudentLearningPathController::class, 'index'])->name('learning-paths');

    Route::get('/learning-paths/{learning_path}', [StudentLearningPathController::class, 'show'])->name('learning-paths.show');

    Route::post('/learning-paths/{learning_path}/enroll', [StudentLearningPathController::class, 'enroll'])->name('learning-paths.enroll');

    Route::get('/leaderboard', [LeaderboardController::class, 'index'])->name('leaderboard');

    Route::get('/leaderboard/student/{user}', [LeaderboardController::class, 'show'])->name('leaderboard.student');
});

Route::middleware(['auth', 'verified', 'admin'])->group(function () {
    // The dashboard landing now points at the users management —
    // the name survives so post-login redirects keep working.
    Route::redirect('/dashboard', '/dashboard/users')->name('dashboard');

    Route::get('/dashboard/users', [UserController::class, 'index'])->name('dashboard.users');
    Route::post('/dashboard/users', [UserController::class, 'store'])->name('dashboard.users.store');
    Route::put('/dashboard/users/{user}', [UserController::class, 'update'])->name('dashboard.users.update');
    Route::delete('/dashboard/users/{user}', [UserController::class, 'destroy'])->name('dashboard.users.destroy');

    Route::get('/dashboard/courses', [CourseController::class, 'index'])->name('dashboard.courses');
    Route::post('/dashboard/courses', [CourseController::class, 'store'])->name('dashboard.courses.store');
    Route::get('/dashboard/courses/{course}/edit', [CourseController::class, 'edit'])->name('dashboard.courses.edit');
    Route::put('/dashboard/courses/{course}', [CourseController::class, 'update'])->name('dashboard.courses.update');
    Route::post('/dashboard/courses/{course}/modules', [ModuleController::class, 'store'])->name('dashboard.courses.modules.store');
    Route::put('/dashboard/courses/{course}/modules/reorder', [ModuleController::class, 'reorder'])->name('dashboard.courses.modules.reorder');
    Route::put('/dashboard/modules/{module}', [ModuleController::class, 'rename'])->name('dashboard.modules.rename');
    Route::post('/dashboard/modules/{module}/lessons', [LessonController::class, 'store'])->name('dashboard.modules.lessons.store');
    Route::put('/dashboard/modules/{module}/lessons/reorder', [LessonController::class, 'reorder'])->name('dashboard.modules.lessons.reorder');
    Route::put('/dashboard/lessons/{lesson}', [LessonController::class, 'rename'])->name('dashboard.lessons.rename');
    Route::delete('/dashboard/lessons/{lesson}', [LessonController::class, 'destroy'])->name('dashboard.lessons.destroy');
    Route::get('/dashboard/courses/{course}/lessons/{lesson}/edit', [LessonController::class, 'edit'])->name('dashboard.courses.lessons.edit')->scopeBindings();
    Route::put('/dashboard/courses/{course}/lessons/{lesson}', [LessonController::class, 'update'])->name('dashboard.courses.lessons.update')->scopeBindings();
    Route::delete('/dashboard/modules/{module}', [ModuleController::class, 'destroy'])->name('dashboard.modules.destroy');
    Route::delete('/dashboard/courses/{course}', [CourseController::class, 'destroy'])->name('dashboard.courses.destroy');

    Route::get('/dashboard/challenges', [ChallengeController::class, 'index'])->name('dashboard.challenges');
    Route::post('/dashboard/challenges', [ChallengeController::class, 'store'])->name('dashboard.challenges.store');
    Route::get('/dashboard/challenges/{challenge}/edit', [ChallengeController::class, 'edit'])->name('dashboard.challenges.edit');
    Route::put('/dashboard/challenges/{challenge}', [ChallengeController::class, 'update'])->name('dashboard.challenges.update');
    Route::delete('/dashboard/challenges/{challenge}', [ChallengeController::class, 'destroy'])->name('dashboard.challenges.destroy');

    Route::get('/dashboard/learning-paths', [LearningPathController::class, 'index'])->name('dashboard.learning-paths');
    Route::post('/dashboard/learning-paths', [LearningPathController::class, 'store'])->name('dashboard.learning-paths.store');
    Route::get('/dashboard/learning-paths/{learning_path}/edit', [LearningPathController::class, 'edit'])->name('dashboard.learning-paths.edit');
    Route::put('/dashboard/learning-paths/{learning_path}', [LearningPathController::class, 'update'])->name('dashboard.learning-paths.update');
    Route::delete('/dashboard/learning-paths/{learning_path}', [LearningPathController::class, 'destroy'])->name('dashboard.learning-paths.destroy');

    Route::get('/dashboard/badges', [BadgeController::class, 'index'])->name('dashboard.badges');
    Route::post('/dashboard/badges', [BadgeController::class, 'store'])->name('dashboard.badges.store');
    Route::get('/dashboard/badges/{badge}/edit', [BadgeController::class, 'edit'])->name('dashboard.badges.edit');
    Route::put('/dashboard/badges/{badge}', [BadgeController::class, 'update'])->name('dashboard.badges.update');
    Route::delete('/dashboard/badges/{badge}', [BadgeController::class, 'destroy'])->name('dashboard.badges.destroy');

    Route::get('/dashboard/avatars', [AvatarController::class, 'index'])->name('dashboard.avatars');
    Route::post('/dashboard/avatars', [AvatarController::class, 'store'])->name('dashboard.avatars.store');
    Route::get('/dashboard/avatars/{avatar}/edit', [AvatarController::class, 'edit'])->name('dashboard.avatars.edit');
    Route::put('/dashboard/avatars/{avatar}', [AvatarController::class, 'update'])->name('dashboard.avatars.update');
    Route::delete('/dashboard/avatars/{avatar}', [AvatarController::class, 'destroy'])->name('dashboard.avatars.destroy');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('/profile/badges/{badge}', [ProfileBadgeController::class, 'toggle'])->name('profile.badges.toggle');

    Route::post('/profile/avatars/{avatar}', [ProfileAvatarController::class, 'equip'])->name('profile.avatars.equip');
});

require __DIR__.'/auth.php';
