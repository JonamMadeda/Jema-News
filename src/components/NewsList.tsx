'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { NewsItem } from '@/lib/rss';
import NewsCard from './NewsCard';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import NewsDetail from './NewsDetail';
import DailyDigest from './DailyDigest';
import LoadingMessage from './LoadingMessage';
import { TAB_EVENT, REFRESH_EVENT, getInitialTab, setAppTab } from './Navbar';

type Tab = 'latest' | 'brief';

function getPageNumbers(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
}

function readParams() {
    if (typeof window === 'undefined') return { tab: 'brief' as Tab, cat: 'All', q: '', page: 1, story: '' };
    const s = new URLSearchParams(window.location.search);
    return {
        tab: (s.get('tab') === 'latest' ? 'latest' : 'brief') as Tab,
        cat: s.get('cat') || 'All',
        q: s.get('q') || '',
        page: Math.max(1, parseInt(s.get('page') || '1', 10) || 1),
        story: s.get('story') || '',
    };
}

function writeParams(patch: Partial<{ tab: Tab; cat: string; q: string; page: number; story: string }>, replace = true) {
    try {
        const url = new URL(window.location.href);
        const apply = (k: string, v: string, def: string) => {
            if (!v || v === def) url.searchParams.delete(k);
            else url.searchParams.set(k, v);
        };
        const cur = readParams();
        const next = { ...cur, ...patch };
        apply('tab', next.tab, 'brief');
        apply('cat', next.cat, 'All');
        apply('q', next.q, '');
        apply('page', String(next.page), '1');
        if (patch.story !== undefined) {
            if (!patch.story) url.searchParams.delete('story');
            else url.searchParams.set('story', patch.story);
        }
        if (replace) window.history.replaceState({}, '', url.toString());
        else window.history.pushState({}, '', url.toString());
    } catch {
        // ignore
    }
}

