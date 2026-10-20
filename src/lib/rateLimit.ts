import { getSharedRedis } from '@/lib/redis';

type Entry = { count: number; resetAt: number };
const memory = new Map<string, Entry>();

function getClientIp(req: Request): string {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
    return req.headers.get('x-real-ip') || 'unknown';
}

export function clientKey(req: Request, scope: string): string {
    return `rl:${scope}:${getClientIp(req)}`;
}

/**
 * Fixed-window rate limit. Prefers Redis (shared across instances),
 * falls back to in-memory (single instance). Fail-open on Redis errors.
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
    const kv = getSharedRedis();
    if (kv) {
        try {
            const count = await kv.incr(key);
            if (count === 1) {
                await kv.expire(key, windowSeconds);
            }
            return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
        } catch {
            // fail through to memory
        }
    }
    const now = Date.now();
    const cur = memory.get(key);
    if (!cur || now > cur.resetAt) {
        memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
        return { allowed: true, remaining: limit - 1 };
    }
    cur.count += 1;
    if (memory.size > 2000) {
        for (const [k, v] of memory) {
            if (v.resetAt < now) memory.delete(k);
            if (memory.size < 1500) break;
        }
    }
    return { allowed: cur.count <= limit, remaining: Math.max(0, limit - cur.count) };
}

export function rateLimitedResponse(remaining = 0) {
    return Response.json(
        { error: 'Too many requests. Try again in a minute.' },
        { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(remaining) } }
    );
}
