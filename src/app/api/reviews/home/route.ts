import { NextResponse } from 'next/server';
import { listHomepageReviews } from '@/lib/reviews';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fresh = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

/** Published reviews for the existing homepage section. Pending and rejected rows are excluded. */
export async function GET() {
  const reviews = await listHomepageReviews(6);
  return NextResponse.json({ reviews }, { headers: fresh });
}
