<?php

namespace App\Policies;

use App\Models\Badge;
use App\Models\User;

class BadgePolicy
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
     * Determine whether the admin can browse the badge listing.
     */
    public function viewAny(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can create a badge.
     */
    public function create(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can open the given badge.
     */
    public function view(User $admin, Badge $badge): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can update the given badge.
     */
    public function update(User $admin, Badge $badge): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can delete the given badge.
     */
    public function delete(User $admin, Badge $badge): bool
    {
        return true;
    }
}
