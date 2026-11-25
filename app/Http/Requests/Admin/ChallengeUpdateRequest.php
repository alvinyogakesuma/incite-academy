<?php

namespace App\Http\Requests\Admin;

use App\Enums\Category;
use App\Enums\Difficulty;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChallengeUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request — the
     * whole challenge save: metadata, the cover image, and the
     * question/answer tree riding the multipart payload.
     *
     * @return array<string, array<string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'category' => ['required', Rule::enum(Category::class)],
            'difficulty' => ['required', Rule::enum(Difficulty::class)],
            'points' => ['required', 'integer', 'min:0'],
            'duration' => ['required', 'integer', 'min:1'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2048'],
            'remove_image' => ['nullable', 'boolean'],
            'questions' => ['nullable', 'array'],
            'questions.*.id' => ['nullable', 'integer'],
            'questions.*.type' => ['required', Rule::in(['text', 'listening'])],
            'questions.*.question_content' => ['required', 'string'],
            'questions.*.audio' => ['nullable', 'file', 'max:10240', 'mimes:mp3,wav,ogg'],
            'questions.*.remove_audio' => ['nullable', 'boolean'],
            'questions.*.answers' => ['required', 'array', 'min:2', 'max:6'],
            'questions.*.answers.*.id' => ['nullable', 'integer'],
            'questions.*.answers.*.answer_content' => ['required', 'string'],
            'questions.*.answers.*.is_correct' => ['nullable', 'boolean'],
        ];
    }
}
