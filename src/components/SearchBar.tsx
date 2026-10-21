'use client';

type SearchBarProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="relative mb-3">
            <input
                id="news-search"
                type="text"
                placeholder="Search headlines…"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Search news"
                autoComplete="off"
                className="w-full bg-white border-b border-gray-200 py-2.5 pr-20 focus:outline-none focus:border-[#001f3f] text-sm transition-colors placeholder:text-gray-400 rounded-t-md"
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {!value && (
                    <kbd className="hidden sm:inline-flex items-center h-5 min-w-[20px] px-1 justify-center rounded border border-gray-300 bg-gray-50 text-[10px] font-semibold text-gray-500 font-sans">
                        /
                    </kbd>
                )}
                {value ? (
                    <button
                        onClick={() => onChange('')}
                        aria-label="Clear search"
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 rounded-md transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                ) : (
                    <div className="w-8 h-8 flex items-center justify-center pointer-events-none">
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
        </div>
    );
}
