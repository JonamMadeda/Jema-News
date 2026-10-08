import { Redis } from '@upstash/redis';

// Resolves a Redis client from either naming scheme:
// - Newer Upstash integration: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// - Older / custom prefix:    KV_REST_API_URL / KV_REST_API_TOKEN
// Returns null when nothing is configured (callers fall back to memory).
// NOTE: the READ_ONLY token can't write — always prefer the full token.
export function getRedis(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    try {
        return new Redis({ url, token });
    } catch {
        return null;
    }
}
