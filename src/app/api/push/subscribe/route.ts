import { NextResponse } from 'next/server';
import { saveSubscription } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const sub = body?.subscription;
        await saveSubscription(sub);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Subscribe failed:', error);
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
}
