import Parser from 'rss-parser';
import { createHash } from 'node:crypto';
import { getSharedRedis } from '@/lib/redis';
import type { NewsCategory, NewsItem } from '@/lib/types';

export type { NewsItem } from '@/lib/types';

type FeedCategory = Exclude<NewsCategory, 'All'>;

type Feed = {
    source: string;
    category: FeedCategory;
    url: string;
};

const FEEDS: Feed[] = [
    // Health
    { source: 'Capital News', category: 'Health', url: 'https://www.capitalfm.co.ke/health/feed/' },
    { source: 'KBC', category: 'Health', url: 'https://www.kbc.co.ke/category/health/feed/' },

    // Education
    { source: 'Capital News', category: 'Education', url: 'https://www.capitalfm.co.ke/education/feed/' },

    // Politics
    { source: 'The Standard', category: 'Politics', url: 'https://www.standardmedia.co.ke/rss/politics.php' },
    { source: 'Capital News', category: 'Politics', url: 'https://www.capitalfm.co.ke/politics/feed/' },

    // Business
    { source: 'The Standard', category: 'Business', url: 'https://www.standardmedia.co.ke/rss/business.php' },
    { source: 'Capital News', category: 'Business', url: 'https://www.capitalfm.co.ke/business/feed/' },
    { source: 'KBC', category: 'Business', url: 'https://www.kbc.co.ke/category/business/feed/' },

    // General
    { source: 'Nation Africa', category: 'General', url: 'https://nation.africa/kenya/rss.xml' },
    { source: 'Citizen Digital', category: 'General', url: 'https://www.citizen.digital/feed.xml' },
    { source: 'The Standard', category: 'General', url: 'https://www.standardmedia.co.ke/rss/kenya.php' },
    { source: 'Capital News', category: 'General', url: 'https://www.capitalfm.co.ke/news/feed/' },
    { source: 'KBC', category: 'General', url: 'https://www.kbc.co.ke/feed/' },
];

const SOURCE_WEIGHT: Record<string, number> = {
    'Nation Africa': 5,
    'The Standard': 5,
    'Citizen Digital': 5,
    'Capital News': 4,
    KBC: 4,
};

const CATEGORY_STRENGTH: Record<FeedCategory, number> = {
    Health: 4,
    Education: 4,
    Politics: 3,
    Business: 3,
    General: 1,
};

const MAX_NEWS = 50;
const MAX_PER_SOURCE = 18;
const MAX_POOL = 300;
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_RECENT_ITEMS = 20;
const DUP_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const DUP_THRESHOLD = 0.5;

const CATEGORY_ORDER: FeedCategory[] = ['Health', 'Education', 'Politics', 'Business', 'General'];

const CATEGORY_TARGETS: Record<FeedCategory, number> = {
    Health: 9,
    Education: 9,
    Politics: 10,
    Business: 10,
    General: 12,
};