export default function NewsList() {
    const initial = useRef(readParams());
    const [activeTab, setActiveTab] = useState<Tab>(initial.current.tab);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(initial.current.q);
    const [activeCategory, setActiveCategory] = useState(initial.current.cat);
    const [currentPage, setCurrentPage] = useState(initial.current.page);
    const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const listTopRef = useRef<HTMLDivElement>(null);
    const savedScroll = useRef(0);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ITEMS_PER_PAGE = 7;

    function showToast(msg: string) {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2500);
    }

    async function loadNews(silent = false) {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/news');
            if (!response.ok) throw new Error('Failed to fetch news');
            const data = await response.json();
            setNews(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setActiveTab(getInitialTab());
        const onTab = (e: Event) => setActiveTab((e as CustomEvent<Tab>).detail);
        const onPop = () => {
            const p = readParams();
            setActiveTab(p.tab);
            setActiveCategory(p.cat);
            setSearchQuery(p.q);
            setCurrentPage(p.page);
            if (!p.story) setSelectedItem(null);
        };
        const onRefresh = () => {
            loadNews(true).then(() => showToast('Updated just now'));
            window.dispatchEvent(new CustomEvent('jema:digest-refresh'));
        };
        window.addEventListener(TAB_EVENT, onTab);
        window.addEventListener('popstate', onPop);
        window.addEventListener(REFRESH_EVENT, onRefresh);
        loadNews();
        return () => {
            window.removeEventListener(TAB_EVENT, onTab);
            window.removeEventListener('popstate', onPop);
            window.removeEventListener(REFRESH_EVENT, onRefresh);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Open deep-linked story once news arrives
    useEffect(() => {
        const storyId = readParams().story;
        if (storyId && news.length > 0 && !selectedItem) {
            const found = news.find((n) => n.id === storyId);
            if (found) {
                savedScroll.current = window.scrollY;
                setSelectedItem(found);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [news]);

    // Keyboard: '/' focuses search, Esc clears
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const target = e.target as HTMLElement;
            const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
            if (e.key === '/' && !typing) {
                e.preventDefault();
                document.getElementById('news-search')?.focus();
            }
            if (e.key === 'Escape' && typing && document.activeElement?.id === 'news-search') {
                setSearchQuery('');
                (document.activeElement as HTMLElement).blur();
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
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
    }, [searchQuery, activeCategory, news]);

    // Sync filter/page/tab to URL (debounced for query via replaceState)
    useEffect(() => {
        writeParams({ tab: activeTab, cat: activeCategory, q: searchQuery, page: currentPage });
    }, [activeTab, activeCategory, searchQuery, currentPage]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { All: news.length };
        for (const n of news) {
            counts[n.category] = (counts[n.category] || 0) + 1;
        }
        return counts;
    }, [news]);

    const totalPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE);
    const safePage = Math.min(currentPage, Math.max(1, totalPages));
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    const paginatedNews = filteredNews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const isFiltering = searchQuery.trim() !== '' || activeCategory !== 'All';
    const trending = news.slice(0, 5);
    const showHero = !isFiltering && safePage === 1 && paginatedNews.length > 0;
    const heroItem = showHero ? paginatedNews[0] : null;
    const restItems = showHero ? paginatedNews.slice(1) : paginatedNews;

    function handleTabChange(tab: Tab) {
        setActiveTab(tab);
        setAppTab(tab);
        setCurrentPage(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleTabListKey(e: React.KeyboardEvent) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        handleTabChange(activeTab === 'brief' ? 'latest' : 'brief');
    }

    function handlePageChange(page: number) {
        setCurrentPage(page);
        listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function handleSelect(item: NewsItem) {
        savedScroll.current = window.scrollY;
        setSelectedItem(item);
        writeParams({ story: item.id }, false);
        window.scrollTo(0, 0);
    }

    function handleBack() {
        writeParams({ story: '' }, false);
        setSelectedItem(null);
        requestAnimationFrame(() => window.scrollTo(0, savedScroll.current || 0));
    }

    if (selectedItem) {
        return <NewsDetail item={selectedItem} onBack={handleBack} />;
    }

    if (loading) {
        return (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start" aria-busy="true" aria-label="Loading news">
                <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-md p-3">
                        <LoadingMessage
                            stages={[
                                'Connecting to Kenyan outlets…',
                                'Gathering the latest headlines…',
                                'Sorting stories by recency…',
                            ]}
                        />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-md overflow-hidden animate-pulse">
                        <div className="aspect-[16/10] bg-gray-100"></div>
                        <div className="p-3 space-y-2">
                            <div className="h-2.5 bg-gray-100 w-28 rounded-md"></div>
                            <div className="h-4 bg-gray-100 w-3/4 rounded"></div>
                        </div>
                    </div>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse flex gap-3 bg-white border border-gray-200 rounded-md p-3">
                            <div className="h-14 w-16 bg-gray-100 rounded-md shrink-0"></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-2.5 bg-gray-100 w-28 rounded-md"></div>
                                <div className="h-4 bg-gray-100 w-3/4 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-md p-3 animate-pulse space-y-2">
                        <div className="h-3 bg-gray-100 w-1/2 rounded-md"></div>
                        <div className="h-3 bg-gray-100 w-full rounded"></div>
                        <div className="h-3 bg-gray-100 w-5/6 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-14 bg-white border border-gray-200 rounded-md">
                <div className="text-gray-600">
                    <p className="text-[13px] uppercase tracking-wide font-semibold mb-4">{error}</p>
                    <button
                        onClick={() => loadNews()}
                        className="min-h-[32px] text-[11px] font-bold uppercase tracking-wide px-4 py-1.5 bg-[#001f3f] text-white rounded-md hover:bg-[#003366] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }).format(new Date()).toUpperCase();

    return (
        <div ref={listTopRef} className="flex flex-col scroll-mt-24">
            {toast && (
                <div role="status" className="mb-3 bg-[#001f3f] text-white text-[12px] font-semibold px-3 py-2 rounded-md">
                    {toast}
                </div>
            )}
            <div className="flex items-center justify-between gap-2 mb-3 border-b border-gray-100 pb-2">
                <div
                    role="tablist"
                    aria-label="Switch between brief and latest news"
                    onKeyDown={handleTabListKey}
                    className="inline-flex w-auto bg-white border border-gray-200 p-0.5 rounded-md gap-0.5"
                >
                    <button
                        role="tab"
                        aria-selected={activeTab === 'brief'}
                        tabIndex={activeTab === 'brief' ? 0 : -1}
                        onClick={() => handleTabChange('brief')}
                        className={`min-h-[32px] rounded-md px-3 sm:px-4 text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2 active:scale-[0.98] ${activeTab === 'brief'
                            ? 'bg-[#001f3f] text-white shadow-md shadow-blue-900/20'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Daily Brief
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === 'latest'}
                        tabIndex={activeTab === 'latest' ? 0 : -1}
                        onClick={() => handleTabChange('latest')}
                        className={`min-h-[32px] rounded-md px-3 sm:px-4 text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2 active:scale-[0.98] ${activeTab === 'latest'
                            ? 'bg-[#001f3f] text-white shadow-md shadow-blue-900/20'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Latest News
                    </button>
                </div>
                <div className="flex items-center gap-2 shrink-0 min-w-0">
                    <span className="hidden md:block text-[11px] font-bold uppercase tracking-wide text-gray-900 truncate">
                        {formattedDate}
                    </span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                        {filteredNews.length} • Live
                    </span>
                </div>
            </div>

            {activeTab === 'brief' ? (
                <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                    <DailyDigest />
                    <aside className="hidden lg:block space-y-4 lg:sticky lg:top-20">
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-3">
                                Trending now
                            </h3>
                            <div className="space-y-3">
                                {trending.map((t, i) => (
                                    <button
                                        key={`${t.id}-${i}`}
                                        onClick={() => handleSelect(t)}
                                        className="w-full text-left flex gap-3 group hover:bg-gray-50 rounded-md p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                    >
                                        <span className="text-lg font-bold text-gray-200 group-hover:text-[#001f3f] leading-none shrink-0 w-6">
                                            {i + 1}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#001f3f]">
                                                {t.title}
                                            </span>
                                            <span className="block mt-1 text-[11px] text-gray-600 uppercase tracking-wide truncate">
                                                {t.source} • {t.category}
                                            </span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => handleTabChange('latest')}
                                className="mt-3 w-full min-h-[32px] text-[11px] font-bold uppercase tracking-wide text-[#001f3f] border border-gray-200 rounded-md hover:border-[#001f3f] hover:bg-gray-50 transition-colors whitespace-nowrap active:scale-[0.99]"
                            >
                                View all news →
                            </button>
                        </div>
                    </aside>
                    <details className="lg:hidden bg-white border border-gray-200 rounded-md">
                        <summary className="cursor-pointer list-none p-3 text-[11px] font-bold uppercase tracking-wide text-[#001f3f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] rounded-md">
                            Trending now ({trending.length})
                        </summary>
                        <div className="px-3 pb-3 space-y-3">
                            {trending.map((t, i) => (
                                <button
                                    key={`${t.id}-${i}`}
                                    onClick={() => handleSelect(t)}
                                    className="w-full text-left flex gap-3 group rounded-md"
                                >
                                    <span className="text-lg font-bold text-gray-200 leading-none shrink-0 w-6">{i + 1}</span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{t.title}</span>
                                        <span className="block mt-1 text-[11px] text-gray-600 uppercase tracking-wide truncate">{t.source} • {t.category}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </details>
                </div>
            ) : (
                <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                    <div className="min-w-0">
                        <div className="bg-white border border-gray-200 rounded-md px-3 pt-2 pb-3">
                            <div className="md:sticky md:top-12 z-30 bg-white/95 md:backdrop-blur-sm -mx-1 px-1 pt-1 pb-2 border-b border-gray-100">
                                <SearchBar value={searchQuery} onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }} />
                                <CategoryFilter
                                    activeCategory={activeCategory}
                                    onCategoryChange={(c) => { setActiveCategory(c); setCurrentPage(1); }}
                                    counts={categoryCounts}
                                />
                            </div>

                            {isFiltering && (
                                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-600" role="status">
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

                            <div className="mt-2">
                                {paginatedNews.length > 0 ? (
                                    <>
                                        {heroItem && (
                                            <article
                                                onClick={() => handleSelect(heroItem)}
                                                className="group cursor-pointer mb-2 rounded-md overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSelect(heroItem);
                                                }}
                                            >
                                                {heroItem.imageUrl ? (
                                                    <div className="relative">
                                                        <img
                                                            src={heroItem.imageUrl}
                                                            alt={heroItem.title}
                                                            loading="lazy"
                                                            sizes="(max-width: 1024px) 100vw, 640px"
                                                            className="w-full aspect-[16/10] object-cover bg-gray-100"
                                                        />
                                                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#001f3f] text-white rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
                                                            Top story • {heroItem.category}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full aspect-[16/10] bg-[#001f3f] flex flex-col justify-end p-4">
                                                        <span className="self-start px-2.5 py-1 bg-white/15 text-white rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap mb-2">
                                                            Top story • {heroItem.category}
                                                        </span>
                                                        <span className="text-white/60 text-[11px] uppercase tracking-wide">{heroItem.source}</span>
                                                    </div>
                                                )}
                                                <div className="p-3">
                                                    <h3 className="text-[17px] md:text-xl font-bold text-gray-900 group-hover:text-[#001f3f] leading-tight">
                                                        {heroItem.title}
                                                    </h3>
                                                    <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">
                                                        {heroItem.contentSnippet}
                                                    </p>
                                                    <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-600">
                                                        {heroItem.source}
                                                    </p>
                                                </div>
                                            </article>
                                        )}
                                        <div className="divide-y divide-gray-100">
                                            {restItems.map((item, idx) => (
                                                <NewsCard
                                                    key={`${item.id}-${idx}`}
                                                    item={item}
                                                    onSelect={handleSelect}
                                                />
                                            ))}
                                        </div>

                                        {totalPages > 1 && (
                                            <nav aria-label="News pages" className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                    {getPageNumbers(safePage, totalPages).map((p, i) =>
                                                        p === '…' ? (
                                                            <span key={`e-${i}`} className="text-gray-400 px-1">…</span>
                                                        ) : (
                                                            <button
                                                                key={p}
                                                                onClick={() => handlePageChange(p)}
                                                                aria-current={p === safePage ? 'page' : undefined}
                                                                className={`min-w-[32px] min-h-[32px] px-2 rounded-md text-[13px] font-semibold whitespace-nowrap transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] ${p === safePage
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
                                                        onClick={() => handlePageChange(Math.max(safePage - 1, 1))}
                                                        disabled={safePage === 1}
                                                        className="min-h-[32px] text-[11px] font-bold uppercase tracking-wide text-[#001f3f] disabled:text-gray-300 flex items-center gap-1.5 px-2 rounded-md whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                                    >
                                                        ← Prev
                                                    </button>
                                                    <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                                                        {safePage} / {totalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => handlePageChange(Math.min(safePage + 1, totalPages))}
                                                        disabled={safePage === totalPages}
                                                        className="min-h-[32px] text-[11px] font-bold uppercase tracking-wide text-[#001f3f] disabled:text-gray-300 flex items-center gap-1.5 px-2 rounded-md whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                                    >
                                                        Next →
                                                    </button>
                                                </div>
                                            </nav>
                                        )}
                                    </>
                                ) : (
                                    <div className="py-14 text-center">
                                        <p className="text-[13px] font-semibold uppercase tracking-wide text-gray-600 mb-4">
                                            No articles found.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                setActiveCategory('All');
                                            }}
                                            className="min-h-[32px] text-[11px] font-bold uppercase tracking-wide px-4 py-1.5 border border-gray-300 rounded-md hover:border-[#001f3f] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                        >
                                            Clear filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <aside className="hidden lg:block space-y-4 lg:sticky lg:top-20">
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-1">
                                Start with the brief
                            </h3>
                            <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
                                2-minute AI catch-up across {news.length} stories.
                            </p>
                            <button
                                onClick={() => handleTabChange('brief')}
                                className="w-full min-h-[32px] text-[11px] font-bold uppercase tracking-wide border border-gray-200 text-[#001f3f] rounded-md hover:border-[#001f3f] hover:bg-gray-50 transition-colors whitespace-nowrap active:scale-[0.99]"
                            >
                                Read Daily Brief →
                            </button>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-3">
                                Trending now
                            </h3>
                            <div className="space-y-3">
                                {trending.map((t, i) => (
                                    <button
                                        key={`${t.id}-${i}`}
                                        onClick={() => handleSelect(t)}
                                        className="w-full text-left flex gap-3 group hover:bg-gray-50 rounded-md p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                    >
                                        <span className="text-lg font-bold text-gray-200 group-hover:text-[#001f3f] leading-none shrink-0 w-6">
                                            {i + 1}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#001f3f]">
                                                {t.title}
                                            </span>
                                            <span className="block mt-1 text-[11px] text-gray-600 uppercase tracking-wide truncate">
                                                {t.source} • {t.category}
                                            </span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                    <details className="lg:hidden bg-white border border-gray-200 rounded-md">
                        <summary className="cursor-pointer list-none p-3 text-[11px] font-bold uppercase tracking-wide text-[#001f3f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] rounded-md">
                            Trending now ({trending.length})
                        </summary>
                        <div className="px-3 pb-3 space-y-3">
                            {trending.map((t, i) => (
                                <button
                                    key={`${t.id}-${i}`}
                                    onClick={() => handleSelect(t)}
                                    className="w-full text-left flex gap-3 group rounded-md"
                                >
                                    <span className="text-lg font-bold text-gray-200 leading-none shrink-0 w-6">{i + 1}</span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{t.title}</span>
                                        <span className="block mt-1 text-[11px] text-gray-600 uppercase tracking-wide truncate">{t.source} • {t.category}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}
