import { NewsItem } from '@/lib/rss';

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
            className="group py-4 md:py-5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50/70 active:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2 rounded-md px-1 -mx-1"
        >
            <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    <span className="px-2 py-px border border-gray-200 text-gray-600 rounded-md text-[10px] font-bold whitespace-nowrap bg-white">
                        {item.category}
                    </span>
                        <span className="text-gray-900 font-semibold truncate">{item.source}</span>
                        <span aria-hidden="true" className="text-gray-300">•</span>
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
                                className={`ml-auto w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] ${saved ? 'text-[#001f3f]' : 'text-gray-300 hover:text-[#001f3f]'}`}
                            >
                                <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                            </button>
                        )}
                </div>

                <h3 className="text-[16px] md:text-[17px] font-bold text-gray-900 group-hover:text-[#001f3f] leading-snug">
                    {item.title}
                    <span aria-hidden="true" className="inline-block ml-1.5 text-[#001f3f] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">→</span>
                </h3>

                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                    {item.contentSnippet}
                </p>
            </div>
        </article>
    );
}
