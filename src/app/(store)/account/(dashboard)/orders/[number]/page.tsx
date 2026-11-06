import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { ArrowLeft, Truck } from 'lucide-react';
import { getDb } from '@/db';
import { orderEvents, orderItems, orders, products } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { formatAtRate } from '@/lib/currency-format';
import { formatMoney } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/utils';
import { OrderTracker, StatusBadge } from '@/components/store/order-status';
import { CancelOrder } from '@/components/store/cancel-order';
import { DeliveryAnswer } from '@/components/store/delivery-answer';
import { ReviewForm } from '@/components/store/product-extras';
import { eligiblePurchases } from '@/lib/reviews';
import { getSettings } from '@/lib/settings';
import { Img } from '@/components/ui/img';
import { PaymentPlanNote } from '@/components/store/payment-plan-note';

export const metadata: Metadata = { title: 'Order details', robots: { index: false } };

const PM = { cod: 'Cash on Delivery', bank: 'Bank Transfer', wallet: 'JazzCash / EasyPaisa', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', card: 'Card (Stripe)' } as Record<string, string>;

export default async function OrderDetail({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const settings = await getSettings();
  const db = await getDb();
  const [o] = await db.select().from(orders).where(and(eq(orders.number, number), eq(orders.userId, user.id))).limit(1);
  if (!o) notFound();
  const [items, events, purchases] = await Promise.all([
    db.select({ item: orderItems, slug: products.slug }).from(orderItems).leftJoin(products, eq(products.id, orderItems.productId)).where(eq(orderItems.orderId, o.id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)).orderBy(asc(orderEvents.createdAt)),
    o.status === 'delivered' ? eligiblePurchases(user.id, user.email) : Promise.resolve([]),
  ]);
  const a = o.shippingAddress;
  const show = (paisa: number) => formatAtRate(paisa, o.displayCurrency, o.displayRate);
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
      <div className="rounded-theme border border-line p-6">
        <OrderTracker
          status={o.status}
          stamps={{
            confirmed: o.timelineStartAt ? formatDateTime(o.timelineStartAt) : null,
            processing: o.processingAt ? formatDateTime(o.processingAt) : null,
            shipped: o.shippedAt ? formatDateTime(o.shippedAt) : null,
            out_for_delivery: o.outForDeliveryAt ? formatDateTime(o.outForDeliveryAt) : null,
            delivered: o.deliveredAt ? formatDateTime(o.deliveredAt) : null,
          }}
        />
      </div>
      {o.status === 'delivered' && (
        <p className="rounded-theme-sm bg-surface px-4 py-3 text-[0.9rem]">Delivered{o.confirmationSource === 'admin' ? ' — confirmed by the atelier' : o.confirmationSource === 'customer' ? ' — you confirmed receipt' : ''}. {o.deliveryConfirmedAt ? formatDateTime(o.deliveryConfirmedAt) : ''}</p>
      )}
      {['out_for_delivery', 'awaiting_confirm'].includes(o.status) && o.deliveryResponse !== 'yes' && o.notificationDueAt && o.notificationDueAt.getTime() <= Date.now() && (
        <DeliveryAnswer orderId={o.id} mode={o.deliveryResponse === 'no' ? 'no' : 'pending'} />
      )}
      {['out_for_delivery', 'awaiting_confirm'].includes(o.status) && o.notificationDueAt && o.notificationDueAt.getTime() > Date.now() && (
        <p className="text-[0.85rem] text-muted">A delivery question opens at {formatDateTime(o.notificationDueAt)}, ten minutes after it was marked out for delivery. It is not based on the original estimate.</p>
      )}
      <CancelOrder orderId={o.id} pendingStatus={o.status === 'pending'} phone={settings.store.phone} email={settings.store.email} />
      <p className="text-[0.85rem] text-muted">{o.shippingMethodName}. {o.expectedAt ? `Expected by ${formatDateTime(o.expectedAt)} PKT. ` : o.paymentMethod === 'cod' ? 'The estimate starts when the atelier confirms this Cash on Delivery order. ' : 'The estimate starts when the payment is verified. '}This is an estimate, not a guarantee. You pay {formatMoney(o.total)} PKR.</p>
      {o.trackingNumber && (
        <p className="flex items-center gap-3 rounded-theme-sm bg-surface px-4 py-3 text-[0.9rem]"><Truck size={18} strokeWidth={1.25} className="text-accent" /> Shipped with {o.trackingCarrier} · Tracking number <span className="font-mono">{o.trackingNumber}</span></p>
      )}
      <div className="grid min-w-0 gap-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-theme border border-line p-4 sm:p-6">
          <ul className="divide-y divide-line">
            {items.map(({ item: i, slug }) => (
              <li key={i.id} className="flex items-start gap-3 py-4 first:pt-0 sm:gap-4">
                <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-theme-sm bg-surface sm:h-20 sm:w-16"><Img src={i.image} alt={i.name} sizes="64px" /></span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[0.95rem]">{i.name}</p>
                  {i.variantTitle && <p className="break-words text-[0.8rem] text-muted">{i.variantTitle}</p>}
                  <p className="text-[0.8rem] text-muted">{show(i.unitPrice)} × {i.quantity}</p>
                  {i.giftPackaging && <p className="text-[0.78rem]">Premium gift packaging · {show(i.giftUnitPrice)} × {i.quantity} · {show(i.giftLineTotal)}</p>}
                  {o.status === 'delivered' && slug && purchases.some((purchase) => purchase.itemId === i.id) && <div className="mt-3"><ReviewForm productId={i.productId!} productName={i.name} image={i.image} defaultName={`${user.firstName} ${user.lastName}`.trim()} avatar={user.avatar} purchases={purchases.filter((purchase) => purchase.productId === i.productId)} signedIn returnTo={`/account/orders/${o.number}`} /></div>}
                  {o.status === 'delivered' && slug && !purchases.some((purchase) => purchase.itemId === i.id) && <p className="mt-2 text-[0.78rem] text-muted">Reviewed, or no longer open for this purchase.</p>}
                </div>
                <p className="shrink-0 text-[0.9rem]">{show(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[0.9rem] [&_div]:gap-3 [&_dd]:shrink-0 [&_dt]:min-w-0 [&_dt]:break-words">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{show(o.subtotal + (o.campaignDiscount || 0))}</dd></div>
            {o.campaignDiscount > 0 && <div className="flex justify-between text-accent"><dt>{o.campaignName || 'Event sale'} included</dt><dd>−{show(o.campaignDiscount)}</dd></div>}
            {o.discountTotal > 0 && <div className="flex justify-between text-accent"><dt>Discount {o.discountCode && `(${o.discountCode})`}</dt><dd>−{show(o.discountTotal)}</dd></div>}
            {o.giftTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Premium Gift Packaging</dt><dd>{show(o.giftTotal)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{o.shippingMethodName}</dt><dd>{o.shippingTotal ? show(o.shippingTotal) : 'Complimentary'}</dd></div>
            {o.refundedAmount > 0 && <div className="flex justify-between text-muted"><dt>Refunded</dt><dd>−{show(o.refundedAmount)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-[1.05rem]"><dt>Total</dt><dd className="font-medium">{show(o.total)}</dd></div>
          </dl>
        </div>
        <div className="min-w-0 space-y-6 break-words text-[0.9rem]">
          <div><p className="label">Shipping address</p><p>{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.province} {a.postalCode}<br />{a.phone}</p></div>
          <div><p className="label">Payment</p><p>{PM[o.paymentMethod] ?? o.paymentMethod}</p>{o.paidAt && <p className="text-muted">Paid {formatDate(o.paidAt)}</p>}<PaymentPlanNote plan={o.paymentPlan} /></div>
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
