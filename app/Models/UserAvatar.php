<?php

namespace App\Models;

use App\Observers\UserAvatarObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Relations\Pivot;

#[Fillable(['user_id', 'avatar_id', 'is_equipped', 'awarded_at'])]
#[ObservedBy([UserAvatarObserver::class])]
class UserAvatar extends Pivot
{
    protected $table = 'user_avatars';

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
