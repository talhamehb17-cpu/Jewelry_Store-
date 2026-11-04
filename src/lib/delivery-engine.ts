import { and, asc, eq, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { customerNotifications, deliveryIssues, orderEvents, orderItems, orders, settings, users, type Order } from '@/db/schema';
import { getAutomationSettings } from './delivery-effects';
import { serviceCodeOf } from './delivery-schedule';
import { sendEmail, statusEmail } from './email';
import { changeOrderStatus, OrderError } from './orders';
import { absoluteUrl } from './utils';

const LOCK = 'delivery_worker_lock';

export type ProgressResult = { checked: number; advanced: number; notified: number; notes: string[]; skipped?: boolean };

async function claimWorker() {
  const db = await getDb();
  const until = new Date(Date.now() + 90_000).toISOString();
  const claimed = await db
    .insert(settings)
    .values({ key: LOCK, value: { until }, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: { until }, updatedAt: new Date() },
      where: sql`(${settings.value}->>'until') is null or (${settings.value}->>'until')::timestamptz < now()`,
    })
    .returning({ key: settings.key });
  return claimed.length > 0;
}

async function releaseWorker() {
  const db = await getDb();
  await db.update(settings).set({ value: { until: null }, updatedAt: new Date() }).where(eq(settings.key, LOCK)).catch(() => undefined);
}

async function mailOrder(order: Order, kind: string, subject: string, html: string, budgetAt: number) {
  if (Date.now() > budgetAt) return 'deferred';
  try {
    const result = await Promise.race([
      sendEmail(order.email, subject, html, kind, { orderId: order.id }),
      new Promise<{ sent: false; reason: string }>((resolve) => setTimeout(() => resolve({ sent: false, reason: 'Email timed out. The status was kept.' }), 8_000)),
    ]);
    return result.sent ? 'sent' : result.reason || 'not sent';
  } catch (err) {
    return err instanceof Error ? err.message : 'email failed';
  }
}

/** Applies overdue Standard and Express stages. Never marks an order delivered. Idempotent across overlapping runs. */
export async function progressOrders(now = new Date(), onlyOrderId?: number): Promise<ProgressResult> {
  const notes: string[] = [];
  let advanced = 0;
  let notified = 0;
  const locked = await claimWorker();
  if (!locked) return { checked: 0, advanced: 0, notified: 0, notes: ['Another delivery worker is already running.'], skipped: true };
  const budgetAt = Date.now() + 25_000;
  try {
    const db = await getDb();
    const settings = await getAutomationSettings(db);
    const due = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.automationState, 'active'),
          inArray(orders.status, ['confirmed', 'processing', 'shipped']),
          isNotNull(orders.nextStatusAt),
          lte(orders.nextStatusAt, now),
          onlyOrderId ? eq(orders.id, onlyOrderId) : undefined,
        ),
      )
      .orderBy(asc(orders.nextStatusAt))
      .limit(25);
    for (const order of due) {
      let current = order;
      for (let step = 0; step < 4; step++) {
        if (!current.nextStatus || !current.nextStatusAt || current.nextStatusAt.getTime() > now.getTime()) break;
        if (current.status === 'cancelled' || current.status === 'delivered') break;
        const from = current.status;
        const target = current.nextStatus;
        try {
          const updated = await changeOrderStatus(current.id, target, 'automation', {
            source: 'automatic',
            actorType: 'system',
            expectedStatus: from,
            note: 'Scheduled from the timeline saved when this order was confirmed. Not marked delivered.',
          });
          if (updated.status === target && updated.status !== from) {
            advanced += 1;
            notes.push(`${updated.number}: ${from} → ${target}`);
            if (settings.emailsEnabled) {
              const link = absoluteUrl(`/account/orders/${updated.number}`);
              const mail = await mailOrder(updated, `order-${target}`, `Your EVERMOON order ${updated.number} is ${target.replaceAll('_', ' ')}`, statusEmail(updated, target, link), budgetAt);
              if (mail !== 'sent') notes.push(`${updated.number}: email ${mail}`);
            }
            current = updated;
          } else {
            current = updated;
            break;
          }
        } catch (err) {
          notes.push(`${order.number}: ${err instanceof Error ? err.message : 'skipped'}`);
          break;
        }
      }
    }
    const prompts = await db
      .select({ order: orders, notificationId: customerNotifications.id })
      .from(customerNotifications)
      .innerJoin(orders, eq(orders.id, customerNotifications.orderId))
      .where(
        and(
          eq(customerNotifications.type, 'delivery_confirm'),
          eq(customerNotifications.status, 'scheduled'),
          lte(customerNotifications.scheduledAt, now),
          inArray(orders.status, ['out_for_delivery', 'awaiting_confirm']),
          onlyOrderId ? eq(orders.id, onlyOrderId) : undefined,
        ),
      )
      .limit(25);
    for (const row of prompts) {
      await db.update(customerNotifications).set({ status: 'pending' }).where(and(eq(customerNotifications.id, row.notificationId), eq(customerNotifications.status, 'scheduled')));
      if (!settings.emailsEnabled) continue;
      const link = absoluteUrl(`/account/orders/${row.order.number}`);
      const mail = await mailOrder(
        row.order,
        'delivery-confirm-request',
        `Has your EVERMOON order ${row.order.number} arrived?`,
        statusEmail(row.order, 'delivery_request', link),
        budgetAt,
      );
      if (mail === 'sent' || mail === 'Already accepted for this order event.') notified += 1;
      else notes.push(`${row.order.number}: confirmation email ${mail}`);
    }
    return { checked: due.length, advanced, notified, notes };
  } finally {
    await releaseWorker();
  }
}

