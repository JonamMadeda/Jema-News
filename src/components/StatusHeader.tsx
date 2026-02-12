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
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">
                {formattedDate}
            </div>
            <div className="bg-gray-50 px-3 py-1.5 rounded-full">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    {updateCount} Updates
                </span>
            </div>
        </div>
    );
}
