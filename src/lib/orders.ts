import crypto from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { discountUsages, discounts, inventoryMovements, orderEvents, orderItems, orders, products, productVariants, type Order, type OrderAddress } from '@/db/schema';
import { buildQuote, type CartLineInput } from './pricing';
import { deliveryServiceByCode, planFromService } from './delivery';

export class OrderError extends Error {}

function signingKey() {
  return process.env.AUTH_SECRET || 'aurelle-dev-only-secret-change-me-0123456789';
}

/** HMAC token that lets a guest view their own order confirmation without an account. */
export function orderAccessToken(orderNumber: string) {
  return crypto.createHmac('sha256', signingKey()).update(`order:${orderNumber}`).digest('base64url').slice(0, 32);
}

export function verifyOrderToken(orderNumber: string, token: string | null | undefined) {
  if (!token) return false;
  const expected = orderAccessToken(orderNumber);
  return expected.length === token.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export type CreateOrderInput = {
  lines: CartLineInput[];
  email: string;
  phone: string;
  address: OrderAddress;
  shippingMethod: string;
  paymentMethod: 'cod' | 'bank' | 'wallet' | 'easypaisa' | 'jazzcash' | 'card';
  paymentRef?: string | null;
  discountCode?: string | null;
  customerNote?: string | null;
  userId?: number | null;
  displayCurrency?: string | null;
  displayRate?: number | null;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const quote = await buildQuote({
    lines: input.lines,
    discountCode: input.discountCode,
    shippingMethod: input.shippingMethod,
    paymentMethod: input.paymentMethod,
    email: input.email,
    userId: input.userId,
  });
  if (!quote.lines.length) throw new OrderError('Your bag is empty or the items are no longer available.');
  if (input.discountCode && quote.discountError) throw new OrderError(quote.discountError);
  const db = await getDb();
  const service = await deliveryServiceByCode(quote.shippingMethod);
  const plan = service ? planFromService(service) : null;

  return db.transaction(async (tx) => {
    // Reserve stock atomically — fails if any variant no longer has enough units.
    for (const l of quote.lines) {
      const updated = await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} - ${l.quantity}` })
        .where(and(eq(productVariants.id, l.variantId), gte(productVariants.stock, l.quantity)))
        .returning({ stock: productVariants.stock });
      if (!updated.length) throw new OrderError(`Sorry — ${l.name}${l.variantTitle ? ` (${l.variantTitle})` : ''} just sold out. Please review your bag.`);
      l.stock = updated[0]!.stock;
    }
    const methodName = quote.shippingMethods.find((m) => m.id === quote.shippingMethod)?.name ?? service?.name ?? 'Standard Delivery';
    const placedAt = new Date();
    const clockStarts = input.paymentMethod === 'cod';
    const [order] = await tx
      .insert(orders)
      .values({
        number: `TMP-${crypto.randomBytes(8).toString('hex')}`,
        userId: input.userId ?? null,
        email: input.email.toLowerCase(),
        phone: input.phone,
        customerName: `${input.address.firstName} ${input.address.lastName}`.trim(),
        status: 'pending',
        paymentStatus: input.paymentMethod === 'cod' ? 'unpaid' : 'awaiting',
        paymentMethod: input.paymentMethod,
        paymentRef: input.paymentRef || null,
        shippingMethod: quote.shippingMethod,
        shippingMethodName: methodName,
        shippingAddress: input.address,
        subtotal: quote.subtotal,
        discountTotal: quote.discount?.amount ?? 0,
        shippingTotal: quote.shipping,
        taxTotal: quote.tax,
        codFee: quote.codFee,
        total: quote.total,
        discountCode: quote.discount?.code ?? null,
        discountId: quote.discount?.id ?? null,
        campaignId: quote.campaign?.id ?? null,
        campaignName: quote.campaign?.name ?? null,
        campaignDiscount: quote.campaign?.amount ?? 0,
        customerNote: input.customerNote || null,
        displayCurrency: input.displayCurrency || null,
        displayRate: input.displayRate && input.displayRate > 0 ? input.displayRate : null,
        deliveryCode: service?.code ?? quote.shippingMethod,
        deliveryMinutes: plan?.durationMinutes ?? null,
        deliveryPlan: plan,
        timelineStartAt: clockStarts ? placedAt : null,
        expectedAt: clockStarts && plan ? new Date(placedAt.getTime() + plan.durationMinutes * 60_000) : null,
      })
      .returning();
    const number = `EM-${10000 + order!.id}`;
    await tx.update(orders).set({ number }).where(eq(orders.id, order!.id));
    await tx.insert(orderItems).values(
      quote.lines.map((l) => ({
        orderId: order!.id,
        productId: l.productId,
        variantId: l.variantId,
        name: l.name,
        variantTitle: l.variantTitle,
        sku: l.sku,
        image: l.image,
        unitPrice: l.unitPrice,
        originalUnitPrice: l.catalogUnitPrice,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
    );
    await tx.insert(inventoryMovements).values(
      quote.lines.map((l) => ({ variantId: l.variantId, productId: l.productId, change: -l.quantity, stockAfter: l.stock, reason: 'order', note: number, orderId: order!.id })),
    );
    for (const l of quote.lines) {
      await tx.update(products).set({ salesCount: sql`${products.salesCount} + ${l.quantity}` }).where(eq(products.id, l.productId));
    }
    if (quote.discount) {
      await tx.update(discounts).set({ usageCount: sql`${discounts.usageCount} + 1` }).where(eq(discounts.id, quote.discount.id));
      await tx.insert(discountUsages).values({ discountId: quote.discount.id, orderId: order!.id, email: input.email.toLowerCase(), userId: input.userId ?? null });
    }
    const label = { cod: 'Cash on Delivery', bank: 'Bank Transfer', wallet: 'JazzCash / EasyPaisa', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', card: 'Card (Stripe)' }[input.paymentMethod];
    await tx.insert(orderEvents).values({ orderId: order!.id, type: 'created', message: `Order placed via website · ${label}`, actor: 'customer' });
    if (input.paymentRef) await tx.insert(orderEvents).values({ orderId: order!.id, type: 'payment', message: `Customer submitted payment reference ${input.paymentRef} — awaiting verification`, actor: 'customer' });
    return { ...order!, number };
  });
}

/** Returns reserved stock to inventory (idempotent through the stock_restored flag). */
export async function restockOrder(orderId: number, reason: 'cancel' | 'return', actor?: string) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
    if (!o || o.stockRestored) return;
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const it of items) {
      if (!it.variantId) continue;
      const [v] = await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${it.quantity}` })
        .where(eq(productVariants.id, it.variantId))
        .returning({ stock: productVariants.stock, productId: productVariants.productId });
      if (v) {
        await tx.insert(inventoryMovements).values({ variantId: it.variantId, productId: v.productId, change: it.quantity, stockAfter: v.stock, reason, note: o.number, orderId });
        await tx.update(products).set({ salesCount: sql`greatest(${products.salesCount} - ${it.quantity}, 0)` }).where(eq(products.id, v.productId));
      }
    }
    await tx.update(orders).set({ stockRestored: true, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await tx.insert(orderEvents).values({ orderId, type: 'inventory', message: 'Stock returned to inventory', actor: actor ?? 'system' });
  });
}

