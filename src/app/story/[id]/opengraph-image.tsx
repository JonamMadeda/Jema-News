import { ImageResponse } from 'next/og';
import { findStory } from '@/lib/story';

export const revalidate = 600;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const story = await findStory(id);

    const title = story?.title || 'Jemanews';
    const meta = story ? `${story.source} • ${story.category}` : 'Kenyan news, briefly';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: '#001f3f',
                    color: '#ffffff',
                    padding: 64,
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>JEMANEWS</div>
                <div>
                    <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>{meta}</div>
                    <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>
                        {title.length > 140 ? title.slice(0, 140) + '…' : title}
                    </div>
                </div>
                <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)' }}>jemanews • Kenyan news, briefly</div>
            </div>
        ),
        { ...size }
    );
}
