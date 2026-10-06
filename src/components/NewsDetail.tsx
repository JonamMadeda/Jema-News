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
        month: 'short',
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
                className="mb-4 min-h-[36px] flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 hover:text-[#001f3f] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] rounded-full px-2 -ml-2"
            >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
            </button>

            <article className="max-w-2xl">
                {item.imageUrl && (
                    <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        className="w-full aspect-video object-cover rounded-lg bg-gray-100 mb-5"
                    />
                )}

                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold uppercase tracking-wide mb-3">
                    <span className="px-2.5 py-0.5 bg-[#001f3f] text-white rounded-full whitespace-nowrap">{item.category}</span>
                    <span className="text-gray-900 truncate">{item.source}</span>
                    <span className="text-gray-300" aria-hidden="true">•</span>
                    <span className="text-gray-500 whitespace-nowrap">{formattedDate}</span>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
                    {item.title}
                </h2>

                <p className="text-[15px] md:text-base text-gray-600 leading-relaxed mb-6">
                    {item.contentSnippet}
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] whitespace-nowrap">
                            AI Summary
                        </h3>
                        {!summary && (
                            <button
                                onClick={handleSummarize}
                                disabled={summarizing}
                                className="min-h-[36px] text-[11px] font-bold uppercase tracking-wide px-4 py-1.5 bg-[#001f3f] text-white rounded-full hover:bg-[#003366] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                            >
                                {summarizing ? 'Working…' : 'Summarize'}
                            </button>
                        )}
                    </div>
                    {summary ? (
                        <div className="text-sm leading-relaxed text-gray-700">
                            <ReactMarkdown
                                components={{
                                    ul: (p) => <ul className="space-y-1.5" {...p} />,
                                    li: (p) => <li className="flex gap-2" {...p} />,
                                    p: (p) => <p className="mb-1.5" {...p} />,
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
                            Get a 3-bullet AI summary. Full details at the source.
                        </p>
                    )}
                </div>

                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full md:w-auto min-h-[44px] px-6 py-3 bg-[#001f3f] text-white text-[11px] font-bold uppercase tracking-wide hover:bg-[#003366] transition-all rounded-full whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                >
                    Read Original
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </article>
        </div>
    );
}
