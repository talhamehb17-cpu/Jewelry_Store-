import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { Printer, Mail, Phone, MapPin } from 'lucide-react';
import { getDb } from '@/db';
import { deliveryIssues, orderEvents, orderItems, orders, paymentProofs } from '@/db/schema';
import { Card, PageHeader } from '@/components/admin/ui';
import { StatusBadge } from '@/components/store/order-status';
import { OrderActions } from '@/components/admin/order-actions';
import { Img } from '@/components/ui/img';
import { STATUS_FLOW } from '@/lib/orders';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/utils';
import { ProofViewer } from '@/components/admin/proof-viewer';
import { DeliveryConsole } from '@/components/admin/delivery-console';


export const metadata = { title: 'Order' };
const PM: Record<string, string> = { cod: 'Cash on Delivery', bank: 'Bank transfer', wallet: 'JazzCash / EasyPaisa', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', card: 'Card (Stripe)' };

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const oid = Number(id);
  if (!Number.isInteger(oid)) notFound();
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, oid)).limit(1);
  if (!o) notFound();
  const [proof] = await db.select({ token: paymentProofs.token, filename: paymentProofs.filename, mime: paymentProofs.mime, createdAt: paymentProofs.createdAt }).from(paymentProofs).where(eq(paymentProofs.orderId, o.id)).limit(1);
  const [items, events, [hist], [issue]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, oid)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, oid)).orderBy(desc(orderEvents.createdAt)),
    db.select({ n: sql<number>`count(*)::int`, spent: sql<number>`coalesce(sum(${orders.total}),0)::bigint` }).from(orders).where(sql`lower(${orders.email}) = ${o.email.toLowerCase()} and ${orders.status} <> 'cancelled'`),
    db.select().from(deliveryIssues).where(sql`${deliveryIssues.orderId} = ${o.id} and ${deliveryIssues.status} = 'open'`).limit(1),
  ]);
  const a = o.shippingAddress;
  return (
    <>
      <PageHeader
        back={{ href: '/admin/orders', label: 'Orders' }}
        title={o.number}
        description={<span className="flex flex-wrap items-center gap-2">{formatDateTime(o.createdAt)} · <StatusBadge status={o.status} /> <StatusBadge status={o.paymentStatus} kind="payment" /></span>}
        actions={<Link href={`/admin/orders/${o.id}/invoice`} target="_blank" className="btn btn-secondary"><Printer size={15} /> Invoice</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title={`Items (${items.reduce((s, i) => s + i.quantity, 0)})`} pad={false}>
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex items-start gap-3 px-4 py-4 sm:items-center sm:px-5">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary"><Img src={i.image} alt="" sizes="56px" /></span>
                  <div className="min-w-0 flex-1">
                    {i.productId ? <Link href={`/admin/products/${i.productId}`} className="font-medium hover:underline">{i.name}</Link> : <span className="font-medium">{i.name}</span>}
                    <p className="text-[0.75rem] text-muted">{[i.variantTitle, i.sku && `SKU ${i.sku}`].filter(Boolean).join(' · ')}</p>
                    <p className="mt-1 text-[0.84rem] sm:hidden">{formatMoney(i.unitPrice)} × {i.quantity} · <span className="font-medium">{formatMoney(i.lineTotal)}</span></p>
                  </div>
                  <span className="hidden text-[0.84rem] text-muted sm:block">{formatMoney(i.unitPrice)} × {i.quantity}</span>
                  <span className="hidden w-28 shrink-0 text-right font-medium sm:block">{formatMoney(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-4 py-4 text-[0.85rem] sm:px-5">
              <div className="flex justify-between gap-3"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(o.subtotal + (o.campaignDiscount || 0))}</dd></div>
              {o.campaignDiscount > 0 && <div className="flex justify-between gap-3"><dt className="min-w-0 text-muted">{o.campaignName || 'Event sale'} included</dt><dd className="shrink-0">−{formatMoney(o.campaignDiscount)}</dd></div>}
              {o.discountTotal > 0 && <div className="flex justify-between gap-3"><dt className="min-w-0 text-muted">Discount {o.discountCode && `(${o.discountCode})`}</dt><dd className="shrink-0">−{formatMoney(o.discountTotal)}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="min-w-0 text-muted">{o.shippingMethodName}</dt><dd className="shrink-0">{formatMoney(o.shippingTotal)}</dd></div>
              {o.codFee > 0 && <div className="flex justify-between"><dt className="text-muted">COD fee</dt><dd>{formatMoney(o.codFee)}</dd></div>}
              {o.taxTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{formatMoney(o.taxTotal)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 text-[0.95rem] font-semibold"><dt>Total</dt><dd>{formatMoney(o.total)}</dd></div>
              {o.refundedAmount > 0 && <div className="flex justify-between text-rose-700"><dt>Refunded</dt><dd>−{formatMoney(o.refundedAmount)}</dd></div>}
            </dl>
          </Card>
          <DeliveryConsole
            order={{
              id: o.id,
              number: o.number,
              status: o.status,
              paymentStatus: o.paymentStatus,
              shippingMethodName: o.shippingMethodName,
              timelineStartAt: o.timelineStartAt?.toISOString() ?? null,
              expectedAt: o.expectedAt?.toISOString() ?? null,
              processingAt: o.processingAt?.toISOString() ?? null,
              shippedAt: o.shippedAt?.toISOString() ?? null,
              outForDeliveryAt: o.outForDeliveryAt?.toISOString() ?? null,
              notificationDueAt: o.notificationDueAt?.toISOString() ?? null,
              deliveryResponse: o.deliveryResponse,
              confirmationSource: o.confirmationSource,
              deliveryConfirmedAt: o.deliveryConfirmedAt?.toISOString() ?? null,
              confirmationNote: o.confirmationNote,
              automationState: o.automationState,
              nextStatus: o.nextStatus,
              nextStatusAt: o.nextStatusAt?.toISOString() ?? null,
              issueId: issue?.id ?? null,
              issueNote: issue?.note ?? null,
            }}
          />
          <OrderActions
            order={{ id: o.id, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, paymentRef: o.paymentRef, total: o.total, refundedAmount: o.refundedAmount, trackingCarrier: o.trackingCarrier, trackingNumber: o.trackingNumber, adminNote: o.adminNote }}
            next={STATUS_FLOW[o.status] ?? []}
          />
          <Card title="Timeline">
            <ol className="space-y-4 border-l border-line pl-5">
              {events.map((e) => (
                <li key={e.id} className="relative text-[0.84rem]">
                  <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#a8844a] ring-1 ring-line" />
                  <p>{e.message}</p>
                  <p className="text-[0.72rem] text-muted">{formatDateTime(e.createdAt)} · {e.actor}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Customer">
            <p className="font-medium">{o.customerName}</p>
            {o.userId ? <Link href={`/admin/customers/${o.userId}`} className="text-[0.8rem] text-muted underline">View customer profile</Link> : <p className="text-[0.8rem] text-muted">Guest checkout</p>}
            <ul className="mt-4 space-y-2 text-[0.84rem]">
              <li className="flex items-center gap-2"><Mail size={14} className="shrink-0 text-muted" /><a href={`mailto:${o.email}`} className="min-w-0 break-all hover:underline">{o.email}</a></li>
              {o.phone && <li className="flex items-center gap-2"><Phone size={14} className="text-muted" /><a href={`tel:${o.phone}`} className="hover:underline">{o.phone}</a> · <a href={`https://wa.me/${o.phone.replace(/\D/g, '').replace(/^0/, '92')}`} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">WhatsApp</a></li>}
            </ul>
            <p className="mt-4 text-[0.78rem] text-muted">{hist?.n ?? 0} orders · {formatMoney(Number(hist?.spent ?? 0))} lifetime</p>
          </Card>
          <Card title="Shipping address">
            <p className="flex gap-2 text-[0.85rem] leading-relaxed"><MapPin size={14} className="mt-1 shrink-0 text-muted" /><span>{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.city}, {a.province} {a.postalCode}<br />{a.country}<br />{a.phone}</span></p>
            <p className="mt-3 text-[0.8rem] text-muted">Method: {o.shippingMethodName}</p>
          </Card>
          <Card title="Payment">
            <dl className="space-y-1.5 text-[0.84rem]">
              <div className="flex justify-between gap-3"><dt className="text-muted">Method</dt><dd>{PM[o.paymentMethod] ?? o.paymentMethod}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Status</dt><dd><StatusBadge status={o.paymentStatus} kind="payment" /></dd></div>
              {o.paymentRef && <div className="flex justify-between gap-3"><dt className="text-muted">Reference</dt><dd className="break-all text-right font-mono text-[0.75rem]">{o.paymentRef}</dd></div>}
              {o.paymentIntentId && <div className="flex justify-between gap-3"><dt className="text-muted">Payment intent</dt><dd className="break-all text-right font-mono text-[0.75rem]">{o.paymentIntentId}</dd></div>}
              {o.paidAt && <div className="flex justify-between gap-3"><dt className="text-muted">Paid</dt><dd>{formatDateTime(o.paidAt)}</dd></div>}
            </dl>
            {proof ? (
              <div className="mt-3">
                <p className="text-[0.8rem]">Receipt uploaded {formatDateTime(proof.createdAt)} · staff only</p>
                {proof.mime.startsWith('image/') ? (
                  <ProofViewer src={`/api/payment-proof/${proof.token}`} alt={`Payment receipt for ${o.number}`} />
                ) : (
                  <a href={`/api/payment-proof/${proof.token}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[0.8rem] underline">View payment receipt ({proof.filename})</a>
                )}
              </div>
            ) : <p className="mt-3 text-[0.8rem] text-muted">No receipt was uploaded with this order.</p>}
            {(o.paymentMethod === 'bank' || o.paymentMethod === 'easypaisa' || o.paymentMethod === 'jazzcash') && <p className="mt-3 rounded-md bg-secondary px-3 py-2 text-[0.75rem] text-muted">The receipt is private. Verify the funds before marking the payment verified.</p>}
          </Card>
          {o.customerNote && <Card title="Customer note"><p className="whitespace-pre-line text-[0.85rem]">{o.customerNote}</p></Card>}
        </div>
      </div>
    </>
  );
}
