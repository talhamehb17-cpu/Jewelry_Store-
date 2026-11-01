import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { products, reviews } from '@/db/schema';

export async function recalcProductRating(productId: number) {
  const db = await getDb();
  const [r] = await db
    .select({ avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`, count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, 'published')));
  await db
    .update(products)
    .set({ ratingAvg: Math.round(Number(r?.avg ?? 0) * 10) / 10, ratingCount: Number(r?.count ?? 0) })
    .where(eq(products.id, productId));
}
