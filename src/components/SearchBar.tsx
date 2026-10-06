'use client';

type SearchBarProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="relative mb-4">
            <input
                type="text"
                placeholder="Search headlines, events or topics..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Search news"
                className="w-full bg-white border-b-2 border-gray-200 py-4 pr-10 focus:outline-none focus:border-[#001f3f] focus-visible:ring-2 focus-visible:ring-[#001f3f]/20 focus-visible:ring-offset-2 rounded-t-sm text-base md:text-lg font-medium transition-colors placeholder:text-gray-400"
            />
            {value ? (
                <button
                    onClick={() => onChange('')}
                    aria-label="Clear search"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] rounded-full transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            ) : (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none pr-1">
                    <svg
                        className="w-5 h-5 text-gray-400"
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
