<?php

namespace App\Models;

use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['title', 'category', 'short_description', 'long_description', 'image_url', 'total_duration', 'modules_count', 'lessons_count', 'total_points'])]
class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
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
}
