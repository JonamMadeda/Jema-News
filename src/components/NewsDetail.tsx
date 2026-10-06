'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { NewsItem } from '@/lib/rss';

type NewsDetailProps = {
    item: NewsItem;
    onBack: () => void;
};

export default function NewsDetail({ item, onBack }: NewsDetailProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [summarizing, setSummarizing] = useState(false);
    const [sumError, setSumError] = useState<string | null>(null);

    const formattedDate = new Date(item.pubDate).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    async function handleSummarize() {
        setSummarizing(true);
        setSumError(null);
        try {
            const res = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: item.title,
                    snippet: item.contentSnippet,
                    source: item.source,
                    category: item.category,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Failed to summarize');
            setSummary(json.summary);
        } catch (err) {
            setSumError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setSummarizing(false);
        }
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={onBack}
                className="mb-6 min-h-[44px] flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-500 hover:text-[#001f3f] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] rounded-full px-2 -ml-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to News
            </button>

            <article className="max-w-3xl">
                {item.imageUrl && (
                    <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        className="w-full aspect-video object-cover rounded-lg bg-gray-100 mb-8"
                    />
                )}

                <div className="flex items-center gap-2 flex-wrap text-xs font-bold uppercase tracking-wider mb-5">
                    <span className="px-3 py-1 bg-[#001f3f] text-white rounded-full">{item.category}</span>
                    <span className="text-gray-900">{item.source}</span>
                    <span className="text-gray-300" aria-hidden="true">•</span>
                    <span className="text-gray-500">{formattedDate}</span>
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-[1.1] tracking-tighter mb-6">
                    {item.title}
                </h2>

                <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8">
                    {item.contentSnippet}
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#001f3f]">
                            AI Summary
                        </h3>
                        {!summary && (
                            <button
                                onClick={handleSummarize}
                                disabled={summarizing}
                                className="min-h-[44px] text-xs font-black uppercase tracking-widest px-5 py-2.5 bg-[#001f3f] text-white rounded-full hover:bg-[#003366] disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                            >
                                {summarizing ? 'Summarizing…' : 'Summarize with AI'}
                            </button>
                        )}
                    </div>
                    {summary ? (
                        <div className="text-[15px] leading-relaxed text-gray-700">
                            <ReactMarkdown
                                components={{
                                    ul: (p) => <ul className="space-y-2" {...p} />,
                                    li: (p) => <li className="flex gap-2" {...p} />,
                                    p: (p) => <p className="mb-2" {...p} />,
                                    strong: (p) => <strong className="text-gray-900" {...p} />,
                                }}
                            >
                                {summary}
                            </ReactMarkdown>
                        </div>
                    ) : sumError ? (
                        <p className="text-sm text-red-600">{sumError}</p>
                    ) : (
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Get a 3-bullet AI summary of this story. Full details at the original source.
                        </p>
                    )}
                </div>

                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 w-full md:w-auto min-h-[52px] px-10 py-4 bg-[#001f3f] text-white text-xs font-black uppercase tracking-[0.25em] hover:bg-[#003366] transition-all rounded-full shadow-xl shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                >
                    Read Original Full Story
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </article>
        </div>
    );
}
