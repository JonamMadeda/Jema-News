'use client';

import { useEffect, useRef, useState } from 'react';
import type { NewsItem } from '@/lib/types';
import NewsCard from './NewsCard';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import NewsDetail from './NewsDetail';
import DailyDigest from './DailyDigest';
import AskNews from './AskNews';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import SubscribeButton from './SubscribeButton';
import LoadingMessage from './LoadingMessage';
import { loadBookmarks, loadHistory, recordHistory, toggleBookmark } from '@/lib/storage';
import { isAppTab, type Tab } from '@/lib/tabs';
import { TAB_EVENT, REFRESH_EVENT, getInitialTab, setAppTab } from './Navbar';

function getPageNumbers(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
}

function readParams(fallbackTab: Tab = 'ask') {
    // fallbackTab comes from the server (?tab=) so SSR and hydration agree
    if (typeof window === 'undefined') return { tab: fallbackTab, cat: 'All', q: '', page: 1, story: '' };
    const s = new URLSearchParams(window.location.search);
    const t = s.get('tab');
    return {
        tab: (isAppTab(t) ? t : fallbackTab) as Tab,
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
        apply('tab', next.tab, 'ask');
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

export default function NewsList({ initialTab = 'ask' }: { initialTab?: Tab }) {
    const initial = useRef(readParams(initialTab));
    const [activeTab, setActiveTab] = useState<Tab>(initial.current.tab);
    const [items, setItems] = useState<NewsItem[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [counts, setCounts] = useState<Record<string, number>>({ All: 0 });
    const [trending, setTrending] = useState<NewsItem[]>([]);
    const [savedItems, setSavedItems] = useState<NewsItem[]>([]);
    const [recentItems, setRecentItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageLoading, setPageLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(initial.current.q);
    const [debouncedQuery, setDebouncedQuery] = useState(initial.current.q);
    const [activeCategory, setActiveCategory] = useState(initial.current.cat);
    const [currentPage, setCurrentPage] = useState(initial.current.page);
    const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [bookmarkIds, setBookmarkIds] = useState<string[]>(() => loadBookmarks());
    const [historyIds, setHistoryIds] = useState<string[]>(() => loadHistory());
    const listTopRef = useRef<HTMLDivElement>(null);
    const savedScroll = useRef(0);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const pageCache = useRef(new Map<string, Awaited<ReturnType<typeof fetchPage>>>());
    const LIMIT = 6;
    const PAGE_CACHE_CAP = 20;

    function cacheSet(key: string, value: Awaited<ReturnType<typeof fetchPage>>) {
        const m = pageCache.current;
        if (m.has(key)) m.delete(key);
        m.set(key, value);
        if (m.size > PAGE_CACHE_CAP) {
            const oldest = m.keys().next().value;
            if (oldest !== undefined) m.delete(oldest);
        }
    }

    function showToast(msg: string) {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2500);
    }

    function pageKey(page: number, cat: string, q: string) {
        return `${page}|${cat}|${q.trim().toLowerCase()}`;
    }

    async function fetchPage(page: number, cat: string, q: string, signal?: AbortSignal) {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(LIMIT),
            category: cat,
            q: q.trim(),
        });
        const response = await fetch(`/api/news?${params.toString()}`, { signal });
        if (!response.ok) throw new Error('Failed to fetch news');
        return response.json() as Promise<{
            items: NewsItem[];
            total: number;
            page: number;
            totalPages: number;
            counts: Record<string, number>;
        }>;
    }

    // Load one server page (cache-first) + prefetch the next page in background
    async function loadPage(page: number, cat: string, q: string) {
        const key = pageKey(page, cat, q);
        const hit = pageCache.current.get(key);
        if (hit) {
            setItems(hit.items);
            setTotal(hit.total);
            setTotalPages(hit.totalPages);
            setCounts(hit.counts);
            if (hit.page !== page) setCurrentPage(hit.page);
        } else {
            abortRef.current?.abort();
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            const firstLoad = items.length === 0;
            if (firstLoad) setLoading(true);
            else setPageLoading(true);
            setError(null);
            try {
                const data = await fetchPage(page, cat, q, ctrl.signal);
                cacheSet(key, data);
                setItems(data.items);
                setTotal(data.total);
                setTotalPages(data.totalPages);
                setCounts(data.counts);
                if (data.page !== page) setCurrentPage(data.page);
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                setError(err instanceof Error ? err.message : 'Something went wrong');
            } finally {
                setLoading(false);
                setPageLoading(false);
            }
        }
        // Prefetch next page so Next feels instant
        if (page < totalPagesRef.current) {
            const nextKey = pageKey(page + 1, cat, q);
            if (!pageCache.current.has(nextKey)) {
                fetchPage(page + 1, cat, q)
                    .then((data) => cacheSet(nextKey, data))
                    .catch(() => {});
            }
        }
    }
    const totalPagesRef = useRef(1);
    totalPagesRef.current = totalPages;

    async function loadTrending() {
        try {
            const params = new URLSearchParams({ page: '1', limit: '8', category: 'All', q: '' });
            const response = await fetch(`/api/news?${params.toString()}`);
            if (!response.ok) return;
            const data = await response.json();
            setTrending(data.items);
        } catch {
            // trending is optional — feed works without it
        }
    }

    async function loadByIds(ids: string[]): Promise<NewsItem[]> {
        if (ids.length === 0) return [];
        try {
            const params = new URLSearchParams({ ids: ids.slice(0, 60).join(',') });
            const response = await fetch(`/api/news?${params.toString()}`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.items;
        } catch {
            return [];
        }
    }

    async function loadSavedLists(bIds: string[], hIds: string[]) {
        const [saved, recent] = await Promise.all([
            loadByIds(bIds),
            loadByIds(hIds.slice(0, 10)),
        ]);
        setSavedItems(saved);
        setRecentItems(recent);
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
            pageCache.current.clear();
            loadPage(currentPageRef.current, activeCategoryRef.current, debouncedQueryRef.current)
                .then(() => showToast('Updated just now'));
            loadTrending();
            window.dispatchEvent(new CustomEvent('jema:digest-refresh'));
        };
        window.addEventListener(TAB_EVENT, onTab);
        window.addEventListener('popstate', onPop);
        window.addEventListener(REFRESH_EVENT, onRefresh);
        loadPage(initial.current.page, initial.current.cat, initial.current.q);
        loadTrending();
        // Deep-linked story (?story=) resolves via a tiny ids lookup
        const storyId = initial.current.story;
        if (storyId) {
            loadByIds([storyId]).then(([found]) => {
                if (found) {
                    savedScroll.current = window.scrollY;
                    setSelectedItem(found);
                }
            });
        }
        return () => {
            window.removeEventListener(TAB_EVENT, onTab);
            window.removeEventListener('popstate', onPop);
            window.removeEventListener(REFRESH_EVENT, onRefresh);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refs so the refresh handler always sees current values
    const currentPageRef = useRef(currentPage);
    currentPageRef.current = currentPage;
    const activeCategoryRef = useRef(activeCategory);
    activeCategoryRef.current = activeCategory;
    const debouncedQueryRef = useRef(debouncedQuery);
    debouncedQueryRef.current = debouncedQuery;

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

    // Debounce search so typing doesn't fire a request per keystroke
    useEffect(() => {
        const id = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(id);
    }, [searchQuery]);

    // Server-driven pages: reload whenever page / category / debounced query changes
    useEffect(() => {
        loadPage(currentPage, activeCategory, debouncedQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, activeCategory, debouncedQuery]);

    // Saved + history resolve through the tiny ids lookup
    useEffect(() => {
        if (activeTab === 'saved') loadSavedLists(bookmarkIds, historyIds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, bookmarkIds, historyIds]);

    // Sync filter/page/tab to URL (debounced for query via replaceState)
    useEffect(() => {
        writeParams({ tab: activeTab, cat: activeCategory, q: searchQuery, page: currentPage });
    }, [activeTab, activeCategory, searchQuery, currentPage]);

    const paginatedNews = items;
    const safePage = Math.min(currentPage, Math.max(1, totalPages));
    const isFiltering = searchQuery.trim() !== '' || activeCategory !== 'All';
    const showHero = !isFiltering && safePage === 1 && paginatedNews.length > 0;
    const heroItem = showHero ? paginatedNews[0] : null;
    const restItems = showHero ? paginatedNews.slice(1) : paginatedNews;
    function handleTabChange(tab: Tab) {
        setActiveTab(tab);
        setAppTab(tab);
        setCurrentPage(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handlePageChange(page: number) {
        setCurrentPage(page);
        listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function handleSelect(item: NewsItem) {
        savedScroll.current = window.scrollY;
        setSelectedItem(item);
        recordHistory(item.id);
        setHistoryIds(loadHistory());
        writeParams({ story: item.id }, false);
        window.scrollTo(0, 0);
    }

    function handleToggleBookmark(item: NewsItem) {
        const { saved, ids } = toggleBookmark(item.id);
        setBookmarkIds(ids);
        showToast(saved ? 'Saved to your list' : 'Removed from saved');
    }

    function handleBack() {
        writeParams({ story: '' }, false);
        setSelectedItem(null);
        requestAnimationFrame(() => window.scrollTo(0, savedScroll.current || 0));
    }

    function handleRefresh() {
        setIsRefreshing(true);
        window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
        setTimeout(() => setIsRefreshing(false), 800);
    }

    return (
        <div className="flex flex-col md:flex-row h-dvh w-full overflow-hidden bg-slate-50">
            {/* Left Sidebar */}
            <Sidebar activeTab={activeTab} onSelectTab={handleTabChange} />

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
                {/* Mobile top header bar */}
                <header className="md:hidden shrink-0 h-12 border-b border-slate-200/80 bg-white px-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                            J
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                            Jemanews
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <SubscribeButton />
                        <button
                            onClick={handleRefresh}
                            aria-label="Refresh news feeds"
                            title="Refresh news"
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25"
                        >
                            <svg
                                className={`w-4 h-4 transition-transform duration-700 ${isRefreshing ? 'rotate-180 text-slate-900' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5 9a8 8 0 0114-3M19 15a8 8 0 01-14 3" />
                            </svg>
                        </button>
                    </div>
                </header>

                {toast && (
                    <div className="fixed top-3 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in">
                        {toast}
                    </div>
                )}

                {/* Right Workspace */}
                <div ref={listTopRef} className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
                    {selectedItem ? (
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6">
                            <div className="max-w-3xl mx-auto w-full">
                                <NewsDetail
                                    item={selectedItem}
                                    onBack={handleBack}
                                    saved={bookmarkIds.includes(selectedItem.id)}
                                    onToggleSave={() => handleToggleBookmark(selectedItem)}
                                />
                            </div>
                        </div>
                    ) : activeTab === 'ask' ? (
                        <AskNews />
                    ) : loading && items.length === 0 ? (
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6">
                            <div className="max-w-5xl mx-auto w-full space-y-4">
                                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                                    <LoadingMessage
                                        stages={[
                                            'Connecting to Kenyan outlets…',
                                            'Gathering the latest headlines…',
                                            'Sorting stories by recency…',
                                        ]}
                                    />
                                </div>
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="animate-pulse bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2">
                                        <div className="h-3 bg-slate-100 w-28 rounded-md"></div>
                                        <div className="h-4 bg-slate-100 w-3/4 rounded-md"></div>
                                        <div className="h-3 bg-slate-100 w-full rounded-md"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6">
                            <div className="max-w-xl mx-auto text-center py-12 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
                                <p className="text-sm font-semibold text-slate-800 mb-4">{error}</p>
                                <button
                                    onClick={() => {
                                        pageCache.current.clear();
                                        loadPage(currentPage, activeCategory, debouncedQuery);
                                    }}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            <div className="max-w-5xl mx-auto w-full">
                                {activeTab === 'brief' ? (
                                    <div className="px-4 sm:px-8 py-6">
                                        <DailyDigest />
                                    </div>
                                ) : activeTab === 'latest' ? (
                                    <div>
                                        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm px-4 sm:px-8 pt-4 pb-3 border-b border-slate-200/70">
                                            <SearchBar value={searchQuery} onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }} />
                                            <CategoryFilter
                                                activeCategory={activeCategory}
                                                onCategoryChange={(c) => { setActiveCategory(c); setCurrentPage(1); }}
                                                counts={counts}
                                            />
                                        </div>
                                        <div className="px-4 sm:px-8 pt-4 pb-6">

                                                {isFiltering && (
                                                    <p className="mb-3 text-xs font-semibold text-slate-600 flex items-center justify-between" role="status">
                                                        <span>
                                                            {total} result{total === 1 ? '' : 's'}
                                                            {searchQuery.trim() && <> for &ldquo;{searchQuery.trim()}&rdquo;</>}
                                                            {activeCategory !== 'All' && <> in {activeCategory}</>}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setSearchQuery('');
                                                                setActiveCategory('All');
                                                            }}
                                                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
                                                        >
                                                            Clear filters
                                                        </button>
                                                    </p>
                                                )}

                                                <div className="mt-2">
                                                    {pageLoading && items.length > 0 && (
                                                        <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5">
                                                            <LoadingMessage stages={['Loading page…']} intervalMs={1200} />
                                                        </div>
                                                    )}
                                                    {paginatedNews.length > 0 ? (
                                                        <>
                                                            {heroItem && (
                                                                <article
                                                                    onClick={() => handleSelect(heroItem)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSelect(heroItem);
                                                                    }}
                                                                    tabIndex={0}
                                                                    className="group cursor-pointer mb-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/60 p-4 sm:p-5 hover:border-slate-300 hover:shadow-sm transition-all active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                                                                >
                                                                    <div className="flex items-center gap-2 flex-wrap mb-2.5 text-xs">
                                                                        <span className="bg-slate-900 text-white font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs text-[11px]">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                                            Top Story
                                                                        </span>
                                                                        <span className="font-semibold text-slate-700">{heroItem.category}</span>
                                                                        <span aria-hidden="true" className="text-slate-300">•</span>
                                                                        <span className="text-slate-500 font-medium truncate">{heroItem.source}</span>
                                                                    </div>
                                                                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 group-hover:text-blue-700 leading-tight tracking-tight mb-2 transition-colors">
                                                                        {heroItem.title}
                                                                    </h3>
                                                                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                                                                        {heroItem.contentSnippet}
                                                                    </p>
                                                                </article>
                                                            )}
                                                            <div className="divide-y divide-slate-100">
                                                                {restItems.map((item, idx) => (
                                                                    <NewsCard
                                                                        key={`${item.id}-${idx}`}
                                                                        item={item}
                                                                        onSelect={handleSelect}
                                                                        saved={bookmarkIds.includes(item.id)}
                                                                        onToggleSave={() => handleToggleBookmark(item)}
                                                                    />
                                                                ))}
                                                            </div>

                                                            {totalPages > 1 && (
                                                                <nav aria-label="News pages" className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5">
                                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                                        {getPageNumbers(safePage, totalPages).map((p, i) =>
                                                                            p === '…' ? (
                                                                                <span key={`e-${i}`} className="text-slate-400 px-1 text-xs">…</span>
                                                                            ) : (
                                                                                <button
                                                                                    key={p}
                                                                                    onClick={() => handlePageChange(p)}
                                                                                    aria-current={p === safePage ? 'page' : undefined}
                                                                                    className={`min-w-[34px] min-h-[34px] px-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                                                                                        p === safePage
                                                                                            ? 'bg-slate-900 text-white shadow-2xs'
                                                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                                    }`}
                                                                                >
                                                                                    {p}
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-xs">
                                                                        <button
                                                                            onClick={() => handlePageChange(Math.max(safePage - 1, 1))}
                                                                            disabled={safePage === 1}
                                                                            className="px-3 py-1.5 rounded-lg font-semibold text-slate-700 disabled:text-slate-300 hover:bg-slate-100 transition-colors"
                                                                        >
                                                                            ← Prev
                                                                        </button>
                                                                        <span className="text-xs font-medium text-slate-500">
                                                                            Page {safePage} of {totalPages}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => handlePageChange(Math.min(safePage + 1, totalPages))}
                                                                            disabled={safePage === totalPages}
                                                                            className="px-3 py-1.5 rounded-lg font-semibold text-slate-700 disabled:text-slate-300 hover:bg-slate-100 transition-colors"
                                                                        >
                                                                            Next →
                                                                        </button>
                                                                    </div>
                                                                </nav>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="py-14 text-center">
                                                            <p className="text-sm font-semibold text-slate-700 mb-3">
                                                                No articles found.
                                                            </p>
                                                            <button
                                                                onClick={() => {
                                                                    setSearchQuery('');
                                                                    setActiveCategory('All');
                                                                }}
                                                                className="text-xs font-semibold px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors"
                                                            >
                                                                Reset all filters
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                        </div>
                                    </div>
                                ) : activeTab === 'trending' ? (
                                    <div className="px-4 sm:px-8 py-6">
                                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/70">
                                                <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                                                    Trending Kenya Stories
                                                </h2>
                                            </div>
                                            {trending.length > 0 ? (
                                                <div className="divide-y divide-slate-100">
                                                    {trending.map((t, i) => (
                                                        <button
                                                            key={`${t.id}-${i}`}
                                                            onClick={() => handleSelect(t)}
                                                            className="w-full text-left flex items-start gap-3 py-3.5 first:pt-1 last:pb-1 group hover:bg-white rounded-xl px-2 -mx-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                                                        >
                                                            <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 transition-colors">
                                                                {i + 1}
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block text-sm sm:text-base font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                                                                    {t.title}
                                                                </span>
                                                                <span className="block mt-1 text-[11px] font-medium text-slate-500 truncate">
                                                                    {t.source} • {t.category}
                                                                </span>
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="py-10 text-center text-xs font-medium text-slate-500">
                                                    No trending stories right now.
                                                </p>
                                            )}
                                        </div>
                                ) : (
                                    <div className="px-4 sm:px-8 py-6 space-y-6">
                                        <section>
                                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 pb-2 border-b border-slate-200/70 flex items-center justify-between">
                                                    <span>Bookmarked Stories</span>
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 text-[11px]">
                                                        {savedItems.length}
                                                    </span>
                                                </h2>
                                                {savedItems.length > 0 ? (
                                                    <div className="divide-y divide-slate-100">
                                                        {savedItems.map((item) => (
                                                            <NewsCard
                                                                key={item.id}
                                                                item={item}
                                                                onSelect={handleSelect}
                                                                saved
                                                                onToggleSave={() => handleToggleBookmark(item)}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="py-8 text-center text-xs text-slate-500">
                                                        Nothing saved yet. Tap the bookmark icon on any story to save it for later.
                                                    </p>
                                                )}
                                            </section>
                                        <section>
                                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 pb-2 border-b border-slate-200/70">
                                                Recently Read
                                            </h2>
                                                {recentItems.length > 0 ? (
                                                    <div className="divide-y divide-slate-100">
                                                        {recentItems.map((item) => (
                                                            <NewsCard
                                                                key={item.id}
                                                                item={item}
                                                                onSelect={handleSelect}
                                                                saved={bookmarkIds.includes(item.id)}
                                                                onToggleSave={() => handleToggleBookmark(item)}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="py-6 text-center text-sm text-gray-600">
                                                        Stories you open will appear here.
                                                    </p>
                                                )}
                                            </section>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <BottomNav activeTab={activeTab} onChange={handleTabChange} />
            </div>
        </div>
    );
}
