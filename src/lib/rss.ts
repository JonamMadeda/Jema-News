import Parser from 'rss-parser';

export type NewsItem = {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    contentSnippet: string;
    source: string;
    category: string;
};

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
const FEED_TIMEOUT_MS = 12000;

let cache: { items: NewsItem[]; expiresAt: number } | null = null;
let inflight: Promise<NewsItem[]> | null = null;

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
        // Full base64url id — reversible so /story/[id] can resolve the link
        const id = Buffer.from(link).toString('base64url');

        return {
            id,
            title: item.title || 'No Title',
            link: link,
            pubDate: item.pubDate || new Date().toISOString(),
            contentSnippet: item.contentSnippet || '',
            source: feed.name,
            category: feed.category,
        };
    });
}

export async function fetchNews(): Promise<NewsItem[]> {
    // Serve cache when fresh; share one in-flight fetch across concurrent requests
    if (cache && Date.now() < cache.expiresAt) return cache.items;
    if (inflight) return inflight;

    inflight = (async () => {
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
        const sorted = uniqueNews.sort(
            (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
        );
        cache = { items: sorted, expiresAt: Date.now() + CACHE_TTL_MS };
        return sorted;
    })();

    try {
        return await inflight;
    } finally {
        inflight = null;
    }
}
