import { fetchNews, NewsItem } from '@/lib/rss';

export function decodeStoryId(id: string): string | null {
    try {
        const link = Buffer.from(id, 'base64url').toString('utf-8');
        if (!link.startsWith('http')) return null;
        return link;
    } catch {
        return null;
    }
}

export async function findStory(id: string): Promise<NewsItem | null> {
    const link = decodeStoryId(id);
    if (!link) return null;
    try {
        const news = await fetchNews();
        return news.find((n) => n.link === link) || null;
    } catch {
        return null;
    }
}
