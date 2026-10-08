'use client';

// Shared client-side push helpers used by the navbar bell and the prompt popup.

export type PushUiState = 'unsupported' | 'denied' | 'on' | 'off' | 'busy';

export function pushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = window.atob(base64.replace(/-/g, '+').replace(/_/g, '/') + padding);
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

export async function getPushUiState(): Promise<PushUiState> {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        return sub ? 'on' : 'off';
    } catch {
        return 'off';
    }
}

export async function subscribeForPush(): Promise<PushUiState> {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return 'unsupported';
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        return permission === 'denied' ? 'denied' : 'off';
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
    return res.ok ? 'on' : 'off';
}

export async function unsubscribeFromPush(): Promise<void> {
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
        // fall through — UI resets to off regardless
    }
}
