'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import LoadingMessage from './LoadingMessage';
import type { NewsItem } from '@/lib/types';

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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="mb-5 flex items-center justify-between gap-2 flex-wrap">
                <button
                    onClick={onBack}
                    className="min-h-[36px] flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-xl px-3 -ml-2"
                >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to stories
                </button>
                <div className="flex items-center gap-2">
                    {onToggleSave && (
                        <button
                            onClick={onToggleSave}
                            aria-pressed={saved}
                            className={`min-h-[36px] inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 border rounded-xl transition-all whitespace-nowrap active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                                saved
                                    ? 'border-slate-300 text-slate-900 bg-slate-100'
                                    : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            {saved ? 'Saved' : 'Save'}
                        </button>
                    )}
                    <button
                        onClick={handleCopyLink}
                        className="min-h-[36px] text-xs font-semibold px-3.5 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all whitespace-nowrap active:scale-95"
                    >
                        {copied ? 'Copied ✓' : 'Share link'}
                    </button>
                    <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[36px] inline-flex items-center text-xs font-semibold px-3.5 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all whitespace-nowrap"
                    >
                        WhatsApp
                    </a>
                </div>
            </div>

            <article className="max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
                    <span className="px-2.5 py-0.5 border border-slate-200 bg-white font-semibold text-slate-700 rounded-full whitespace-nowrap text-[11px]">
                        {item.category}
                    </span>
                    <span className="font-semibold text-slate-700 truncate">{item.source}</span>
                    <span className="text-slate-300" aria-hidden="true">•</span>
                    <span className="text-slate-500 font-medium whitespace-nowrap">{formattedDate}</span>
                </div>

                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-tight tracking-tight mb-4">
                    {item.title}
                </h2>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                    {item.contentSnippet}
                </p>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-6" aria-live="polite">
                    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                                AI Key Points Summary
                            </h3>
                        </div>
                        {!summary && !summarizing && (
                            <button
                                onClick={handleSummarize}
                                className="min-h-[32px] text-xs font-semibold px-3.5 py-1.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all whitespace-nowrap shrink-0 active:scale-95"
                            >
                                Generate 3 Bullets
                            </button>
                        )}
                    </div>
                    {summarizing ? (
                        <div className="space-y-3" aria-busy="true" aria-label="Summarizing story">
                            <LoadingMessage stages={['Reading story text…', 'Distilling top key facts…']} />
                            <div className="space-y-2 animate-pulse pt-1">
                                <div className="h-3 bg-slate-200 w-full rounded-md"></div>
                                <div className="h-3 bg-slate-200 w-11/12 rounded-md"></div>
                                <div className="h-3 bg-slate-200 w-4/5 rounded-md"></div>
                            </div>
                        </div>
                    ) : summary ? (
                        <div className="text-sm leading-relaxed text-slate-800">
                            <ReactMarkdown
                                components={{
                                    ul: (p) => <ul className="space-y-2" {...p} />,
                                    li: (p) => <li className="flex gap-2 text-sm leading-relaxed" {...p} />,
                                    p: (p) => <p className="mb-2" {...p} />,
                                    strong: (p) => <strong className="font-semibold text-slate-900" {...p} />,
                                }}
                            >
                                {summary}
                            </ReactMarkdown>
                        </div>
                    ) : sumError ? (
                        <div>
                            <p className="text-xs font-medium text-rose-600 mb-2">{sumError}</p>
                            <button onClick={handleSummarize} className="text-xs font-semibold underline text-slate-900">Try again</button>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Generate an instant 3-bullet AI brief. Original details remain on the publisher website.
                        </p>
                    )}
                </div>

                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[42px] px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all rounded-xl whitespace-nowrap active:scale-98 shadow-2xs"
                >
                    Read Full Story at Source
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </article>
        </div>
    );
}
