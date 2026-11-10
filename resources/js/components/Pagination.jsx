import { ChevronLeft, ChevronRight } from 'lucide-react';
import SelectField from '@/components/SelectField';

export default function Pagination({
    currentPage,
    totalPages = 1,
    pageSize,
    totalRecords,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [5, 10, 20],
}) {
    return (
        <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-neutral-950/5 bg-white p-5 shadow-sm select-none sm:flex-row sm:items-center sm:justify-between md:px-6 md:py-4">
            {/* Showing entry counter */}
            <div className="font-inter flex items-center gap-2 text-[12px] text-neutral-500">
                <span>Showing</span>
                <SelectField
                    inForm={false}
                    name="page-size"
                    value={String(pageSize)}
                    onValueChange={(value) => onPageSizeChange(parseInt(value))}
                    options={pageSizeOptions.map(String)}
                    className="w-[68px]"
                />
                <span>
                    of <strong>{totalRecords.toLocaleString()}</strong> records
                </span>
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-1.5 self-center">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="hover:bg-primary-50 shrink-0 cursor-pointer rounded-xl border border-neutral-950/5 p-2 text-neutral-500 transition-all disabled:pointer-events-none disabled:opacity-30"
                    title="Previous Page"
                >
                    <ChevronLeft className="size-4" />
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    if (
                        totalPages > 5 &&
                        Math.abs(currentPage - pageNum) > 1 &&
                        pageNum !== 1 &&
                        pageNum !== totalPages
                    ) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                            return (
                                <span
                                    key={pageNum}
                                    className="px-1 font-mono text-xs text-neutral-500/40 select-none"
                                >
                                    ...
                                </span>
                            );
                        }
                        return null;
                    }

                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={`font-inter flex size-8 cursor-pointer items-center justify-center rounded-xl text-[12px] font-bold transition-all duration-200 ${
                                currentPage === pageNum
                                    ? 'bg-primary-700 shadow-primary-700/20 text-white shadow-sm'
                                    : 'hover:bg-primary-50 border border-transparent text-neutral-500 hover:border-neutral-950/5'
                            }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}

                <button
                    onClick={() =>
                        onPageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="hover:bg-primary-50 shrink-0 cursor-pointer rounded-xl border border-neutral-950/5 p-2 text-neutral-500 transition-all disabled:pointer-events-none disabled:opacity-30"
                    title="Next Page"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>
        </div>
    );
}
