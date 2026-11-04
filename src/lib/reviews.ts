import { and, desc, eq, isNotNull, isNull, notExists, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { orderItems, orders, products, reviews, type Review } from '@/db/schema';

const STUDIO = '@studio.maisonaurelle.pk';

export function presentReview(review: Review) {
  return {
    id: review.id,
    name: review.name,
    rating: review.rating,
    title: review.title,
    body: review.body,
    avatar: review.avatar,
    photo: review.photo,
    verified: review.verified,
    studio: !review.verified && !!review.email?.endsWith(STUDIO),
    createdAt: review.createdAt.toISOString(),
  };
}

export type PublicReview = ReturnType<typeof presentReview>;

export async function recalcProductRating(productId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`, count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, 'published')));
  await db
    .update(products)
    .set({ ratingAvg: Math.round(Number(row?.avg ?? 0) * 10) / 10, ratingCount: Number(row?.count ?? 0) })
    .where(eq(products.id, productId));
}

export async function reviewDistribution(productId: number) {
  const db = await getDb();
  const rows = await db
    .select({ rating: reviews.rating, count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, 'published')))
    .groupBy(reviews.rating);
  const counts = new Map(rows.map((row) => [row.rating, Number(row.count)]));
  return [5, 4, 3, 2, 1].map((star) => ({ star, count: counts.get(star) ?? 0 }));
}

export async function listPublishedReviews(productId: number, offset = 0, limit = 8) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, 'published')))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)
    .offset(Math.max(0, offset));
  return rows.map(presentReview);
}

export type EligiblePurchase = {
  orderId: number;
  number: string;
  itemId: number;
  productId: number;
  name: string;
};

export async function eligiblePurchases(userId: number, email: string, productId?: number) {
  const db = await getDb();
  const owned = or(eq(orders.userId, userId), and(isNull(orders.userId), sql`lower(${orders.email}) = ${email.toLowerCase()}`));
  const rows = await db
    .select({
      orderId: orders.id,
      number: orders.number,
      itemId: orderItems.id,
      productId: orderItems.productId,
      name: orderItems.name,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        owned,
        eq(orders.status, 'delivered'),
        isNotNull(orderItems.productId),
        productId ? eq(orderItems.productId, productId) : undefined,
        notExists(
          db
            .select({ id: reviews.id })
            .from(reviews)
            .where(and(eq(reviews.orderId, orders.id), eq(reviews.productId, orderItems.productId))),
        ),
      ),
    )
    .orderBy(desc(orders.deliveredAt));
  const seen = new Set<string>();
  return rows.filter((row): row is EligiblePurchase => {
    if (row.productId == null) return false;
    const key = `${row.orderId}:${row.productId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
