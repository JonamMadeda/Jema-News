'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type DigestResponse = {
    briefing: string;
    headlineCount: number;
    generatedAt: string;
    model: string;
    cached?: boolean;
    error?: string;
};

function readingTime(text: string): string {
    const words = text.trim().split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 200));
    return `~${mins} min`;
}

export default function DailyDigest() {
    const [data, setData] = useState<DigestResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [canShare, setCanShare] = useState(false);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/digest');
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Failed to load digest');
            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        if (typeof navigator !== 'undefined' && 'share' in navigator) setCanShare(true);
    }, []);

    async function handleCopy() {
        if (!data?.briefing) return;
        try {
            await navigator.clipboard.writeText(data.briefing);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    async function handleShare() {
        if (!data?.briefing) return;
        try {
            await navigator.share({ title: "Today's Brief — Jema News", text: data.briefing });
        } catch {
            // user dismissed — ignore
        }
    }

    if (loading) {
        return (
            <div className="space-y-3" aria-busy="true" aria-label="Loading daily brief">
                <div className="bg-[#001f3f] rounded-lg p-4 animate-pulse">
                    <div className="h-3 bg-white/20 w-40 rounded-full mb-2"></div>
                    <div className="flex gap-1.5">
                        <div className="h-5 bg-white/10 w-20 rounded-full"></div>
                        <div className="h-5 bg-white/10 w-20 rounded-full"></div>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse space-y-2">
                    <div className="h-3 bg-gray-100 w-1/3 rounded-full"></div>
                    <div className="h-3 bg-gray-100 w-full rounded"></div>
                    <div className="h-3 bg-gray-100 w-11/12 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900 mb-0.5">
                        Brief unavailable
                    </p>
                    <p className="text-sm text-gray-600 truncate">{error}</p>
                </div>
                <button
                    onClick={load}
                    className="min-h-[36px] text-[11px] font-bold uppercase tracking-wide px-4 py-1.5 bg-[#001f3f] text-white rounded-full hover:bg-[#003366] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    const date = new Date(data.generatedAt).toLocaleString('en-KE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="space-y-3">
            <div className="bg-[#001f3f] text-white rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
                            </span>
                            <h2 className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap">
                                Today&apos;s Briefing
                            </h2>
                            {data.cached && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide bg-white/10 px-2 py-0.5 rounded-full text-white/70 whitespace-nowrap">
                                    Cached
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] text-white/70 truncate">{date}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-white/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                                {data.headlineCount} stories
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-white/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                                {readingTime(data.briefing)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={handleCopy}
                            className="min-h-[34px] text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 border border-white/20 hover:bg-white/10 transition-colors rounded-full whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                        {canShare && (
                            <button
                                onClick={handleShare}
                                className="min-h-[34px] text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 border border-white/20 hover:bg-white/10 transition-colors rounded-full whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                Share
                            </button>
                        )}
                        <button
                            onClick={load}
                            className="min-h-[34px] text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 bg-white text-[#001f3f] hover:bg-white/90 transition-colors rounded-full whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#001f3f]"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5">
                <ReactMarkdown
                    components={{
                        h1: (props) => <h3 className="text-xs font-bold uppercase tracking-wide text-[#001f3f] mt-4 mb-2 first:mt-0" {...props} />,
                        h2: (props) => <h3 className="text-xs font-bold uppercase tracking-wide text-[#001f3f] mt-4 mb-2 first:mt-0 pb-1.5 border-b border-gray-100" {...props} />,
                        h3: (props) => <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-900 mt-3 mb-1.5" {...props} />,
                        p: (props) => <p className="text-sm leading-relaxed text-gray-700 mb-2.5" {...props} />,
                        ul: (props) => <ul className="space-y-2 mb-3" {...props} />,
                        ol: (props) => <ol className="space-y-2 mb-3 list-decimal pl-4" {...props} />,
                        li: (props) => <li className="text-sm leading-relaxed text-gray-700 bg-gray-50 border-l-2 border-[#001f3f] pl-3 pr-2.5 py-2 rounded-r-md list-none" {...props} />,
                        strong: (props) => <strong className="font-semibold text-gray-900" {...props} />,
                    }}
                >
                    {data.briefing}
                </ReactMarkdown>

                <p className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                    AI-generated — verify with originals.
                </p>
            </div>
        </div>
    );
}
