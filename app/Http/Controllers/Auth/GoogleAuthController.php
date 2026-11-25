<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect the user to the Google authentication page.
     */
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Obtain the user information from Google.
     */
    public function callback(): RedirectResponse
    {
        $googleUser = Socialite::driver('google')->user();

        $email = strtolower($googleUser->getEmail() ?? '');

        if (! preg_match('/@(?:[a-z0-9-]+\.)*itera\.ac\.id$/', $email)) {
            return redirect('/login')->with('error', 'Only ITERA institutional Google accounts (@itera.ac.id) may sign in.');
        }

        $user = User::where('google_id', $googleUser->getId())
            ->orWhere('email', $email)
            ->first();

        if ($user) {
            if (! $user->google_id) {
                $user->update([
                    'google_id' => $googleUser->getId(),
                ]);
            }
        } else {
            $user = User::create([
                'name' => $googleUser->getName(),
                'email' => $email,
                'google_id' => $googleUser->getId(),
            ]);
        }

        // Google has already verified ownership of the address, so an account
        // signed in through OAuth never needs the app's verification flow.
        $user->markEmailAsVerified();

        Auth::login($user);

        request()->session()->regenerate();

        return redirect()->intended(route(User::homeRoute(), absolute: false));
    }
}
