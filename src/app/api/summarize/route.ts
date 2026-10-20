import { NextResponse } from 'next/server';
import { completeWithFallback } from '@/lib/ai';
import { checkRateLimit, clientKey, rateLimitedResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_TITLE = 500;
const MAX_SNIPPET = 2000;
const MAX_SOURCE = 100;
const MAX_CATEGORY = 50;

export async function POST(req: Request) {
    const rl = await checkRateLimit(clientKey(req, 'summarize'), 10, 60);
    if (!rl.allowed) return rateLimitedResponse(rl.remaining);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    try {
        const body = await req.json().catch(() => null);
        const title = typeof body?.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : '';
        const snippet = typeof body?.snippet === 'string' ? body.snippet.slice(0, MAX_SNIPPET) : '';
        const source = typeof body?.source === 'string' ? body.source.slice(0, MAX_SOURCE) : 'Unknown';
        const category = typeof body?.category === 'string' ? body.category.slice(0, MAX_CATEGORY) : 'General';
        if (!title) {
            return NextResponse.json({ error: 'Missing title' }, { status: 400 });
        }

        const { text: summary } = await completeWithFallback(
            apiKey,
            [
                {
                    role: 'system',
                    content:
                        'Output only 3 concise markdown bullets summarizing the article (max 80 words total). No preamble, no explanation. Neutral tone, no hallucinations, no links.',
                },
                {
                    role: 'user',
                    content: `Title: ${title}\nSource: ${source} | Category: ${category}\nExcerpt: ${snippet.slice(0, 800)}`,
                },
            ],
            { temperature: 0.3, maxTokens: 500 }
        );

        return NextResponse.json({ summary });
    } catch (error) {
        console.error('Summarize error:', error);
        const message = error instanceof Error ? error.message : 'Failed to summarize';
        const status = message.includes('rate-limited') ? 429 : 502;
        return NextResponse.json({ error: message }, { status });
    }
}
