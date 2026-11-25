<?php

namespace App\Models;

use App\Observers\LessonAttemptObserver;
use Database\Factories\LessonAttemptFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'lesson_id', 'course_id', 'score', 'points_awarded', 'total_points', 'correct_count', 'total_questions', 'percentage', 'attempted_at'])]
#[ObservedBy([LessonAttemptObserver::class])]
class LessonAttempt extends Model
{
    /** @use HasFactory<LessonAttemptFactory> */
    use HasFactory;

    protected $table = 'lesson_attempts';

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

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
