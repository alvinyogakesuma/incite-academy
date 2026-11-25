<?php

namespace App\Http\Controllers;

use App\Models\Badge;
use App\Models\UserBadge;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProfileBadgeController extends Controller
{
    /**
     * Toggle the student's display of an earned badge — equipping
     * joins the showcase (at most three at a time), unequipping
     * frees the slot.
     */
    public function toggle(Request $request, Badge $badge): RedirectResponse
    {
        $award = UserBadge::query()
            ->where('user_id', $request->user()->id)
            ->where('badge_id', $badge->id)
            ->first();

        // Only earned badges can join the showcase.
        if ($award === null) {
            return back()->withErrors(['badge' => 'You have not earned this badge yet.']);
        }

        // The pivot carries no primary key of its own — the
        // toggles write through the builder's own where clauses.
        if ($award->is_equipped) {
            UserBadge::query()
                ->where('user_id', $request->user()->id)
                ->where('badge_id', $badge->id)
                ->update(['is_equipped' => false]);

            return redirect()->back();
        }

        $equippedCount = UserBadge::query()
            ->where('user_id', $request->user()->id)
            ->where('is_equipped', true)
            ->count();

        if ($equippedCount >= 3) {
            return back()->withErrors(['badge' => 'You can display a maximum of 3 badges. Remove one first.']);
        }

        UserBadge::query()
            ->where('user_id', $request->user()->id)
            ->where('badge_id', $badge->id)
            ->update(['is_equipped' => true]);

        return redirect()->back();
    }
}