export type DeliveryPrompt = {
  id: number;
  notificationId: number;
  number: string;
  shippingMethodName: string;
  service: 'Standard' | 'Express';
  total: number;
  image: string | null;
  productName: string;
  quantity: number;
  scheduledAt: string;
};

async function holderEmail(userId: number) {
  const db = await getDb();
  const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return (u?.email || '').toLowerCase();
}

function ownsOrder(order: { userId: number | null; email: string }, userId: number, email: string) {
  return order.userId === userId || (order.userId == null && order.email.toLowerCase() === email);
}

export async function ordersAwaitingDeliveryConfirmation(userId: number, now = new Date()) {
  const db = await getDb();
  const prefs = await getAutomationSettings(db);
  if (!prefs.popupEnabled) return [];
  const email = await holderEmail(userId);
  const rows = await db
    .select({
      order: orders,
      notificationId: customerNotifications.id,
      scheduledAt: customerNotifications.scheduledAt,
      image: orderItems.image,
      name: orderItems.name,
      quantity: orderItems.quantity,
    })
    .from(customerNotifications)
    .innerJoin(orders, eq(orders.id, customerNotifications.orderId))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        or(eq(orders.userId, userId), and(sql`${orders.userId} is null`, sql`lower(${orders.email}) = ${email}`)),
        eq(customerNotifications.type, 'delivery_confirm'),
        inArray(customerNotifications.status, ['scheduled', 'pending']),
        lte(customerNotifications.scheduledAt, now),
        inArray(orders.status, ['out_for_delivery', 'awaiting_confirm']),
        sql`${orders.deliveryResponse} is null`,
      ),
    )
    .orderBy(asc(customerNotifications.scheduledAt));
  const seen = new Set<number>();
  const prompts: DeliveryPrompt[] = [];
  for (const row of rows) {
    if (seen.has(row.order.id)) continue;
    seen.add(row.order.id);
    const items = rows.filter((r) => r.order.id === row.order.id);
    const qty = items.reduce((n, r) => n + (r.quantity ?? 0), 0);
    prompts.push({
      id: row.order.id,
      notificationId: row.notificationId,
      number: row.order.number,
      shippingMethodName: row.order.shippingMethodName,
      service: serviceCodeOf(row.order) === 'express' ? 'Express' : 'Standard',
      total: row.order.total,
      image: row.image,
      productName: row.name || 'Your piece',
      quantity: qty || 1,
      scheduledAt: row.scheduledAt.toISOString(),
    });
  }
  return prompts;
}

