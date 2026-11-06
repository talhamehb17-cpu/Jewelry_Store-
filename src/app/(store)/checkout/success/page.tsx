import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { CheckCircle2, Clock, Landmark, Smartphone, Banknote, CreditCard } from 'lucide-react';
import { getDb } from '@/db';
import { orderItems, orders } from '@/db/schema';
import { verifyOrderToken } from '@/lib/orders';
import { confirmStripeSession } from '@/lib/stripe';
import { getSettings } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { formatMoney } from '@/lib/money';
import { Img } from '@/components/ui/img';
import { PaymentPlanNote } from '@/components/store/payment-plan-note';
import { ClearCartOnMount } from '@/components/store/clear-cart';
import { GuestCancel } from '@/components/store/guest-cancel';

export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false } };

type SP = Promise<{ order?: string; token?: string; session_id?: string; email?: string; note?: string }>;

export default async function SuccessPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  if (!sp.order) notFound();
  const db = await getDb();
  let [order] = await db.select().from(orders).where(eq(orders.number, sp.order)).limit(1);
  if (!order) notFound();
  const user = await getCurrentUser();
  const allowed = verifyOrderToken(order.number, sp.token) || (user && order.userId === user.id);
  if (!allowed) notFound();

  // Card payments: verify with Stripe server-side (webhook also confirms asynchronously).
  let paymentNote: string | null = null;
  if (order.paymentMethod === 'card' && order.paymentStatus !== 'paid' && sp.session_id) {
    const res = await confirmStripeSession(sp.session_id, 'customer-return');
    if (res.ok && res.order) order = res.order;
    else paymentNote = 'We’re waiting for Stripe to confirm your payment. This page will show “Paid” once it’s verified — you’ll also receive an email.';
  }
  const [items, settings] = await Promise.all([db.select().from(orderItems).where(eq(orderItems.orderId, order.id)), getSettings()]);
  const a = order.shippingAddress;
  const paid = order.paymentStatus === 'paid';
  const p = settings.payments;

  return (
    <div className="container-x pb-24 pt-12 md:pt-16">
      <ClearCartOnMount />
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <CheckCircle2 size={48} strokeWidth={1} className="mx-auto text-accent" />
          <p className="eyebrow mt-6">Order {order.number}</p>
          <h1 className="t-1 mt-3">Thank you, {order.customerName.split(' ')[0]}</h1>
          <p className="mx-auto mt-4 max-w-lg text-muted">Your order has been received{paid ? ' and paid' : ''}. {sp.email === 'sent' ? `The confirmation was accepted for ${order.email}.` : `The confirmation to ${order.email} is still pending. The order number is saved.`}</p>
          {sp.note && <p className="mx-auto mt-2 max-w-lg text-[0.85rem] text-muted">{sp.note}</p>}
        </div>

        <div className="mt-10 rounded-theme border border-line p-6 md:p-8">
          {order.paymentPlan?.applied && <PaymentPlanNote plan={order.paymentPlan} />}
          {order.paymentMethod === 'cod' && !order.paymentPlan?.applied && <p className="flex gap-3 text-[0.92rem]"><Banknote size={20} strokeWidth={1.25} className="shrink-0 text-accent" /><span>Please keep <strong>{formatMoney(order.total)} PKR</strong> ready in cash. This is the amount to pay. A currency shown elsewhere on the site is only a display estimate.</span></p>}
          {order.paymentMethod === 'bank' && !paid && !order.paymentPlan?.applied && (
            <div className="flex gap-3 text-[0.92rem]"><Landmark size={20} strokeWidth={1.25} className="shrink-0 text-accent" />
              <div>
                <p>We received your bank-transfer receipt for <strong>{formatMoney(order.total)}</strong> to <strong>{p.bank.accountTitle}</strong>, {p.bank.bankName}.</p>
                <p className="mt-2 text-muted">{order.paymentRef ? `Reference received: ${order.paymentRef}. ` : ''}Your receipt is under review and is not publicly visible. The order is confirmed only after the payment is verified.</p>
              </div>
            </div>
          )}
          {(order.paymentMethod === 'easypaisa' || order.paymentMethod === 'jazzcash' || order.paymentMethod === 'wallet') && !paid && !order.paymentPlan?.applied && (
            <div className="flex gap-3 text-[0.92rem]"><Smartphone size={20} strokeWidth={1.25} className="shrink-0 text-accent" />
              <div>
                <p>We received your {order.paymentMethod === 'jazzcash' ? 'JazzCash' : order.paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'wallet'} receipt. The order total was <strong>{formatMoney(order.total)}</strong>{order.paymentRef ? `, reference ${order.paymentRef}` : ''}.</p>
                <p className="mt-2 text-muted">Payment is under review. Uploading the receipt does not confirm it — we’ll email you when it is verified.</p>
              </div>
            </div>
          )}
          {order.paymentMethod === 'card' && (
            <p className="flex gap-3 text-[0.92rem]">{paid ? <CreditCard size={20} strokeWidth={1.25} className="shrink-0 text-accent" /> : <Clock size={20} strokeWidth={1.25} className="shrink-0 text-accent" />}<span>{paid ? 'Your card payment was verified by Stripe. Thank you!' : paymentNote ?? 'Awaiting payment confirmation from Stripe.'}</span></p>
          )}
          {paid && order.paymentMethod !== 'card' && order.paymentMethod !== 'cod' && <p className="flex gap-3 text-[0.92rem]"><CheckCircle2 size={20} strokeWidth={1.25} className="shrink-0 text-accent" />Payment verified — thank you!</p>}
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-theme bg-surface/60 p-6">
            <h2 className="t-4 mb-4">Order summary</h2>
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-4">
                  <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-theme-sm bg-surface"><Img src={i.image} alt={i.name} sizes="56px" /></span>
                  <span className="flex-1 text-[0.9rem]">{i.name}{i.variantTitle && <span className="block text-[0.78rem] text-muted">{i.variantTitle}</span>}{i.giftPackaging && <span className="block text-[0.75rem] text-accent">Premium Gift Packaging {formatMoney(i.giftLineTotal)}</span>}</span>
                  <span className="text-[0.85rem] text-muted">× {i.quantity}</span>
                  <span className="w-24 text-right text-[0.9rem]">{formatMoney(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[0.88rem]">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(order.subtotal + (order.campaignDiscount || 0))}</dd></div>
              {order.campaignDiscount > 0 && <div className="flex justify-between text-accent"><dt>{order.campaignName || 'Event sale'} included</dt><dd>−{formatMoney(order.campaignDiscount)}</dd></div>}
              {order.discountTotal > 0 && <div className="flex justify-between text-accent"><dt>Discount {order.discountCode && `(${order.discountCode})`}</dt><dd>−{formatMoney(order.discountTotal)}</dd></div>}
              {order.giftTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Premium Gift Packaging</dt><dd>{formatMoney(order.giftTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">{order.shippingMethodName}</dt><dd>{order.shippingTotal ? formatMoney(order.shippingTotal) : 'Complimentary'}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-[1rem]"><dt>Total to pay</dt><dd className="font-medium">{formatMoney(order.total)} PKR</dd></div>
            </dl>
          </div>
          <div className="space-y-6 text-[0.9rem]">
            <div>
              <h3 className="label">Delivering to</h3>
              <p>{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.province}<br />{a.phone}</p>
            </div>
            <div>
              <h3 className="label">What happens next</h3>
              <ol className="space-y-2 text-muted">
                <li>1. The order stays Pending until the atelier confirms it{order.paymentMethod === 'cod' ? '. They may call to confirm before dispatch' : ''}.</li>
                <li>2. You can cancel from your account only while it is Pending.</li>
                <li>3. A tracking number is added only when the atelier has one. Delivery dates are estimates, not a guarantee.</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">Continue shopping</Link>
          {user ? <Link href={`/account/orders/${order.number}`} className="btn btn-secondary">Track this order</Link> : <Link href="/account/register" className="btn btn-secondary">Create an account to track orders</Link>}
          {sp.token && <GuestCancel number={order.number} token={sp.token} pending={order.status === 'pending'} />}
        </div>
      </div>
    </div>
  );
}
