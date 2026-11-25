<?php

namespace App\Models;

use App\Enums\Category;
use App\Enums\Difficulty;
use Database\Factories\ChallengeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['title', 'description', 'category', 'difficulty', 'points', 'duration', 'image_url'])]
class Challenge extends Model
{
    /** @use HasFactory<ChallengeFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'category' => Category::class,
            'difficulty' => Difficulty::class,
            'points' => 'integer',
            'duration' => 'integer',
        ];
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ChallengeQuestion::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ChallengeAttempt::class);
    }
}
