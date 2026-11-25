<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('challenges', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('category', [
                'Reading Comprehension',
                'Listening Comprehension',
                'Structure and Writing Expression',
            ]);
            $table->enum('difficulty', ['Easy', 'Medium', 'Hard']);
            $table->unsignedInteger('points')->default(0);
            $table->unsignedInteger('duration')->default(0);
            $table->string('image_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('challenges');
    }
};
