<?php

namespace App\Models;

use App\Enums\Category;
use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable(['title', 'slug', 'category', 'short_description', 'long_description', 'image_url', 'status', 'total_duration', 'modules_count', 'lessons_count', 'total_points'])]
class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use HasFactory;

    /**
     * The slug is generated from the title once and never changes
     * after — published URLs survive renames.
     */
    protected static function booted(): void
    {
        static::saving(function (Course $course) {
            if ($course->title && ! $course->slug) {
                $course->slug = static::uniqueSlug($course->title);
            }
        });
    }

    /**
     * Slugify a title, suffixing -2, -3… while the slug is taken.
     */
    protected static function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'course';
        $slug = $base;
        $suffix = 2;

        while (static::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.($suffix++);
        }

        return $slug;
    }

    protected function casts(): array
    {
        return [
            'category' => Category::class,
            'total_duration' => 'integer',
            'modules_count' => 'integer',
            'lessons_count' => 'integer',
            'total_points' => 'integer',
        ];
    }

    public function modules(): HasMany
    {
        return $this->hasMany(Module::class);
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * The users enrolled in this course, reading the pivot's
     * enrollment stamps through with them.
     */
    public function enrolledUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_enrollments')
            ->withPivot(['enrolled_at', 'last_accessed']);
    }
}
