import type { Metadata } from 'next';
import { eq, sql } from 'drizzle-orm';
import { AdminShell } from '@/components/admin/shell';
import { requireAdminPage } from '@/lib/auth';
import { getDb, getDbKind } from '@/db';
import { contactMessages, orders, productVariants, reviews } from '@/db/schema';
import { scheduleProgress } from '@/lib/fulfillment';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · EVERMOON Admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  scheduleProgress();
  const db = await getDb();
  const [[o], [l], [r], [m], kind] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(sql`${orders.status} = 'pending' or ${orders.paymentStatus} = 'awaiting'`),
    db.select({ n: sql<number>`count(*)::int` }).from(productVariants).where(sql`${productVariants.stock} <= ${productVariants.lowStockThreshold}`),
    db.select({ n: sql<number>`count(*)::int` }).from(reviews).where(eq(reviews.status, 'pending')),
    db.select({ n: sql<number>`count(*)::int` }).from(contactMessages).where(eq(contactMessages.read, false)),
    getDbKind(),
  ]);
  const expires = process.env.NEON_DB_EXPIRES_AT ? new Date(process.env.NEON_DB_EXPIRES_AT) : null;
  let dbWarning: string | null = null;
  if (kind === 'pglite' && process.env.VERCEL) dbWarning = 'No DATABASE_URL configured — running on a temporary embedded database. Data will reset.';
  else if (process.env.NEON_CLAIM_URL && expires) {
    const hours = Math.round((+expires - Date.now()) / 3_600_000);
    dbWarning = hours > 0 ? `Your Neon database is unclaimed and expires in about ${hours} hours. Claim it to keep your data.` : 'Your temporary Neon database has expired unless it was claimed.';
  }
  return (
    <AdminShell user={{ name: `${user.firstName} ${user.lastName}`.trim() || user.email, email: user.email, role: user.role }} badges={{ orders: o?.n ?? 0, lowStock: l?.n ?? 0, reviews: r?.n ?? 0, messages: m?.n ?? 0 }} dbWarning={dbWarning}>
      {children}
    </AdminShell>
  );
}
