import { fetchNews } from '@/lib/rss';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

type CachedDigest = {
    briefing: string;
    headlineCount: number;
    generatedAt: string;
    model: string;
    sources: string[];
};

// In-memory cache (per server instance) to avoid burning credits
let cache: { data: CachedDigest; expiresAt: number } | null = null;

export async function GET() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: 'OPENROUTER_API_KEY is not configured. Add it to .env.local.' },
            { status: 500 }
        );
    }

    if (cache && Date.now() < cache.expiresAt) {
        return NextResponse.json({ ...cache.data, cached: true });
    }

    try {
        const news = await fetchNews();
        if (news.length === 0) {
            return NextResponse.json({ error: 'No news available to summarize' }, { status: 502 });
        }

        const top = news.slice(0, 20);
        const headlines = top
            .map((n, i) => `${i + 1}. [${n.category} | ${n.source}] ${n.title} — ${n.contentSnippet?.slice(0, 200) || 'No excerpt'}`)
            .join('\n');

        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://jema-news.local',
                'X-Title': 'Jema News',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are the Jema News editor for Kenya. Write a concise daily briefing from the headlines provided. Return markdown with: 1) "Top Stories" (max 5 bullets, 1-2 sentences each), 2) "In Brief" (one line per remaining category: Business, Politics, Health, Education, General). Keep total under 300 words. Neutral tone, no hallucinations, no links.',
                    },
                    {
                        role: 'user',
                        content: `Summarize these Kenyan headlines into a daily digest:\n\n${headlines}`,
                    },
                ],
                temperature: 0.4,
                max_tokens: 800,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('OpenRouter error:', response.status, errText.slice(0, 500));
            return NextResponse.json(
                { error: `AI provider failed (${response.status}). Try again later.` },
                { status: 502 }
            );
        }

        const json = await response.json();
        const briefing: string | undefined = json?.choices?.[0]?.message?.content;

        if (!briefing) {
            console.error('OpenRouter unexpected payload:', JSON.stringify(json).slice(0, 500));
            return NextResponse.json({ error: 'AI returned an empty summary' }, { status: 502 });
        }

        const data: CachedDigest = {
            briefing,
            headlineCount: top.length,
            generatedAt: new Date().toISOString(),
            model: json?.model || MODEL,
            sources: [...new Set(top.map((t) => t.source))].slice(0, 6),
        };

        cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };

        return NextResponse.json({ ...data, cached: false });
    } catch (error) {
        console.error('Digest API Error:', error);
        return NextResponse.json({ error: 'Failed to generate daily digest' }, { status: 500 });
    }
}
