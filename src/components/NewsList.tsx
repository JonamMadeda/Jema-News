'use client';

import { useEffect, useRef, useState } from 'react';
import { NewsItem } from '@/lib/rss';
import NewsCard from './NewsCard';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import NewsDetail from './NewsDetail';
import DailyDigest from './DailyDigest';
import LoadingMessage from './LoadingMessage';
import { loadBookmarks, loadHistory, recordHistory, toggleBookmark } from '@/lib/storage';
import { TAB_EVENT, REFRESH_EVENT, getInitialTab, setAppTab } from './Navbar';

type Tab = 'latest' | 'brief' | 'trending' | 'saved';

const TABS: { id: Tab; label: string }[] = [
    { id: 'brief', label: 'Daily Brief' },
    { id: 'latest', label: 'Latest News' },
    { id: 'trending', label: 'Trending' },
    { id: 'saved', label: 'Saved' },
];

function getPageNumbers(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
}

function TrendingRows({ items, onSelect }: { items: NewsItem[]; onSelect: (item: NewsItem) => void }) {
    return (
        <div className="space-y-3">
            {items.map((t, i) => (
                <button
                    key={`${t.id}-${i}`}
                    onClick={() => onSelect(t)}
                    className="w-full text-left flex gap-3 group hover:bg-gray-50 rounded-md p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                >
                    <span className="text-lg font-bold text-gray-200 group-hover:text-[#001f3f] leading-none shrink-0 w-6 transition-colors">
                        {i + 1}
                    </span>
                    <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-[#001f3f]">
                            {t.title}
                        </span>
                        <span className="block mt-1 text-[11px] text-gray-600 uppercase tracking-wide truncate">
                            {t.source} • {t.category}
                        </span>
                    </span>
                </button>
            ))}
        </div>
    );
}

function readParams() {
    if (typeof window === 'undefined') return { tab: 'brief' as Tab, cat: 'All', q: '', page: 1, story: '' };
    const s = new URLSearchParams(window.location.search);
    const t = s.get('tab');
    return {
        tab: (t === 'latest' || t === 'trending' || t === 'saved' ? t : 'brief') as Tab,
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
    const [bookmarkIds, setBookmarkIds] = useState<string[]>(() => loadBookmarks());
    const [historyIds, setHistoryIds] = useState<string[]>(() => loadHistory());
    const listTopRef = useRef<HTMLDivElement>(null);
    const savedScroll = useRef(0);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const pageCache = useRef(new Map<string, Awaited<ReturnType<typeof fetchPage>>>());
    const LIMIT = 6;

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
                pageCache.current.set(key, data);
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
                    .then((data) => pageCache.current.set(nextKey, data))
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

    function handleTabListKey(e: React.KeyboardEvent) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        // Trending tab is mobile-only — skip it in the cycle on desktop
        const visible =
            typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
                ? TABS.filter((t) => t.id !== 'trending')
                : TABS;
        const i = visible.findIndex((t) => t.id === activeTab);
        const at = i === -1 ? 0 : i;
        const next = e.key === 'ArrowRight' ? visible[(at + 1) % visible.length] : visible[(at + visible.length - 1) % visible.length];
        handleTabChange(next.id);
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

    if (selectedItem) {
        return (
            <NewsDetail
                item={selectedItem}
                onBack={handleBack}
                saved={bookmarkIds.includes(selectedItem.id)}
                onToggleSave={() => handleToggleBookmark(selectedItem)}
            />
        );
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
                    <div className="bg-white border border-gray-200 rounded-md p-3 animate-pulse">
                        <div className="space-y-2">
                            <div className="h-2.5 bg-gray-100 w-28 rounded-md"></div>
                            <div className="h-4 bg-gray-100 w-3/4 rounded"></div>
                            <div className="h-3 bg-gray-100 w-full rounded"></div>
                        </div>
                    </div>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-md p-3">
                            <div className="space-y-2">
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
                        onClick={() => {
                            pageCache.current.clear();
                            loadPage(currentPage, activeCategory, debouncedQuery);
                        }}
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
            <div className="md:hidden mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {formattedDate}
                </p>
                <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                    {total} • Live
                </span>
            </div>
            <div className="flex items-center justify-between gap-2 mb-3 border-b border-gray-100 pb-2">
                <div
                    role="tablist"
                    aria-label="Switch between brief, latest and trending"
                    onKeyDown={handleTabListKey}
                    className="flex w-full sm:inline-flex sm:w-auto bg-white border border-gray-200 p-0.5 rounded-md gap-0.5"
                >
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            role="tab"
                            aria-selected={activeTab === t.id}
                            tabIndex={activeTab === t.id ? 0 : -1}
                            onClick={() => handleTabChange(t.id)}
                            className={`min-h-[32px] rounded-md px-2 sm:px-4 text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2 active:scale-[0.98] ${t.id === 'trending' ? 'lg:hidden ' : ''}flex-1 sm:flex-none ${activeTab === t.id
                                ? 'bg-[#001f3f] text-white shadow-md shadow-blue-900/20'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="hidden md:flex items-center gap-2 shrink-0 min-w-0">
                    <span className="hidden md:block text-[11px] font-bold uppercase tracking-wide text-gray-900 truncate">
                        {formattedDate}
                    </span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                        {total} • Live
                    </span>
                </div>
            </div>

            {activeTab === 'brief' ? (
                <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                    <DailyDigest />
                    <aside className="hidden lg:block lg:sticky lg:top-20">
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-3">
                                Trending now
                            </h3>
                            <TrendingRows items={trending} onSelect={handleSelect} />
                        </div>
                    </aside>
                </div>
            ) : activeTab === 'latest' ? (
                <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                    <div className="min-w-0">
                        <div className="bg-white border border-gray-200 rounded-md px-4 pt-3 pb-4">
                            <div className="md:sticky md:top-12 z-30 bg-white/95 md:backdrop-blur-sm -mx-2 px-2 pt-2 pb-3 border-b border-gray-100">
                                <SearchBar value={searchQuery} onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }} />
                                <CategoryFilter
                                    activeCategory={activeCategory}
                                    onCategoryChange={(c) => { setActiveCategory(c); setCurrentPage(1); }}
                                    counts={counts}
                                />
                            </div>

                            {isFiltering && (
                                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-600" role="status">
                                    {total} result{total === 1 ? '' : 's'}
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
                                {pageLoading && items.length > 0 && (
                                    <div className="mb-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
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
                                                className="group cursor-pointer mb-4 rounded-r-md rounded-l-none border border-gray-200 border-l-[3px] border-l-[#001f3f] bg-white pl-4 pr-4 py-4 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                            >
                                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide mb-2">
                                                    <span className="bg-[#001f3f] text-white px-2 py-0.5 rounded-md">Top story</span>
                                                    <span className="text-gray-600">{heroItem.category}</span>
                                                    <span aria-hidden="true" className="text-gray-300">•</span>
                                                    <span className="text-gray-600 truncate">{heroItem.source}</span>
                                                </div>
                                                <h3 className="text-lg md:text-[22px] font-bold text-gray-900 group-hover:text-[#001f3f] leading-tight tracking-tight">
                                                    {heroItem.title}
                                                </h3>
                                                <p className="mt-2 text-sm md:text-[15px] text-gray-600 leading-relaxed line-clamp-2">
                                                    {heroItem.contentSnippet}
                                                </p>
                                            </article>
                                        )}
                                        <div className="divide-y divide-gray-100">
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

                    <aside className="space-y-4 lg:sticky lg:top-20">
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-1">
                                Start with the brief
                            </h3>
                            <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
                                2-minute AI catch-up across {counts.All || total} stories.
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleTabChange('brief')}
                                    className="w-full min-h-[32px] text-[11px] font-bold uppercase tracking-wide border border-gray-200 text-[#001f3f] rounded-md hover:border-[#001f3f] hover:bg-gray-50 transition-colors whitespace-nowrap active:scale-[0.99]"
                                >
                                    Read Daily Brief →
                                </button>
                                <button
                                    onClick={() => handleTabChange('trending')}
                                    className="lg:hidden w-full min-h-[32px] text-[11px] font-bold uppercase tracking-wide border border-gray-200 text-[#001f3f] rounded-md hover:border-[#001f3f] hover:bg-gray-50 transition-colors whitespace-nowrap active:scale-[0.99]"
                                >
                                    See trending →
                                </button>
                            </div>
                        </div>
                        <div className="hidden lg:block bg-white border border-gray-200 rounded-md p-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-3">
                                Trending now
                            </h3>
                            <TrendingRows items={trending} onSelect={handleSelect} />
                        </div>
                    </aside>
                </div>
            ) : activeTab === 'trending' ? (
                <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                    <div className="bg-white border border-gray-200 rounded-md p-3 min-w-0">
                        <h2 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-2 px-1">
                            Trending now
                        </h2>
                        {trending.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {trending.map((t, i) => (
                                    <button
                                        key={`${t.id}-${i}`}
                                        onClick={() => handleSelect(t)}
                                        className="w-full text-left flex gap-3 py-3 first:pt-1 last:pb-1 group hover:bg-gray-50 rounded-md px-1 -mx-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f]"
                                    >
                                        <span className="text-2xl font-bold text-gray-200 group-hover:text-[#001f3f] leading-none shrink-0 w-8 transition-colors">
                                            {i + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[15px] font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-[#001f3f]">
                                                {t.title}
                                            </span>
                                            <span className="block mt-1 text-[11px] text-gray-600 uppercase tracking-wide truncate">
                                                {t.source} • {t.category}
                                            </span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="py-10 text-center text-[13px] font-semibold uppercase tracking-wide text-gray-600">
                                No trending stories yet.
                            </p>
                        )}
                    </div>
                    <aside className="space-y-4 lg:sticky lg:top-20">
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-1">
                                Start with the brief
                            </h3>
                            <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
                                2-minute AI catch-up across {counts.All || total} stories.
                            </p>
                            <button
                                onClick={() => handleTabChange('brief')}
                                className="w-full min-h-[32px] text-[11px] font-bold uppercase tracking-wide border border-gray-200 text-[#001f3f] rounded-md hover:border-[#001f3f] hover:bg-gray-50 transition-colors whitespace-nowrap active:scale-[0.99]"
                            >
                                Read Daily Brief →
                            </button>
                        </div>
                    </aside>
                </div>
            ) : (
                <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                    <div className="min-w-0 space-y-4">
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                            <h2 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-2 px-1">
                                Bookmarked ({savedItems.length})
                            </h2>
                            {savedItems.length > 0 ? (
                                <div className="divide-y divide-gray-100">
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
                                <p className="py-6 text-center text-sm text-gray-600">
                                    Nothing saved yet. Tap the bookmark on any story to keep it here.
                                </p>
                            )}
                        </div>
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                            <h2 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-2 px-1">
                                Recently read
                            </h2>
                            {recentItems.length > 0 ? (
                                <div className="divide-y divide-gray-100">
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
                        </div>
                    </div>
                    <aside className="space-y-4 lg:sticky lg:top-20">
                        <div className="bg-white border border-gray-200 rounded-md p-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#001f3f] mb-1">
                                Start with the brief
                            </h3>
                            <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
                                2-minute AI catch-up across {counts.All || total} stories.
                            </p>
                            <button
                                onClick={() => handleTabChange('brief')}
                                className="w-full min-h-[32px] text-[11px] font-bold uppercase tracking-wide border border-gray-200 text-[#001f3f] rounded-md hover:border-[#001f3f] hover:bg-gray-50 transition-colors whitespace-nowrap active:scale-[0.99]"
                            >
                                Read Daily Brief →
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
