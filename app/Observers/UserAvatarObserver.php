<?php

namespace App\Observers;

use App\Models\Avatar;
use App\Models\UserAvatar;

class UserAvatarObserver
{
    /**
     * An awarded avatar counts its new recipient.
     */
    public function created(UserAvatar $pivot): void
    {
        $avatar = Avatar::find($pivot->avatar_id);

        if ($avatar !== null) {
            $avatar->increment('recipients_count');
        }
    }

    /**
     * A removed award settles the count back down.
     */
    public function deleted(UserAvatar $pivot): void
    {
        $avatar = Avatar::find($pivot->avatar_id);

        if ($avatar !== null) {
            $avatar->decrement('recipients_count');
        }
    }
}
