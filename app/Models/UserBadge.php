<?php

namespace App\Models;

use App\Observers\UserBadgeObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Relations\Pivot;

#[Fillable(['user_id', 'badge_id', 'is_equipped', 'awarded_at'])]
#[ObservedBy([UserBadgeObserver::class])]
class UserBadge extends Pivot
{
    protected $table = 'user_badges';

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_equipped' => 'boolean',
            'awarded_at' => 'datetime',
        ];
    }
}
