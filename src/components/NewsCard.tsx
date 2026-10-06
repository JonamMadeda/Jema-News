import { useState } from 'react';
import { NewsItem } from '@/lib/rss';

type NewsCardProps = {
    item: NewsItem;
    onSelect: (item: NewsItem) => void;
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

export default function NewsCard({ item, onSelect }: NewsCardProps) {
    const [imgHidden, setImgHidden] = useState(false);
    const showImage = item.imageUrl && !imgHidden;

    return (
        <article
            onClick={() => onSelect(item)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item);
                }
            }}
            tabIndex={0}
            className="group py-4 border-b border-gray-100 last:border-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2 rounded-md"
        >
            <div className="flex gap-3">
                {showImage && (
                    <div className="shrink-0">
                        <img
                            src={item.imageUrl}
                            alt=""
                            loading="lazy"
                            onError={() => setImgHidden(true)}
                            className="w-20 h-16 md:w-32 md:h-20 object-cover rounded-md bg-gray-100"
                        />
                    </div>
                )}
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        <span className="px-2 py-0.5 bg-[#001f3f] text-white rounded-full text-[10px] font-bold whitespace-nowrap">
                            {item.category}
                        </span>
                        <span className="text-gray-900 font-bold truncate">{item.source}</span>
                        <span aria-hidden="true" className="text-gray-300">•</span>
                        <time className="whitespace-nowrap">{timeAgo(item.pubDate)}</time>
                    </div>

                    <h3 className="text-[15px] md:text-base font-semibold text-gray-900 group-hover:text-[#001f3f] leading-snug">
                        {item.title}
                    </h3>

                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                        {item.contentSnippet}
                    </p>
                </div>
            </div>
        </article>
    );
}
