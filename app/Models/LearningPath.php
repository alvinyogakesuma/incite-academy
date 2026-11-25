<?php

namespace App\Models;

use Database\Factories\LearningPathFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['title', 'description', 'image_url', 'level', 'courses_count', 'total_duration'])]
class LearningPath extends Model
{
    /** @use HasFactory<LearningPathFactory> */
    use HasFactory;

    /**
     * The path's difficulty bandings — the level column's
     * allowed values.
     */
    public const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

    protected function casts(): array
    {
        return [
            'courses_count' => 'integer',
            'total_duration' => 'integer',
        ];
    }

    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class)
            ->withPivot('order_index')
            ->orderByPivot('order_index');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(LearningPathEnrollment::class);
    }

    /**
     * Refresh the stored card aggregates from the attached
     * courses — their count and combined duration.
     */
    public function recalculateStats(): void
    {
        $courseIds = $this->courses()->pluck('courses.id');

        $stats = Course::whereIn('id', $courseIds)
            ->selectRaw('count(*) as cnt, coalesce(sum(total_duration),0) as dur')
            ->first();

        $this->update([
            'courses_count' => (int) ($stats?->cnt ?? 0),
            'total_duration' => (int) ($stats?->dur ?? 0),
        ]);
    }
}
