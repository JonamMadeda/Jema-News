import { NextResponse } from 'next/server';
import { hasAiProvider } from '@/lib/ai';
import { buildFreshDigest } from '@/lib/digest';
import { setDigest } from '@/lib/digestCache';
import { sendBriefPush } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorized(req: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    // Header-only: ?secret= leaks in Vercel logs / browser history.
    return req.headers.get('authorization') === `Bearer ${secret}`;
}

// Daily job (cron): build a fresh morning brief, cache it, and notify every
// subscriber exactly once. No per-user AI cost beyond the single brief.
export async function GET(req: Request) {
    if (!authorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasAiProvider()) {
        return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    try {
        const data = await buildFreshDigest();
        await setDigest(data);

        const firstHeadline =
            data.briefing
                .split('\n')
                .map((l) => l.replace(/^[-*•\d.)\s#]+/, '').trim())
                .find((l) => l.length > 20)
                ?.slice(0, 120) || 'Top Kenyan stories in ~2 minutes';

        const result = await sendBriefPush({
            title: "Today's briefing is ready",
            body: firstHeadline,
            url: '/?tab=brief',
        });

        return NextResponse.json({
            ok: true,
            headlineCount: data.headlineCount,
            ...result,
        });
    } catch (error) {
        console.error('Daily brief job failed:', error);
        const message = error instanceof Error ? error.message : 'Job failed';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