export async function addOrderEvent(orderId: number, type: string, message: string, actor: string) {
  const db = await getDb();
  await db.insert(orderEvents).values({ orderId, type, message, actor });
}

export async function markOrderPaid(orderId: number, opts: { actor: string; ref?: string | null; paymentIntentId?: string | null; message?: string }) {
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || o.paymentStatus === 'paid') return o;
  const [updated] = await db
    .update(orders)
    .set({
      paymentStatus: 'paid',
      paidAt: new Date(),
      paymentRef: opts.ref ?? o.paymentRef,
      paymentIntentId: opts.paymentIntentId ?? o.paymentIntentId,
      status: o.status === 'pending' ? 'confirmed' : o.status,
      timelineStartAt: o.timelineStartAt ?? (o.paymentMethod === 'cod' ? o.createdAt : new Date()),
      expectedAt:
        o.expectedAt ??
        (o.deliveryMinutes ? new Date(Date.now() + o.deliveryMinutes * 60_000) : null),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();
  await addOrderEvent(orderId, 'payment', opts.message ?? 'Payment marked as received', opts.actor);
  return updated;
}

export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'awaiting_confirm', 'delivered', 'cancelled'] as const;

export const STATUS_FLOW: Record<string, string[]> = {
  pending: ['confirmed', 'processing', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'awaiting_confirm', 'cancelled'],
  out_for_delivery: ['awaiting_confirm', 'delivered', 'cancelled'],
  awaiting_confirm: ['delivered', 'out_for_delivery', 'cancelled'],
  delivered: ['cancelled'],
  cancelled: [],
};

