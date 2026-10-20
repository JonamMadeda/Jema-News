import { fetchNews, resolveByIds } from '@/lib/rss';
import { VALID_CATEGORIES } from '@/lib/types';
import { checkRateLimit, clientKey, rateLimitedResponse } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 50;
const MAX_IDS = 60;
const MAX_Q_LENGTH = 200;
const MAX_ID_LENGTH = 4096;

export async function GET(req: Request) {
    const rl = await checkRateLimit(clientKey(req, 'news'), 120, 60);
    if (!rl.allowed) return rateLimitedResponse(rl.remaining);

    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(
            MAX_LIMIT,
            Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
        );
        const rawCategory = searchParams.get('category') || 'All';
        const category =
            rawCategory === 'All' ||
            (VALID_CATEGORIES as readonly string[]).includes(rawCategory)
                ? rawCategory
                : 'All';
        const q = (searchParams.get('q') || '').trim().slice(0, MAX_Q_LENGTH).toLowerCase();
        const idsParam = (searchParams.get('ids') || '').trim().slice(0, MAX_IDS * (MAX_ID_LENGTH + 1));

        const all = await fetchNews();

        // Batch lookup for bookmarks / history / deep-links — preserves request order
        if (idsParam) {
            const wanted = idsParam
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0 && s.length <= MAX_ID_LENGTH)
                .slice(0, MAX_IDS);
            const items = resolveByIds(all, wanted);
            return NextResponse.json({ items, total: items.length, page: 1, limit: items.length, totalPages: 1 });
        }

        let result = all;
        if (category !== 'All') {
            result = result.filter((item) => item.category === category);
        }
        if (q) {
            result = result.filter(
                (item) =>
                    item.title.toLowerCase().includes(q) ||
                    item.contentSnippet.toLowerCase().includes(q)
            );
        }

        const total = result.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const items = result.slice((safePage - 1) * limit, safePage * limit);

        // Category counts over the full set (for filter pills)
        const counts: Record<string, number> = { All: all.length };
        for (const n of all) {
            counts[n.category] = (counts[n.category] || 0) + 1;
        }

        return NextResponse.json({ items, total, page: safePage, limit, totalPages, counts });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}