const CATEGORY_RULES: { category: Exclude<FeedCategory, 'General'>; terms: string[] }[] = [
    {
        category: 'Health',
        terms: [
            'health', 'healthcare', 'hospital', 'hospitals', 'clinic', 'clinics', 'medical',
            'medicine', 'medics', 'doctor', 'doctors', 'nurse', 'nurses', 'patient', 'patients',
            'disease', 'diseases', 'illness', 'outbreak', 'epidemic', 'pandemic', 'ebola', 'mpox',
            'cholera', 'malaria', 'dengue', 'hiv', 'aids', 'cancer', 'diabetes', 'tuberculosis',
            'vaccine', 'vaccines', 'vaccination', 'immunisation', 'immunization', 'maternal',
            'pregnancy', 'reproductive', 'surgery', 'pharmacy', 'pharmaceutical', 'mental health',
            'nutrition', 'sanitation', 'public health', 'ministry of health', 'health ministry',
            'who warns', 'world health organization', 'nhif', 'shif', 'social health insurance',
            'health insurance', 'kmtc', 'referral hospital', 'county hospital', 'mama lucy',
        ],
    },
    {
        category: 'Education',
        terms: [
            'education', 'school', 'schools', 'student', 'students', 'learner', 'learners',
            'teacher', 'teachers', 'lecturer', 'lecturers', 'tutor', 'tutors', 'university',
            'universities', 'college', 'colleges', 'campus', 'campuses', 'exam', 'exams',
            'examination', 'examinations', 'kcse', 'kcpe', 'cbc', 'curriculum', 'classroom',
            'classrooms', 'academic', 'academics', 'scholarship', 'scholarships', 'bursary',
            'bursaries', 'tuition', 'tsc', 'knut', 'kuppet', 'uasu', 'kusu', 'tvet',
            'polytechnic', 'polytechnics', 'principal', 'headteacher', 'ministry of education',
            'education ministry', 'helb', 'student loan', 'school feeding',
        ],
    },
    {
        category: 'Business',
        terms: [
            'business', 'economy', 'economic', 'economics', 'trade', 'trading', 'market', 'markets',
            'investor', 'investors', 'investment', 'investments', 'company', 'companies',
            'corporate', 'bank', 'banks', 'banking', 'finance', 'financial', 'shilling',
            'inflation', 'tax', 'taxes', 'revenue', 'gdp', 'exports', 'imports', 'startup',
            'startups', 'sme', 'smes', 'sacco', 'saccos', 'tourism', 'agriculture', 'farming',
            'farmers', 'manufacturing', 'industry', 'industrial', 'jobs', 'employment',
            'unemployment', 'procurement', 'tender', 'tenders', 'safaricom', 'equity bank', 'kcb',
            'ncba', 'mpesa', 'm pesa', 'fuliza', 'housing', 'affordable housing', 'construction',
            'real estate', 'oil', 'fuel', 'petrol', 'diesel', 'tea', 'coffee', 'horticulture',
            'avocado', 'maize', 'sugar', 'budget', 'treasury', 'central bank', 'interest rate',
            'loan', 'loans', 'credit', 'insurance',
        ],
    },
    {
        category: 'Politics',
        terms: [
            'politics', 'political', 'politician', 'politicians', 'president', 'deputy president',
            'ruto', 'gachagua', 'raila', 'odinga', 'uhuru', 'kenyatta', 'william ruto', 'rigathi',
            'mudavadi', 'wetangula', 'sifuna', 'parliament', 'national assembly', 'senate',
            'senator', 'senators', 'mp', 'mps', 'member of parliament', 'governor', 'governors',
            'county government', 'devolution', 'cabinet', 'cabinet secretary', 'principal secretary',
            'state house', 'election', 'elections', 'iebc', 'voter', 'voters', 'voter registration',
            'by election', 'party', 'parties', 'uda', 'odm', 'jubilee', 'dcp', 'ford kenya', 'anc',
            'constitution', 'constitutional', 'bill', 'bills', 'law', 'laws', 'court', 'courts',
            'judge', 'judges', 'judiciary', 'supreme court', 'high court', 'petition', 'petitions',
            'corruption', 'eacc', 'arrest', 'arrested', 'police', 'dci', 'security', 'impeachment',
            'censure', 'county assembly', 'mca', 'mcas', 'public participation', 'referendum',
            'coalition', 'opposition', 'ruling party',
        ],
    },
];

