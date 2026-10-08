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
            className="fixed bottom-4 inset-x-4 z-[60] sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
            <div className="bg-[#001f3f] text-white rounded-md p-4 shadow-2xl shadow-blue-900/30">
                <p className="text-[11px] font-bold uppercase tracking-wide mb-1">
                    Morning brief, daily
                </p>
                <p className="text-sm text-white/80 leading-relaxed mb-3">
                    One notification a day when your briefing is ready. Nothing else, ever.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={enable}
                        disabled={busy}
                        className="flex-1 min-h-[32px] text-[11px] font-bold uppercase tracking-wide bg-white text-[#001f3f] rounded-md hover:bg-white/90 transition-colors whitespace-nowrap active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        {busy ? 'Enabling…' : 'Enable'}
                    </button>
                    <button
                        onClick={dismiss}
                        className="min-h-[32px] text-[11px] font-bold uppercase tracking-wide px-4 text-white/70 hover:text-white border border-white/20 hover:bg-white/10 rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
