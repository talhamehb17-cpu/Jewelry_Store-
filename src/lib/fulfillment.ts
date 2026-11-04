import { and, eq, inArray, isNotNull, isNull, lte, ne, or } from 'drizzle-orm';
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

async function mailStatus(order: Order, status: string) {
  const link = absoluteUrl(`/account/orders/${order.number}`);
  await Promise.race([
    sendEmail(order.email, `Your EVERMOON order ${order.number} is ${status.replaceAll('_', ' ')}`, statusEmail(order, status, link), `order-${status}`, { orderId: order.id }),
    new Promise((resolve) => setTimeout(resolve, 12_000)),
  ]);
}

/** Advances only stages the saved plan marked automatic. Never marks an order delivered. */
export async function progressOrders(now = new Date(), onlyOrderId?: number) {
  const db = await getDb();
  let advanced = 0;
  const notes: string[] = [];
  let checked = 0;
  for (let pass = 0; pass < 4; pass++) {
    const rows = await db
      .select()
      .from(orders)
      .where(and(inArray(orders.status, ['pending', 'confirmed', 'processing', 'shipped']), ne(orders.status, 'cancelled'), onlyOrderId ? eq(orders.id, onlyOrderId) : undefined));
    checked = rows.length;
    let moved = 0;
    for (const order of rows) {
      const plan = planOf(order);
      const start = deliveryClockStart(order);
      if (!plan || !start) continue;
      const key = AUTO[order.status];
      const next = NEXT[order.status];
      if (!key || !next) continue;
      if ((next === 'shipped' || next === 'out_for_delivery') && plan[key] == null) continue;
      const threshold = plan[key];
      if (threshold == null || threshold < 0) continue;
      if (now.getTime() - start.getTime() < threshold * 60_000) continue;
      try {
        const updated = await changeOrderStatus(order.id, next, 'automation', {
          note: `Automatic move after ${threshold} minutes on the plan saved with this order. Not marked delivered.`,
        });
        advanced += 1;
        moved += 1;
        notes.push(`${updated.number}: ${order.status} → ${next}`);
        await mailStatus(updated, next);
      } catch (err) {
        notes.push(`${order.number}: skipped (${err instanceof Error ? err.message : 'error'})`);
      }
    }
    if (!moved) break;
  }
  const due = await db
    .select()
    .from(orders)
    .where(and(inArray(orders.status, ['shipped', 'out_for_delivery']), isNull(orders.deliveryResponse), isNotNull(orders.expectedAt), lte(orders.expectedAt, now), onlyOrderId ? eq(orders.id, onlyOrderId) : undefined));
  for (const order of due) {
    try {
      const updated = await changeOrderStatus(order.id, 'awaiting_confirm', 'automation', {
        note: 'Expected delivery time passed. Waiting for the customer to confirm receipt. Not marked delivered.',
        force: true,
      });
      advanced += 1;
      notes.push(`${updated.number}: ${order.status} → awaiting confirmation`);
    } catch (err) {
      notes.push(`${order.number}: confirmation skipped (${err instanceof Error ? err.message : 'error'})`);
    }
  }
  return { checked, advanced, notes };
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
        isNotNull(orders.expectedAt),
        or(eq(orders.status, 'awaiting_confirm'), and(lte(orders.expectedAt, now), inArray(orders.status, ['shipped', 'out_for_delivery']))),
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