const KENYA_TERMS = [
    'kenya', 'kenyan', 'kenyans', 'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'thika',
    'machakos', 'kajiado', 'kiambu', 'muranga', 'nyeri', 'meru', 'embu', 'kericho', 'bomet',
    'narok', 'naivasha', 'kakamega', 'bungoma', 'busia', 'siaya', 'homa bay', 'migori', 'kisii',
    'nyamira', 'vihiga', 'trans nzoia', 'kitale', 'turkana', 'lodwar', 'marsabit', 'isiolo',
    'wajir', 'mandera', 'garissa', 'kilifi', 'malindi', 'lamu', 'kwale', 'taita taveta', 'voi',
    'kitui', 'makueni', 'mwingi', 'ruto', 'gachagua', 'raila', 'odinga', 'uhuru', 'kenyatta',
    'mudavadi', 'wetangula', 'sifuna', 'kindiki', 'sakaja', 'natembeya', 'wamalwa', 'kalonzo',
    'mutua', 'iebc', 'parliament', 'state house', 'harambee', 'safaricom', 'mpesa', 'm pesa',
    'matatu', 'boda boda', 'county', 'counties', 'mca', 'mcas', 'nyumba kumi', 'hustler',
    'kwanza', 'bunge', 'senate', 'national assembly', 'judiciary', 'eacc', 'dci', 'kdf', 'nps',
    'kenya defence forces', 'kenya police', 'starehe', 'kibera', 'mathare', 'kasarani',
    'embakasi', 'westlands', 'langata', 'kibra', 'ruaraka', 'dagoretti', 'kamukunji',
    'makadara',
];

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'from', 'with', 'at',
    'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'has', 'have', 'had', 'do',
    'does', 'did', 'will', 'would', 'can', 'could', 'may', 'might', 'must', 'this', 'that',
    'these', 'those', 'it', 'its', 'he', 'she', 'they', 'them', 'his', 'her', 'their', 'we',
    'our', 'you', 'your', 'i', 'me', 'my', 'not', 'no', 'so', 'than', 'then', 'now', 'just',
    'after', 'before', 'over', 'under', 'into', 'amid', 'says', 'say', 'said', 'new', 'up',
    'out', 'about', 'more', 'most', 'also', 'how', 'why', 'what', 'who', 'when', 'where',
    'which', 'while', 'during', 'between', 'against', 'through', 'across', 'off', 'per', 'vs',
    'via', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
]);