export async function changeOrderStatus(
  orderId: number,
  status: string,
  actor: string,
  extra: { carrier?: string; tracking?: string; note?: string; reason?: string; force?: boolean; customerNote?: string } = {},
) {
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) throw new OrderError('Order not found.');
  if (o.status === status) return o;
  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) throw new OrderError('Unknown order status.');
  if (status === 'cancelled' && !extra.reason && !extra.note && actor !== 'customer' && actor !== 'system') {
    throw new OrderError('Enter a cancellation reason.');
  }
  const allowed = extra.force || (STATUS_FLOW[o.status] ?? []).includes(status);
  if (!allowed) throw new OrderError(`Cannot move an order from “${o.status}” to “${status}”.`);
  const now = new Date();
  const patch: Partial<Order> = { status, updatedAt: now };
  if (extra.customerNote) patch.customerVisibleNote = extra.customerNote.slice(0, 500);
  if (status === 'shipped') {
    patch.shippedAt = now;
    if (extra.carrier) patch.trackingCarrier = extra.carrier;
    if (extra.tracking) patch.trackingNumber = extra.tracking;
  }
  if (status === 'delivered') {
    patch.deliveredAt = now;
    if (o.paymentMethod === 'cod' && o.paymentStatus !== 'paid') {
      patch.paymentStatus = 'paid';
      patch.paidAt = now;
    }
  }
  if (status === 'cancelled') {
    patch.cancelledAt = now;
    patch.cancelReason = (extra.reason || extra.note || 'Cancelled').slice(0, 500);
  }
  const [updated] = await db.update(orders).set(patch).where(eq(orders.id, orderId)).returning();
  const label = status.replaceAll('_', ' ');
  const tracking = status === 'shipped' && (extra.tracking || o.trackingNumber) ? ` · ${extra.carrier || o.trackingCarrier || ''} ${extra.tracking || o.trackingNumber}` : '';
  const reason = extra.reason ? ` Reason: ${extra.reason}` : '';
  await addOrderEvent(orderId, 'status', `${o.status} → ${label}${tracking}${reason}${extra.note ? ` — ${extra.note}` : ''}`, actor);
  if (status === 'delivered' && o.paymentMethod === 'cod' && o.paymentStatus !== 'paid') await addOrderEvent(orderId, 'payment', 'Cash collected on delivery', actor);
  if (status === 'cancelled') await restockOrder(orderId, 'cancel', actor);
  return updated!;
}

/** Guest cancellation from the order link. The token is checked here; status must still be pending. */
export async function cancelPendingByToken(number: string, token: string) {
  if (!verifyOrderToken(number, token)) throw new OrderError('This link cannot cancel the order.');
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!o) throw new OrderError('Order not found.');
  if (o.status !== 'pending') throw new OrderError('You can cancel only while the order is still pending. After confirmation, contact client care.');
  return changeOrderStatus(o.id, 'cancelled', 'customer', { reason: 'Customer cancelled while the order was pending' });
}

/** Customer cancellation is allowed only while the order is still pending. Enforced here, not only in the UI. */
export async function cancelPendingOrder(orderId: number, userId: number) {
  const db = await getDb();
  const [o] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1);
  if (!o) throw new OrderError('Order not found.');
  if (o.status !== 'pending') throw new OrderError('You can cancel from your account only while the order is still pending. After confirmation, contact client care.');
  return changeOrderStatus(orderId, 'cancelled', 'customer', { reason: 'Customer cancelled while the order was pending' });
}
