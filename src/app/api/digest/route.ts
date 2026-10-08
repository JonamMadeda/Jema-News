import { NextResponse } from 'next/server';
import { buildFreshDigest } from '@/lib/digest';
import { getDigest, setDigest } from '@/lib/digestCache';

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
        const data = await buildFreshDigest(apiKey);
        await setDigest(data);
        return NextResponse.json({ ...data, cached: false });
    } catch (error) {
        console.error('Digest API Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate daily digest';
        const status = message.includes('rate-limited') ? 429 : 502;
        return NextResponse.json({ error: message }, { status });
    }
}
