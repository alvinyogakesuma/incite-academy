<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The all-time leaderboard — one row per student, mirroring
 * their running point total.
 */
#[Fillable(['user_id', 'points'])]
class AllTimeLeaderboard extends Model
{
    protected $table = 'alltime_leaderboard';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'points' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
