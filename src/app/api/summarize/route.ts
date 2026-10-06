import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';

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
                            'You are a Kenyan news summarizer. Summarize the article in 3 concise bullet points (max 80 words total). Neutral tone, no hallucinations, no links. Return markdown bullets.',
                    },
                    {
                        role: 'user',
                        content: `Title: ${title}\nSource: ${source || 'Unknown'} | Category: ${category || 'General'}\nExcerpt: ${(snippet || '').slice(0, 800)}`,
                    },
                ],
                temperature: 0.3,
                max_tokens: 300,
            }),
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'AI provider failed. Try again later.' }, { status: 502 });
        }

        const json = await response.json();
        const summary: string | undefined = json?.choices?.[0]?.message?.content;
        if (!summary) {
            return NextResponse.json({ error: 'AI returned empty summary' }, { status: 502 });
        }

        return NextResponse.json({ summary });
    } catch (error) {
        console.error('Summarize error:', error);
        return NextResponse.json({ error: 'Failed to summarize' }, { status: 500 });
    }
}
