'use server';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { newsletterSubscribers } from '@/db/schema';

export async function unsubscribeByToken(token: string) {
  const value = token.trim();
  if (!/^[a-f0-9]{32,64}$/i.test(value)) return { ok: false, message: 'This unsubscribe link is not valid.' };
  const db = await getDb();
  const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.token, value)).limit(1);
  if (!row) return { ok: false, message: 'We could not find that subscription.' };
  if (row.status === 'unsubscribed') return { ok: true, message: 'You are already unsubscribed from promotional emails.' };
  await db.update(newsletterSubscribers).set({ status: 'unsubscribed', unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.id, row.id));
  return { ok: true, message: 'You will no longer receive promotional emails. Order updates for purchases you place will still be sent.' };
}
