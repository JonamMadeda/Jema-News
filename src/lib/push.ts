import webpush from 'web-push';
import { getRedis } from '@/lib/redis';

export type PushSubscriptionJSON = {
    endpoint: string;
    keys: { p256dh: string; auth: string };
};

export type BriefPushPayload = {
    title: string;
    body: string;
    url: string;
};

const SUBS_KEY = 'jema:push-subs';

function redis() {
    return getRedis();
}

// Dev fallback when Redis isn't configured (per-process only)
const memorySubs = new Map<string, PushSubscriptionJSON>();

function vapidConfigured(): boolean {
    return Boolean(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
            process.env.VAPID_PRIVATE_KEY &&
            process.env.VAPID_SUBJECT
    );
}

export async function listSubscriptions(): Promise<PushSubscriptionJSON[]> {
    const kv = redis();
    if (kv) {
        try {
            const subs = await kv.hgetall<Record<string, PushSubscriptionJSON>>(SUBS_KEY);
            return subs ? Object.values(subs) : [];
        } catch (err) {
            console.error('Push subs read failed:', err);
            return [];
        }
    }
    return [...memorySubs.values()];
}

export async function saveSubscription(sub: PushSubscriptionJSON): Promise<{ stored: boolean }> {
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        throw new Error('Invalid subscription');
    }
    const kv = redis();
    if (kv) {
        await kv.hset(SUBS_KEY, { [sub.endpoint]: sub });
        return { stored: true };
    }
    memorySubs.set(sub.endpoint, sub);
    return { stored: true };
}

export async function removeSubscription(endpoint: string): Promise<void> {
    if (!endpoint) return;
    const kv = redis();
    if (kv) {
        try {
            await kv.hdel(SUBS_KEY, endpoint);
        } catch (err) {
            console.error('Push subs delete failed:', err);
        }
        return;
    }
    memorySubs.delete(endpoint);
}

export async function sendBriefPush(
    payload: BriefPushPayload
): Promise<{ sent: number; failed: number; total: number }> {
    if (!vapidConfigured()) {
        throw new Error('VAPID keys not configured');
    }
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT as string,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
        process.env.VAPID_PRIVATE_KEY as string
    );

    const subs = await listSubscriptions();
    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(sub as webpush.PushSubscription, JSON.stringify(payload));
                sent++;
            } catch (err) {
                failed++;
                // Prune dead endpoints so the set stays healthy
                const statusCode = (err as { statusCode?: number })?.statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    await removeSubscription(sub.endpoint);
                } else {
                    console.error('Push send failed:', statusCode ?? err);
                }
            }
        })
    );

    return { sent, failed, total: subs.length };
}
