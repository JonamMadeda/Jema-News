import { NextResponse } from 'next/server';
import { removeSubscription } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        await removeSubscription(body?.endpoint);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Unsubscribe failed:', error);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }
}
