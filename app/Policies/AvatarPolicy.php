<?php

namespace App\Policies;

use App\Models\Avatar;
use App\Models\User;

class AvatarPolicy
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
     * Determine whether the admin can browse the avatar listing.
     */
    public function viewAny(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can create an avatar.
     */
    public function create(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can open the given avatar.
     */
    public function view(User $admin, Avatar $avatar): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can update the given avatar.
     */
    public function update(User $admin, Avatar $avatar): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can delete the given avatar.
     */
    public function delete(User $admin, Avatar $avatar): bool
    {
        return true;
    }
}
