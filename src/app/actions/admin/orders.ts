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
    const o = await changeOrderStatus(orderId, status, actorName(u), { ...extra, source: 'admin', actorType: 'admin', actorId: u.id, confirmDelivery: status === 'delivered' });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    if (extra.notify && o) {
      const link = `${siteUrl()}/checkout/success?order=${o.number}&token=${orderAccessToken(o.number)}`;
      const mail = await Promise.race([
        sendEmail(o.email, `Your EVERMOON order ${o.number} is ${status.replaceAll('_', ' ')}`, statusEmail(o, status, link), `order-${status}`, { orderId: o.id }),
        new Promise<{ sent: false; reason: string }>((resolve) => setTimeout(() => resolve({ sent: false, reason: 'Email timed out after the status was saved.' }), 15_000)),
      ]);
      if (!mail.sent) return { ok: true, message: `Order marked as ${status.replaceAll('_', ' ')}. Email was not accepted: ${mail.reason || 'not sent'}.` };
    }
    return { ok: true, message: `Order marked as ${status}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not update the order.' };
  }
}

export async function markPaid(orderId: number, ref?: string): Promise<R> {
  const u = await assertAdmin();
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, message: 'Order not found.' };
  if (o.status === 'cancelled') return { ok: false, message: 'Cancelled orders cannot be marked as paid.' };
  if (o.paymentMethod === 'card') return { ok: false, message: 'Card payments are confirmed automatically by Stripe.' };
  const paid = await markOrderPaid(orderId, { actor: actorName(u), actorId: u.id, ref: ref || o.paymentRef, message: `Payment verified${ref ? ` (ref ${ref})` : ''}` });
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
  const reason = note?.trim();
  if (!reason) return { ok: false, message: 'Enter a rejection reason. The payment was not changed.' };
  await db.update(orders).set({ paymentStatus: 'failed', automationState: 'paused', nextStatus: null, nextStatusAt: null, updatedAt: new Date(), adminNote: reason }).where(eq(orders.id, orderId));
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

export async function markDelivered(orderId: number, note?: string): Promise<R> {
  try {
    const u = await assertAdmin();
    const o = await changeOrderStatus(orderId, 'delivered', actorName(u), {
      source: 'admin',
      actorType: 'admin',
      actorId: u.id,
      confirmDelivery: true,
      verificationNote: note?.trim() || undefined,
      note: note?.trim() || 'Admin verified delivery',
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath('/admin/express');
    const link = `${siteUrl()}/account/orders/${o.number}`;
    const mail = await sendEmail(o.email, `Your EVERMOON order ${o.number} is delivered`, statusEmail(o, 'delivered', link), 'order-delivered', { orderId: o.id });
    if (!mail.sent) return { ok: true, message: `Marked delivered. The email was not accepted: ${mail.reason || 'not sent'}. The status is saved.` };
    return { ok: true, message: 'Marked delivered. The customer notification is resolved.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not mark the order delivered.' };
  }
}

export async function saveDeliveryNote(orderId: number, note: string): Promise<R> {
  const u = await assertAdmin();
  const text = note.trim();
  if (!text) return { ok: false, message: 'Enter a delivery note. Nothing was saved.' };
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, message: 'Order not found.' };
  await db.update(orders).set({ confirmationNote: text.slice(0, 500), updatedAt: new Date() }).where(eq(orders.id, orderId));
  await addOrderEvent(orderId, 'delivery', `Delivery note: ${text.slice(0, 300)}`, actorName(u));
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: 'Delivery note saved.' };
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
