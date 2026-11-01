import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { ArrowLeft, Truck } from 'lucide-react';
import { getDb } from '@/db';
import { orderEvents, orderItems, orders } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/utils';
import { OrderTracker, StatusBadge } from '@/components/store/order-status';
import { Img } from '@/components/ui/img';

export const metadata: Metadata = { title: 'Order details', robots: { index: false } };

const PM = { cod: 'Cash on Delivery', bank: 'Bank Transfer', wallet: 'JazzCash / EasyPaisa', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', card: 'Card (Stripe)' } as Record<string, string>;

export default async function OrderDetail({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const db = await getDb();
  const [o] = await db.select().from(orders).where(and(eq(orders.number, number), eq(orders.userId, user.id))).limit(1);
  if (!o) notFound();
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)).orderBy(asc(orderEvents.createdAt)),
  ]);
  const a = o.shippingAddress;
  return (
    <div className="space-y-8">
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-[0.85rem] text-muted hover:text-ink"><ArrowLeft size={15} /> All orders</Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="t-2">{o.number}</h2>
          <p className="mt-1 text-[0.85rem] text-muted">Placed {formatDateTime(o.createdAt)}</p>
        </div>
        <div className="flex gap-2"><StatusBadge status={o.status} /><StatusBadge status={o.paymentStatus} kind="payment" /></div>
      </div>
      <div className="rounded-theme border border-line p-6"><OrderTracker status={o.status} /></div>
      {o.trackingNumber && (
        <p className="flex items-center gap-3 rounded-theme-sm bg-surface px-4 py-3 text-[0.9rem]"><Truck size={18} strokeWidth={1.25} className="text-accent" /> Shipped with {o.trackingCarrier} · Tracking number <span className="font-mono">{o.trackingNumber}</span></p>
      )}
      <div className="grid gap-8 md:grid-cols-[1.5fr_1fr]">
        <div className="rounded-theme border border-line p-6">
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-4 first:pt-0">
                <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-theme-sm bg-surface"><Img src={i.image} alt={i.name} sizes="64px" /></span>
                <div className="flex-1">
                  <p className="text-[0.95rem]">{i.name}</p>
                  {i.variantTitle && <p className="text-[0.8rem] text-muted">{i.variantTitle}</p>}
                  <p className="text-[0.8rem] text-muted">{formatMoney(i.unitPrice)} × {i.quantity}</p>
                </div>
                <p>{formatMoney(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[0.9rem]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(o.subtotal)}</dd></div>
            {o.discountTotal > 0 && <div className="flex justify-between text-accent"><dt>Discount {o.discountCode && `(${o.discountCode})`}</dt><dd>−{formatMoney(o.discountTotal)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{o.shippingMethodName}</dt><dd>{o.shippingTotal ? formatMoney(o.shippingTotal) : 'Complimentary'}</dd></div>
            {o.refundedAmount > 0 && <div className="flex justify-between text-muted"><dt>Refunded</dt><dd>−{formatMoney(o.refundedAmount)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-[1.05rem]"><dt>Total</dt><dd className="font-medium">{formatMoney(o.total)}</dd></div>
          </dl>
        </div>
        <div className="space-y-6 text-[0.9rem]">
          <div><p className="label">Shipping address</p><p>{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.province} {a.postalCode}<br />{a.phone}</p></div>
          <div><p className="label">Payment</p><p>{PM[o.paymentMethod] ?? o.paymentMethod}</p>{o.paidAt && <p className="text-muted">Paid {formatDate(o.paidAt)}</p>}</div>
          <div>
            <p className="label">Timeline</p>
            <ol className="space-y-3 border-l border-line pl-4">
              {events.filter((e) => e.type !== 'inventory').map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                  <p>{e.message}</p>
                  <p className="text-[0.75rem] text-muted">{formatDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </div>
          <Link href="/contact" className="btn btn-secondary w-full">Need help with this order?</Link>
        </div>
      </div>
    </div>
  );
}
