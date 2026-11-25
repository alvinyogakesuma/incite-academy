<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_avatars', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('avatar_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_equipped')->default(false);
            $table->timestamp('awarded_at')->useCurrent();

            $table->primary(['user_id', 'avatar_id']);
            $table->index(['user_id', 'is_equipped']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_avatars');
    }
};
