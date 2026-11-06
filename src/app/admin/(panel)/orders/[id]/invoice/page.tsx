import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { orderItems, orders } from '@/db/schema';
import { getSettings } from '@/lib/settings';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/utils';
import { PrintButton } from '@/components/admin/print-button';

export const metadata = { title: 'Invoice' };
const PM: Record<string, string> = { cod: 'Cash on Delivery', bank: 'Bank transfer', wallet: 'JazzCash / EasyPaisa', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', card: 'Card (Stripe)' };

export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, Number(id))).limit(1);
  if (!o) notFound();
  const [items, settings] = await Promise.all([db.select().from(orderItems).where(eq(orderItems.orderId, o.id)), getSettings()]);
  const a = o.shippingAddress;
  const s = settings.store;
  return (
    <div className="print-area fixed inset-0 z-[100] overflow-auto bg-white text-[#23201d] print:static">
      <div className="no-print sticky top-0 flex justify-end gap-2 border-b border-line bg-white/90 p-3 backdrop-blur"><PrintButton /></div>
      <div className="mx-auto max-w-3xl px-4 py-6 text-[0.88rem] sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-heading text-[1.6rem] tracking-[0.18em]">EVERMOON</p>
            <p className="text-[0.7rem] uppercase tracking-[0.3em] text-muted">Fine Jewelry</p>
            <p className="mt-4 max-w-xs text-[0.8rem] text-muted">{s.address}<br />{s.phone} · {s.email}</p>
          </div>
          <div className="text-right">
            <p className="font-heading text-[1.6rem]">Invoice</p>
            <p className="mt-1">{o.number}</p>
            <p className="text-muted">Issued {formatDate(o.createdAt)}</p>
            <p className="mt-2 inline-block rounded-full border border-line px-2.5 py-0.5 text-[0.72rem] uppercase tracking-wide">{o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus === 'refunded' ? 'Refunded' : 'Payment due'}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2 sm:gap-8">
          <div><p className="label">Bill & ship to</p><p>{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.province} {a.postalCode}<br />{a.country}<br />{a.phone}<br />{o.email}</p></div>
          <div><p className="label">Details</p><p>Payment: {PM[o.paymentMethod]}<br />Shipping: {o.shippingMethodName}{o.trackingNumber ? <><br />Tracking: {o.trackingCarrier} {o.trackingNumber}</> : null}</p></div>
        </div>
        <div className="mt-8 overflow-x-auto sm:mt-10">
        <table className="w-full min-w-[32rem]">
          <thead><tr className="border-b border-[#23201d] text-left text-[0.72rem] uppercase tracking-wider"><th className="py-2">Item</th><th className="py-2">SKU</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Total</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-line"><td className="py-3">{i.name}{i.variantTitle && <span className="block text-[0.75rem] text-muted">{i.variantTitle}</span>}{i.giftPackaging && <span className="block text-[0.75rem]">Premium gift packaging {formatMoney(i.giftUnitPrice)} × {i.quantity}</span>}</td><td className="py-3 text-muted">{i.sku}</td><td className="py-3 text-right">{formatMoney(i.unitPrice)}</td><td className="py-3 text-right">{i.quantity}</td><td className="py-3 text-right">{formatMoney(i.lineTotal)}</td></tr>
            ))}
          </tbody>
        </table>
        </div>
        <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(o.subtotal + (o.campaignDiscount || 0))}</dd></div>
          {o.campaignDiscount > 0 && <div className="flex justify-between"><dt className="text-muted">{o.campaignName || 'Event sale'}</dt><dd>−{formatMoney(o.campaignDiscount)}</dd></div>}
          {o.discountTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{formatMoney(o.discountTotal)}</dd></div>}
          {o.giftTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Gift packaging</dt><dd>{formatMoney(o.giftTotal)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{formatMoney(o.shippingTotal)}</dd></div>
          <div className="flex justify-between border-t border-[#23201d] pt-2 text-[1rem] font-semibold"><dt>Total (PKR)</dt><dd>{formatMoney(o.total)}</dd></div>
        </dl>
        <p className="mt-16 border-t border-line pt-5 text-center text-[0.75rem] text-muted">Thank you for choosing EVERMOON. Unworn pieces may be discussed for return within 7 days of a confirmed delivery. A refund is recorded only when the atelier records one.</p>
      </div>
    </div>
  );
}
