'use client';

import { useEffect, useState } from 'react';
import { Public_Sans } from 'next/font/google';

const brand = Public_Sans({ subsets: ['latin'], weight: ['700', '800'] });

type Tab = 'latest' | 'brief';

export const TAB_EVENT = 'jema:tab';
export const REFRESH_EVENT = 'jema:refresh';

export function getInitialTab(): Tab {
    if (typeof window === 'undefined') return 'brief';
    return new URLSearchParams(window.location.search).get('tab') === 'latest' ? 'latest' : 'brief';
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
    const [today, setToday] = useState('');

    useEffect(() => {
        setToday(
            new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())
        );
    }, []);

    function handleRefresh() {
        window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
    }

    return (
        <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
            <div className="mx-auto w-full max-w-6xl px-4 h-12 flex items-center justify-between gap-3">
                <a href="/" className="flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] rounded-md">
                    <span className="w-7 h-7 bg-[#001f3f] rounded-md flex items-center justify-center shrink-0">
                        <span className={`${brand.className} text-white font-bold text-[14px] leading-none tracking-tight`}>J</span>
                    </span>
                    <span className={`${brand.className} text-[16px] min-[400px]:text-[18px] font-bold leading-none tracking-tight text-[#001f3f] whitespace-nowrap`}>
                        Jemanews
                    </span>
                </a>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden md:block text-[11px] font-semibold text-gray-600 whitespace-nowrap">{today}</span>
                    <span className="hidden md:block w-px h-4 bg-gray-200"></span>
                    <button
                        onClick={handleRefresh}
                        aria-label="Refresh news"
                        title="Refresh (soft, keeps filters)"
                        onDoubleClick={() => window.location.reload()}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-[#001f3f] hover:bg-gray-100 rounded-md transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0114-3M19 15a8 8 0 01-14 3" />
                        </svg>
                    </button>
                    <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-1 bg-gray-100 text-gray-600 rounded-md whitespace-nowrap">
                        Kenya
                    </span>
                </div>
            </div>
        </header>
    );
}
