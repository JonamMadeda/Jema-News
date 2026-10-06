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
        <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-900">
                    {formattedDate}
                </div>
            </div>
            <div className="bg-gray-100 px-3 py-1.5 rounded-full">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-600">
                    {updateCount} Updates • Live
                </span>
            </div>
        </div>
    );
}
