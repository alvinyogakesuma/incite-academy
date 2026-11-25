<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AvatarUpdateRequest extends FormRequest
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
     * whole avatar save: metadata, the optional icon, and the
     * unlock requirements riding the multipart payload.
     *
     * @return array<string, array<string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'icon' => ['nullable', 'image', 'mimes:jpeg,png,webp', 'max:2048'],
            'remove_icon' => ['nullable', 'boolean'],
            'logic' => ['required', 'string', Rule::in(['AND', 'OR'])],
            'conditions' => ['required', 'array', 'min:1'],
            'conditions.*.type' => ['required', 'string', Rule::in(['points', 'quiz', 'course', 'path', 'challenge'])],
            'conditions.*.operator' => ['required', 'string', Rule::in(['>=', '<=', '>', '<', '='])],
            'conditions.*.value' => ['required', 'string'],
        ];
    }
}
