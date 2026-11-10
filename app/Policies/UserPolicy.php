<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
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
     * Determine whether the admin can update the given user.
     */
    public function update(User $admin, User $target): bool
    {
        return $this->isModifiable($admin, $target);
    }

    /**
     * Determine whether the admin can delete the given user.
     */
    public function delete(User $admin, User $target): bool
    {
        return $this->isModifiable($admin, $target);
    }

    /**
     * Admins cannot act on themselves, and the last remaining
     * admin cannot be demoted or deleted.
     */
    private function isModifiable(User $admin, User $target): bool
    {
        if ($admin->id === $target->id) {
            return false;
        }

        if ($target->isAdmin() && User::where('role', 'admin')->count() <= 1) {
            return false;
        }

        return true;
    }
}
