import { NextResponse } from 'next/server';
import { searchSuggestions } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 80);
  const data = await searchSuggestions(q);
  return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=30' } });
}
