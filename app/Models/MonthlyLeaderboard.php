<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One calendar month of the materialized leaderboard — a row per
 * student per month, anchored by the month's first day.
 */
#[Fillable(['user_id', 'points', 'period_start'])]
class MonthlyLeaderboard extends Model
{
    protected $table = 'monthly_leaderboard';

    /**
     * The period anchor stays a raw Y-m-d string — it is only ever
     * written and compared as one, so no cast ever reformats it
     * behind the lookups' backs.
     *
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
