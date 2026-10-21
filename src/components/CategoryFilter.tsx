'use client';

const CATEGORIES = ['All', 'Politics', 'Business', 'Education', 'Health', 'General'];

type CategoryFilterProps = {
    activeCategory: string;
    onCategoryChange: (category: string) => void;
    counts?: Record<string, number>;
};

export default function CategoryFilter({ activeCategory, onCategoryChange, counts }: CategoryFilterProps) {
    return (
        <div className="relative">
            <div
                className="flex items-center gap-1.5 overflow-x-auto py-1 -mx-1 px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Filter news by category"
            >
                {CATEGORIES.map((category) => {
                    const count = counts?.[category];
                    const isActive = activeCategory === category;
                    return (
                        <button
                            key={category}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onCategoryChange(category)}
                            className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                                isActive
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                            }`}
                        >
                            {category}
                            {typeof count === 'number' && (
                                <span
                                    className={`ml-1.5 text-[11px] font-medium ${
                                        isActive ? 'text-slate-300' : 'text-slate-400'
                                    }`}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            {/* Fades the right edge so users perceive the horizontal scroll */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden"
            />
        </div>
    );
}
