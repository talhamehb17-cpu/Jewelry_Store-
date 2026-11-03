import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { deliveryServices, type DeliveryPlan, type DeliveryService } from '@/db/schema';

export { daysToMinutes, formatDuration, minutesToDays } from './delivery-format';

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
