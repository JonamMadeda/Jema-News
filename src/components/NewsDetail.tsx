'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import LoadingMessage from './LoadingMessage';
import { NewsItem } from '@/lib/rss';

type NewsDetailProps = {
    item: NewsItem;
    onBack: () => void;
    saved?: boolean;
    onToggleSave?: () => void;
};

export default function NewsDetail({ item, onBack, saved = false, onToggleSave }: NewsDetailProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [summarizing, setSummarizing] = useState(false);
    const [sumError, setSumError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

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

    async function handleCopyLink() {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/story/${item.id}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    const storyUrl = typeof window !== 'undefined' ? `${window.location.origin}/story/${item.id}` : `/story/${item.id}`;
    const waHref = `https://wa.me/?text=${encodeURIComponent(item.title + ' — Jemanews ' + storyUrl)}`;
    const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(item.title + ' — Jemanews')}&url=${encodeURIComponent(storyUrl)}`;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-4 flex items-center justify-between gap-2">
                <button
                    onClick={onBack}
                    className="min-h-[32px] flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-600 hover:text-[#001f3f] transition-colors whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] rounded-md px-2 -ml-2"
                >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>
                <div className="flex items-center gap-1.5">
                    {onToggleSave && (
                        <button
                            onClick={onToggleSave}
                            aria-pressed={saved}
                            className={`min-h-[32px] inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-3 border rounded-md transition-colors whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] ${saved ? 'border-[#001f3f] text-[#001f3f] bg-gray-50' : 'border-gray-200 text-gray-600 hover:text-[#001f3f] hover:border-[#001f3f]'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            {saved ? 'Saved' : 'Save'}
                        </button>
                    )}
                    <button
                        onClick={handleCopyLink}
                        className="min-h-[32px] text-[11px] font-bold uppercase tracking-wide px-3 text-gray-600 hover:text-[#001f3f] border border-gray-200 hover:border-[#001f3f] rounded-md transition-colors whitespace-nowrap active:scale-[0.98]"
                    >
                        {copied ? 'Copied' : 'Copy link'}
                    </button>
                    <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[32px] inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-3 text-gray-600 hover:text-[#001f3f] border border-gray-200 hover:border-[#001f3f] rounded-md transition-colors whitespace-nowrap"
                    >
                        WhatsApp
                    </a>
                    <a
                        href={xHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[32px] hidden sm:inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-3 text-gray-600 hover:text-[#001f3f] border border-gray-200 hover:border-[#001f3f] rounded-md transition-colors whitespace-nowrap"
                    >
                        X
                    </a>
                </div>
            </div>

            <article className="max-w-2xl">
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold uppercase tracking-wide mb-3">
                    <span className="px-2.5 py-0.5 border border-gray-200 bg-white text-gray-600 rounded-md whitespace-nowrap">{item.category}</span>
                    <span className="text-gray-900 truncate">{item.source}</span>
                    <span className="text-gray-300" aria-hidden="true">•</span>
                    <span className="text-gray-600 whitespace-nowrap">{formattedDate}</span>
                </div>

                <h2 className="text-[22px] md:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
                    {item.title}
                </h2>

                <p className="text-[15px] md:text-base text-gray-600 leading-relaxed mb-6">
                    {item.contentSnippet}
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-5" aria-live="polite">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] whitespace-nowrap">
                            AI Summary
                        </h3>
                        {!summary && !summarizing && (
                            <button
                                onClick={handleSummarize}
                                className="min-h-[32px] text-[11px] font-bold uppercase tracking-wide px-4 py-1.5 bg-[#001f3f] text-white rounded-md hover:bg-[#003366] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                            >
                                Summarize
                            </button>
                        )}
                    </div>
                    {summarizing ? (
                        <div className="space-y-2.5" aria-busy="true" aria-label="Summarizing story">
                            <LoadingMessage stages={['Reading this story…', 'Writing 3 key points…']} />
                            <div className="space-y-2 animate-pulse pt-1">
                                <div className="h-3 bg-gray-200 w-full rounded-md"></div>
                                <div className="h-3 bg-gray-200 w-11/12 rounded-md"></div>
                                <div className="h-3 bg-gray-200 w-4/5 rounded-md"></div>
                            </div>
                        </div>
                    ) : summary ? (
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
                        <div>
                            <p className="text-sm text-red-600 mb-2">{sumError}</p>
                            <button onClick={handleSummarize} className="text-[11px] font-bold uppercase tracking-wide underline underline-offset-4 text-[#001f3f]">Try again</button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Get a 3-bullet AI summary. Full details at the source.
                        </p>
                    )}
                </div>

                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full md:w-auto min-h-[36px] px-5 py-2 bg-[#001f3f] text-white text-[11px] font-bold uppercase tracking-wide hover:bg-[#003366] transition-all rounded-md whitespace-nowrap active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
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
