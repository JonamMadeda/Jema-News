import { NextResponse } from 'next/server';
import { completeWithFallback } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    try {
        const { title, snippet, source, category } = await req.json();
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
                    content: `Title: ${title}\nSource: ${source || 'Unknown'} | Category: ${category || 'General'}\nExcerpt: ${(snippet || '').slice(0, 800)}`,
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
