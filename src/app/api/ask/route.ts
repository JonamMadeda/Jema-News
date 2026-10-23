import { NextResponse } from 'next/server';
import { completeWithFallback, hasAiProvider } from '@/lib/ai';
import { balancedHeadlines, fetchNews } from '@/lib/rss';
import { checkRateLimit, clientKey, rateLimitedResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_QUESTION = 300;
const HEADLINE_COUNT = 25;

export async function POST(req: Request) {
    const rl = await checkRateLimit(clientKey(req, 'ask'), 12, 60);
    if (!rl.allowed) return rateLimitedResponse(rl.remaining);

    if (!hasAiProvider()) {
        return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    try {
        const body = await req.json().catch(() => null);
        const question =
            typeof body?.question === 'string' ? body.question.trim().slice(0, MAX_QUESTION) : '';
        if (!question) {
            return NextResponse.json({ error: 'Missing question' }, { status: 400 });
        }

        const news = await fetchNews();
        if (news.length === 0) {
            throw new Error('No news available right now');
        }

        const top = balancedHeadlines(news, HEADLINE_COUNT);
        const headlines = top
            .map(
                (n, i) =>
                    `${i + 1}. [${n.category} | ${n.source}] ${n.title} — ${
                        n.contentSnippet?.slice(0, 160) || 'No excerpt'
                    }`
            )
            .join('\n');
        const date = new Intl.DateTimeFormat('en-KE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date());

        const { text: answer, model } = await completeWithFallback(
            [
                {
                    role: 'system',
                    content:
                        'You are Jemanews, a Kenyan news assistant. Answer with ONE short text message of at most 70 words: plain conversational sentences, no headings, no bullet lists, no markdown, no preamble, no sign-off. Use only the headlines provided — never invent facts, names, figures or dates. If the headlines do not answer the question, say so in one line and give the closest recent update instead. Neutral tone, no links.',
                },
                {
                    role: 'user',
                    content: `Date: ${date}\nReader question: ${question}\n\nToday's headlines:\n${headlines}`,
                },
            ],
            { temperature: 0.4, maxTokens: 300 }
        );

        return NextResponse.json({ answer, model, generatedAt: new Date().toISOString() });
    } catch (error) {
        console.error('Ask API Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to answer';
        const status = message.includes('rate-limited') ? 429 : 502;
        return NextResponse.json({ error: message }, { status });
    }
}
