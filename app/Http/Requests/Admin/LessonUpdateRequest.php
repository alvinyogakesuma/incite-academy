<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LessonUpdateRequest extends FormRequest
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
     * whole lesson save: metadata plus the question/answer tree
     * riding the multipart payload.
     *
     * @return array<string, array<string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['article', 'quiz', 'exam'])],
            'duration' => ['nullable', 'integer', 'min:1', Rule::requiredIf($this->input('type') === 'exam')],
            'article_content' => ['nullable', 'string'],
            'questions' => ['nullable', 'array'],
            'questions.*.id' => ['nullable', 'integer'],
            'questions.*.type' => ['required', Rule::in(['text', 'listening'])],
            'questions.*.question_content' => ['required', 'string'],
            'questions.*.audio' => ['nullable', 'file', 'max:10240', 'mimes:mp3,wav,ogg'],
            'questions.*.audio_duration' => ['nullable', 'integer', 'min:1'],
            'questions.*.remove_audio' => ['nullable', 'boolean'],
            'questions.*.answers' => ['required', 'array', 'min:2', 'max:6'],
            'questions.*.answers.*.id' => ['nullable', 'integer'],
            'questions.*.answers.*.answer_content' => ['required', 'string'],
            'questions.*.answers.*.is_true' => ['nullable', 'boolean'],
        ];
    }
}
