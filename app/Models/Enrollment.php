<?php

namespace App\Models;

use Database\Factories\EnrollmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'course_id', 'enrolled_at', 'last_accessed'])]
class Enrollment extends Model
{
    /** @use HasFactory<EnrollmentFactory> */
    use HasFactory;

    protected $table = 'course_enrollments';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'enrolled_at' => 'datetime',
            'last_accessed' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Enroll the user in the course, or refresh the last accessed
     * stamp on their existing enrollment — idempotent, so callers
     * never check for a prior enrollment first.
     */
    public static function ensureFor(User $user, int $courseId): self
    {
        $enrollment = self::firstOrCreate(
            ['user_id' => $user->id, 'course_id' => $courseId],
            ['enrolled_at' => now(), 'last_accessed' => now()],
        );

        if (! $enrollment->wasRecentlyCreated) {
            $enrollment->update(['last_accessed' => now()]);
        }

        return $enrollment;
    }
}
