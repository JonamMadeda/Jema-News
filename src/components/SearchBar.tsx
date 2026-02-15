'use client';

type SearchBarProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="relative mb-8">
            <input
                type="text"
                placeholder="Search headlines, events or topics..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white border-b-2 border-gray-100 py-4 pr-10 focus:outline-none focus:border-[#001f3f] text-base md:text-xl font-medium transition-colors placeholder:text-gray-300"
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                    className="w-5 h-5 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>
        </div>
    );
}
