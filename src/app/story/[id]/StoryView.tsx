'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NewsDetail from '@/components/NewsDetail';
import { NewsItem } from '@/lib/rss';
import { loadBookmarks, recordHistory, toggleBookmark } from '@/lib/storage';
import { useState } from 'react';

export default function StoryView({ item }: { item: NewsItem }) {
    const router = useRouter();
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        recordHistory(item.id);
        setSaved(loadBookmarks().includes(item.id));
    }, [item.id]);

    return (
        <NewsDetail
            item={item}
            onBack={() => router.push('/')}
            saved={saved}
            onToggleSave={() => setSaved(toggleBookmark(item.id).saved)}
        />
    );
}
