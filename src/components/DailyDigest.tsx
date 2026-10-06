'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import LoadingMessage from './LoadingMessage';
import { setAppTab } from './Navbar';

type DigestResponse = {
    briefing: string;
    headlineCount: number;
    generatedAt: string;
    model: string;
    sources?: string[];
    cached?: boolean;
    error?: string;
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function DailyDigest() {
    const [data, setData] = useState<DigestResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

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
        const onRefresh = () => load();
        window.addEventListener('jema:digest-refresh', onRefresh);
        return () => window.removeEventListener('jema:digest-refresh', onRefresh);
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

    if (loading) {
        return (
            <div className="space-y-3" aria-busy="true" aria-label="Loading daily brief">
                <div className="bg-[#001f3f] rounded-md p-3">
                    <LoadingMessage
                        dark
                        stages={[
                            'Reading today’s top stories…',
                            'Asking the AI to brief you…',
                            'Writing your briefing…',
                        ]}
                    />
                </div>
                <div className="bg-white border border-gray-200 rounded-md p-3 animate-pulse space-y-2">
                    <div className="h-3 bg-gray-100 w-1/3 rounded-md"></div>
                    <div className="h-3 bg-gray-100 w-full rounded"></div>
                    <div className="h-3 bg-gray-100 w-11/12 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="border border-dashed border-gray-300 rounded-md p-4 bg-white">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900 mb-1">
                    Brief unavailable
                </p>
                <p className="text-sm text-gray-600 mb-3">{error}. You can still browse the latest headlines.</p>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={load}
                        className="min-h-[32px] text-[11px] font-bold uppercase tracking-wide px-4 py-1.5 bg-[#001f3f] text-white rounded-md hover:bg-[#003366] transition-colors whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => { setAppTab('latest'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="min-h-[32px] text-[11px] font-bold uppercase tracking-wide px-4 py-1.5 border border-gray-200 text-[#001f3f] rounded-md hover:border-[#001f3f] transition-colors whitespace-nowrap active:scale-[0.98]"
                    >
                        Browse latest →
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const shareText = encodeURIComponent(`Today's Brief — Jemanews\n\n${data.briefing.slice(0, 900)}`);
    const waHref = `https://wa.me/?text=${shareText}`;
    const xHref = `https://twitter.com/intent/tweet?text=${shareText}`;
    const sourceLine =
        data.sources && data.sources.length > 0
            ? ` from ${data.sources.slice(0, 2).join(', ')}${data.sources.length > 2 ? ` +${data.sources.length - 2} more` : ''}`
            : '';

    return (
        <div className="space-y-3">
            <div className="bg-[#001f3f] text-white rounded-md px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap">
                            Today&apos;s Briefing
                        </h2>
                        <p className="text-[12px] text-white/60 truncate">Generated {timeAgo(data.generatedAt)}</p>
                    </div>
                    <button
                        onClick={load}
                        aria-label="Regenerate brief"
                        title="Regenerate"
                        className="w-8 h-8 shrink-0 inline-flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0114-3M19 15a8 8 0 01-14 3" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-md p-3 md:p-4">
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

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] text-gray-600">
                        AI-generated{sourceLine} — verify with originals.
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={handleCopy}
                            className="text-[11px] font-bold uppercase tracking-wide text-gray-600 hover:text-[#001f3f] underline underline-offset-4 decoration-gray-300 hover:decoration-[#001f3f] transition-colors"
                        >
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                        <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold uppercase tracking-wide text-gray-600 hover:text-[#001f3f] underline underline-offset-4 decoration-gray-300 hover:decoration-[#001f3f] transition-colors"
                        >
                            WhatsApp
                        </a>
                        <a
                            href={xHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold uppercase tracking-wide text-gray-600 hover:text-[#001f3f] underline underline-offset-4 decoration-gray-300 hover:decoration-[#001f3f] transition-colors"
                        >
                            X
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
