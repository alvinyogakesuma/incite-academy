<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\MajorDepartement;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        $majorDepartements = MajorDepartement::query()
            ->orderBy('name')
            ->get(['id', 'name', 'major_departement_domain', 'major_departement_code']);

        return Inertia::render('Auth/Register', [
            'majorDepartements' => $majorDepartements,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                'unique:'.User::class,
                'regex:/@(?:[a-z0-9-]+\.)*itera\.ac\.id$/',
            ],
            'nim_nip' => [
                'required',
                'string',
                'unique:users,nim_nip',
                'digits_between:9,18',
            ],
            'major_departement' => [
                'required',
                'string',
                'exists:majors_departements,name',
            ],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $majorDepartement = MajorDepartement::query()
            ->where('name', $request->major_departement)
            ->firstOrFail();

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'nim_nip' => $request->nim_nip,
            'major_departement_id' => $majorDepartement->id,
        ]);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
