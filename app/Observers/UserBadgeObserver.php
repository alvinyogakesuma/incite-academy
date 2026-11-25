<?php

namespace App\Observers;

use App\Models\Badge;
use App\Models\UserBadge;

class UserBadgeObserver
{
    /**
     * An awarded badge counts its new recipient.
     */
    public function created(UserBadge $pivot): void
    {
        $badge = Badge::find($pivot->badge_id);

        if ($badge !== null) {
            $badge->increment('recipients_count');
        }
    }

    /**
     * A removed award settles the count back down.
     */
    public function deleted(UserBadge $pivot): void
    {
        $badge = Badge::find($pivot->badge_id);

        if ($badge !== null) {
            $badge->decrement('recipients_count');
        }
    }
}
