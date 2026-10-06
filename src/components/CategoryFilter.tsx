'use client';

const CATEGORIES = ['All', 'Politics', 'Business', 'Education', 'Health', 'General'];

type CategoryFilterProps = {
    activeCategory: string;
    onCategoryChange: (category: string) => void;
    counts?: Record<string, number>;
};

export default function CategoryFilter({ activeCategory, onCategoryChange, counts }: CategoryFilterProps) {
    return (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Filter by category">
            {CATEGORIES.map((category) => {
                const count = counts?.[category];
                const isActive = activeCategory === category;
                return (
                    <button
                        key={category}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onCategoryChange(category)}
                        className={`shrink-0 whitespace-nowrap min-h-[32px] px-3 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2 ${isActive
                            ? 'bg-[#001f3f] text-white shadow-md shadow-blue-900/20'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                    >
                        {category}
                        {typeof count === 'number' && (
                            <span className={`ml-1.5 text-[10px] font-semibold ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
