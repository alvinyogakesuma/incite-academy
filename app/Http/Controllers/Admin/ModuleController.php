<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Module;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ModuleController extends Controller
{
    /**
     * Create a blank module appended to the course's outline —
     * the editor's Add Module button. Stats recalculation is
     * deliberately left out; the denormalized counters are
     * refreshed by a later phase of the rebuild.
     */
    public function store(Request $request, Course $course): RedirectResponse
    {
        Gate::authorize('update', $course);

        Module::create([
            'course_id' => $course->id,
            'title' => 'Untitled Module',
            'order_index' => (int) (Module::where('course_id', $course->id)->max('order_index') ?? -1) + 1,
        ]);

        return redirect()->route('dashboard.courses.edit', $course);
    }

    /**
     * Rename the module — the outline's inline title editor.
     */
    public function rename(Request $request, Module $module): RedirectResponse
    {
        Gate::authorize('update', $module->course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $module->update($validated);

        return redirect()->route('dashboard.courses.edit', $module->course);
    }

    /**
     * Remove the module — its lessons cascade via the foreign key.
     */
    public function destroy(Module $module): RedirectResponse
    {
        Gate::authorize('update', $module->course);

        $course = $module->course;

        $module->delete();

        return redirect()->route('dashboard.courses.edit', $course);
    }

    /**
     * Rewrite the course's module order — the outline's drag
     * handle. The payload must cover every module exactly once; a
     * foreign or partial list never reorders another course's
     * rows.
     */
    public function reorder(Request $request, Course $course): RedirectResponse
    {
        Gate::authorize('update', $course);

        $validated = $request->validate([
            'module_order' => ['required', 'array', 'min:1'],
            'module_order.*' => ['required', 'integer'],
        ]);

        $requestedIds = collect($validated['module_order'])->map(fn ($id) => (int) $id)->all();

        $courseModuleIds = $course->modules()->orderBy('id')->pluck('id')->all();

        if (collect($requestedIds)->sort()->values()->all() !== $courseModuleIds) {
            throw ValidationException::withMessages([
                'module_order' => 'The module order must cover every module exactly once.',
            ]);
        }

        DB::transaction(function () use ($course, $requestedIds): void {
            $modules = $course->modules()->get()->keyBy('id');

            // Park every row above the current maximum first — the
            // (course_id, order_index) unique constraint must never
            // see a duplicate during the shuffle.
            $parkAbove = (int) ($course->modules()->max('order_index') ?? -1) + 1;

            foreach ($requestedIds as $index => $moduleId) {
                $modules[$moduleId]->update(['order_index' => $parkAbove + $index]);
            }

            foreach ($requestedIds as $index => $moduleId) {
                $modules[$moduleId]->update(['order_index' => $index]);
            }
        });

        return redirect()->route('dashboard.courses.edit', $course);
    }
}
