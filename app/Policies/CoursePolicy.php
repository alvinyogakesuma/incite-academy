<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\User;

class CoursePolicy
{
    /**
     * Non-admins are denied outright for every ability.
     */
    public function before(?User $user): ?bool
    {
        if ($user === null || ! $user->isAdmin()) {
            return false;
        }

        return null;
    }

    /**
     * Determine whether the admin can browse the course listing.
     */
    public function viewAny(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can create a course.
     */
    public function create(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can open the given course's editor.
     */
    public function view(User $admin, Course $course): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can update the given course.
     */
    public function update(User $admin, Course $course): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can delete the given course.
     */
    public function delete(User $admin, Course $course): bool
    {
        return true;
    }
}
