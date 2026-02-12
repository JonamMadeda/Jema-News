import { NewsItem } from '@/lib/rss';

type NewsCardProps = {
    item: NewsItem;
    onSelect: (item: NewsItem) => void;
};

export default function NewsCard({ item, onSelect }: NewsCardProps) {
    const formattedDate = new Date(item.pubDate).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <article className="group py-8 border-b border-gray-100 last:border-0">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span className="text-[#001f3f] font-black">{item.source}</span>
                    <span>•</span>
                    <span>{formattedDate}</span>
                </div>

                <h3
                    className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-[#001f3f] transition-colors leading-tight cursor-pointer"
                    onClick={() => onSelect(item)}
                >
                    {item.title}
                </h3>

                <p className="text-gray-500 text-sm md:text-base leading-relaxed line-clamp-2 max-w-2xl mt-1">
                    {item.contentSnippet}
                </p>

                <div className="mt-4">
                    <button
                        onClick={() => onSelect(item)}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-[#001f3f] hover:opacity-70 flex items-center gap-2 group/link"
                    >
                        Read Summary
                        <svg
                            className="w-3 h-3 transform transition-transform group-hover/link:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </article>
    );
}
