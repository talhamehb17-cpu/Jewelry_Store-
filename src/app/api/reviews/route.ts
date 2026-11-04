import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { products } from '@/db/schema';
import { publishedReviewSnapshot } from '@/lib/reviews';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fresh = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0) || 0);
  const limit = Math.min(24, Math.max(1, Number(url.searchParams.get('limit') || 12) || 12));
  if (!slug) return NextResponse.json({ reviews: [], total: 0, average: 0, distribution: [] }, { headers: fresh });
  const db = await getDb();
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return NextResponse.json({ reviews: [], total: 0, average: 0, distribution: [] }, { headers: fresh });
  const snapshot = await publishedReviewSnapshot(product.id, offset, limit);
  return NextResponse.json(snapshot, { headers: fresh });
}
