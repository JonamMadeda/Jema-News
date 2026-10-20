// Shared digest cache.
//
// Problem: the old in-memory cache lives per serverless instance, so most
// visitors paid the full RSS + AI cost (~10s). This module prefers Upstash
// Redis (shared across all instances + survives cold starts) and falls back
// to process memory when the KV env vars aren't configured (local dev).
// Accuracy is untouched — same prompt, same models, just served instantly.

import { getSharedRedis } from '@/lib/redis';

export type CachedDigest = {
    briefing: string;
    headlineCount: number;
    generatedAt: string;
    model: string;
    sources: string[];
};

const KEY = 'jema:digest';
const LOCK_KEY = 'jema:digest-lock';
const TTL_SECONDS = 3 * 60 * 60; // 3 hours, mirrors the client cache
const LOCK_TTL_SECONDS = 90;

// Memory fallback for local dev / missing env
let memory: { data: CachedDigest; expiresAt: number } | null = null;
let memoryLockUntil = 0;

export async function getDigest(): Promise<{ data: CachedDigest; cached: boolean } | null> {
    const kv = getSharedRedis();
    if (kv) {
        try {
            const data = await kv.get<CachedDigest>(KEY);
            if (data?.briefing) return { data, cached: true };
            return null;
        } catch (err) {
            console.error('Digest KV read failed, using memory:', err);
        }
    }
    if (memory && Date.now() < memory.expiresAt) {
        return { data: memory.data, cached: true };
    }
    return null;
}

export async function setDigest(data: CachedDigest): Promise<void> {
    const kv = getSharedRedis();
    if (kv) {
        try {
            await kv.set(KEY, data, { ex: TTL_SECONDS });
            return;
        } catch (err) {
            console.error('Digest KV write failed, using memory:', err);
        }
    }
    memory = { data, expiresAt: Date.now() + TTL_SECONDS * 1000 };
}

/** Distributed single-flight: only one builder runs at a time. */
export async function tryAcquireDigestLock(): Promise<boolean> {
    const kv = getSharedRedis();
    if (kv) {
        try {
            const res = await kv.set(LOCK_KEY, Date.now().toString(), {
                ex: LOCK_TTL_SECONDS,
                nx: true,
            });
            return res === 'OK';
        } catch {
            // fall through to memory lock
        }
    }
    const now = Date.now();
    if (now < memoryLockUntil) return false;
    memoryLockUntil = now + LOCK_TTL_SECONDS * 1000;
    return true;
}

export async function releaseDigestLock(): Promise<void> {
    const kv = getSharedRedis();
    if (kv) {
        try {
            await kv.del(LOCK_KEY);
        } catch {
            // ignore
        }
    }
    memoryLockUntil = 0;
}

export function backendName(): string {
    return getSharedRedis() ? 'kv' : 'memory';
}
