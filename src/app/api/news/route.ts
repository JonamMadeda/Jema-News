import { fetchNews } from '@/lib/rss';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 50;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(
            MAX_LIMIT,
            Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
        );
        const category = searchParams.get('category') || 'All';
        const q = (searchParams.get('q') || '').trim().toLowerCase();
        const idsParam = (searchParams.get('ids') || '').trim();

        const all = await fetchNews();

        // Batch lookup for bookmarks / history / deep-links — preserves request order
        if (idsParam) {
            const wanted = idsParam.split(',').filter(Boolean);
            const byId = new Map(all.map((n) => [n.id, n]));
            const items = wanted.map((id) => byId.get(id)).filter((n) => n !== undefined);
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
