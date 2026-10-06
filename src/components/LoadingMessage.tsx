'use client';

import { useEffect, useState } from 'react';

type LoadingMessageProps = {
    stages: string[];
    /** Light text for dark backgrounds */
    dark?: boolean;
    /** ms per stage */
    intervalMs?: number;
};

export default function LoadingMessage({ stages, dark = false, intervalMs = 1800 }: LoadingMessageProps) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (stages.length <= 1) return;
        const id = setInterval(() => setIndex((i) => (i + 1) % stages.length), intervalMs);
        return () => clearInterval(id);
    }, [stages.length, intervalMs]);

    return (
        <div role="status" aria-live="polite" className="flex items-center gap-2.5">
            <span
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 rounded-full border-2 animate-spin ${dark ? 'border-white/25 border-t-white' : 'border-gray-200 border-t-[#001f3f]'}`}
            ></span>
            <span className={`text-[13px] font-medium ${dark ? 'text-white/85' : 'text-gray-600'}`}>
                {stages[index]}
            </span>
        </div>
    );
}
