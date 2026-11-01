import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { getStripe, confirmStripeSession, cancelUnpaidCardOrder } from '@/lib/stripe';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { addOrderEvent } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/** Stripe webhook: signature-verified source of truth for card payments. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? '', secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${(e as Error).message}` }, { status: 400 });
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') await confirmStripeSession(session, 'stripe-webhook');
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const id = Number(session.metadata?.orderId);
        if (id) await cancelUnpaidCardOrder(id, event.type === 'checkout.session.expired' ? 'Payment session expired' : 'Payment failed');
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const id = Number(charge.metadata?.orderId);
        if (id) {
          const db = await getDb();
          const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
          if (o) {
            const refunded = charge.amount_refunded;
            await db.update(orders).set({ refundedAmount: refunded, paymentStatus: refunded >= o.total ? 'refunded' : 'partially_refunded', updatedAt: new Date() }).where(eq(orders.id, id));
            await addOrderEvent(id, 'refund', `Stripe reports ${(refunded / 100).toFixed(0)} PKR refunded`, 'stripe-webhook');
          }
        }
        break;
      }
    }
  } catch (e) {
    console.error('webhook handling failed', e);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