const parser = new Parser({
    timeout: 18000,
    headers: {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
});

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REDIS_KEY = 'jema:news:pool:v6';
const REDIS_TTL_SECONDS = 5 * 60;
const FEED_TIMEOUT_MS = 18000;
const MAX_ID_LENGTH = 4096;

let poolCache: { items: NewsItem[]; expiresAt: number } | null = null;
let poolInflight: Promise<NewsItem[]> | null = null;

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

function decodeEntities(value: string): string {
    return value
        .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function cleanText(value: string | undefined): string {
    if (!value) return '';
    return decodeEntities(value.replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeWords(value: string): string {
    return ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function hasKenyaContext(title: string, snippet: string, link: string, tags: string[]): boolean {
    const text = normalizeWords(`${title} ${snippet} ${link} ${tags.join(' ')}`);
    return KENYA_TERMS.some((term) => text.includes(` ${term} `));
}

function countMatches(haystack: string, terms: string[]): number {
    let matches = 0;
    for (const term of terms) {
        if (haystack.includes(` ${term} `)) matches++;
    }
    return matches;
}

function classifyItem(title: string, snippet: string, link: string, tags: string[]): FeedCategory {
    const titleText = normalizeWords(title);
    const bodyText = normalizeWords(`${snippet} ${link} ${tags.join(' ')}`);
    let best: FeedCategory = 'General';
    let bestScore = 0;

    for (const rule of CATEGORY_RULES) {
        const score = countMatches(titleText, rule.terms) * 3 + countMatches(bodyText, rule.terms);
        if (score > bestScore) {
            best = rule.category;
            bestScore = score;
        }
    }

    return bestScore >= 2 ? best : 'General';
}

function itemTime(item: NewsItem): number {
    return new Date(item.pubDate).getTime() || 0;
}

function compareItems(a: NewsItem, b: NewsItem): number {
    const byDate = itemTime(b) - itemTime(a);
    if (byDate !== 0) return byDate;

    const bySource = (SOURCE_WEIGHT[b.source] || 0) - (SOURCE_WEIGHT[a.source] || 0);
    if (bySource !== 0) return bySource;

    return b.contentSnippet.length - a.contentSnippet.length;
}

function canonicalKey(link: string): string {
    try {
        const url = new URL(link);
        url.hash = '';
        const tracking: string[] = [];
        url.searchParams.forEach((_, key) => {
            if (/^(utm_|fbclid$|gclid$|mc_|ref$|source$)/i.test(key)) tracking.push(key);
        });
        for (const key of tracking) url.searchParams.delete(key);
        url.searchParams.sort();
        return url.toString().replace(/\/$/, '');
    } catch {
        return link;
    }
}

function meaningfulTokens(value: string): Set<string> {
    const tokens = value
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
    return new Set(tokens);
}

function titleSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size < 4 || b.size < 4) return 0;
    let intersection = 0;
    for (const token of a) {
        if (b.has(token)) intersection++;
    }
    return intersection / (a.size + b.size - intersection);
}

function categoryStrength(category: string): number {
    return CATEGORY_STRENGTH[category as FeedCategory] ?? 1;
}

function mergeItems(current: NewsItem, candidate: NewsItem): NewsItem {
    const category =
        categoryStrength(candidate.category) > categoryStrength(current.category)
            ? candidate.category
            : current.category;
    const preferred = compareItems(candidate, current) < 0 ? candidate : current;
    return { ...preferred, category };
}

function dedupeItems(items: NewsItem[]): NewsItem[] {
    const byUrl = new Map<string, number>();
    const kept: { item: NewsItem; tokens: Set<string>; time: number }[] = [];

    for (const candidate of items) {
        const urlKey = canonicalKey(candidate.link);
        let index = byUrl.get(urlKey);

        if (index === undefined) {
            const candidateTokens = meaningfulTokens(candidate.title);
            const candidateTime = itemTime(candidate);
            const match = kept.findIndex(
                (entry) =>
                    Math.abs(entry.time - candidateTime) <= DUP_WINDOW_MS &&
                    titleSimilarity(entry.tokens, candidateTokens) >= DUP_THRESHOLD
            );
            if (match >= 0) index = match;
        }

        if (index !== undefined) {
            const merged = mergeItems(kept[index].item, candidate);
            kept[index] = {
                item: merged,
                tokens: meaningfulTokens(merged.title),
                time: itemTime(merged),
            };
            byUrl.set(urlKey, index);
            byUrl.set(canonicalKey(merged.link), index);
            continue;
        }

        const nextIndex = kept.length;
        byUrl.set(urlKey, nextIndex);
        kept.push({
            item: candidate,
            tokens: meaningfulTokens(candidate.title),
            time: itemTime(candidate),
        });
    }

    return kept.map((entry) => entry.item);
}

function onlyRecent(items: NewsItem[]): NewsItem[] {
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    const recent = items.filter((item) => itemTime(item) >= cutoff);
    return recent.length >= MIN_RECENT_ITEMS ? recent : items;
}

function selectBalanced(items: NewsItem[]): NewsItem[] {
    const sorted = [...items].sort(compareItems);
    const selected: NewsItem[] = [];
    const selectedIds = new Set<string>();
    const sourceCounts = new Map<string, number>();

    const take = (item: NewsItem) => {
        selected.push(item);
        selectedIds.add(item.id);
        sourceCounts.set(item.source, (sourceCounts.get(item.source) || 0) + 1);
    };

    for (const category of CATEGORY_ORDER) {
        let remaining = CATEGORY_TARGETS[category];
        if (remaining <= 0 || selected.length >= MAX_NEWS) continue;

        const bySource = new Map<string, NewsItem[]>();
        for (const item of sorted) {
            if (item.category !== category || selectedIds.has(item.id)) continue;
            const bucket = bySource.get(item.source);
            if (bucket) bucket.push(item);
            else bySource.set(item.source, [item]);
        }

        const buckets = [...bySource.entries()].map(([source, items]) => ({
            source,
            items,
            next: 0,
        }));

        while (remaining > 0) {
            let progressed = false;
            for (const bucket of buckets) {
                if (remaining <= 0 || selected.length >= MAX_NEWS) break;
                if ((sourceCounts.get(bucket.source) || 0) >= MAX_PER_SOURCE) continue;
                const item = bucket.items[bucket.next];
                bucket.next += 1;
                if (!item || selectedIds.has(item.id)) continue;
                take(item);
                remaining--;
                progressed = true;
            }
            if (!progressed) break;
        }
    }

    for (const item of sorted) {
        if (selected.length >= MAX_NEWS) break;
        if (selectedIds.has(item.id)) continue;
        if ((sourceCounts.get(item.source) || 0) >= MAX_PER_SOURCE) continue;
        take(item);
    }

    if (selected.length < MAX_NEWS) {
        for (const item of sorted) {
            if (selected.length >= MAX_NEWS) break;
            if (selectedIds.has(item.id)) continue;
            take(item);
        }
    }

    return selected.sort(compareItems);
}

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
    const parsedFeed = await withTimeout(parser.parseURL(feed.url), FEED_TIMEOUT_MS, feed.url);
    const items: NewsItem[] = [];

    for (const item of parsedFeed.items) {
        const link = (item.link || '').trim();
        if (!/^https?:\/\//i.test(link)) continue;

        const title = cleanText(item.title).slice(0, 300);
        if (!title) continue;

        const date = new Date(item.pubDate || item.isoDate || '');
        if (Number.isNaN(date.getTime())) continue;

        const snippet = cleanText(item.contentSnippet || item.summary || item.content || '').slice(0, 700);
        const tags = item.categories || [];

        if (feed.category === 'General') {
            if (/opinion|editorial/i.test(tags.join(' '))) continue;
            if (/\/(blogs-opinion|opinion|editorials?)\//i.test(link)) continue;
            if (!hasKenyaContext(title, snippet, link, tags)) continue;
        }

        const category =
            feed.category === 'General'
                ? classifyItem(title, snippet, link, tags)
                : feed.category;

        items.push({
            id: makeStoryId(link),
            title,
            link,
            pubDate: date.toISOString(),
            contentSnippet: snippet,
            source: feed.source,
            category,
        });
    }

    return items;
}

async function fetchFreshPool(): Promise<NewsItem[]> {
    // All feeds in parallel — one slow feed can't block the rest
    const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed)));
    const allNews: NewsItem[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            allNews.push(...result.value);
        } else {
            console.error(
                `Error fetching from ${FEEDS[index].source} (${FEEDS[index].category}):`,
                result.reason
            );
        }
    });

    const unique = dedupeItems(allNews);
    unique.sort(compareItems);
    return unique.slice(0, MAX_POOL);
}

