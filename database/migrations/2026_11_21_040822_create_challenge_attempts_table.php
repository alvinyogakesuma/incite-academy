<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenge_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('challenge_id')->constrained()->cascadeOnDelete();
            $table->integer('score');
            $table->integer('points_awarded')->default(0);
            $table->integer('total_points');
            $table->integer('correct_count');
            $table->integer('total_questions');
            $table->integer('percentage');
            $table->dateTime('attempted_at');
            $table->index(['user_id', 'challenge_id']);
            $table->index('attempted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenge_attempts');
    }
};
