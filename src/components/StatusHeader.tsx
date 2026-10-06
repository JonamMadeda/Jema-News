'use client';

type StatusHeaderProps = {
    updateCount: number;
};

export default function StatusHeader({ updateCount }: StatusHeaderProps) {
    const now = new Date();
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    }).format(now).toUpperCase();

    return (
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                </span>
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-900 truncate">
                    {formattedDate}
                </div>
            </div>
            <div className="bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                    {updateCount} • Live
                </span>
            </div>
        </div>
    );
}
