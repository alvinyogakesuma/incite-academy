<?php

namespace App\Http\Controllers;

use App\Models\Avatar;
use App\Models\UserAvatar;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProfileAvatarController extends Controller
{
    /**
     * Equip an earned avatar as the student's profile picture —
     * exclusively: every other equipped avatar clears, the picked
     * one takes the slot.
     */
    public function equip(Request $request, Avatar $avatar): RedirectResponse
    {
        $award = UserAvatar::query()
            ->where('user_id', $request->user()->id)
            ->where('avatar_id', $avatar->id)
            ->first();

        // Only earned avatars can wear the profile slot.
        if ($award === null) {
            return back()->withErrors(['avatar' => 'You have not unlocked this avatar yet.']);
        }

        // The pivot carries no primary key of its own — the equip
        // writes through the builder's own where clauses, clearing
        // the old slot before taking the new one.
        UserAvatar::query()
            ->where('user_id', $request->user()->id)
            ->update(['is_equipped' => false]);

        UserAvatar::query()
            ->where('user_id', $request->user()->id)
            ->where('avatar_id', $avatar->id)
            ->update(['is_equipped' => true]);

        return redirect()->back();
    }
}
