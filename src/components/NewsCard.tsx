import type { NewsItem } from '@/lib/types';

type NewsCardProps = {
    item: NewsItem;
    onSelect: (item: NewsItem) => void;
    saved?: boolean;
    onToggleSave?: () => void;
};

function timeAgo(pubDate: string): string {
    const diff = Date.now() - new Date(pubDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(pubDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export default function NewsCard({ item, onSelect, saved = false, onToggleSave }: NewsCardProps) {
    return (
        <article
            onClick={() => onSelect(item)}
            onKeyDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item);
                }
            }}
            tabIndex={0}
            className="group py-3.5 px-2 -mx-2 rounded-xl cursor-pointer hover:bg-white active:bg-slate-100/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
            <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <span className="font-semibold text-slate-700 truncate">{item.source}</span>
                    <span aria-hidden="true" className="text-slate-300">•</span>
                    <span className="truncate">{item.category}</span>
                    <span aria-hidden="true" className="text-slate-300">•</span>
                    <time className="whitespace-nowrap">{timeAgo(item.pubDate)}</time>

                    {onToggleSave && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSave();
                            }}
                            aria-label={saved ? 'Remove bookmark' : 'Bookmark this story'}
                            aria-pressed={saved}
                            title={saved ? 'Saved' : 'Save'}
                            className={`ml-auto w-8 h-8 -mr-1 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                                saved
                                    ? 'text-slate-900'
                                    : 'text-slate-300 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                    )}
                </div>

                <h3 className="mt-1 text-[15px] sm:text-base font-semibold text-slate-900 group-hover:text-blue-700 leading-snug transition-colors">
                    {item.title}
                </h3>
            </div>
        </article>
    );
}
