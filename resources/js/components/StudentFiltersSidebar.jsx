import { useState } from 'react';
import { Checkbox, Dialog } from 'radix-ui';
import { Check, Search, SlidersHorizontal, X } from 'lucide-react';
import SelectField from '@/components/SelectField';
import TextField from '@/components/TextField';

const PROGRESS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
];

function FilterContent({
    searchLabel,
    searchQuery,
    onSearchChange,
    sortOptions,
    sortBy,
    onSortChange,
    filterGroups,
    progressFilter,
    onProgressChange,
}) {
    return (
        <div className="flex flex-col gap-6">
            {/* Search */}
            <div className="flex flex-col gap-2">
                <label
                    htmlFor="student-filters-search"
                    className="font-inter text-body-sm font-semibold text-neutral-950/80"
                >
                    {searchLabel}
                </label>
                <TextField
                    inForm={false}
                    name="student-filters-search"
                    icon={Search}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search by title, desc..."
                />
            </div>

            {/* Sort By */}
            <div className="flex flex-col gap-2">
                <label
                    htmlFor="student-filters-sort"
                    className="font-inter text-body-sm font-semibold text-neutral-950/80"
                >
                    Sort By
                </label>
                <SelectField
                    inForm={false}
                    name="student-filters-sort"
                    value={sortBy}
                    onValueChange={onSortChange}
                    options={sortOptions}
                    placeholder="Sort by"
                />
            </div>

            {/* Filter groups — each a titled checkbox list */}
            {filterGroups.map((group) => (
                <div key={group.title} className="flex flex-col gap-2.5">
                    <label className="font-inter text-body-sm font-semibold text-neutral-950/80">
                        {group.title}
                    </label>
                    <div className="flex flex-col gap-2">
                        {group.options.map((option) => {
                            const checked = group.selected.includes(option);

                            return (
                                <label
                                    key={option}
                                    className="group flex cursor-pointer items-center gap-2.5"
                                >
                                    <Checkbox.Root
                                        checked={checked}
                                        onCheckedChange={() =>
                                            group.onToggle(option)
                                        }
                                        className={`flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-all duration-200 outline-none ${
                                            checked
                                                ? 'border-primary-700 bg-primary-700 shadow-primary-700/10 shadow-sm'
                                                : 'border-neutral-950/10 bg-neutral-50 hover:border-neutral-950/20 hover:bg-neutral-100'
                                        }`}
                                    >
                                        <Checkbox.Indicator>
                                            <Check
                                                className="size-3 text-white"
                                                strokeWidth={3}
                                            />
                                        </Checkbox.Indicator>
                                    </Checkbox.Root>
                                    <span className="font-inter text-body-sm text-neutral-500 transition-colors duration-200 group-hover:text-neutral-950">
                                        {option}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Progress — only the pages carrying a progress filter
                pass one */}
            {progressFilter !== undefined && (
                <div className="flex flex-col gap-2.5">
                    <label className="font-inter text-body-sm font-semibold text-neutral-950/80">
                        Progress
                    </label>
                    <div className="flex flex-col gap-2">
                        {PROGRESS_OPTIONS.map((opt) => {
                            const checked = progressFilter === opt.value;

                            return (
                                <label
                                    key={opt.value}
                                    className="group flex cursor-pointer items-center gap-2.5"
                                >
                                    <Checkbox.Root
                                        checked={checked}
                                        onCheckedChange={() =>
                                            onProgressChange(opt.value)
                                        }
                                        className={`flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-all duration-200 outline-none ${
                                            checked
                                                ? 'border-primary-700 bg-primary-700 shadow-primary-700/10 shadow-sm'
                                                : 'border-neutral-950/10 bg-neutral-50 hover:border-neutral-950/20 hover:bg-neutral-100'
                                        }`}
                                    >
                                        <Checkbox.Indicator>
                                            <Check
                                                className="size-3 text-white"
                                                strokeWidth={3}
                                            />
                                        </Checkbox.Indicator>
                                    </Checkbox.Root>
                                    <span className="font-inter text-body-sm text-neutral-500 transition-colors duration-200 group-hover:text-neutral-950">
                                        {opt.label}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Student listing filters — a desktop sidebar plus a mobile
 * slide-in dialog over the same filter content: the search field,
 * the sort select, the titled checkbox groups (categories,
 * levels), and the optional progress block. Shared by the course
 * catalog, the challenges, and the learning paths. Ported from
 * the deprecated app's CourseFilters on the current design
 * tokens.
 */
export default function StudentFiltersSidebar(props) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden w-[239px] shrink-0 self-start rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm lg:block">
                <div className="mb-6 flex items-center justify-between border-b border-neutral-950/5 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="border-primary-700/5 bg-primary-50 text-primary-700 rounded-lg border p-2">
                            <SlidersHorizontal className="size-4" />
                        </div>
                        <h3 className="font-poppins text-body-sm font-bold text-neutral-950">
                            Filters
                        </h3>
                    </div>
                </div>
                <FilterContent {...props} />
            </aside>

            {/* Mobile Filter Toggle + Dialog */}
            <div className="lg:hidden">
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="font-inter text-body-sm hover:border-primary-700/10 hover:bg-primary-50 hover:text-primary-700 flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-950/5 bg-white px-4 py-2.5 font-bold text-neutral-950 shadow-sm transition-all duration-200 active:scale-95"
                >
                    <SlidersHorizontal className="size-4 text-neutral-500" />
                    <span>Filters</span>
                </button>

                <Dialog.Root open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="animate-in fade-in fixed inset-0 z-50 bg-black/40 backdrop-blur-sm duration-200" />
                        <Dialog.Content className="animate-in slide-in-from-left fixed top-0 bottom-0 left-0 z-50 w-[280px] overflow-y-auto bg-white shadow-2xl duration-300 focus:outline-none">
                            <div className="flex items-center justify-between border-b border-neutral-950/5 p-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-primary-50 text-primary-700 rounded-lg p-2">
                                        <SlidersHorizontal className="size-4" />
                                    </div>
                                    <Dialog.Title className="font-poppins text-body-sm font-bold text-neutral-950">
                                        Filters
                                    </Dialog.Title>
                                </div>
                                <Dialog.Close asChild>
                                    <button className="hover:bg-primary-50 hover:text-primary-700 cursor-pointer rounded-lg p-1.5 text-neutral-500 transition-all outline-none">
                                        <X className="size-4" />
                                    </button>
                                </Dialog.Close>
                            </div>
                            <div className="p-5">
                                <FilterContent {...props} />
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>
        </>
    );
}
