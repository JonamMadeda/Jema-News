import { type Tab } from '@/lib/tabs';

export default function TabIcon({ tab, className = 'w-4 h-4 shrink-0' }: { tab: Tab; className?: string }) {
    const props = {
        className,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        'aria-hidden': true,
    };

    switch (tab) {
        case 'ask':
            return (
                <svg {...props}>
                    <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-4 3v-5.7A8.5 8.5 0 1 1 21 11.5Z" />
                    <path d="M8.5 10.5h7M8.5 14h4.5" />
                </svg>
            );
        case 'brief':
            return (
                <svg {...props}>
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M8 9h8M8 13h8M8 17h4" />
                </svg>
            );
        case 'latest':
            return (
                <svg {...props}>
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7.5V12l3 1.8" />
                </svg>
            );
        case 'trending':
            return (
                <svg {...props}>
                    <path d="M3 17l6-6 4 4 8-8" />
                    <path d="M15 7h6v6" />
                </svg>
            );
        case 'saved':
            return (
                <svg {...props}>
                    <path d="M6 4h12v17l-6-4-6 4V4Z" />
                </svg>
            );
    }
}
