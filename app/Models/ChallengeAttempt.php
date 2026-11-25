<?php

namespace App\Models;

use App\Observers\ChallengeAttemptObserver;
use Database\Factories\ChallengeAttemptFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'challenge_id', 'score', 'points_awarded', 'total_points', 'correct_count', 'total_questions', 'percentage', 'attempted_at'])]
#[ObservedBy([ChallengeAttemptObserver::class])]
class ChallengeAttempt extends Model
{
    /** @use HasFactory<ChallengeAttemptFactory> */
    use HasFactory;

    protected $table = 'challenge_attempts';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'points_awarded' => 'integer',
            'total_points' => 'integer',
            'correct_count' => 'integer',
            'total_questions' => 'integer',
            'percentage' => 'integer',
            'attempted_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function challenge(): BelongsTo
    {
        return $this->belongsTo(Challenge::class);
    }
}
