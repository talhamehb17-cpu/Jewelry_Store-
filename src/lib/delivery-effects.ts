import { and, eq, inArray } from 'drizzle-orm';
import type { DB } from '@/db';
import { customerNotifications, deliveryIssues, settings, type DeliveryPlan, type Order } from '@/db/schema';
import { DEFAULT_TIMELINE, nextScheduled, normalizeTimeline, notificationDueAt, serviceCodeOf, snapshotTimeline, type TimelineSettings } from './delivery-schedule';

const KEY = 'delivery_automation';

export async function getAutomationSettings(db: DB): Promise<TimelineSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  return normalizeTimeline(row?.value ?? DEFAULT_TIMELINE);
}

export async function saveAutomationSettings(db: DB, value: TimelineSettings) {
  await db
    .insert(settings)
    .values({ key: KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** Fields written once, when payment or COD confirmation starts the clock. Later setting edits do not call this. */
export async function scheduleStartPatch(db: DB, order: Pick<Order, 'deliveryCode' | 'shippingMethod' | 'shippingMethodName' | 'automationState' | 'deliveryPlan'>, resultingStatus: string, now: Date) {
  if (order.automationState === 'active' && order.deliveryPlan?.snapshottedAt) return null;
  const settings = await getAutomationSettings(db);
  const plan = snapshotTimeline(serviceCodeOf(order), now, settings);
  const next = nextScheduled(resultingStatus, plan);
  return {
    deliveryPlan: plan satisfies DeliveryPlan,
    deliveryCode: plan.serviceCode,
    deliveryMinutes: plan.durationMinutes,
    timelineStartAt: now,
    expectedAt: new Date(plan.expectedAt),
    automationState: 'active' as const,
    nextStatus: next?.status ?? null,
    nextStatusAt: next ? new Date(next.at) : null,
  };
}

export function nextPatch(status: string, plan: DeliveryPlan | null | undefined) {
  const next = nextScheduled(status, plan);
  return {
    nextStatus: next?.status ?? null,
    nextStatusAt: next ? new Date(next.at) : null,
    automationState: status === 'delivered' || status === 'cancelled' ? ('complete' as const) : ('active' as const),
  };
}

export async function syncDeliverySideEffects(
  tx: DB,
  previous: Order,
  updated: Order,
  extra: { source?: string; actorId?: number | null; actor?: string; note?: string },
) {
  const now = updated.updatedAt ?? new Date();
  if (updated.status === 'out_for_delivery' && previous.status !== 'out_for_delivery') {
    const delay = updated.deliveryPlan?.notificationDelayMinutes ?? 10;
    const due = updated.notificationDueAt ?? notificationDueAt(updated.outForDeliveryAt ?? now, delay);
    const [open] = await tx
      .select({ id: customerNotifications.id })
      .from(customerNotifications)
      .where(and(eq(customerNotifications.orderId, updated.id), eq(customerNotifications.type, 'delivery_confirm'), inArray(customerNotifications.status, ['scheduled', 'pending'])))
      .limit(1);
    if (open) {
      await tx.update(customerNotifications).set({ scheduledAt: due, status: 'scheduled', userId: updated.userId, response: null, resolvedAt: null }).where(eq(customerNotifications.id, open.id));
    } else {
      await tx.insert(customerNotifications).values({
        userId: updated.userId,
        orderId: updated.id,
        type: 'delivery_confirm',
        status: 'scheduled',
        scheduledAt: due,
        title: 'Has your EVERMOON order arrived?',
        body: 'Your order is marked as Out for Delivery. Have you received your package?',
      });
    }
  }
  if (updated.status === 'delivered' && previous.status !== 'delivered') {
    await tx
      .update(customerNotifications)
      .set({
        status: updated.confirmationSource === 'customer' ? 'answered_yes' : 'resolved',
        response: updated.confirmationSource === 'customer' ? 'yes' : updated.deliveryResponse,
        resolvedAt: now,
      })
      .where(and(eq(customerNotifications.orderId, updated.id), eq(customerNotifications.type, 'delivery_confirm'), inArray(customerNotifications.status, ['scheduled', 'pending', 'answered_no'])));
    if (extra.source === 'admin') {
      await tx
        .update(deliveryIssues)
        .set({
          status: 'resolved',
          resolvedAt: now,
          resolvedBy: (extra.actor || 'admin').slice(0, 120),
          resolvedById: extra.actorId ?? null,
          resolutionNote: (extra.note || 'Delivery confirmed by the atelier after checking.').slice(0, 500),
        })
        .where(and(eq(deliveryIssues.orderId, updated.id), eq(deliveryIssues.status, 'open')));
    }
  }
  if (updated.status === 'cancelled' && previous.status !== 'cancelled') {
    await tx
      .update(customerNotifications)
      .set({ status: 'resolved', resolvedAt: now })
      .where(and(eq(customerNotifications.orderId, updated.id), inArray(customerNotifications.status, ['scheduled', 'pending'])));
    await tx
      .update(deliveryIssues)
      .set({ status: 'resolved', resolvedAt: now, resolvedBy: extra.actor || 'system', resolutionNote: 'Order cancelled.' })
      .where(and(eq(deliveryIssues.orderId, updated.id), eq(deliveryIssues.status, 'open')));
  }
}
