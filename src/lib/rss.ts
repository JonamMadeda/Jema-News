import Parser from 'rss-parser';
import { createHash } from 'node:crypto';
import { getSharedRedis } from '@/lib/redis';
import type { NewsItem } from '@/lib/types';

export type { NewsItem } from '@/lib/types';

const parser = new Parser();

const FEEDS = [
    // General/Kenya
    { name: 'The Standard', category: 'General', url: 'https://www.standardmedia.co.ke/rss/kenya.php' },
    { name: 'Capital News', category: 'General', url: 'https://www.capitalfm.co.ke/news/feed/' },
    { name: 'Citizen Digital', category: 'General', url: 'https://www.citizen.digital/feed.xml' },
    { name: 'Tuko', category: 'General', url: 'https://www.tuko.co.ke/rss/all.rss' },
    { name: 'KBC', category: 'General', url: 'https://www.kbc.co.ke/feed/' },

    // Politics
    { name: 'The Standard', category: 'Politics', url: 'https://www.standardmedia.co.ke/rss/politics.php' },

    // Business
    { name: 'The Standard', category: 'Business', url: 'https://www.standardmedia.co.ke/rss/business.php' },
    { name: 'Capital Business', category: 'Business', url: 'https://www.capitalfm.co.ke/business/feed/' },

    // Education
    { name: 'The Standard', category: 'Education', url: 'https://www.standardmedia.co.ke/rss/education.php' },

    // Health
    { name: 'The Standard', category: 'Health', url: 'https://www.standardmedia.co.ke/rss/health.php' },

];

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REDIS_KEY = 'jema:news';
const REDIS_TTL_SECONDS = 5 * 60;
const FEED_TIMEOUT_MS = 12000;
const MAX_ID_LENGTH = 4096;

let cache: { items: NewsItem[]; expiresAt: number } | null = null;
let inflight: Promise<NewsItem[]> | null = null;

export function makeStoryId(link: string): string {
    return createHash('sha256').update(link).digest('hex').slice(0, 16);
}

/** Backward-compat: old ids were full base64url(link). Returns link or null. */
export function legacyDecodeStoryId(id: string): string | null {
    if (!id || id.length > MAX_ID_LENGTH) return null;
    try {
        const link = Buffer.from(id, 'base64url').toString('utf-8');
        if (!link.startsWith('http')) return null;
        return link;
    } catch {
        return null;
    }
}

/** Resolve a mixed list of new (hash) + legacy (base64url) ids, preserving request order. */
export function resolveByIds(all: NewsItem[], wanted: string[]): NewsItem[] {
    const byId = new Map(all.map((n) => [n.id, n]));
    const byLink = new Map(all.map((n) => [n.link, n]));
    const out: NewsItem[] = [];
    for (const id of wanted) {
        const hit = byId.get(id);
        if (hit) {
            out.push(hit);
            continue;
        }
        const link = legacyDecodeStoryId(id);
        if (link) {
            const byLinkHit = byLink.get(link);
            if (byLinkHit) out.push(byLinkHit);
        }
    }
    return out;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Feed timeout: ${label}`)), ms);
    });
    return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

async function fetchFeed(feed: (typeof FEEDS)[number]): Promise<NewsItem[]> {
    const parsedFeed = await withTimeout(parser.parseURL(feed.url), FEED_TIMEOUT_MS, feed.url);
    return parsedFeed.items.map((item) => {
        const link = item.link || '#';
        return {
            id: makeStoryId(link),
            title: item.title || 'No Title',
            link: link,
            pubDate: item.pubDate || new Date().toISOString(),
            contentSnippet: item.contentSnippet || '',
            source: feed.name,
            category: feed.category,
        };
    });
}

async function fetchFresh(): Promise<NewsItem[]> {
    // All feeds in parallel — one slow feed can't block the rest
    const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed)));
    const allNews: NewsItem[] = [];
    results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
            allNews.push(...r.value);
        } else {
            console.error(`Error fetching from ${FEEDS[i].name} (${FEEDS[i].category}):`, r.reason);
        }
    });

    // De-duplicate by link
    const seen = new Set();
    const uniqueNews = allNews.filter((item) => {
        const duplicate = seen.has(item.link);
        seen.add(item.link);
        return !duplicate;
    });

    // Sort by date descending
    return uniqueNews.sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
}

export async function fetchNews(): Promise<NewsItem[]> {
    // 1. Memory (fastest, same-instance)
    if (cache && Date.now() < cache.expiresAt) return cache.items;
    if (inflight) return inflight;

    // 2. Shared Redis (cross-instance, survives cold starts)
    const kv = getSharedRedis();
    if (kv) {
        try {
            const cached = await kv.get<NewsItem[]>(REDIS_KEY);
            if (Array.isArray(cached) && cached.length > 0) {
                cache = { items: cached, expiresAt: Date.now() + CACHE_TTL_MS };
                return cached;
            }
        } catch (err) {
            console.error('News KV read failed, falling through to fetch:', err);
        }
    }

    inflight = (async () => {
        const sorted = await fetchFresh();
        cache = { items: sorted, expiresAt: Date.now() + CACHE_TTL_MS };
        if (kv && sorted.length > 0) {
            try {
                await kv.set(REDIS_KEY, sorted, { ex: REDIS_TTL_SECONDS });
            } catch (err) {
                console.error('News KV write failed:', err);
            }
        }
        return sorted;
    })();

    try {
        return await inflight;
    } finally {
        inflight = null;
    }
}
