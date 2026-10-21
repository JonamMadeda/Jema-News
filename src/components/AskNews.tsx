'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import LoadingMessage from './LoadingMessage';

type Message = {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    at: string;
    error?: boolean;
};

const PRESETS = [
    "What's trending?",
    'Top stories today',
    'Latest in politics',
    'Business & economy',
    'Health updates',
    'Education news',
];

function stamp(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Avatar() {
    return (
        <span
            aria-hidden="true"
            className="w-6 h-6 shrink-0 rounded-full bg-[#001f3f] text-white text-[10px] font-bold flex items-center justify-center select-none"
        >
            J
        </span>
    );
}

export default function AskNews() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const idRef = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
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
            if (!res.ok) throw new Error(json?.error || 'Could not get an answer');
            idRef.current += 1;
            setMessages((m) => [
                ...m,
                { id: idRef.current, role: 'assistant', text: json.answer, at: stamp() },
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
                            : 'Something went wrong. Try again in a moment.',
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

    async function handleCopyLast() {
        const last = [...messages].reverse().find((m) => m.role === 'assistant' && !m.error);
        if (!last) return;
        try {
            await navigator.clipboard.writeText(last.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    const canCopy = messages.some((m) => m.role === 'assistant' && !m.error);

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="shrink-0 bg-[#001f3f] text-white rounded-md px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2.5">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-white/15 flex items-center justify-center text-[13px] font-bold">
                            J
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap">
                                Ask Jemanews
                            </h2>
                            <p className="text-[12px] text-white/60 truncate">
                                Answers from today&apos;s headlines
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {canCopy && (
                            <button
                                onClick={handleCopyLast}
                                className="min-h-[32px] px-2 text-[11px] font-bold uppercase tracking-wide text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        )}
                        {messages.length > 0 && (
                            <button
                                onClick={() => setMessages([])}
                                aria-label="Clear conversation"
                                title="Clear conversation"
                                className="w-8 h-8 inline-flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m5-4h4M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 mt-3 flex flex-col bg-white border border-gray-200 rounded-md overflow-hidden">
                <div
                    ref={scrollRef}
                    className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3"
                    aria-live="polite"
                >
                    {messages.length === 0 && !loading && (
                        <div className="h-full flex flex-col justify-center py-6">
                            <div className="flex items-end gap-2">
                                <Avatar />
                                <div className="max-w-[85%] bg-gray-100 text-gray-800 text-sm leading-relaxed rounded-xl rounded-bl-sm px-3.5 py-2.5">
                                    Hi — ask me anything about today&apos;s news in Kenya. I answer
                                    from the latest headlines only, so nothing is invented.
                                </div>
                            </div>
                            <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                                Try one of these
                            </p>
                            <div className="grid sm:grid-cols-2 gap-2">
                                {PRESETS.slice(0, 4).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => ask(p)}
                                        className="text-left min-h-[44px] px-3 py-2 rounded-md border border-gray-200 text-[13px] font-medium text-gray-700 hover:border-[#001f3f] hover:text-[#001f3f] hover:bg-gray-50 transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m) =>
                        m.role === 'user' ? (
                            <div key={m.id} className="flex flex-col items-end">
                                <p className="max-w-[80%] bg-[#001f3f] text-white text-sm leading-relaxed rounded-xl rounded-br-sm px-3.5 py-2.5 whitespace-pre-wrap break-words">
                                    {m.text}
                                </p>
                                <span className="text-[10px] text-gray-400 mt-1 mr-1">{m.at}</span>
                            </div>
                        ) : m.error ? (
                            <div key={m.id} className="flex items-end gap-2">
                                <Avatar />
                                <div
                                    className="max-w-[85%] bg-red-50 border border-red-200 text-red-800 text-sm leading-relaxed rounded-xl rounded-bl-sm px-3.5 py-2.5"
                                    role="alert"
                                >
                                    <p className="break-words">{m.text}</p>
                                    <button
                                        onClick={() => retry(m.id)}
                                        className="mt-2 min-h-[32px] text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 border border-red-200 text-red-800 rounded-md hover:bg-white transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div key={m.id} className="flex items-end gap-2">
                                <Avatar />
                                <div className="min-w-0">
                                    <div className="max-w-full bg-gray-100 text-gray-800 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                                        <ReactMarkdown
                                            components={{
                                                p: (props) => (
                                                    <p className="text-sm leading-relaxed break-words" {...props} />
                                                ),
                                                strong: (props) => (
                                                    <strong className="font-semibold text-gray-900" {...props} />
                                                ),
                                            }}
                                        >
                                            {m.text}
                                        </ReactMarkdown>
                                    </div>
                                    <span className="block text-[10px] text-gray-400 mt-1 ml-1">{m.at}</span>
                                </div>
                            </div>
                        )
                    )}

                    {loading && (
                        <div className="flex items-end gap-2">
                            <Avatar />
                            <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                                <LoadingMessage
                                    stages={['Checking today’s headlines…', 'Drafting your answer…']}
                                    intervalMs={1600}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-gray-100 px-3 py-2.5">
                    {messages.length > 0 && (
                        <div
                            className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            aria-label="Suggested questions"
                        >
                            {PRESETS.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => ask(p)}
                                    disabled={loading}
                                    className="shrink-0 whitespace-nowrap min-h-[32px] px-3 rounded-md border border-gray-200 text-[11px] font-bold uppercase tracking-wide text-[#001f3f] hover:border-[#001f3f] hover:bg-gray-50 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            ask(input);
                        }}
                        className="flex items-center gap-2"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about today’s news…"
                            aria-label="Ask a question"
                            autoComplete="off"
                            maxLength={300}
                            className="flex-1 min-w-0 bg-white border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#001f3f] transition-colors placeholder:text-gray-400"
                        />
                        <button
                            type="submit"
                            disabled={loading || input.trim() === ''}
                            className="min-h-[40px] px-4 text-[11px] font-bold uppercase tracking-wide bg-[#001f3f] text-white rounded-md hover:bg-[#003366] transition-colors whitespace-nowrap active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
