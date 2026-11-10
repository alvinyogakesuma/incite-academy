<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<string>>
     */
    public function rules(): array
    {
        $userId = $this->route('user')->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($userId),
                'regex:/@([a-zA-Z0-9.-]+\.)?itera\.ac\.id$/i',
            ],
            'role' => ['required', 'string', Rule::in(['student', 'admin'])],
            'nim_nip' => [
                'required',
                'string',
                'regex:/^\d+$/',
                'max:50',
                Rule::unique(User::class)->ignore($userId),
            ],
            'major_department' => [
                'required',
                'string',
                'exists:majors_departements,name',
            ],
            'total_points' => ['required', 'integer', 'min:0'],
        ];
    }
}
