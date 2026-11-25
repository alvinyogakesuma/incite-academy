<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One calendar year of the materialized leaderboard — a row per
 * student per year, anchored by its first of January.
 */
#[Fillable(['user_id', 'points', 'period_start'])]
class YearlyLeaderboard extends Model
{
    protected $table = 'yearly_leaderboard';

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
