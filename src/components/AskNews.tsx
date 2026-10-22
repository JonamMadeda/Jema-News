'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import LoadingMessage from './LoadingMessage';
import type { StorySource } from '@/lib/types';

type Message = {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    at: string;
    error?: boolean;
    headlines?: StorySource[];
};

const SESSION_KEY = 'jema:ask-session';

const SUGGESTIONS = [
    "What are the major headlines in Kenya today?",
    "Latest business and economic news",
    "Recent updates in national politics",
    "Health and public sector developments",
    "Education and university news",
];

function stamp(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AssistantAvatar() {
    return (
        <div
            aria-hidden="true"
            className="w-7 h-7 shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center select-none"
        >
            <svg className="w-3.5 h-3.5 text-slate-200" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
            </svg>
        </div>
    );
}

export default function AskNews() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [restored, setRestored] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [transcriptCopied, setTranscriptCopied] = useState(false);
    const idRef = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(SESSION_KEY);
            if (saved) {
                const parsed: unknown = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    const valid = parsed.filter(
                        (message): message is Message =>
                            message &&
                            typeof message === 'object' &&
                            typeof message.id === 'number' &&
                            (message.role === 'user' || message.role === 'assistant') &&
                            typeof message.text === 'string' &&
                            typeof message.at === 'string'
                    );
                    setMessages(valid.slice(-100));
                    idRef.current = valid.reduce((highest, message) => Math.max(highest, message.id), 0);
                }
            }
        } catch {
            // Ignore stale or unavailable session storage.
        }
        setRestored(true);
    }, []);

    useEffect(() => {
        if (!restored) return;
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
        } catch {
            // Session storage may be unavailable or full.
        }
    }, [messages, restored]);

    // Auto-scroll when messages update or loading state changes
    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, loading]);

    async function ask(question: string) {
        const q = question.trim();
        if (!q || loading) return;
        setInput('');
        idRef.current += 1;
        setMessages((m) => [...m, { id: idRef.current, role: 'user', text: q, at: stamp() }]);
        setLoading(true);

        try {
            const res = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || 'Could not fetch an answer');
            idRef.current += 1;
            setMessages((m) => [
                ...m,
                {
                    id: idRef.current,
                    role: 'assistant',
                    text: json.answer,
                    at: stamp(),
                    headlines: Array.isArray(json.headlines) ? json.headlines : [],
                },
            ]);
        } catch (err) {
            idRef.current += 1;
            setMessages((m) => [
                ...m,
                {
                    id: idRef.current,
                    role: 'assistant',
                    text:
                        err instanceof Error && err.message
                            ? err.message
                            : 'Unable to connect to news intelligence. Please retry.',
                    at: stamp(),
                    error: true,
                },
            ]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }

    function retry(id: number) {
        const idx = messages.findIndex((m) => m.id === id);
        if (idx < 1) return;
        const prev = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
        if (prev) ask(prev.text);
    }

    async function copyMessage(id: number, text: string) {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            setCopiedId(null);
        }
    }

    async function copyTranscript() {
        const text = messages
            .map((m) => `${m.role === 'user' ? 'You' : 'Assistant'}: ${m.text}`)
            .join('\n\n');
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setTranscriptCopied(true);
            setTimeout(() => setTranscriptCopied(false), 2000);
        } catch {
            setTranscriptCopied(false);
        }
    }

    return (
        <div className="w-full h-full flex flex-col min-h-0 bg-white border-0 shadow-none">
            {/* Minimal Header Bar */}
            <div className="shrink-0 h-12 border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Kenya News Intelligence</span>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="text-slate-400 font-normal hidden sm:inline">Grounded in today&apos;s headlines</span>
                </div>

                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <>
                            <button
                                onClick={copyTranscript}
                                className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-50 transition-colors"
                            >
                                {transcriptCopied ? 'Copied ✓' : 'Copy chat'}
                            </button>
                            <button
                                onClick={() => setMessages([])}
                                aria-label="Clear chat"
                                title="Clear conversation"
                                className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-50 transition-colors"
                            >
                                Reset
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Central Scrollable Message Stream */}
            <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-6 touch-pan-y"
                aria-live="polite"
            >
                <div className="max-w-3xl mx-auto w-full space-y-6">
                    {messages.length === 0 && !loading && (
                        <div className="py-12 sm:py-20 text-center max-w-xl mx-auto">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 mx-auto flex items-center justify-center mb-4">
                                <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
                                </svg>
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                                How can I help you today?
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-8 max-w-md mx-auto">
                                Ask about breaking events, politics, business, or public services. Open the headline context under each answer to check the original reports.
                            </p>

                            <div className="space-y-2 text-left">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => ask(s)}
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-800 hover:bg-slate-50/60 transition-all text-xs font-medium text-slate-700 active:scale-[0.99]"
                                    >
                                        <span className="truncate">{s}</span>
                                        <span className="text-slate-400 text-sm ml-2">→</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m) =>
                        m.role === 'user' ? (
                            <div key={m.id} className="flex flex-col items-end">
                                <div className="max-w-[85%] sm:max-w-[75%] bg-slate-900 text-white text-sm leading-relaxed rounded-2xl rounded-br-xs px-4 py-3 shadow-2xs">
                                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                                </div>
                                <span className="text-[11px] font-medium text-slate-400 mt-1 mr-1">{m.at}</span>
                            </div>
                        ) : m.error ? (
                            <div key={m.id} className="flex items-start gap-3">
                                <AssistantAvatar />
                                <div
                                    className="max-w-[90%] sm:max-w-[80%] bg-rose-50 border border-rose-200 text-rose-900 text-sm leading-relaxed rounded-2xl rounded-tl-xs p-4"
                                    role="alert"
                                >
                                    <p className="font-medium break-words">{m.text}</p>
                                    <button
                                        onClick={() => retry(m.id)}
                                        className="mt-3 px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors active:scale-95"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div key={m.id} className="flex items-start gap-3 group">
                                <AssistantAvatar />
                                <div className="min-w-0 max-w-[92%] sm:max-w-[85%]">
                                    <div className="bg-slate-50 border border-slate-100 text-slate-800 rounded-2xl rounded-tl-xs px-4 sm:px-5 py-3.5">
                                        <ReactMarkdown
                                            components={{
                                                p: (props) => (
                                                    <p className="text-sm leading-relaxed break-words mb-2.5 last:mb-0" {...props} />
                                                ),
                                                strong: (props) => (
                                                    <strong className="font-bold text-slate-900" {...props} />
                                                ),
                                                ul: (props) => (
                                                    <ul className="list-disc pl-5 my-2 space-y-1.5 text-sm" {...props} />
                                                ),
                                                ol: (props) => (
                                                    <ol className="list-decimal pl-5 my-2 space-y-1.5 text-sm" {...props} />
                                                ),
                                                li: (props) => (
                                                    <li className="leading-relaxed" {...props} />
                                                ),
                                            }}
                                        >
                                            {m.text}
                                        </ReactMarkdown>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5 ml-1">
                                        <span className="text-[11px] font-medium text-slate-400">{m.at}</span>
                                        <span className="text-slate-300">•</span>
                                        <button
                                            onClick={() => copyMessage(m.id, m.text)}
                                            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                                        >
                                            {copiedId === m.id ? 'Copied ✓' : 'Copy'}
                                        </button>
                                    </div>
                                    {m.headlines && m.headlines.length > 0 && (
                                        <details className="mt-2 ml-1 text-xs text-slate-500">
                                            <summary className="w-fit cursor-pointer font-medium hover:text-slate-800">
                                                Headline context ({m.headlines.length})
                                            </summary>
                                            <ul className="mt-2 space-y-1.5 border-l border-slate-200 pl-3">
                                                {m.headlines.map((headline) => (
                                                    <li key={headline.link}>
                                                        <a
                                                            href={headline.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:text-blue-700 hover:underline"
                                                        >
                                                            {headline.title}
                                                        </a>
                                                        <span className="text-slate-400"> · {headline.source}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {loading && (
                        <div className="flex items-start gap-3">
                            <AssistantAvatar />
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-xs px-4 sm:px-5 py-3.5">
                                <LoadingMessage
                                    stages={[
                                        'Scanning today’s headlines…',
                                        'Verifying reporting sources…',
                                        'Synthesizing concise answer…',
                                    ]}
                                    intervalMs={1500}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Central Fixed Bottom Input Dock */}
            <div className="shrink-0 bg-white border-t border-slate-100 px-4 py-3 sm:py-4">
                <div className="max-w-3xl mx-auto w-full">
                    {messages.length > 0 && (
                        <div
                            className="flex gap-2 overflow-x-auto pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            aria-label="Suggested questions"
                        >
                            {SUGGESTIONS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => ask(s)}
                                    disabled={loading}
                                    className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-slate-800 hover:text-slate-900 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            ask(input);
                        }}
                        className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10 transition-all"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about Kenya headlines, business, politics..."
                            aria-label="Ask about Kenyan news"
                            autoComplete="off"
                            maxLength={300}
                            className="flex-1 min-w-0 bg-transparent px-3 py-1.5 text-[16px] md:text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            disabled={loading || input.trim() === ''}
                            aria-label="Send query"
                            className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                        </button>
                    </form>
                    <p className="text-[11px] text-slate-400 text-center mt-2">
                        Answers are synthesized strictly from verified Kenyan news sources.
                    </p>
                </div>
            </div>
        </div>
    );
}