export async function fetchPool(): Promise<NewsItem[]> {
    // 1. Memory (fastest, same-instance)
    if (poolCache && Date.now() < poolCache.expiresAt) return poolCache.items;
    if (poolInflight) return poolInflight;

    // 2. Shared Redis (cross-instance, survives cold starts)
    const kv = getSharedRedis();
    if (kv) {
        try {
            const cached = await kv.get<NewsItem[]>(REDIS_KEY);
            if (Array.isArray(cached) && cached.length > 0) {
                poolCache = { items: cached, expiresAt: Date.now() + CACHE_TTL_MS };
                return cached;
            }
        } catch (err) {
            console.error('News KV read failed, falling through to fetch:', err);
        }
    }

    poolInflight = (async () => {
        const fresh = await fetchFreshPool();
        poolCache = { items: fresh, expiresAt: Date.now() + CACHE_TTL_MS };
        if (kv && fresh.length > 0) {
            try {
                await kv.set(REDIS_KEY, fresh, { ex: REDIS_TTL_SECONDS });
            } catch (err) {
                console.error('News KV write failed:', err);
            }
        }
        return fresh;
    })();

    try {
        return await poolInflight;
    } finally {
        poolInflight = null;
    }
}

export async function fetchNews(): Promise<NewsItem[]> {
    const pool = await fetchPool();
    return selectBalanced(onlyRecent(pool));
}

export function balancedHeadlines(items: NewsItem[], limit: number): NewsItem[] {
    if (limit <= 0 || items.length === 0) return [];
    if (items.length <= limit) return items;

    const perCategory = Math.max(2, Math.floor(limit / CATEGORY_ORDER.length));
    const buckets = new Map<FeedCategory, NewsItem[]>();
    for (const item of items) {
        const category = CATEGORY_ORDER.includes(item.category as FeedCategory)
            ? (item.category as FeedCategory)
            : 'General';
        const bucket = buckets.get(category);
        if (bucket) bucket.push(item);
        else buckets.set(category, [item]);
    }

    const out: NewsItem[] = [];
    const seen = new Set<string>();
    for (const category of CATEGORY_ORDER) {
        for (const item of (buckets.get(category) || []).slice(0, perCategory)) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            out.push(item);
        }
    }

    for (const item of items) {
        if (out.length >= limit) break;
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
    }

    return out.slice(0, limit);
}
