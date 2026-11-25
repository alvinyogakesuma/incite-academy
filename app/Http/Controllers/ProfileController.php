<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Avatar;
use App\Models\Badge;
use App\Models\Enrollment;
use App\Models\LearningPathEnrollment;
use App\Models\LessonCompletion;
use App\Models\MajorDepartement;
use App\Models\UserAvatar;
use App\Models\UserBadge;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile page — the personal info and
     * password forms, the badge showcase, and the student's live
     * progress across their enrolled courses and learning paths.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        // The student's completed lessons per course — the source
        // of every progress meter on the page.
        $completedByCourse = LessonCompletion::query()
            ->where('user_id', $user->id)
            ->selectRaw('course_id, count(*) as cnt')
            ->groupBy('course_id')
            ->pluck('cnt', 'course_id');

        $courses = $user->enrollments()
            ->with('course')
            ->get()
            ->map(function (Enrollment $enrollment) use ($completedByCourse) {
                $course = $enrollment->course;
                $completed = (int) ($completedByCourse[$course->id] ?? 0);
                $total = (int) $course->lessons_count;

                return [
                    'id' => $course->id,
                    'slug' => $course->slug,
                    'title' => $course->title,
                    'description' => $course->short_description,
                    'category' => $course->category?->value,
                    'completed' => $completed,
                    'total' => $total,
                    'progress' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
                ];
            })
            ->values();

        $paths = LearningPathEnrollment::query()
            ->where('user_id', $user->id)
            ->with('learningPath.courses')
            ->get()
            ->map(function (LearningPathEnrollment $enrollment) use ($completedByCourse) {
                $path = $enrollment->learningPath;

                $total = 0;
                $completed = 0;

                foreach ($path->courses as $course) {
                    $total += (int) $course->lessons_count;
                    $completed += (int) ($completedByCourse[$course->id] ?? 0);
                }

                return [
                    'id' => $path->id,
                    'title' => $path->title,
                    'description' => $path->description,
                    'level' => $path->level,
                    'progress' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
                ];
            })
            ->values();

        // The student's awards, keyed by badge — the showcase's
        // earned and equipped flags.
        $userBadges = UserBadge::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('badge_id');

        $badges = Badge::query()
            ->orderBy('title')
            ->get()
            ->map(fn (Badge $badge) => [
                'id' => $badge->id,
                'title' => $badge->title,
                'description' => $badge->description,
                'icon_url' => $badge->icon_url && str_starts_with($badge->icon_url, 'badges/')
                    ? Storage::disk('public')->url($badge->icon_url)
                    : $badge->icon_url,
                'isAwarded' => $userBadges->has($badge->id),
                'isEquipped' => (bool) $userBadges->get($badge->id)?->is_equipped,
            ]);

        // The student's avatar awards, keyed by avatar — the
        // character grid's earned and equipped flags.
        $userAvatars = UserAvatar::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('avatar_id');

        $avatars = Avatar::query()
            ->orderBy('title')
            ->get()
            ->map(fn (Avatar $avatar) => [
                'id' => $avatar->id,
                'title' => $avatar->title,
                'description' => $avatar->description,
                'icon_url' => $avatar->icon_url && str_starts_with($avatar->icon_url, 'avatars/')
                    ? Storage::disk('public')->url($avatar->icon_url)
                    : $avatar->icon_url,
                'isAwarded' => $userAvatars->has($avatar->id),
                'isEquipped' => (bool) $userAvatars->get($avatar->id)?->is_equipped,
            ]);

        // The equipped character's icon for the header band.
        $equippedAvatar = collect($avatars)
            ->first(fn (array $item) => $item['isEquipped']);

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'majorDepartements' => MajorDepartement::query()
                ->orderBy('name')
                ->get()
                ->map(fn (MajorDepartement $major) => [
                    'value' => (string) $major->id,
                    'label' => $major->name,
                ]),
            'badges' => $badges,
            'avatars' => $avatars,
            'equippedAvatar' => $equippedAvatar['icon_url'] ?? null,
            'courses' => $courses,
            'paths' => $paths,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
