<?php

namespace App\Models;

use Database\Factories\ChallengeQuestionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['challenge_id', 'type', 'question_content', 'audio_url', 'order_index'])]
class ChallengeQuestion extends Model
{
    /** @use HasFactory<ChallengeQuestionFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'order_index' => 'integer',
        ];
    }

    public function challenge(): BelongsTo
    {
        return $this->belongsTo(Challenge::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ChallengeAnswer::class);
    }
}
