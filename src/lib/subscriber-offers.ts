import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { discounts, newsletterSubscribers } from '@/db/schema';
import { formatMoney } from './money';

export type SubscriberOffer = {
  code: string;
  label: string;
  detail: string;
  expiresAt: string | null;
};

function labelFor(type: string, value: number) {
  if (type === 'percentage') return `${value}% off`;
  if (type === 'fixed') return `${formatMoney(value)} off`;
  return 'Free shipping';
}

function detailFor(row: { minOrderAmount: number; appliesTo: string; perUserLimit: number | null; oncePerCustomer: boolean; usageLimit: number | null; usageCount: number }) {
  const parts = [row.minOrderAmount > 0 ? `Minimum ${formatMoney(row.minOrderAmount)}` : 'No minimum'];
  if (row.appliesTo === 'products') parts.push('Selected products');
  else if (row.appliesTo === 'collections') parts.push('Selected collections');
  else if (row.appliesTo === 'categories') parts.push('Selected categories');
  else parts.push('Entire order');
  if (row.oncePerCustomer || row.perUserLimit === 1) parts.push('Once per customer');
  else if (row.perUserLimit) parts.push(`${row.perUserLimit} uses per customer`);
  if (row.usageLimit != null) parts.push(`${Math.max(0, row.usageLimit - row.usageCount)} uses left`);
  return parts.join(' · ');
}

export async function isActiveSubscriber(email: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(and(eq(sql`lower(${newsletterSubscribers.email})`, email.trim().toLowerCase()), eq(newsletterSubscribers.status, 'subscribed')))
    .limit(1);
  return !!row;
}

/** One shared code. Existing subscribers see it when it becomes active; unsubscribed emails see nothing. */
export async function listSubscriberOffers(email: string): Promise<SubscriberOffer[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !(await isActiveSubscriber(normalized))) return [];
  const db = await getDb();
  const now = new Date();
  const rows = await db.select().from(discounts).where(and(eq(discounts.audience, 'subscribers'), eq(discounts.active, true)));
  return rows
    .filter((row) => {
      if (row.startsAt && row.startsAt > now) return false;
      if (row.endsAt && row.endsAt < now) return false;
      if (row.usageLimit != null && row.usageCount >= row.usageLimit) return false;
      return true;
    })
    .map((row) => ({
      code: row.code,
      label: labelFor(row.type, row.value),
      detail: detailFor(row),
      expiresAt: row.endsAt ? row.endsAt.toISOString() : null,
    }));
}
