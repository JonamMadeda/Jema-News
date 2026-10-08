// Shared digest cache.
//
// Problem: the old in-memory cache lives per serverless instance, so most
// visitors paid the full RSS + AI cost (~10s). This module prefers Upstash
// Redis (shared across all instances + survives cold starts) and falls back
// to process memory when the KV env vars aren't configured (local dev).
// Accuracy is untouched — same prompt, same models, just served instantly.

import { getRedis } from '@/lib/redis';
import type { Redis } from '@upstash/redis';

export type CachedDigest = {
    briefing: string;
    headlineCount: number;
    generatedAt: string;
    model: string;
    sources: string[];
};

const KEY = 'jema:digest';
const TTL_SECONDS = 3 * 60 * 60; // 3 hours, mirrors the client cache

// Lazy singleton (avoids throwing at import time when env is absent)
let client: Redis | null | undefined;
function redis(): Redis | null {
    if (client === undefined) client = getRedis();
    return client;
}

// Memory fallback for local dev / missing env
let memory: { data: CachedDigest; expiresAt: number } | null = null;

export async function getDigest(): Promise<{ data: CachedDigest; cached: boolean } | null> {
    const kv = redis();
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
    const kv = redis();
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

export function backendName(): string {
    return redis() ? 'kv' : 'memory';
}
