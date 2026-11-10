<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->enum('category', [
                'Reading Comprehension',
                'Listening Comprehension',
                'Structure and Writing Expression',
            ]);
            $table->string('short_description');
            $table->text('long_description');
            $table->string('image_url')->nullable();
            $table->unsignedInteger('total_duration')->default(0);
            $table->unsignedInteger('modules_count')->default(0);
            $table->unsignedInteger('lessons_count')->default(0);
            $table->unsignedInteger('total_points')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
