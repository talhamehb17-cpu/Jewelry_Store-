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
    createdAt: (review.approvedAt ?? review.createdAt).toISOString(),
  };
}

export type HomeReviewCard = {
  id: string;
  name: string;
  rating: number;
  title: string | null;
  quote: string;
  date: string | null;
  avatar: string | null;
  verified: boolean;
  studio: boolean;
  productName: string;
  productSlug: string;
  productImage: string | null;
};

function preview(body: string) {
  const text = body.replace(/\s+/g, ' ').trim();
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
}

/** Published reviews only, newest approved customer reviews first. One joined query. */
export async function listHomepageReviews(limit = 6): Promise<HomeReviewCard[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: reviews.id,
      name: reviews.name,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      avatar: reviews.avatar,
      verified: reviews.verified,
      email: reviews.email,
      createdAt: reviews.createdAt,
      approvedAt: reviews.approvedAt,
      productName: products.name,
      productSlug: products.slug,
      productImage: sql<string | null>`(select pi.url from product_images pi where pi.product_id = ${products.id} order by pi.position asc, pi.id asc limit 1)`,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(and(eq(reviews.status, 'published'), eq(products.status, 'active')))
    .orderBy(desc(reviews.verified), desc(sql`coalesce(${reviews.approvedAt}, ${reviews.createdAt})`))
    .limit(limit);
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    rating: row.rating,
    title: row.title,
    quote: preview(row.body),
    date: (row.approvedAt ?? row.createdAt).toISOString(),
    avatar: row.avatar,
    verified: row.verified,
    studio: !row.verified && !!row.email?.endsWith(STUDIO),
    productName: row.productName,
    productSlug: row.productSlug,
    productImage: row.productImage,
  }));
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

export async function listPublishedReviews(productId: number, offset = 0, limit = 12) {
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

/** Published reviews only. Pending and rejected rows never enter this payload. */
export async function publishedReviewSnapshot(productId: number, offset = 0, limit = 12) {
  const db = await getDb();
  const published = and(eq(reviews.productId, productId), eq(reviews.status, 'published'));
  const [stats] = await db
    .select({ avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`, total: sql<number>`count(*)::int` })
    .from(reviews)
    .where(published);
  const [rows, distribution] = await Promise.all([
    listPublishedReviews(productId, offset, limit),
    reviewDistribution(productId),
  ]);
  return {
    reviews: rows,
    total: Number(stats?.total ?? 0),
    average: Math.round(Number(stats?.avg ?? 0) * 10) / 10,
    distribution,
  };
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
