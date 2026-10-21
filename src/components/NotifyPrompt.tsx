'use client';

import { useEffect, useState } from 'react';
import { getPushUiState, subscribeForPush } from '@/lib/pushClient';

const DISMISS_KEY = 'jema:notify-prompt-dismissed';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // ask again after a week
const SHOW_AFTER_MS = 4000; // let the page settle first

function snoozed(): boolean {
    try {
        const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
        return Date.now() - at < SNOOZE_MS;
    } catch {
        return true;
    }
}

// Soft-ask popup for the daily briefing alert. Only appears when the user
// hasn't decided yet (no subscription, permission still 'default'), and at
// most once a week after dismissal. The native browser prompt only fires
// after tapping Enable — never on page load.
export default function NotifyPrompt() {
    const [visible, setVisible] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (snoozed()) return;
        let timer: ReturnType<typeof setTimeout>;
        getPushUiState().then((state) => {
            if (state !== 'off') return; // on / denied / unsupported → stay quiet
            timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
        });
        return () => clearTimeout(timer);
    }, []);

    function dismiss() {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            // ignore
        }
        setVisible(false);
    }

    async function enable() {
        setBusy(true);
        try {
            const next = await subscribeForPush();
            if (next === 'on') {
                dismiss();
                return;
            }
        } catch {
            // fall through to dismiss so we don't nag on failure
        } finally {
            setBusy(false);
        }
        dismiss();
    }

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Enable daily briefing alerts"
            className="fixed bottom-6 inset-x-4 z-[60] md:left-auto md:right-6 md:bottom-6 md:w-84 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-700/70">
                <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.3V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.3c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-100">
                        Morning Intelligence Briefing
                    </p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Get a single notification each morning when Kenya&apos;s daily brief is prepared. No spam, no marketing.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={enable}
                        disabled={busy}
                        className="flex-1 min-h-[36px] text-xs font-bold bg-white text-slate-900 rounded-xl hover:bg-slate-100 transition-all whitespace-nowrap active:scale-98 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        {busy ? 'Enabling…' : 'Enable Alerts'}
                    </button>
                    <button
                        onClick={dismiss}
                        className="min-h-[36px] text-xs font-semibold px-4 text-slate-400 hover:text-white border border-slate-700 hover:bg-white/5 rounded-xl transition-all whitespace-nowrap"
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
}
