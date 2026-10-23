'use client';

import { type Tab } from '@/lib/tabs';
import TabIcon from './TabIcon';

const ITEMS: { id: Tab; label: string }[] = [
    { id: 'ask', label: 'Ask' },
    { id: 'brief', label: 'Brief' },
    { id: 'latest', label: 'Latest' },
    { id: 'trending', label: 'Trending' },
    { id: 'saved', label: 'Saved' },
];

export default function BottomNav({
    activeTab,
    onChange,
}: {
    activeTab: Tab;
    onChange: (tab: Tab) => void;
}) {
    return (
        <nav
            aria-label="Primary"
            className="md:hidden shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        >
            <ul className="grid grid-cols-5">
                {ITEMS.map((item) => {
                    const active = activeTab === item.id;
                    return (
                        <li key={item.id}>
                            <button
                                type="button"
                                onClick={() => onChange(item.id)}
                                aria-current={active ? 'page' : undefined}
                                className={`w-full min-h-14 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition-colors active:scale-95 ${
                                    active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <span
                                    className={`flex items-center justify-center w-9 h-6 rounded-lg transition-colors ${
                                        active ? 'bg-slate-900 text-white' : ''
                                    }`}
                                >
                                    <TabIcon tab={item.id} className="w-[18px] h-[18px]" />
                                </span>
                                <span>{item.label}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
