import { NextResponse } from 'next/server';
import { activeOverrideUrl } from '@/lib/db-connection';

/** Temporary cutover helper. Requires the cron secret and is removed after DATABASE_URL is updated. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET || '';
  const auth = request.headers.get('authorization') || '';
  const query = new URL(request.url).searchParams.get('key') || '';
  if (!secret || (auth !== `Bearer ${secret}` && query !== secret)) return new NextResponse('unauthorized', { status: 401 });
  const url = await activeOverrideUrl();
  if (!url) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, url });
}
