<?php

namespace App\Policies;

use App\Models\Challenge;
use App\Models\User;

class ChallengePolicy
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
     * Determine whether the admin can browse the challenge listing.
     */
    public function viewAny(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can create a challenge.
     */
    public function create(User $admin): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can open the given challenge.
     */
    public function view(User $admin, Challenge $challenge): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can update the given challenge.
     */
    public function update(User $admin, Challenge $challenge): bool
    {
        return true;
    }

    /**
     * Determine whether the admin can delete the given challenge.
     */
    public function delete(User $admin, Challenge $challenge): bool
    {
        return true;
    }
}
