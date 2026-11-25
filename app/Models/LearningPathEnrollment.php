<?php

namespace App\Models;

use Database\Factories\LearningPathEnrollmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'learning_path_id', 'enrolled_at'])]
class LearningPathEnrollment extends Model
{
    /** @use HasFactory<LearningPathEnrollmentFactory> */
    use HasFactory;

    protected $table = 'learning_path_enrollments';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'enrolled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function learningPath(): BelongsTo
    {
        return $this->belongsTo(LearningPath::class);
    }
}
