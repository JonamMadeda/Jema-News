'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    getPushUiState,
    subscribeForPush,
    unsubscribeFromPush,
    PushUiState,
} from '@/lib/pushClient';

export default function SubscribeButton() {
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

    return (
        <button
            onClick={state === 'on' ? unsubscribe : subscribe}
            disabled={state === 'busy' || state === 'denied'}
            aria-label={title}
            title={title}
            aria-pressed={state === 'on'}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] disabled:opacity-40 ${state === 'on' ? 'text-[#001f3f] bg-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <svg className="w-4 h-4" fill={state === 'on' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.3V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.3c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
        </button>
    );
}
