import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { deliveryServices, type DeliveryPlan, type DeliveryService } from '@/db/schema';

export function minutesToDays(minutes: number) {
  return Math.round((minutes / 1440) * 10) / 10;
}

export function daysToMinutes(days: number) {
  if (!Number.isFinite(days) || days <= 0) return 0;
  return Math.max(1, Math.round(days * 1440));
}

export function formatDuration(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return 'Estimate set by the atelier';
  const days = minutesToDays(minutes);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function planFromService(service: Pick<DeliveryService, 'durationMinutes' | 'confirmMinutes' | 'processingMinutes' | 'shipMinutes' | 'outMinutes'>): DeliveryPlan {
  return {
    durationMinutes: service.durationMinutes,
    confirmMinutes: service.confirmMinutes,
    processingMinutes: service.processingMinutes,
    shipMinutes: service.shipMinutes,
    outMinutes: service.outMinutes,
  };
}

export async function listDeliveryServices() {
  const db = await getDb();
  return db.select().from(deliveryServices).orderBy(asc(deliveryServices.position), asc(deliveryServices.id));
}

export async function activeDeliveryServices() {
  const rows = await listDeliveryServices();
  return rows.filter((r) => r.active);
}

export async function deliveryServiceByCode(code: string) {
  const db = await getDb();
  const [row] = await db.select().from(deliveryServices).where(eq(deliveryServices.code, code)).limit(1);
  return row ?? null;
}

/** Clock starts when the order can actually move: COD at placement, other methods when payment is verified. */
export function deliveryClockStart(order: { paymentMethod: string; paymentStatus: string; createdAt: Date; paidAt: Date | null; timelineStartAt: Date | null }) {
  if (order.timelineStartAt) return order.timelineStartAt;
  if (order.paymentMethod === 'cod') return order.createdAt;
  if (order.paymentStatus === 'paid' && order.paidAt) return order.paidAt;
  return null;
}
