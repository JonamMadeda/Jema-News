'use client';

import { useEffect, useState } from 'react';
import { NewsItem } from '@/lib/rss';
import NewsCard from './NewsCard';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import NewsDetail from './NewsDetail';

export default function NewsList() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
    const ITEMS_PER_PAGE = 7;

    useEffect(() => {
        async function loadNews() {
            try {
                const response = await fetch('/api/news');
                if (!response.ok) throw new Error('Failed to fetch news');
                const data = await response.json();
                setNews(data);
                setFilteredNews(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong');
            } finally {
                setLoading(false);
            }
        }
        loadNews();
    }, []);

    useEffect(() => {
        let result = [...news];

        if (activeCategory !== 'All') {
            result = result.filter(item => item.category === activeCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                item =>
                    item.title.toLowerCase().includes(query) ||
                    item.contentSnippet.toLowerCase().includes(query)
            );
        }

        setFilteredNews(result);
        setCurrentPage(1); // Reset to first page when filtering/searching
    }, [searchQuery, activeCategory, news]);

    const totalPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedNews = filteredNews.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (selectedItem) {
        return <NewsDetail item={selectedItem} onBack={() => setSelectedItem(null)} />;
    }

    if (loading) {
        return (
            <div className="space-y-12 py-10">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse space-y-4">
                        <div className="h-3 bg-gray-100 w-24 rounded"></div>
                        <div className="h-8 bg-gray-100 w-3/4 rounded"></div>
                        <div className="h-4 bg-gray-100 w-full rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <div className="text-gray-400">
                    <p className="text-sm uppercase tracking-widest font-bold mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-[10px] font-black uppercase tracking-widest px-6 py-3 border border-gray-200 hover:border-[#001f3f] transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <CategoryFilter
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
            />

            <div className="mt-8">
                {paginatedNews.length > 0 ? (
                    <>
                        <div className="divide-y divide-gray-100">
                            {paginatedNews.map((item, idx) => (
                                <NewsCard
                                    key={`${item.id}-${idx}`}
                                    item={item}
                                    onSelect={(item) => {
                                        setSelectedItem(item);
                                        window.scrollTo(0, 0);
                                    }}
                                />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-12 flex items-center justify-between border-t border-gray-100 pt-8">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-[#001f3f] disabled:text-gray-300 flex items-center gap-2 group"
                                >
                                    <svg className="w-3 h-3 transform transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Previous
                                </button>

                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-[#001f3f] disabled:text-gray-300 flex items-center gap-2 group"
                                >
                                    Next
                                    <svg className="w-3 h-3 transform transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-20 text-center text-gray-400">
                        <p className="text-sm font-bold uppercase tracking-[0.2em]">
                            No articles found matching your criteria.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
