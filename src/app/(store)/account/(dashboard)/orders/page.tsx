import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { orderItems, orders } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/store/order-status';
import { Img } from '@/components/ui/img';

export const metadata: Metadata = { title: 'My orders', robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser('/account/orders');
  const db = await getDb();
  const list = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  const items = list.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, list.map((o) => o.id))) : [];
  return (
    <div>
      <h2 className="t-3 mb-6">Order history</h2>
      {list.length === 0 ? (
        <div className="rounded-theme border border-dashed border-line p-12 text-center">
          <p className="text-muted">No orders yet — your future favourites are waiting.</p>
          <Link href="/shop" className="btn btn-primary mt-6">Discover jewelry</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((o) => {
            const its = items.filter((i) => i.orderId === o.id);
            return (
              <Link key={o.id} href={`/account/orders/${o.number}`} className="block rounded-theme border border-line p-5 transition hover:border-ink">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{o.number}</p>
                    <p className="text-[0.8rem] text-muted">Placed {formatDate(o.createdAt)} · {its.reduce((a, i) => a + i.quantity, 0)} items</p>
                  </div>
                  <div className="flex items-center gap-2"><StatusBadge status={o.status} /><StatusBadge status={o.paymentStatus} kind="payment" /></div>
                  <p className="font-heading text-xl">{formatMoney(o.total)}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  {its.slice(0, 5).map((i) => (
                    <span key={i.id} className="relative h-16 w-14 overflow-hidden rounded-theme-sm bg-surface"><Img src={i.image} alt={i.name} sizes="56px" /></span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
