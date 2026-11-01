import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { Package, Heart, MapPin, ArrowRight } from 'lucide-react';
import { getDb } from '@/db';
import { addresses, orders, wishlistItems } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/store/order-status';

export const metadata: Metadata = { title: 'My account', robots: { index: false } };

export default async function AccountOverview({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const user = await requireUser('/account');
  const { reset } = await searchParams;
  const db = await getDb();
  const [recent, [stats], [wish], [addr]] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(3),
    db.select({ count: sql<number>`count(*)::int`, spent: sql<number>`coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.total} else 0 end),0)::int` }).from(orders).where(eq(orders.userId, user.id)),
    db.select({ count: sql<number>`count(*)::int` }).from(wishlistItems).where(eq(wishlistItems.userId, user.id)),
    db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault)).limit(1),
  ]);
  return (
    <div className="space-y-10">
      {reset && <p className="rounded-theme-sm bg-surface px-4 py-3 text-[0.88rem]">Your password has been updated.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/account/orders" className="rounded-theme border border-line p-6 transition hover:border-ink">
          <Package size={20} strokeWidth={1.25} className="text-accent" />
          <p className="font-heading mt-4 text-3xl">{stats?.count ?? 0}</p>
          <p className="text-[0.82rem] text-muted">Orders · {formatMoney(stats?.spent ?? 0)} total</p>
        </Link>
        <Link href="/wishlist" className="rounded-theme border border-line p-6 transition hover:border-ink">
          <Heart size={20} strokeWidth={1.25} className="text-accent" />
          <p className="font-heading mt-4 text-3xl">{wish?.count ?? 0}</p>
          <p className="text-[0.82rem] text-muted">Saved pieces</p>
        </Link>
        <Link href="/account/addresses" className="rounded-theme border border-line p-6 transition hover:border-ink">
          <MapPin size={20} strokeWidth={1.25} className="text-accent" />
          <p className="mt-4 text-[0.92rem]">{addr ? `${addr.line1}, ${addr.city}` : 'No saved address'}</p>
          <p className="text-[0.82rem] text-muted">Default address</p>
        </Link>
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="t-3">Recent orders</h2>
          <Link href="/account/orders" className="inline-flex items-center gap-1 text-[0.85rem] underline-offset-4 hover:underline">View all <ArrowRight size={14} /></Link>
        </div>
        {recent.length ? (
          <div className="divide-y divide-line rounded-theme border border-line">
            {recent.map((o) => (
              <Link key={o.id} href={`/account/orders/${o.number}`} className="flex flex-wrap items-center justify-between gap-3 p-5 transition hover:bg-surface/50">
                <div>
                  <p className="font-medium">{o.number}</p>
                  <p className="text-[0.8rem] text-muted">{formatDate(o.createdAt)}</p>
                </div>
                <StatusBadge status={o.status} />
                <p className="text-[0.95rem]">{formatMoney(o.total)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-theme border border-dashed border-line p-10 text-center">
            <p className="text-muted">You haven’t placed any orders yet.</p>
            <Link href="/shop" className="btn btn-primary mt-6">Start shopping</Link>
          </div>
        )}
      </section>
      <section className="grid gap-4 rounded-theme bg-surface/60 p-6 sm:grid-cols-2">
        <div>
          <p className="label">Account details</p>
          <p>{user.firstName} {user.lastName}</p>
          <p className="text-[0.9rem] text-muted">{user.email}</p>
          {user.phone && <p className="text-[0.9rem] text-muted">{user.phone}</p>}
        </div>
        <div className="sm:text-right"><Link href="/account/profile" className="btn btn-secondary">Edit profile</Link></div>
      </section>
    </div>
  );
}
