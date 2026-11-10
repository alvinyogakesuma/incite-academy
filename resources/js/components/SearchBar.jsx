import { Search, RotateCcw } from 'lucide-react';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';

export default function SearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    className = '',
    filters = [],
    showReset = false,
    onReset,
}) {
    return (
        <div
            className={`rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm md:p-6 ${className}`}
        >
            <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
                {/* ========== SEARCH INPUT ========== */}
                <div className="flex-1">
                    <TextField
                        inForm={false}
                        name="search"
                        type="text"
                        icon={Search}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        autoComplete="nope"
                    />
                </div>

                {/* ========== FILTER DROPDOWNS + RESET ========== */}
                {(filters.length > 0 || showReset) && (
                    <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                        {filters.map((filter) => (
                            <div
                                key={filter.name}
                                className="flex items-center gap-1.5"
                            >
                                {filter.label && (
                                    <span className="font-inter text-body-sm hidden inline font-semibold text-neutral-500">
                                        {filter.label}
                                    </span>
                                )}
                                <SelectField
                                    inForm={false}
                                    name={filter.name}
                                    value={filter.value}
                                    onValueChange={filter.onChange}
                                    options={filter.options}
                                    placeholder={filter.placeholder}
                                />
                            </div>
                        ))}

                        {showReset && onReset && (
                            <button
                                type="button"
                                onClick={onReset}
                                title="Reset Filters"
                                aria-label="Reset Filters"
                                className="border-primary-700/5 bg-primary-50 text-primary-700 hover:bg-primary-50/80 flex size-[42px] shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-200 hover:rotate-12"
                            >
                                <RotateCcw className="size-4 shrink-0" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
