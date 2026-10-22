'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    getPushUiState,
    subscribeForPush,
    unsubscribeFromPush,
    PushUiState,
} from '@/lib/pushClient';

function BellIcon({ className, filled }: { className: string; filled: boolean }) {
    return (
        <svg
            className={className}
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.3V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.3c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    );
}

export default function SubscribeButton({ variant = 'icon' }: { variant?: 'icon' | 'row' }) {
    const [state, setState] = useState<PushUiState>('off');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        getPushUiState().then((s) => {
            setState(s);
            setReady(true);
        });
    }, []);

    const subscribe = useCallback(async () => {
        setState('busy');
        try {
            setState(await subscribeForPush());
        } catch {
            setState('off');
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        setState('busy');
        await unsubscribeFromPush();
        setState('off');
    }, []);

    if (!ready || state === 'unsupported') return null;

    const title =
        state === 'on'
            ? 'Daily brief alerts on — tap to turn off'
            : state === 'denied'
              ? 'Notifications blocked — allow them in browser settings'
              : 'Get one daily briefing alert';

    if (variant === 'row') {
        const label =
            state === 'busy'
                ? 'Updating…'
                : state === 'on'
                  ? 'Daily alerts on'
                  : state === 'denied'
                    ? 'Alerts blocked'
                    : 'Daily alerts';

        return (
            <button
                onClick={state === 'on' ? unsubscribe : subscribe}
                disabled={state === 'busy' || state === 'denied'}
                aria-label={title}
                title={title}
                aria-pressed={state === 'on'}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-left text-slate-600 hover:text-slate-900 hover:bg-white/80 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25"
            >
                <BellIcon className="w-[18px] h-[18px] shrink-0 text-slate-500" filled={state === 'on'} />
                <span className="truncate">{label}</span>
                <span
                    className={`ml-auto w-1.5 h-1.5 rounded-full ${state === 'on' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    aria-hidden="true"
                />
            </button>
        );
    }

    return (
        <button
            onClick={state === 'on' ? unsubscribe : subscribe}
            disabled={state === 'busy' || state === 'denied'}
            aria-label={title}
            title={title}
            aria-pressed={state === 'on'}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25 disabled:opacity-40 ${state === 'on' ? 'text-slate-900 bg-slate-200/80' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'}`}
        >
            <BellIcon className="w-4 h-4" filled={state === 'on'} />
        </button>
    );
}
