import { isAppTab, type Tab } from './tabs';

export const TAB_EVENT = 'jema:tab';
export const REFRESH_EVENT = 'jema:refresh';

export function getInitialTab(): Tab {
    if (typeof window === 'undefined') return 'ask';
    const t = new URLSearchParams(window.location.search).get('tab');
    return isAppTab(t) ? t : 'ask';
}

export function setAppTab(tab: Tab) {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url.toString());
    } catch {
        // ignore
    }
    window.dispatchEvent(new CustomEvent<Tab>(TAB_EVENT, { detail: tab }));
}
