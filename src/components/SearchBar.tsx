'use client';

type SearchBarProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="relative mb-2">
            <input
                id="news-search"
                type="text"
                placeholder="Search headlines…  ( / )"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Search news"
                autoComplete="off"
                className="w-full bg-white border-b border-gray-200 py-2.5 pr-9 focus:outline-none focus:border-[#001f3f] text-[15px] transition-colors placeholder:text-gray-400 rounded-t-md"
            />
            {value ? (
                <button
                    onClick={() => onChange('')}
                    aria-label="Clear search"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 rounded-md transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            ) : (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none pr-1">
                    <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
}
