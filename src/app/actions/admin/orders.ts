'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import { addOrderEvent, changeOrderStatus, markOrderPaid, OrderError, orderAccessToken, restockOrder } from '@/lib/orders';
import { refundStripePayment } from '@/lib/stripe';
import { sendEmail, statusEmail } from '@/lib/email';
import { siteUrl } from '@/lib/utils';
import { formatMoney } from '@/lib/money';

type R = { ok: boolean; message: string };
const actorName = (u: { firstName: string; email: string }) => u.firstName || u.email;

export async function updateOrderStatus(orderId: number, status: string, extra: { carrier?: string; tracking?: string; note?: string; notify?: boolean; reason?: string; force?: boolean; customerNote?: string } = {}): Promise<R> {
  const u = await assertAdmin();
  try {
    const o = await changeOrderStatus(orderId, status, actorName(u), extra);
    if (extra.notify && o) {
      const link = `${siteUrl()}/checkout/success?order=${o.number}&token=${orderAccessToken(o.number)}`;
      const mail = await sendEmail(o.email, `Your EVERMOON order ${o.number} is ${status.replaceAll('_', ' ')}`, statusEmail(o, status, link), `order-${status}`, { orderId: o.id });
      if (!mail.sent) return { ok: true, message: `Order marked as ${status.replaceAll('_', ' ')}. Email was not accepted: ${mail.reason || 'not sent'}.` };
    }
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: `Order marked as ${status}.` };
  } catch (e) {
    return { ok: false, message: e instanceof OrderError ? e.message : 'Could not update the order.' };
  }
}

export async function markPaid(orderId: number, ref?: string): Promise<R> {
  const u = await assertAdmin();
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, message: 'Order not found.' };
  if (o.status === 'cancelled') return { ok: false, message: 'Cancelled orders cannot be marked as paid.' };
  if (o.paymentMethod === 'card') return { ok: false, message: 'Card payments are confirmed automatically by Stripe.' };
  const paid = await markOrderPaid(orderId, { actor: actorName(u), ref: ref || o.paymentRef, message: `Payment verified${ref ? ` (ref ${ref})` : ''}` });
  if (paid) {
    const link = `${siteUrl()}/checkout/success?order=${paid.number}&token=${orderAccessToken(paid.number)}`;
    const mail = await sendEmail(paid.email, `Payment confirmed for ${paid.number}`, statusEmail(paid, 'paid', link), 'order-paid', { orderId: paid.id });
    if (!mail.sent) return { ok: true, message: `Payment recorded. The confirmation email was not accepted: ${mail.reason || 'not sent'}.` };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: 'Payment verified.' };
}

export async function rejectPayment(orderId: number, note?: string): Promise<R> {
  const u = await assertAdmin();
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, message: 'Order not found.' };
  if (o.paymentMethod === 'card') return { ok: false, message: 'Card payments are confirmed by Stripe.' };
  if (o.paymentStatus === 'paid') return { ok: false, message: 'Verified payments must be refunded, not rejected.' };
  await db.update(orders).set({ paymentStatus: 'failed', updatedAt: new Date(), adminNote: note || o.adminNote }).where(eq(orders.id, orderId));
  await addOrderEvent(orderId, 'payment', `Payment rejected${note ? ` — ${note}` : ''}`, actorName(u));
  const link = `${siteUrl()}/checkout/success?order=${o.number}&token=${orderAccessToken(o.number)}`;
  await sendEmail(o.email, `Payment update for ${o.number}`, statusEmail(o, 'failed', link), 'order-payment-failed', { orderId: o.id });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: 'Payment rejected. The customer can be asked to upload a new receipt.' };
}

export async function refundOrder(orderId: number, amountRupees: number, reason: string, restock: boolean): Promise<R> {
  const u = await assertAdmin({ adminOnly: true });
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, message: 'Order not found.' };
  const amount = Math.round(amountRupees * 100);
  const refundable = o.total - o.refundedAmount;
  if (!(amount > 0) || amount > refundable) return { ok: false, message: `Enter an amount between Rs 1 and ${formatMoney(refundable)}.` };
  if (o.paymentStatus !== 'paid' && o.paymentStatus !== 'partially_refunded') return { ok: false, message: 'Only paid orders can be refunded.' };
  let note = 'Manual refund recorded';
  if (o.paymentMethod === 'card') {
    try {
      const r = await refundStripePayment(o, amount);
      note = `Stripe refund ${r.id} (${r.status})`;
    } catch (e) {
      return { ok: false, message: `Stripe refund failed: ${(e as Error).message}` };
    }
  }
  const total = o.refundedAmount + amount;
  await db.update(orders).set({ refundedAmount: total, paymentStatus: total >= o.total ? 'refunded' : 'partially_refunded', updatedAt: new Date() }).where(eq(orders.id, orderId));
  await addOrderEvent(orderId, 'refund', `${note}: ${formatMoney(amount)}${reason ? ` — ${reason}` : ''}`, actorName(u));
  if (restock) await restockOrder(orderId, 'return', actorName(u));
  const link = `${siteUrl()}/checkout/success?order=${o.number}&token=${orderAccessToken(o.number)}`;
  const mail = await sendEmail(o.email, `Refund recorded for ${o.number}`, statusEmail({ ...o, refundedAmount: total }, 'refunded', link), 'order-refund', { orderId: o.id });
  if (!mail.sent) return { ok: true, message: `Refund recorded. The email was not accepted: ${mail.reason || 'not sent'}. The refund itself is only recorded here — it is not a bank transfer.` };
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: `Refunded ${formatMoney(amount)}.` };
}

export async function saveOrderNote(orderId: number, note: string): Promise<R> {
  const u = await assertAdmin();
  const db = await getDb();
  await db.update(orders).set({ adminNote: note.slice(0, 4000), updatedAt: new Date() }).where(eq(orders.id, orderId));
  await addOrderEvent(orderId, 'note', 'Internal note updated', actorName(u));
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: 'Note saved.' };
}

export async function saveTracking(orderId: number, carrier: string, tracking: string): Promise<R> {
  const u = await assertAdmin();
  const db = await getDb();
  await db.update(orders).set({ trackingCarrier: carrier.slice(0, 80) || null, trackingNumber: tracking.slice(0, 120) || null, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await addOrderEvent(orderId, 'tracking', `Tracking updated: ${carrier} ${tracking}`.trim(), actorName(u));
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: 'Tracking saved.' };
}
