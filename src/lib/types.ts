export type NewsItem = {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    contentSnippet: string;
    source: string;
    category: string;
};

export type StorySource = Pick<NewsItem, 'title' | 'source' | 'link'>;

export const VALID_CATEGORIES = [
    'General',
    'Politics',
    'Business',
    'Education',
    'Health',
] as const;

export type NewsCategory = (typeof VALID_CATEGORIES)[number] | 'All';
