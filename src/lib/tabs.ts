// Shared tab types — importable from both server and client components
// (must live outside 'use client' modules).

export type Tab = 'latest' | 'brief' | 'trending' | 'ask' | 'saved';

export function isAppTab(value: string | null | undefined): value is Tab {
    return value === 'latest' || value === 'brief' || value === 'trending' || value === 'ask' || value === 'saved';
}
