<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserStoreRequest;
use App\Http\Requests\Admin\UserUpdateRequest;
use App\Models\MajorDepartement;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display the list of users (search, filtering, sorting, and
     * pagination are handled client-side).
     */
    public function index(): Response
    {
        $users = User::with('majorDepartement')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->mapUser($user));

        [$programStudi, $upaUpt] = MajorDepartement::query()
            ->orderBy('name')
            ->get(['name', 'major_departement_code'])
            ->partition(fn (MajorDepartement $departement) => $departement->major_departement_code !== null)
            ->map(fn ($partition) => $partition->pluck('name')->values());

        return Inertia::render('Dashboard/Users', [
            'users' => $users,
            'programStudi' => $programStudi,
            'upaUpt' => $upaUpt,
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(UserStoreRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $majorDepartement = $this->resolveMajorDepartement($validated['major_department']);

        User::create([
            ...$validated,
            'major_departement_id' => $majorDepartement->id,
            'password' => Hash::make('Password1!'),
        ]);

        return redirect()->route('dashboard.users');
    }

    /**
     * Resolve a department name to its model.
     */
    private function resolveMajorDepartement(string $name): MajorDepartement
    {
        return MajorDepartement::query()
            ->where('name', $name)
            ->firstOrFail();
    }

    /**
     * Map a user model to the array shape used by the admin list.
     *
     * @return array<string, mixed>
     */
    private function mapUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'nim_nip' => $user->nim_nip,
            'major_department' => $user->majorDepartement?->name,
            'total_points' => $user->total_points,
            'joined' => $user->created_at->toDateString(),
        ];
    }
}
