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
import { ClearCartOnMount } from '@/components/store/clear-cart';

export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false } };

type SP = Promise<{ order?: string; token?: string; session_id?: string }>;

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
          <p className="mx-auto mt-4 max-w-lg text-muted">Your order has been received{paid ? ' and paid' : ''}. We’ve sent a confirmation to <span className="text-ink">{order.email}</span>.</p>
        </div>

        <div className="mt-10 rounded-theme border border-line p-6 md:p-8">
          {order.paymentMethod === 'cod' && <p className="flex gap-3 text-[0.92rem]"><Banknote size={20} strokeWidth={1.25} className="shrink-0 text-accent" /><span>Please keep <strong>{formatMoney(order.total)}</strong> ready in cash for the courier. Our team may call {order.phone} to confirm your order before dispatch.</span></p>}
          {order.paymentMethod === 'bank' && !paid && (
            <div className="flex gap-3 text-[0.92rem]"><Landmark size={20} strokeWidth={1.25} className="shrink-0 text-accent" />
              <div>
                <p>Please transfer <strong>{formatMoney(order.total)}</strong> to <strong>{p.bank.accountTitle}</strong>, {p.bank.bankName}, IBAN <span className="font-mono">{p.bank.iban}</span>, using <strong>{order.number}</strong> as the reference.</p>
                <p className="mt-2 text-muted">{order.paymentRef ? `Reference received: ${order.paymentRef}. ` : ''}Your order will be confirmed once payment is verified.</p>
              </div>
            </div>
          )}
          {order.paymentMethod === 'wallet' && !paid && (
            <div className="flex gap-3 text-[0.92rem]"><Smartphone size={20} strokeWidth={1.25} className="shrink-0 text-accent" />
              <div>
                <p>Send <strong>{formatMoney(order.total)}</strong> via JazzCash ({p.wallet.jazzcash}) or Easypaisa ({p.wallet.easypaisa}) to <strong>{p.wallet.accountTitle}</strong>.</p>
                <p className="mt-2 text-muted">{order.paymentRef ? `Transaction ID received: ${order.paymentRef}. ` : 'Reply to your confirmation email or WhatsApp us with your transaction ID. '}We’ll confirm as soon as it’s verified.</p>
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
                  <span className="flex-1 text-[0.9rem]">{i.name}{i.variantTitle && <span className="block text-[0.78rem] text-muted">{i.variantTitle}</span>}</span>
                  <span className="text-[0.85rem] text-muted">× {i.quantity}</span>
                  <span className="w-24 text-right text-[0.9rem]">{formatMoney(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[0.88rem]">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(order.subtotal)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between text-accent"><dt>Discount {order.discountCode && `(${order.discountCode})`}</dt><dd>−{formatMoney(order.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">{order.shippingMethodName}</dt><dd>{order.shippingTotal ? formatMoney(order.shippingTotal) : 'Complimentary'}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-[1rem]"><dt>Total</dt><dd className="font-medium">{formatMoney(order.total)}</dd></div>
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
                <li>1. We confirm your order{order.paymentMethod === 'cod' ? ' by phone or WhatsApp' : ''}.</li>
                <li>2. Your pieces are polished, boxed and dispatched.</li>
                <li>3. You receive a tracking number by email and SMS.</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">Continue shopping</Link>
          {user ? <Link href={`/account/orders/${order.number}`} className="btn btn-secondary">Track this order</Link> : <Link href="/account/register" className="btn btn-secondary">Create an account to track orders</Link>}
        </div>
      </div>
    </div>
  );
}