export async function customerAlertCount(userId: number, now = new Date()) {
  const db = await getDb();
  const prefs = await getAutomationSettings(db);
  if (!prefs.centerEnabled && !prefs.popupEnabled) return 0;
  const email = await holderEmail(userId);
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${customerNotifications.orderId})::int` })
    .from(customerNotifications)
    .innerJoin(orders, eq(orders.id, customerNotifications.orderId))
    .where(
      and(
        or(eq(orders.userId, userId), and(sql`${orders.userId} is null`, sql`lower(${orders.email}) = ${email}`)),
        eq(customerNotifications.type, 'delivery_confirm'),
        or(inArray(customerNotifications.status, ['scheduled', 'pending', 'answered_no']), eq(customerNotifications.response, 'no')),
        lte(customerNotifications.scheduledAt, now),
        sql`${orders.status} <> 'cancelled'`,
        sql`${orders.status} <> 'delivered'`,
      ),
    );
  return row?.n ?? 0;
}

function staleMessage(order: Order) {
  if (order.status === 'delivered') {
    const who = order.confirmationSource === 'admin' ? 'the atelier' : order.confirmationSource === 'customer' ? 'you' : 'a previous confirmation';
    return `This order is already delivered, confirmed by ${who}.`;
  }
  if (order.status === 'cancelled') return 'This order is cancelled.';
  return 'This delivery question is no longer open.';
}

export async function respondToDelivery(orderId: number, userId: number, received: boolean, now = new Date()) {
  const db = await getDb();
  const email = await holderEmail(userId);
  const outcome = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
    if (!order || !ownsOrder(order, userId, email)) return { ok: false as const, message: 'Order not found.' };
    if (order.status === 'delivered' || order.status === 'cancelled') return { ok: false as const, stale: order.status === 'delivered', message: staleMessage(order) };
    if (!['out_for_delivery', 'awaiting_confirm'].includes(order.status)) return { ok: false as const, message: 'This order is not out for delivery.' };
    if (order.deliveryResponse === 'yes') return { ok: false as const, stale: true, message: staleMessage(order) };
    if (order.notificationDueAt && order.notificationDueAt.getTime() > now.getTime()) {
      return { ok: false as const, message: 'The delivery question is not open yet. It opens 10 minutes after the order is actually out for delivery, not on the original estimate.' };
    }
    if (!received) {
      if (order.deliveryResponse === 'no') return { ok: true as const, message: 'We already have your note that it has not arrived. The order is still out for delivery.' };
      await tx.update(orders).set({ deliveryResponse: 'no', updatedAt: now }).where(eq(orders.id, order.id));
      await tx
        .update(customerNotifications)
        .set({ status: 'answered_no', response: 'no' })
        .where(and(eq(customerNotifications.orderId, order.id), eq(customerNotifications.type, 'delivery_confirm'), inArray(customerNotifications.status, ['scheduled', 'pending'])));
      const [open] = await tx.select({ id: deliveryIssues.id }).from(deliveryIssues).where(and(eq(deliveryIssues.orderId, order.id), eq(deliveryIssues.status, 'open'))).limit(1);
      if (!open) {
        await tx.insert(deliveryIssues).values({
          orderId: order.id,
          userId,
          status: 'open',
          note: 'Customer said the package has not arrived.',
          customerResponse: 'no',
          expectedAt: order.expectedAt,
        });
      }
      await tx.insert(orderEvents).values({
        orderId: order.id,
        type: 'delivery',
        message: 'Customer said the package has not arrived. Status stays out for delivery.',
        actor: 'customer',
        actorType: 'customer',
        actorId: userId,
        source: 'customer',
        fromStatus: order.status,
        toStatus: order.status,
      });
      return { ok: true as const, message: 'We have opened a delivery issue. The order is not marked delivered.', order, kind: 'no' as const };
    }
    return { ok: true as const, message: '', order, kind: 'yes' as const };
  });
  if (!outcome.ok || outcome.kind !== 'yes') {
    if (outcome.ok && outcome.kind === 'no' && outcome.order) {
      const link = absoluteUrl(`/account/orders/${outcome.order.number}`);
      await sendEmail(outcome.order.email, `We’re looking into ${outcome.order.number}`, statusEmail(outcome.order, 'delivery_issue', link), 'delivery-issue-customer', { orderId: outcome.order.id }).catch(() => undefined);
    }
    return outcome.ok ? { ok: true as const, message: outcome.message } : { ok: false as const, message: outcome.message, stale: 'stale' in outcome ? outcome.stale : false };
  }
  try {
    await changeOrderStatus(orderId, 'delivered', 'customer', {
      source: 'customer',
      actorType: 'customer',
      actorId: userId,
      confirmDelivery: true,
      note: 'Customer confirmed receipt',
    });
  } catch (err) {
    const [fresh] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (fresh?.status === 'delivered') return { ok: false as const, stale: true, message: staleMessage(fresh) };
    return { ok: false as const, message: err instanceof OrderError ? err.message : 'Could not confirm delivery.' };
  }
  const [fresh] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (fresh) {
    const link = absoluteUrl(`/account/orders/${fresh.number}`);
    await sendEmail(fresh.email, `Delivery confirmed for ${fresh.number}`, statusEmail(fresh, 'delivered', link), 'order-delivered', { orderId: fresh.id }).catch(() => undefined);
  }
  const events = await db.select({ id: orderEvents.id }).from(orderEvents).where(and(eq(orderEvents.orderId, orderId), eq(orderEvents.toStatus, 'delivered')));
  return { ok: true as const, message: 'Thank you. The order is marked delivered.', events: events.length };
}

export async function respondToDeliveryByToken(number: string, token: string, received: boolean) {
  const { verifyOrderToken } = await import('./orders');
  if (!verifyOrderToken(number, token)) return { ok: false as const, message: 'This link cannot confirm the order.' };
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!order?.userId) return { ok: false as const, message: 'Sign in with the account on this order, or ask the atelier to confirm delivery.' };
  return respondToDelivery(order.id, order.userId, received);
}
