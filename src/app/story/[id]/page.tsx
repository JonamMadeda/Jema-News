import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findStory } from '@/lib/story';
import StoryView from './StoryView';

export const revalidate = 600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const story = await findStory(id);
    if (!story) return { title: 'Story not found — Jemanews' };

    const description = story.contentSnippet.slice(0, 200) || `${story.source} • ${story.category}`;
    return {
        title: `${story.title} — Jemanews`,
        description,
        openGraph: {
            title: story.title,
            description,
            type: 'article',
            publishedTime: story.pubDate,
            authors: [story.source],
        },
        twitter: {
            card: 'summary_large_image',
            title: story.title,
            description,
        },
    };
}

export default async function StoryPage({ params }: Props) {
    const { id } = await params;
    const story = await findStory(id);
    if (!story) notFound();

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-5 md:py-8">
            <StoryView item={story} />
        </div>
    );
}
