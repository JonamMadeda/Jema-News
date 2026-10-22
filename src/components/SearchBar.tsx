'use client';

type SearchBarProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="relative mb-3">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>
            <input
                id="news-search"
                type="text"
                placeholder="Search Kenya headlines, leaders, topics…"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Search news"
                autoComplete="off"
                className="w-full bg-white border border-slate-200/90 py-2.5 pl-10 pr-16 focus:outline-none focus:bg-white focus:border-slate-800 focus:ring-2 focus:ring-slate-900/10 text-[16px] md:text-sm text-slate-800 transition-all placeholder:text-slate-400 rounded-xl"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {!value && (
                    <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 justify-center rounded border border-slate-200 bg-white text-[10px] font-semibold text-slate-500 font-sans shadow-2xs">
                        /
                    </kbd>
                )}
                {value && (
                    <button
                        onClick={() => onChange('')}
                        aria-label="Clear search"
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors active:scale-95"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
