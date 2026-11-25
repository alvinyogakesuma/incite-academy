<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The materialized leaderboard tables — one per period family.
     * The three calendar-anchored tables key their rows by the
     * period's opening date (the Monday, the first, or the first
     * of January), so a new period simply starts row-less and
     * history stays put. The all-time table holds one row per
     * student, mirroring their running total.
     */
    public function up(): void
    {
        foreach (['weekly', 'monthly', 'yearly'] as $period) {
            Schema::create("{$period}_leaderboard", function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->unsignedInteger('points')->default(0);
                $table->date('period_start');
                $table->timestamps();

                $table->unique(['user_id', 'period_start']);
                $table->index(['period_start', 'points']);
            });
        }

        Schema::create('alltime_leaderboard', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('points')->default(0);
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alltime_leaderboard');
        Schema::dropIfExists('yearly_leaderboard');
        Schema::dropIfExists('monthly_leaderboard');
        Schema::dropIfExists('weekly_leaderboard');
    }
};
