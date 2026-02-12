import Parser from 'rss-parser';

export type NewsItem = {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    contentSnippet: string;
    source: string;
    imageUrl?: string;
    category: string;
};

const parser = new Parser();

const FEEDS = [
    // General/Kenya
    { name: 'The Standard', category: 'General', url: 'https://www.standardmedia.co.ke/rss/kenya.php' },
    { name: 'Capital News', category: 'General', url: 'https://www.capitalfm.co.ke/news/feed/' },

    // Politics
    { name: 'The Standard', category: 'Politics', url: 'https://www.standardmedia.co.ke/rss/politics.php' },

    // Business
    { name: 'The Standard', category: 'Business', url: 'https://www.standardmedia.co.ke/rss/business.php' },
    { name: 'Capital Business', category: 'Business', url: 'https://www.capitalfm.co.ke/business/feed/' },

    // Sports
    { name: 'The Standard', category: 'Sports', url: 'https://www.standardmedia.co.ke/rss/sports.php' },
    { name: 'Capital Sports', category: 'Sports', url: 'https://www.capitalfm.co.ke/sports/feed/' },

    // Entertainment / Lifestyle
    { name: 'The Standard', category: 'Entertainment', url: 'https://www.standardmedia.co.ke/rss/entertainment.php' },
    { name: 'Capital Lifestyle', category: 'Lifestyle', url: 'https://www.capitalfm.co.ke/lifestyle/feed/' },
];

export async function fetchNews(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    for (const feed of FEEDS) {
        try {
            const parsedFeed = await parser.parseURL(feed.url);
            const items = parsedFeed.items.map((item) => {
                const imageUrl = item.enclosure?.url || (item as any).mediaContent?.$?.url;
                const link = item.link || '#';
                const id = Buffer.from(link).toString('base64').substring(0, 16);

                return {
                    id,
                    title: item.title || 'No Title',
                    link: link,
                    pubDate: item.pubDate || new Date().toISOString(),
                    contentSnippet: item.contentSnippet || '',
                    source: feed.name,
                    imageUrl: imageUrl,
                    category: feed.category,
                };
            });
            allNews.push(...items);
        } catch (error) {
            console.error(`Error fetching from ${feed.name} (${feed.category}):`, error);
        }
    }

    // De-duplicate by link
    const seen = new Set();
    const uniqueNews = allNews.filter((item) => {
        const duplicate = seen.has(item.link);
        seen.add(item.link);
        return !duplicate;
    });

    // Sort by date descending
    return uniqueNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}
