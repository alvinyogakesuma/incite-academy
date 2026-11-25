<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenge_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('challenge_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['text', 'listening']);
            $table->longText('question_content');
            $table->string('audio_url')->nullable();
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->index(['challenge_id', 'order_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenge_questions');
    }
};
