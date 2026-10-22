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

function getCategoryColor(category: string): string {
    switch (category?.toLowerCase()) {
        case 'politics':
            return 'bg-purple-50 text-purple-700 border-purple-200/60';
        case 'business':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
        case 'health':
            return 'bg-rose-50 text-rose-700 border-rose-200/60';
        case 'education':
            return 'bg-amber-50 text-amber-700 border-amber-200/60';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200/60';
    }
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
            className="group py-4 px-3 -mx-3 border-b border-slate-100 last:border-0 rounded-xl cursor-pointer hover:bg-white active:bg-slate-100/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
            <div className="flex flex-col gap-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${getCategoryColor(item.category)}`}>
                        {item.category}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">
                        {item.source}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">•</span>
                    <time className="text-slate-500 font-medium whitespace-nowrap">
                        {timeAgo(item.pubDate)}
                    </time>
                    
                    {onToggleSave && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSave();
                            }}
                            aria-label={saved ? 'Remove bookmark' : 'Bookmark this story'}
                            aria-pressed={saved}
                            title={saved ? 'Saved' : 'Save'}
                            className={`ml-auto w-8 h-8 rounded-lg flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                                saved
                                    ? 'text-blue-600 bg-blue-50/90'
                                    : 'text-slate-300 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                    )}
                </div>

                <h3 className="text-[16px] md:text-[17px] font-bold text-slate-900 group-hover:text-blue-700 leading-snug transition-colors">
                    {item.title}
                    <span
                        aria-hidden="true"
                        className="inline-block ml-1.5 text-blue-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all font-normal"
                    >
                        →
                    </span>
                </h3>

                <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                    {item.contentSnippet}
                </p>
            </div>
        </article>
    );
}
