import { and, eq, inArray, isNull, lte, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { deliveryIssues, orders, type DeliveryPlan, type Order } from '@/db/schema';
import { changeOrderStatus } from './orders';
import { deliveryClockStart } from './delivery';
import { sendEmail, statusEmail } from './email';
import { absoluteUrl } from './utils';
import { getSettings } from './settings';

const AUTO: Record<string, keyof DeliveryPlan> = {
  pending: 'confirmMinutes',
  confirmed: 'processingMinutes',
  processing: 'shipMinutes',
  shipped: 'outMinutes',
};

const NEXT: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'processing',
  processing: 'shipped',
  shipped: 'out_for_delivery',
};

function planOf(order: Order): DeliveryPlan | null {
  const plan = order.deliveryPlan;
  if (!plan || typeof plan !== 'object' || !plan.durationMinutes) return null;
  return plan;
}

let lastProgress = 0;

/** Runs the timer at most once every five minutes in this server instance. Never marks delivered. */
export function scheduleProgress() {
  if (Date.now() - lastProgress < 5 * 60_000) return;
  lastProgress = Date.now();
  void progressOrders().catch(() => undefined);
}

/** Advances only stages the saved plan marked automatic. Never marks an order delivered. */
export async function progressOrders(now = new Date()) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(and(inArray(orders.status, ['pending', 'confirmed', 'processing', 'shipped']), ne(orders.status, 'cancelled')));
  let advanced = 0;
  const notes: string[] = [];
  for (const order of rows) {
    const plan = planOf(order);
    const start = deliveryClockStart(order);
    if (!plan || !start) continue;
    const key = AUTO[order.status];
    const next = NEXT[order.status];
    if (!key || !next) continue;
    const threshold = plan[key];
    if (threshold == null || threshold < 0) continue;
    const elapsed = now.getTime() - start.getTime();
    if (elapsed < threshold * 60_000) continue;
    try {
      const updated = await changeOrderStatus(order.id, next, 'automation', {
        note: `Automatic move after ${threshold} minutes on the saved delivery plan. Delivery is not marked received by the timer.`,
      });
      advanced += 1;
      notes.push(`${updated.number}: ${order.status} → ${next}`);
      const link = absoluteUrl(`/account/orders/${updated.number}`);
      await sendEmail(updated.email, `Your EVERMOON order ${updated.number} is ${next.replaceAll('_', ' ')}`, statusEmail(updated, next, link), `order-${next}`, {
        orderId: updated.id,
      });
    } catch (err) {
      notes.push(`${order.number}: skipped (${err instanceof Error ? err.message : 'error'})`);
    }
  }
  return { checked: rows.length, advanced, notes };
}

export async function ordersAwaitingDeliveryConfirmation(userId: number, now = new Date()) {
  const db = await getDb();
  return db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        isNull(orders.deliveryResponse),
        lte(orders.expectedAt, now),
        inArray(orders.status, ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery']),
      ),
    );
}

export async function respondToDelivery(orderId: number, userId: number, received: boolean) {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1);
  if (!order) return { ok: false as const, message: 'Order not found.' };
  if (order.status === 'cancelled' || order.status === 'delivered') return { ok: false as const, message: 'This order is already closed.' };
  if (order.deliveryResponse) return { ok: false as const, message: 'You already answered this. Client care will follow up if needed.' };
  if (!order.expectedAt || order.expectedAt.getTime() > Date.now()) return { ok: false as const, message: 'The expected delivery time has not passed yet.' };
  const now = new Date();
  if (received) {
    await changeOrderStatus(order.id, 'delivered', 'customer', { note: 'Customer confirmed receipt', force: true });
    await db
      .update(orders)
      .set({ deliveryResponse: 'yes', deliveryConfirmedAt: now, updatedAt: now })
      .where(eq(orders.id, order.id));
    const link = absoluteUrl(`/account/orders/${order.number}`);
    await sendEmail(order.email, `Delivery confirmed for ${order.number}`, statusEmail({ ...order, status: 'delivered' }, 'delivered', link), 'order-delivered', {
      orderId: order.id,
      force: true,
    });
    return { ok: true as const, message: 'Thank you. The order is marked delivered.' };
  }
  await db.update(orders).set({ deliveryResponse: 'no', updatedAt: now }).where(eq(orders.id, order.id));
  await db.insert(deliveryIssues).values({
    orderId: order.id,
    status: 'open',
    note: 'Customer said the order has not arrived.',
    expectedAt: order.expectedAt,
  });
  const settings = await getSettings();
  if (settings.store.email) {
    await sendEmail(
      settings.store.email,
      `Delivery issue ${order.number}`,
      `<p>Order ${order.number} was not received.</p><p>${order.customerName} · ${order.email} · ${order.phone ?? ''}</p><p>${order.shippingMethodName}. Expected ${order.expectedAt.toISOString()}.</p>`,
      'delivery-issue',
      { orderId: order.id },
    );
  }
  return { ok: true as const, message: 'We have opened a delivery issue for the atelier. The order is not marked delivered.' };
}
