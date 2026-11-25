<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_learning_path', function (Blueprint $table) {
            $table->foreignId('learning_path_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('order_index')->default(0);

            $table->primary(['learning_path_id', 'course_id']);
            $table->index(['learning_path_id', 'order_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_learning_path');
    }
};
