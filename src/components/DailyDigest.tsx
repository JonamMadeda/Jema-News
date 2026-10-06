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
    return `~${mins} min read`;
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
            <div className="space-y-4" aria-busy="true" aria-label="Loading daily brief">
                <div className="bg-[#001f3f] rounded-lg p-6 animate-pulse">
                    <div className="h-3 bg-white/20 w-48 rounded mb-3"></div>
                    <div className="flex gap-2">
                        <div className="h-6 bg-white/10 w-24 rounded-full"></div>
                        <div className="h-6 bg-white/10 w-28 rounded-full"></div>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse space-y-3">
                    <div className="h-4 bg-gray-100 w-1/3 rounded"></div>
                    <div className="h-3 bg-gray-100 w-full rounded"></div>
                    <div className="h-3 bg-gray-100 w-11/12 rounded"></div>
                    <div className="h-3 bg-gray-100 w-4/5 rounded"></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse space-y-3">
                    <div className="h-4 bg-gray-100 w-1/4 rounded"></div>
                    <div className="h-3 bg-gray-100 w-full rounded"></div>
                    <div className="h-3 bg-gray-100 w-3/4 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="border border-dashed border-gray-300 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">
                        Brief unavailable
                    </p>
                    <p className="text-sm text-gray-600">{error}</p>
                </div>
                <button
                    onClick={load}
                    className="min-h-[44px] text-xs font-black uppercase tracking-widest px-5 py-2.5 bg-[#001f3f] text-white rounded-full hover:bg-[#003366] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2 shrink-0"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    const date = new Date(data.generatedAt).toLocaleString('en-KE', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="space-y-4">
            <div className="bg-[#001f3f] text-white rounded-lg p-6 shadow-xl shadow-blue-900/10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                            </span>
                            <h2 className="text-xs font-black uppercase tracking-[0.25em]">
                                Today&apos;s AI Briefing
                            </h2>
                            {data.cached && (
                                <span className="text-[11px] font-bold uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full text-white/70">
                                    Cached
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-white/70">{date}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                                {data.headlineCount} stories
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                                {readingTime(data.briefing)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="min-h-[44px] text-xs font-black uppercase tracking-widest px-4 py-2 border border-white/20 hover:bg-white/10 transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        {canShare && (
                            <button
                                onClick={handleShare}
                                className="min-h-[44px] text-xs font-black uppercase tracking-widest px-4 py-2 border border-white/20 hover:bg-white/10 transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                Share
                            </button>
                        )}
                        <button
                            onClick={load}
                            className="min-h-[44px] text-xs font-black uppercase tracking-widest px-4 py-2 bg-white text-[#001f3f] hover:bg-white/90 transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#001f3f]"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 shadow-sm">
                <ReactMarkdown
                    components={{
                        h1: (props) => <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#001f3f] mt-6 mb-3 first:mt-0 flex items-center gap-2" {...props} />,
                        h2: (props) => <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#001f3f] mt-6 mb-3 first:mt-0 pb-2 border-b border-gray-100" {...props} />,
                        h3: (props) => <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900 mt-5 mb-2" {...props} />,
                        p: (props) => <p className="text-[15px] leading-relaxed text-gray-700 mb-3" {...props} />,
                        ul: (props) => <ul className="space-y-3 mb-4" {...props} />,
                        ol: (props) => <ol className="space-y-3 mb-4 list-decimal pl-5" {...props} />,
                        li: (props) => <li className="text-[15px] leading-relaxed text-gray-700 bg-gray-50 border-l-2 border-[#001f3f] pl-4 pr-3 py-2.5 rounded-r-md list-none" {...props} />,
                        strong: (props) => <strong className="font-bold text-gray-900" {...props} />,
                    }}
                >
                    {data.briefing}
                </ReactMarkdown>

                <p className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    AI-generated from Kenyan sources — verify with originals.
                </p>
            </div>
        </div>
    );
}
