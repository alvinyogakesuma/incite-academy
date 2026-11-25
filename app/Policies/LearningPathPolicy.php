<?php

namespace App\Policies;

use App\Models\LearningPath;
use App\Models\User;

class LearningPathPolicy
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
     * Determine whether the admin can browse the learning path
     * listing.
     */
    public function viewAny(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can create a learning path.
     */
    public function create(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can open the given learning
     * path.
     */
    public function view(User $admin, LearningPath $learningPath): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can update the given learning
     * path.
     */
    public function update(User $admin, LearningPath $learningPath): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can delete the given learning
     * path.
     */
    public function delete(User $admin, LearningPath $learningPath): bool
    {
        return true;
    }
}
