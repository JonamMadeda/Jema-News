'use client';

const CATEGORIES = ['All', 'Politics', 'Business', 'Education', 'Health', 'Sports', 'Entertainment'];

type CategoryFilterProps = {
    activeCategory: string;
    onCategoryChange: (category: string) => void;
};

export default function CategoryFilter({ activeCategory, onCategoryChange }: CategoryFilterProps) {
    return (
        <div className="flex items-center gap-6 overflow-x-auto pb-4 mb-4 scrollbar-hide no-scrollbar">
            {CATEGORIES.map((category) => (
                <button
                    key={category}
                    onClick={() => onCategoryChange(category)}
                    className={`
            text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all
            ${activeCategory === category
                            ? 'text-[#001f3f] border-b-2 border-[#001f3f] pb-1'
                            : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent pb-1'}
          `}
                >
                    {category}
                </button>
            ))}
        </div>
    );
}
