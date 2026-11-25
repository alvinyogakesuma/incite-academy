<?php

namespace App\Http\Requests\Admin;

use App\Models\LearningPath;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LearningPathUpdateRequest extends FormRequest
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
     * whole learning path save: metadata, the cover image, and
     * the course sequence riding the multipart payload.
     *
     * @return array<string, array<string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'level' => ['required', 'string', Rule::in(LearningPath::LEVELS)],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2048'],
            'remove_image' => ['nullable', 'boolean'],
            'courses' => ['required', 'array', 'min:1'],
            'courses.*' => ['required', 'integer', 'distinct', 'exists:courses,id'],
        ];
    }
}
