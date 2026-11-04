import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { products, reviews } from '@/db/schema';
import { listPublishedReviews } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0) || 0);
  const limit = Math.min(12, Math.max(1, Number(url.searchParams.get('limit') || 8) || 8));
  if (!slug) return NextResponse.json({ reviews: [], total: 0 });
  const db = await getDb();
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return NextResponse.json({ reviews: [], total: 0 });
  const [count] = await db.select({ total: sql<number>`count(*)::int` }).from(reviews).where(and(eq(reviews.productId, product.id), eq(reviews.status, 'published')));
  const rows = await listPublishedReviews(product.id, offset, limit);
  return NextResponse.json({ reviews: rows, total: Number(count?.total ?? 0) });
}
