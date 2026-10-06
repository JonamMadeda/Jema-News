'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { NewsItem } from '@/lib/rss';
import NewsCard from './NewsCard';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import NewsDetail from './NewsDetail';
import StatusHeader from './StatusHeader';
import DailyDigest from './DailyDigest';

type Tab = 'latest' | 'brief';

function getInitialTab(): Tab {
    if (typeof window === 'undefined') return 'brief';
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'latest' ? 'latest' : 'brief';
}

function getPageNumbers(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
}

export default function NewsList() {
    const [activeTab, setActiveTab] = useState<Tab>('brief');
    const [news, setNews] = useState<NewsItem[]>([]);
    const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
    const listTopRef = useRef<HTMLDivElement>(null);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        setActiveTab(getInitialTab());
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

    // Handle browser back button for detail view
    useEffect(() => {
        const handlePopState = () => {
            setSelectedItem(null);
        };

        if (selectedItem) {
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [selectedItem]);

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

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { All: news.length };
        for (const n of news) {
            counts[n.category] = (counts[n.category] || 0) + 1;
        }
        return counts;
    }, [news]);

    const totalPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedNews = filteredNews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const isFiltering = searchQuery.trim() !== '' || activeCategory !== 'All';

    function handleTabChange(tab: Tab) {
        setActiveTab(tab);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState({}, '', url.toString());
        } catch {
            // ignore — tabs still work without URL sync
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handlePageChange(page: number) {
        setCurrentPage(page);
        listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (selectedItem) {
        return <NewsDetail item={selectedItem} onBack={() => window.history.back()} />;
    }

    if (loading) {
        return (
            <div className="space-y-6 py-10" aria-busy="true" aria-label="Loading news">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-4">
                        <div className="h-20 w-24 md:h-28 md:w-40 bg-gray-100 rounded-md shrink-0"></div>
                        <div className="flex-1 space-y-3 py-1">
                            <div className="h-3 bg-gray-100 w-32 rounded-full"></div>
                            <div className="h-5 bg-gray-100 w-3/4 rounded"></div>
                            <div className="h-4 bg-gray-100 w-full rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <div className="text-gray-500">
                    <p className="text-sm uppercase tracking-widest font-bold mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="min-h-[44px] text-xs font-black uppercase tracking-widest px-6 py-3 bg-[#001f3f] text-white rounded-full hover:bg-[#003366] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={listTopRef} className="flex flex-col scroll-mt-24">
            <StatusHeader updateCount={filteredNews.length} />

            <div
                role="tablist"
                aria-label="Switch between brief and latest news"
                className="bg-gray-100 p-1.5 rounded-full flex gap-1 mb-8"
            >
                <button
                    role="tab"
                    aria-selected={activeTab === 'brief'}
                    onClick={() => handleTabChange('brief')}
                    className={`flex-1 min-h-[44px] rounded-full px-5 text-xs font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2 ${activeTab === 'brief'
                        ? 'bg-[#001f3f] text-white shadow-md shadow-blue-900/20'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'brief' ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                    Daily Brief
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'latest'}
                    onClick={() => handleTabChange('latest')}
                    className={`flex-1 min-h-[44px] rounded-full px-5 text-xs font-black uppercase tracking-[0.15em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2 ${activeTab === 'latest'
                        ? 'bg-[#001f3f] text-white shadow-md shadow-blue-900/20'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    Latest News
                </button>
            </div>

            {activeTab === 'brief' ? (
                <DailyDigest />
            ) : (
                <>
                    <div className="sticky top-16 md:top-20 z-30 bg-white/95 backdrop-blur-sm -mx-1 px-1 pt-2 pb-3 border-b border-gray-100">
                        <SearchBar value={searchQuery} onChange={setSearchQuery} />
                        <CategoryFilter
                            activeCategory={activeCategory}
                            onCategoryChange={setActiveCategory}
                            counts={categoryCounts}
                        />
                    </div>

                    {isFiltering && (
                        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500" role="status">
                            {filteredNews.length} result{filteredNews.length === 1 ? '' : 's'}
                            {searchQuery.trim() && <> for &ldquo;{searchQuery.trim()}&rdquo;</>}
                            {activeCategory !== 'All' && <> in {activeCategory}</>}
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setActiveCategory('All');
                                }}
                                className="ml-3 underline underline-offset-4 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] rounded"
                            >
                                Clear
                            </button>
                        </p>
                    )}

                    <div className="mt-4">
                        {paginatedNews.length > 0 ? (
                            <>
                                <div className="divide-y divide-gray-100">
                                    {paginatedNews.map((item, idx) => (
                                        <NewsCard
                                            key={`${item.id}-${idx}`}
                                            item={item}
                                            onSelect={(item: NewsItem) => {
                                                window.history.pushState({ detail: true }, '');
                                                setSelectedItem(item);
                                                window.scrollTo(0, 0);
                                            }}
                                        />
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <nav aria-label="News pages" className="mt-10 flex flex-col gap-4 border-t border-gray-100 pt-6">
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                            {getPageNumbers(currentPage, totalPages).map((p, i) =>
                                                p === '…' ? (
                                                    <span key={`e-${i}`} className="text-gray-400 px-1">…</span>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        onClick={() => handlePageChange(p)}
                                                        aria-current={p === currentPage ? 'page' : undefined}
                                                        className={`min-w-[44px] min-h-[44px] px-3 rounded-full text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] ${p === currentPage
                                                            ? 'bg-[#001f3f] text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="min-h-[44px] text-xs font-black uppercase tracking-[0.2em] text-[#001f3f] disabled:text-gray-300 flex items-center gap-2 px-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                            >
                                                ← Previous
                                            </button>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="min-h-[44px] text-xs font-black uppercase tracking-[0.2em] text-[#001f3f] disabled:text-gray-300 flex items-center gap-2 px-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                            >
                                                Next →
                                            </button>
                                        </div>
                                    </nav>
                                )}
                            </>
                        ) : (
                            <div className="py-20 text-center">
                                <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">
                                    No articles found matching your criteria.
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setActiveCategory('All');
                                    }}
                                    className="min-h-[44px] text-xs font-black uppercase tracking-widest px-6 py-3 border border-gray-300 rounded-full hover:border-[#001f3f] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
