import { NextResponse } from 'next/server';
import { hasAiProvider } from '@/lib/ai';
import { buildFreshDigest } from '@/lib/digest';
import { getDigest, releaseDigestLock, setDigest, tryAcquireDigestLock } from '@/lib/digestCache';
import { checkRateLimit, clientKey, rateLimitedResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const rl = await checkRateLimit(clientKey(req, 'digest'), 20, 60);
    if (!rl.allowed) return rateLimitedResponse(rl.remaining);

    if (!hasAiProvider()) {
        return NextResponse.json(
            {
                error: 'AI is not configured. Set OPENROUTER_API_KEY, GROQ_API_KEY or GEMINI_API_KEY.',
            },
            { status: 500 }
        );
    }

    const hit = await getDigest();
    if (hit) {
        return NextResponse.json({ ...hit.data, cached: true });
    }

    // Single-flight: if another instance is already building, poll briefly
    // then tell the client to keep waiting instead of burning AI credits.
    const locked = await tryAcquireDigestLock();
    if (!locked) {
        for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r, 1000));
            const retry = await getDigest();
            if (retry) return NextResponse.json({ ...retry.data, cached: true });
        }
        return NextResponse.json(
            { pending: true, error: 'Brief is being generated. This usually takes a few seconds.' },
            { status: 202, headers: { 'Retry-After': '3' } }
        );
    }

    try {
        const data = await buildFreshDigest();
        await setDigest(data);
        return NextResponse.json({ ...data, cached: false });
    } catch (error) {
        console.error('Digest API Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate daily digest';
        const status = message.includes('rate-limited') ? 429 : 502;
        return NextResponse.json({ error: message }, { status });
    } finally {
        await releaseDigestLock();
    }
}
