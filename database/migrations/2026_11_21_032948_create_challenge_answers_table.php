<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenge_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('challenge_question_id')->constrained()->cascadeOnDelete();
            $table->text('answer_content');
            $table->boolean('is_correct')->default(false);
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->index(['challenge_question_id', 'order_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenge_answers');
    }
};
