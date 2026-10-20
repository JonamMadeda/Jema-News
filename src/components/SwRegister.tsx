'use client';

import { useEffect } from 'react';

export default function SwRegister() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        // A dev-mode SW pins stale chunks across HMR edits. Only run it in production.
        if (process.env.NODE_ENV !== 'production') {
            navigator.serviceWorker
                .getRegistrations()
                .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
                .catch(() => {});
            if ('caches' in window) {
                caches
                    .keys()
                    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
                    .catch(() => {});
            }
            return;
        }

        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
    }, []);
    return null;
}
