import { NextResponse } from 'next/server';
import { saveSubscription } from '@/lib/push';
import { checkRateLimit, clientKey, rateLimitedResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const rl = await checkRateLimit(clientKey(req, 'push-sub'), 20, 60);
    if (!rl.allowed) return rateLimitedResponse(rl.remaining);

    try {
        const text = await req.text();
        // 4KB cap — push subscriptions are small JSON
        if (text.length > 4096) {
            return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
        }
        const body = JSON.parse(text || '{}');
        const sub = body?.subscription;
        await saveSubscription(sub);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Subscribe failed:', error);
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
}
