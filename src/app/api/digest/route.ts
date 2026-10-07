import { fetchNews } from '@/lib/rss';
import { NextResponse } from 'next/server';
import { completeWithFallback } from '@/lib/ai';
import { getDigest, setDigest, CachedDigest } from '@/lib/digestCache';

export const dynamic = 'force-dynamic';

export async function GET() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: 'OPENROUTER_API_KEY is not configured. Add it to .env.local.' },
            { status: 500 }
        );
    }

    const hit = await getDigest();
    if (hit) {
        return NextResponse.json({ ...hit.data, cached: true });
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

        const { text: briefing, model } = await completeWithFallback(
            apiKey,
            [
                {
                    role: 'system',
                    content:
                        'You are the Jemanews editor for Kenya. Output only a concise daily briefing in markdown with: 1) "Top Stories" (max 5 bullets, 1-2 sentences each), 2) "In Brief" (one line per remaining category). Keep total under 300 words. No preamble, no explanation. Neutral tone, no hallucinations, no links.',
                },
                {
                    role: 'user',
                    content: `Summarize these Kenyan headlines into a daily digest:\n\n${headlines}`,
                },
            ],
            { temperature: 0.4, maxTokens: 800 }
        );

        const data: CachedDigest = {
            briefing,
            headlineCount: top.length,
            generatedAt: new Date().toISOString(),
            model,
            sources: [...new Set(top.map((t) => t.source))].slice(0, 6),
        };

        await setDigest(data);

        return NextResponse.json({ ...data, cached: false });
    } catch (error) {
        console.error('Digest API Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate daily digest';
        const status = message.includes('rate-limited') ? 429 : 502;
        return NextResponse.json({ error: message }, { status });
    }
}
