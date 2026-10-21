'use client';

import { useState } from 'react';
import { Public_Sans } from 'next/font/google';
import SubscribeButton from './SubscribeButton';
import { type Tab } from '@/lib/tabs';
import { REFRESH_EVENT } from './Navbar';

const brand = Public_Sans({ subsets: ['latin'], weight: ['700', '800'] });

const TABS: { id: Tab; label: string }[] = [
    { id: 'ask', label: 'Ask AI' },
    { id: 'brief', label: 'Daily Brief' },
    { id: 'latest', label: 'Latest News' },
    { id: 'trending', label: 'Trending' },
    { id: 'saved', label: 'Saved Stories' },
];

function TabIcon({ tab }: { tab: Tab }) {
    const props = {
        className: 'w-4 h-4 shrink-0',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
    };
    switch (tab) {
        case 'ask':
            return (
                <svg {...props}>
                    <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-4 3v-5.7A8.5 8.5 0 1 1 21 11.5Z" />
                    <path d="M8.5 10.5h7M8.5 14h4.5" />
                </svg>
            );
        case 'brief':
            return (
                <svg {...props}>
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M8 9h8M8 13h8M8 17h4" />
                </svg>
            );
        case 'latest':
            return (
                <svg {...props}>
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7.5V12l3 1.8" />
                </svg>
            );
        case 'trending':
            return (
                <svg {...props}>
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M15 7h6v6" />
                </svg>
            );
        case 'saved':
            return (
                <svg {...props}>
                    <path d="M6 4h12v17l-6-4-6 4V4Z" />
                </svg>
            );
    }
}

type SidebarProps = {
    activeTab: Tab;
    onSelectTab: (tab: Tab) => void;
    mobileOpen: boolean;
    onCloseMobile: () => void;
};

export default function Sidebar({
    activeTab,
    onSelectTab,
    mobileOpen,
    onCloseMobile,
}: SidebarProps) {
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

    const content = (
        <div className="flex flex-col h-full bg-white select-none">
            {/* Sidebar Brand Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
                        <span className={`${brand.className} text-white font-black text-sm leading-none`}>
                            J
                        </span>
                    </span>
                    <div className="min-w-0">
                        <span className={`${brand.className} block text-base font-bold leading-tight text-slate-900 truncate`}>
                            Jemanews
                        </span>
                        <span className="block text-[11px] font-medium text-slate-400 truncate">
                            News Intelligence
                        </span>
                    </div>
                </div>

                {/* Mobile close button */}
                <button
                    onClick={onCloseMobile}
                    aria-label="Close menu"
                    className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Navigation Tab Links */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Menu
                </p>
                {TABS.map((t) => {
                    const active = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => {
                                onSelectTab(t.id);
                                onCloseMobile();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                                active
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <TabIcon tab={t.id} />
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Sidebar Footer Controls */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between px-2 text-xs text-slate-500">
                    <span suppressHydrationWarning className="font-medium">
                        {today}
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Kenya</span>
                    </div>
                </div>

                <div className="flex items-center justify-between px-1 pt-1">
                    <div className="flex items-center gap-1">
                        <SubscribeButton />
                        <button
                            onClick={handleRefresh}
                            aria-label="Refresh news feeds"
                            title="Refresh news"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-all active:scale-95"
                        >
                            <svg
                                className={`w-4 h-4 transition-transform duration-700 ${isRefreshing ? 'rotate-180 text-slate-900' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0114-3M19 15a8 8 0 01-14 3" />
                            </svg>
                        </button>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium">
                        Live Feeds
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop persistent sidebar */}
            <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 h-dvh border-r border-slate-200/80 sticky top-0 bg-white z-20">
                {content}
            </aside>

            {/* Mobile drawer overlay */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div
                        onClick={onCloseMobile}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                        aria-hidden="true"
                    />
                    <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
                        {content}
                    </div>
                </div>
            )}
        </>
    );
}
