'use client';

// Local persistence for bookmarks + reading history. No account needed;
// ids are stable per article link.

const BOOKMARKS_KEY = 'jema:bookmarks';
const HISTORY_KEY = 'jema:history';
const HISTORY_CAP = 30;

function readIds(key: string): string[] {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

function writeIds(key: string, ids: string[]) {
    try {
        localStorage.setItem(key, JSON.stringify(ids));
    } catch {
        // storage full or unavailable — non-fatal
    }
}

export function loadBookmarks(): string[] {
    if (typeof window === 'undefined') return [];
    return readIds(BOOKMARKS_KEY);
}

export function toggleBookmark(id: string): { saved: boolean; ids: string[] } {
    const ids = readIds(BOOKMARKS_KEY);
    const i = ids.indexOf(id);
    if (i === -1) {
        const next = [id, ...ids];
        writeIds(BOOKMARKS_KEY, next);
        return { saved: true, ids: next };
    }
    const next = ids.filter((x) => x !== id);
    writeIds(BOOKMARKS_KEY, next);
    return { saved: false, ids: next };
}

export function loadHistory(): string[] {
    if (typeof window === 'undefined') return [];
    return readIds(HISTORY_KEY);
}

export function recordHistory(id: string) {
    if (typeof window === 'undefined') return;
    const ids = readIds(HISTORY_KEY).filter((x) => x !== id);
    writeIds(HISTORY_KEY, [id, ...ids].slice(0, HISTORY_CAP));
}
