import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED = new Set(['images.unsplash.com']);

/** Same-origin proxy for catalog photos. The browser never talks to Unsplash directly. */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('src') || '';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response('Bad image', { status: 400 });
  }
  if (url.protocol !== 'https:' || !ALLOWED.has(url.hostname)) return new Response('Forbidden', { status: 400 });

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'image/avif,image/webp,image/jpeg,image/*' },
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return new Response('Image unavailable', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } });
    const type = res.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) return new Response('Image unavailable', { status: 404 });
    const body = await res.arrayBuffer();
    if (body.byteLength < 800) return new Response('Image unavailable', { status: 404 });
    return new Response(body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Image unavailable', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
  }
}
