'use client';

import { useEffect, useState } from 'react';

type PushState = 'unsupported' | 'denied' | 'on' | 'off' | 'busy';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = window.atob(base64.replace(/-/g, '+').replace(/_/g, '/') + padding);
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

export default function SubscribeButton() {
    const [state, setState] = useState<PushState>('off');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            setState('unsupported');
            return;
        }
        if (Notification.permission === 'denied') {
            setState('denied');
            return;
        }
        navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => setState(sub ? 'on' : 'off'))
            .catch(() => setState('off'));
        setReady(true);
    }, []);

    async function subscribe() {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;
        setState('busy');
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setState(permission === 'denied' ? 'denied' : 'off');
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub.toJSON() }),
            });
            setState(res.ok ? 'on' : 'off');
        } catch {
            setState('off');
        }
    }

    async function unsubscribe() {
        setState('busy');
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            const endpoint = sub?.endpoint;
            if (sub) await sub.unsubscribe();
            if (endpoint) {
                await fetch('/api/push/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint }),
                });
            }
        } catch {
            // fall through to off state
        }
        setState('off');
    }

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
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#001f3f] disabled:opacity-40 ${state === 'on' ? 'text-[#001f3f] bg-gray-100' : 'text-gray-600 hover:text-[#001f3f] hover:bg-gray-100'}`}
        >
            <svg className="w-4 h-4" fill={state === 'on' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.3V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.3c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
        </button>
    );
}
