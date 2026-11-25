<?php

namespace App\Models;

use Database\Factories\ChallengeAnswerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['challenge_question_id', 'answer_content', 'is_correct', 'order_index'])]
class ChallengeAnswer extends Model
{
    /** @use HasFactory<ChallengeAnswerFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
            'order_index' => 'integer',
        ];
    }

    public function challengeQuestion(): BelongsTo
    {
        return $this->belongsTo(ChallengeQuestion::class);
    }
}
