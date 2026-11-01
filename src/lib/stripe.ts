import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { orders, type Order } from '@/db/schema';
import { markOrderPaid, orderAccessToken, changeOrderStatus, addOrderEvent } from './orders';

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

/** Creates a hosted Stripe Checkout session for an order (amount taken from the server-side order total). */
export async function createCheckoutSession(order: Order, origin: string) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Card payments are not configured.');
  const token = orderAccessToken(order.number);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: order.email,
    client_reference_id: String(order.id),
    metadata: { orderId: String(order.id), orderNumber: order.number },
    payment_intent_data: { metadata: { orderId: String(order.id), orderNumber: order.number } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: order.total,
          product_data: { name: `Maison Aurelle — order ${order.number}`, description: 'Fine jewelry, shipping and applicable discounts included' },
        },
      },
    ],
    success_url: `${origin}/checkout/success?order=${encodeURIComponent(order.number)}&token=${token}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?cancelled=${encodeURIComponent(order.number)}&token=${token}`,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
  });
  const db = await getDb();
  await db.update(orders).set({ paymentRef: session.id, updatedAt: new Date() }).where(eq(orders.id, order.id));
  return session;
}

/** Verifies a Checkout Session with Stripe and marks the order paid if (and only if) Stripe confirms payment. */
export async function confirmStripeSession(sessionOrId: Stripe.Checkout.Session | string, actor = 'stripe') {
  const stripe = getStripe();
  if (!stripe) return { ok: false as const, reason: 'Stripe not configured' };
  const session = typeof sessionOrId === 'string' ? await stripe.checkout.sessions.retrieve(sessionOrId) : sessionOrId;
  const orderId = Number(session.metadata?.orderId);
  if (!orderId) return { ok: false as const, reason: 'Session has no order reference' };
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false as const, reason: 'Order not found' };
  if (order.paymentStatus === 'paid') return { ok: true as const, order };
  if (session.payment_status !== 'paid') return { ok: false as const, reason: `Payment status: ${session.payment_status}`, order };
  if (session.amount_total !== order.total || session.currency?.toUpperCase() !== order.currency) {
    await addOrderEvent(order.id, 'payment', `Stripe amount mismatch (${session.amount_total} ${session.currency}) — manual review required`, 'system');
    return { ok: false as const, reason: 'Amount mismatch', order };
  }
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const updated = await markOrderPaid(order.id, { actor, ref: session.id, paymentIntentId: pi ?? null, message: `Card payment confirmed by Stripe (${pi ?? session.id})` });
  return { ok: true as const, order: updated ?? order };
}

/** Cancels an unpaid card order (customer abandoned Stripe Checkout or the session expired) and restocks it. */
export async function cancelUnpaidCardOrder(orderId: number, reason: string) {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.paymentMethod !== 'card' || order.paymentStatus === 'paid' || order.status === 'cancelled') return;
  const stripe = getStripe();
  if (stripe && order.paymentRef?.startsWith('cs_')) {
    try {
      const s = await stripe.checkout.sessions.retrieve(order.paymentRef);
      if (s.payment_status === 'paid') {
        await confirmStripeSession(s, 'system');
        return;
      }
      if (s.status === 'open') await stripe.checkout.sessions.expire(order.paymentRef);
    } catch {
      /* session may already be expired */
    }
  }
  await db.update(orders).set({ paymentStatus: 'failed', updatedAt: new Date() }).where(eq(orders.id, orderId));
  await changeOrderStatus(orderId, 'cancelled', 'system', { note: reason });
}

export async function refundStripePayment(order: Order, amount: number) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured.');
  if (!order.paymentIntentId) throw new Error('No Stripe payment found for this order.');
  return stripe.refunds.create({ payment_intent: order.paymentIntentId, amount, metadata: { orderNumber: order.number } });
}
