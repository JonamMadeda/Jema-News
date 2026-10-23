'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import LoadingMessage from './LoadingMessage';
import { setAppTab } from '@/lib/appEvents';

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
    const aliveRef = useRef(true);
    // Guards against polling forever if the brief never lands.
    const attemptsRef = useRef(0);
    // Keeps the effect free of a `load` dependency while always calling the latest.
    const loadRef = useRef<(force?: boolean) => void>(() => {});

    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
        };
    }, []);

    async function load(force = false) {
        if (!aliveRef.current) return;
        setLoading(true);
        setError(null);
        // Client cache (survives reloads + server cold starts) mirrors the 3h server TTL
        if (!force) {
            try {
                const raw = localStorage.getItem('jema:digest');
                if (raw) {
                    const cached = JSON.parse(raw) as { data: DigestResponse; expiresAt: number };
                    if (cached.expiresAt > Date.now() && cached.data?.briefing) {
                        setData({ ...cached.data, cached: true });
                        setLoading(false);
                        return;
                    }
                }
            } catch {
                // ignore corrupt cache
            }
        }
        try {
            const res = await fetch('/api/digest');
            const json = await res.json();
            // 202 means another instance holds the single-flight lock and is
            // building the brief right now — keep polling instead of erroring.
            if (res.status === 202) {
                attemptsRef.current += 1;
                if (attemptsRef.current > 10) {
                    setError(json?.error || 'The brief is taking longer than usual. Try again shortly.');
                    setLoading(false);
                    return;
                }
                await new Promise((r) => setTimeout(r, 3000));
                if (aliveRef.current) await load(force);
                return;
            }
            if (!res.ok) throw new Error(json?.error || 'Failed to load digest');
            setData(json);
            try {
                localStorage.setItem(
                    'jema:digest',
                    JSON.stringify({ data: json, expiresAt: Date.now() + 3 * 60 * 60 * 1000 })
                );
            } catch {
                // storage unavailable — non-fatal
            }
        } catch (err) {
            if (!aliveRef.current) return;
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            if (aliveRef.current) setLoading(false);
        }
    }

    loadRef.current = load;

    useEffect(() => {
        loadRef.current();
        const onRefresh = () => {
            attemptsRef.current = 0;
            loadRef.current(true);
        };
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
            <div
                className="min-h-[60vh] flex flex-col items-center justify-center"
                aria-busy="true"
                aria-label="Loading daily brief"
            >
                <div className="w-full max-w-md space-y-4">
                    <LoadingMessage
                        stages={[
                            'Reading today’s stories…',
                            'Checking sources…',
                            'Writing the brief…',
                        ]}
                    />
                    <div className="animate-pulse space-y-2.5">
                        <div className="h-3 bg-slate-200/70 w-1/4 rounded-full"></div>
                        <div className="h-3 bg-slate-200/70 w-full rounded-full"></div>
                        <div className="h-3 bg-slate-200/70 w-11/12 rounded-full"></div>
                        <div className="h-3 bg-slate-200/70 w-2/3 rounded-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-4">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                    Brief unavailable
                </p>
                <p className="text-sm text-slate-600 mb-4">
                    {error}. You can still browse the latest headlines.
                </p>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => load(true)}
                        className="min-h-9 text-xs font-semibold px-4 py-1.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25"
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => { setAppTab('latest'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="min-h-9 text-xs font-semibold px-4 py-1.5 border border-slate-200 text-slate-700 rounded-xl hover:border-slate-800 hover:text-slate-900 transition-colors whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25"
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
        <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-slate-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 truncate">
                        Daily Brief
                    </h2>
                    <span aria-hidden="true" className="text-slate-300">•</span>
                    <p className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                        Updated {timeAgo(data.generatedAt)}
                    </p>
                </div>
                <button
                    onClick={() => load(true)}
                    aria-label="Regenerate brief"
                    title="Regenerate brief"
                    className="w-8 h-8 shrink-0 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0114-3M19 15a8 8 0 01-14 3" />
                    </svg>
                </button>
            </div>

            <div className="pt-5">
                <ReactMarkdown
                    components={{
                        h1: (props) => <h3 className="mt-7 mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 first:mt-0" {...props} />,
                        h2: (props) => <h3 className="mt-6 mb-2 text-xs font-bold uppercase tracking-wider text-slate-900 first:mt-0" {...props} />,
                        h3: (props) => <h4 className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600" {...props} />,
                        p: (props) => <p className="mb-3 text-sm leading-relaxed text-slate-700 last:mb-0" {...props} />,
                        ul: (props) => <ul className="mb-4 space-y-1.5 pl-5 list-disc marker:text-slate-400 text-sm" {...props} />,
                        ol: (props) => <ol className="mb-4 space-y-1.5 pl-5 list-decimal marker:text-slate-400 text-sm" {...props} />,
                        li: (props) => <li className="leading-relaxed" {...props} />,
                        strong: (props) => <strong className="font-semibold text-slate-900" {...props} />,
                    }}
                >
                    {data.briefing}
                </ReactMarkdown>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] font-medium text-slate-500">
                    AI summary{sourceLine} · Verify sources.
                </p>
                <div className="flex items-center gap-3 shrink-0 text-[11px] font-semibold text-slate-500">
                    <button
                        onClick={handleCopy}
                        className="hover:text-slate-900 transition-colors"
                    >
                        {copied ? 'Copied ✓' : 'Copy'}
                    </button>
                    <span className="text-slate-300">•</span>
                    <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-slate-900 transition-colors"
                    >
                        WhatsApp
                    </a>
                    <span className="text-slate-300">•</span>
                    <a
                        href={xHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-slate-900 transition-colors"
                    >
                        X
                    </a>
                </div>
            </div>
        </div>
    );
}
