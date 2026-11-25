<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * A student made progress — a lesson completed, a lesson attempt
 * landed, or a challenge attempt landed. Whatever counts toward
 * an earnable's requirements may have changed.
 */
class StudentProgressed
{
    use Dispatchable;

    /**
     * @param  User  $user  the student whose progress moved
     */
    public function __construct(public readonly User $user) {}
}
