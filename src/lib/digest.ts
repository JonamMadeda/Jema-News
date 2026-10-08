import { fetchNews } from '@/lib/rss';
import { completeWithFallback } from '@/lib/ai';
import { CachedDigest } from '@/lib/digestCache';

// Builds a fresh briefing (no cache read). Shared by /api/digest and the
// daily push job so both use the same prompt and models.
export async function buildFreshDigest(apiKey: string): Promise<CachedDigest> {
    const news = await fetchNews();
    if (news.length === 0) {
        throw new Error('No news available to summarize');
    }

    const top = news.slice(0, 20);
    const headlines = top
        .map((n, i) => `${i + 1}. [${n.category} | ${n.source}] ${n.title} — ${n.contentSnippet?.slice(0, 200) || 'No excerpt'}`)
        .join('\n');

    const { text: briefing, model } = await completeWithFallback(
        apiKey,
        [
            {
                role: 'system',
                content:
                    'You are the Jemanews editor for Kenya. Output only a concise daily briefing in markdown with: 1) "Top Stories" (max 5 bullets, 1-2 sentences each), 2) "In Brief" (one line per remaining category). Keep total under 300 words. No preamble, no explanation. Neutral tone, no hallucinations, no links.',
            },
            {
                role: 'user',
                content: `Summarize these Kenyan headlines into a daily digest:\n\n${headlines}`,
            },
        ],
        { temperature: 0.4, maxTokens: 800 }
    );

    return {
        briefing,
        headlineCount: top.length,
        generatedAt: new Date().toISOString(),
        model,
        sources: [...new Set(top.map((t) => t.source))].slice(0, 6),
    };
}
