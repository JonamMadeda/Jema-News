import { fetchPool, legacyDecodeStoryId } from '@/lib/rss';
import type { NewsItem } from '@/lib/types';

const MAX_ID_LENGTH = 4096;

export function decodeStoryId(id: string): string | null {
    if (!id || id.length > MAX_ID_LENGTH) return null;
    // New short hash ids are not reversible — resolution happens via lookup.
    // This helper only decodes legacy base64url ids.
    return legacyDecodeStoryId(id);
}

export async function findStory(id: string): Promise<NewsItem | null> {
    if (!id || id.length > MAX_ID_LENGTH) return null;
    try {
        const news = await fetchPool();
        const direct = news.find((n) => n.id === id);
        if (direct) return direct;
        const link = legacyDecodeStoryId(id);
        if (!link) return null;
        return news.find((n) => n.link === link) || null;
    } catch {
        return null;
    }
}
