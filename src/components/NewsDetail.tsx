import { NewsItem } from '@/lib/rss';

type NewsDetailProps = {
    item: NewsItem;
    onBack: () => void;
};

export default function NewsDetail({ item, onBack }: NewsDetailProps) {
    const formattedDate = new Date(item.pubDate).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={onBack}
                className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#001f3f] transition-colors group"
            >
                <svg className="w-3 h-3 transform transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to News
            </button>

            <article className="max-w-3xl">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#001f3f] mb-6">
                    <span className="px-2 py-1 bg-[#001f3f] text-white rounded-sm">{item.category}</span>
                    <span className="text-gray-300">•</span>
                    <span>{item.source}</span>
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-[1.1] tracking-tighter mb-8">
                    {item.title}
                </h2>

                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-12 pb-8 border-b border-gray-100">
                    <span>Published on {formattedDate}</span>
                </div>

                <div className="prose prose-slate max-w-none">
                    <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-12 italic">
                        {item.contentSnippet}
                    </p>

                    <div className="p-8 bg-gray-50 rounded-sm border-l-4 border-[#001f3f] mb-12">
                        <p className="text-sm text-gray-500 leading-relaxed">
                            This is a summary of the news story. To read the complete, in-depth report including all media and related coverage, please visit the original source.
                        </p>
                    </div>
                </div>

                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 w-full md:w-auto px-10 py-5 bg-[#001f3f] text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-[#003366] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-900/10"
                >
                    Read Original Full Story
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </article>
        </div>
    );
}
