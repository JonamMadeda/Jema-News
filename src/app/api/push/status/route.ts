import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// Safe diagnostics: counts only, never endpoints or keys.
export async function GET() {
    const kv = getRedis();
    let subscriberCount: number | null = null;
    if (kv) {
        try {
            const subs = await kv.hgetall('jema:push-subs');
            subscriberCount = subs ? Object.keys(subs).length : 0;
        } catch {
            subscriberCount = null;
        }
    }
    return NextResponse.json({
        redisConfigured: Boolean(kv),
        subscriberCount,
        vapidConfigured: Boolean(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
        ),
    });
}
