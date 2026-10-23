'use client';

import { useState } from 'react';
import SubscribeButton from './SubscribeButton';
import TabIcon from './TabIcon';
import { type Tab } from '@/lib/tabs';
import { REFRESH_EVENT } from '@/lib/appEvents';

const TABS: { id: Tab; label: string }[] = [
    { id: 'ask', label: 'Ask AI' },
    { id: 'brief', label: 'Daily Brief' },
    { id: 'latest', label: 'Latest News' },
    { id: 'trending', label: 'Trending' },
    { id: 'saved', label: 'Saved Stories' },
];

type SidebarProps = {
    activeTab: Tab;
    onSelectTab: (tab: Tab) => void;
};

export default function Sidebar({ activeTab, onSelectTab }: SidebarProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    function handleRefresh() {
        setIsRefreshing(true);
        window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
        setTimeout(() => setIsRefreshing(false), 800);
    }

    return (
        <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 h-dvh sticky top-0 bg-slate-100 border-r border-slate-200/80 z-20">
            <div className="flex flex-col h-full select-none">
                {/* Brand */}
                <div className="p-4 border-b border-slate-200/70 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-white font-bold text-base leading-none">
                                J
                            </span>
                        </span>
                        <span className="block text-base font-bold leading-tight tracking-tight text-slate-900 truncate">
                            Jemanews
                        </span>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                        <SubscribeButton />
                        <button
                            type="button"
                            onClick={handleRefresh}
                            aria-label="Refresh news feeds"
                            title="Refresh news"
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/80 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25"
                        >
                            <svg
                                className={`w-4 h-4 transition-transform duration-700 ${isRefreshing ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0114-3M19 15a8 8 0 01-14 3" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav aria-label="Main navigation" className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
                    <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Menu
                    </p>
                    <div className="space-y-1">
                        {TABS.map((t) => {
                            const active = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => onSelectTab(t.id)}
                                    aria-current={active ? 'page' : undefined}
                                    className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25 ${
                                        active
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                                    }`}
                                >
                                    <TabIcon
                                        tab={t.id}
                                        className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                                            active ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'
                                        }`}
                                    />
                                    <span className="truncate">{t.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </aside>
    );
}
