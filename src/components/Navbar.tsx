'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Public_Sans } from 'next/font/google';
import SubscribeButton from './SubscribeButton';
import { isAppTab, type Tab } from '@/lib/tabs';

const brand = Public_Sans({ subsets: ['latin'], weight: ['700', '800'] });

// Re-exported so both import paths resolve to the same function.
export { isAppTab } from '@/lib/tabs';

export const TAB_EVENT = 'jema:tab';
export const REFRESH_EVENT = 'jema:refresh';

export function getInitialTab(): Tab {
    if (typeof window === 'undefined') return 'ask';
    const t = new URLSearchParams(window.location.search).get('tab');
    return isAppTab(t) ? t : 'ask';
}

export function setAppTab(tab: Tab) {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url.toString());
    } catch {
        // ignore
    }
    window.dispatchEvent(new CustomEvent<Tab>(TAB_EVENT, { detail: tab }));
}

export default function Navbar() {
    // Locale/timezone dependent: server renders '', client renders the date.
    const [today] = useState(() =>
        typeof window === 'undefined'
            ? ''
            : new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())
    );
    const [isRefreshing, setIsRefreshing] = useState(false);

    function handleRefresh() {
        setIsRefreshing(true);
        window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
        setTimeout(() => setIsRefreshing(false), 800);
    }

    return (
        <header className="border-b border-slate-200/80 sticky top-0 bg-white/85 backdrop-blur-md z-40 transition-colors">
            <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 h-13 flex items-center justify-between gap-3">
                <Link
                    href="/"
                    className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-xl"
                >
                    <span className="w-8 h-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 rounded-xl flex items-center justify-center shrink-0 shadow-xs border border-slate-700/50">
                        <span className={`${brand.className} text-white font-black text-sm leading-none tracking-tight`}>
                            J
                        </span>
                    </span>
                    <div className="flex flex-col">
                        <span className={`${brand.className} text-base sm:text-lg font-black leading-tight tracking-tight text-slate-900`}>
                            Jemanews
                        </span>
                    </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                    <span
                        suppressHydrationWarning
                        className="hidden md:inline-block text-xs font-medium text-slate-500 whitespace-nowrap"
                    >
                        {today}
                    </span>
                    <span className="hidden md:inline-block w-px h-3.5 bg-slate-200" />
                    
                    <SubscribeButton />

                    <button
                        onClick={handleRefresh}
                        aria-label="Refresh news"
                        title="Refresh feeds (double-click to full reload)"
                        onDoubleClick={() => window.location.reload()}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform duration-700 ${isRefreshing ? 'rotate-180 text-slate-900' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0114-3M19 15a8 8 0 01-14 3"
                            />
                        </svg>
                    </button>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[11px] font-semibold tracking-wide uppercase">Kenya</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
