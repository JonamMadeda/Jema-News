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
            className="group py-6 border-b border-gray-100 last:border-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-4 rounded-sm"
        >
            <div className="flex gap-4 md:gap-5">
                {showImage && (
                    <div className="shrink-0">
                        <img
                            src={item.imageUrl}
                            alt=""
                            loading="lazy"
                            onError={() => setImgHidden(true)}
                            className="w-24 h-20 md:w-40 md:h-28 object-cover rounded-md bg-gray-100"
                        />
                    </div>
                )}
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs font-bold uppercase tracking-wider text-gray-500">
                        <span className="px-2 py-0.5 bg-[#001f3f] text-white rounded-full text-[11px] font-black tracking-widest">
                            {item.category}
                        </span>
                        <span className="text-gray-900 font-black">{item.source}</span>
                        <span aria-hidden="true" className="text-gray-300">•</span>
                        <time className="text-gray-500">{timeAgo(item.pubDate)}</time>
                    </div>

                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 group-hover:text-[#001f3f] group-hover:underline decoration-2 underline-offset-4 transition-colors leading-tight">
                        {item.title}
                    </h3>

                    <p className="text-gray-600 text-sm md:text-base leading-relaxed line-clamp-2 max-w-2xl">
                        {item.contentSnippet}
                    </p>

                    <div className="mt-2">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#001f3f] flex items-center gap-2">
                            Read Summary
                            <svg
                                className="w-3.5 h-3.5 transform transition-transform group-hover:translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </span>
                    </div>
                </div>
            </div>
        </article>
    );
}
