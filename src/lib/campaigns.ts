import { cache } from 'react';
import { and, asc, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { campaigns, newsletterSubscribers, type Campaign } from '@/db/schema';

export type SaleScope = { appliesTo: string; productIds: number[]; categoryIds: number[]; percent: number; allowStacking: boolean };

/** Soonest-ending live event. Drafts and paused campaigns never apply. */
export const getActiveCampaign = cache(async (): Promise<Campaign | null> => {
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .select()
    .from(campaigns)
    .where(and(inArray(campaigns.status, ['active', 'scheduled']), lte(campaigns.startsAt, now), gt(campaigns.endsAt, now)))
    .orderBy(asc(campaigns.endsAt))
    .limit(1);
  return row ?? null;
});

export function campaignHit(c: SaleScope | Campaign | null, productId: number, categoryId: number | null) {
  if (!c) return false;
  if (c.appliesTo === 'products') return (c.productIds ?? []).includes(productId);
  if (c.appliesTo === 'categories') return categoryId != null && (c.categoryIds ?? []).includes(categoryId);
  return c.appliesTo === 'all';
}

export function discountPrice(price: number, percent: number) {
  const pct = Math.min(90, Math.max(0, percent));
  return Math.max(0, price - Math.round((price * pct) / 100));
}

export function presentPrice(price: number, compareAt: number | null, hit: boolean, percent: number) {
  if (!hit || percent <= 0) return { price, compareAt };
  const next = discountPrice(price, percent);
  if (next >= price) return { price, compareAt };
  const compare = compareAt && compareAt > price ? compareAt : price;
  return { price: next, compareAt: compare };
}

/** Moves scheduled/active rows to the status their clock implies. Draft and paused are left alone. */
export async function syncCampaignClocks() {
  const db = await getDb();
  const now = new Date();
  await db
    .update(campaigns)
    .set({ status: 'expired', updatedAt: now })
    .where(and(inArray(campaigns.status, ['active', 'scheduled']), lte(campaigns.endsAt, now)));
  await db
    .update(campaigns)
    .set({ status: 'active', updatedAt: now })
    .where(and(eq(campaigns.status, 'scheduled'), lte(campaigns.startsAt, now), gt(campaigns.endsAt, now)));
}

export function effectiveStatus(c: { status: string; startsAt: Date; endsAt: Date }, now = new Date()) {
  if (c.status === 'draft' || c.status === 'paused') return c.status;
  if (c.endsAt <= now) return 'expired';
  if (c.startsAt > now) return 'scheduled';
  return 'active';
}

export async function subscriberCount() {
  const db = await getDb();
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, 'subscribed'));
  return Number(row?.n ?? 0);
}
