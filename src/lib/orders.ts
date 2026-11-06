import crypto from 'node:crypto';
import { and, eq, gte, ne, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { discountUsages, discounts, inventoryMovements, orderEvents, orderItems, orders, products, productVariants, type Order, type OrderAddress } from '@/db/schema';
import { buildQuote, type CartLineInput } from './pricing';
import { deliveryServiceByCode, planFromService } from './delivery';
import { nextPatch, scheduleStartPatch, syncDeliverySideEffects } from './delivery-effects';
import { notificationDueAt, STATUS_RANK } from './delivery-schedule';
import { formatMoney } from './money';
import { advanceBlocksFulfilment, methodAllowedForQuote, snapshotPlan, type AdvanceMethod, type PaymentPlan } from './shopping-rules';

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
  if (quote.checkoutBlock) throw new OrderError(quote.checkoutBlock);
  if (input.discountCode && quote.discountError) throw new OrderError(quote.discountError);
  if (quote.highValue.applied && !methodAllowedForQuote(input.paymentMethod, quote.highValue)) {
    throw new OrderError('This order needs an advance by EasyPaisa, JazzCash or bank transfer. Cash on Delivery covers only the remaining balance.');
  }
  const paymentPlan: PaymentPlan | null = quote.highValue.applied && (input.paymentMethod === 'easypaisa' || input.paymentMethod === 'jazzcash' || input.paymentMethod === 'bank')
    ? snapshotPlan(quote.highValue, input.paymentMethod as AdvanceMethod, quote.total)
    : null;
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
    const [order] = await tx
      .insert(orders)
      .values({
        number: `TMP-${crypto.randomBytes(8).toString('hex')}`,
        userId: input.userId ?? null,
        email: input.email.toLowerCase(),
        phone: input.phone,
        customerName: `${input.address.firstName} ${input.address.lastName}`.trim(),
        status: 'pending',
        paymentStatus: paymentPlan ? 'awaiting' : input.paymentMethod === 'cod' ? 'unpaid' : 'awaiting',
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
        paymentPlan,
        giftTotal: quote.giftTotal,
        deliveryCode: service?.code ?? quote.shippingMethod,
        deliveryMinutes: plan?.durationMinutes ?? null,
        deliveryPlan: plan,
        timelineStartAt: null,
        expectedAt: null,
        automationState: 'idle',
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
        giftPackaging: l.giftSelected,
        giftUnitPrice: l.giftUnitPrice,
        giftLineTotal: l.giftLineTotal,
        giftImage: l.giftImage,
      })),
    );
    await tx.insert(inventoryMovements).values(
      quote.lines.map((l) => ({ variantId: l.variantId, productId: l.productId, change: -l.quantity, stockAfter: l.stock, reason: 'order', note: number, orderId: order!.id })),
    );
    for (const l of quote.lines) {
      await tx.update(products).set({ salesCount: sql`${products.salesCount} + ${l.quantity}` }).where(eq(products.id, l.productId));
    }
    if (quote.discount) {
      const [locked] = await tx.select().from(discounts).where(eq(discounts.id, quote.discount.id)).for('update');
      if (!locked || (locked.usageLimit != null && locked.usageCount >= locked.usageLimit)) throw new OrderError('This discount code has reached its usage limit.');
      const perUser = locked.perUserLimit ?? (locked.oncePerCustomer ? 1 : null);
      if (perUser) {
        const used = await tx
          .select({ id: discountUsages.id })
          .from(discountUsages)
          .innerJoin(orders, eq(orders.id, discountUsages.orderId))
          .where(and(eq(discountUsages.discountId, locked.id), ne(orders.status, 'cancelled'), eq(sql`lower(${discountUsages.email})`, input.email.toLowerCase())))
          .limit(perUser);
        if (used.length >= perUser) throw new OrderError(perUser === 1 ? `${locked.code} can only be used once per customer.` : `${locked.code} has already been used ${perUser} times on this account.`);
      }
      const claimed = await tx
        .update(discounts)
        .set({ usageCount: sql`${discounts.usageCount} + 1` })
        .where(and(eq(discounts.id, locked.id), sql`(${discounts.usageLimit} is null or ${discounts.usageCount} < ${discounts.usageLimit})`))
        .returning({ id: discounts.id });
      if (!claimed.length) throw new OrderError('This discount code has reached its usage limit.');
      await tx.insert(discountUsages).values({ discountId: quote.discount.id, orderId: order!.id, email: input.email.toLowerCase(), userId: input.userId ?? null });
    }
    const label = { cod: 'Cash on Delivery', bank: 'Bank Transfer', wallet: 'JazzCash / EasyPaisa', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', card: 'Card (Stripe)' }[input.paymentMethod];
    await tx.insert(orderEvents).values({
      orderId: order!.id,
      type: 'created',
      message: paymentPlan ? `Order placed via website · advance ${formatMoney(paymentPlan.advanceAmount)} by ${label}, remaining ${formatMoney(paymentPlan.remainingAmount)} cash on delivery` : `Order placed via website · ${label}`,
      actor: 'customer',
    });
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

export async function markOrderPaid(orderId: number, opts: { actor: string; actorId?: number | null; ref?: string | null; paymentIntentId?: string | null; message?: string }) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
    if (!o || o.paymentStatus === 'paid' || o.status === 'cancelled') return o;
    if (o.paymentPlan?.applied) throw new OrderError('This order uses an advance payment. Approve or reject the advance after checking the receipt. The remaining cash is not paid yet.');
    const now = new Date();
    const nextStatus = o.status === 'pending' ? 'confirmed' : o.status;
    const schedule = await scheduleStartPatch(tx as unknown as typeof db, o, nextStatus, now);
    const [updated] = await tx
      .update(orders)
      .set({
        paymentStatus: 'paid',
        paidAt: now,
        paymentRef: opts.ref ?? o.paymentRef,
        paymentIntentId: opts.paymentIntentId ?? o.paymentIntentId,
        status: nextStatus,
        statusVersion: o.statusVersion + 1,
        ...(schedule ?? {}),
        updatedAt: now,
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, o.status)))
      .returning();
    if (!updated) return o;
    await tx.insert(orderEvents).values({
      orderId,
      type: 'payment',
      message: opts.message ?? 'Payment marked as received',
      actor: opts.actor,
      actorType: opts.actorId ? 'admin' : 'system',
      actorId: opts.actorId ?? null,
      source: opts.actorId ? 'admin' : 'automatic',
    });
    if (o.status !== nextStatus) {
      await tx.insert(orderEvents).values({
        orderId,
        type: 'status',
        message: `${o.status} → confirmed · payment verified. Delivery schedule saved with this confirmation.`,
        actor: opts.actor,
        fromStatus: o.status,
        toStatus: nextStatus,
        actorType: opts.actorId ? 'admin' : 'system',
        actorId: opts.actorId ?? null,
        source: opts.actorId ? 'admin' : 'automatic',
      });
    }
    return updated;
  });
}

export async function reviewAdvancePayment(orderId: number, decision: 'approve' | 'reject', opts: { actor: string; actorId: number; reason?: string }) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
    if (!o) throw new OrderError('Order not found.');
    if (o.status === 'cancelled') throw new OrderError('Cancelled orders cannot be reviewed.');
    const plan = o.paymentPlan;
    if (!plan?.applied) throw new OrderError('This order has no advance payment to review.');
    if (plan.advanceStatus === 'verified' && decision === 'approve') return o;
    if (plan.advanceStatus === 'rejected' && decision === 'reject') return o;
    const now = new Date();
    if (decision === 'reject') {
      const reason = opts.reason?.trim();
      if (!reason) throw new OrderError('Enter a rejection reason. The payment was not changed.');
      const next: PaymentPlan = { ...plan, advanceStatus: 'rejected', rejectedReason: reason.slice(0, 500), rejectedByName: opts.actor, rejectedAt: now.toISOString() };
      const [updated] = await tx
        .update(orders)
        .set({ paymentPlan: next, paymentStatus: 'failed', automationState: 'paused', nextStatus: null, nextStatusAt: null, updatedAt: now, adminNote: reason.slice(0, 500) })
        .where(and(eq(orders.id, orderId), eq(orders.status, o.status)))
        .returning();
      await tx.insert(orderEvents).values({ orderId, type: 'payment', message: `Advance rejected by ${opts.actor}: ${reason}`, actor: opts.actor, actorType: 'admin', actorId: opts.actorId, source: 'admin' });
      return updated ?? o;
    }
    const next: PaymentPlan = { ...plan, advanceStatus: 'verified', verifiedById: opts.actorId, verifiedByName: opts.actor, verifiedAt: now.toISOString() };
    const nextStatus = o.status === 'pending' ? 'confirmed' : o.status;
    const schedule = o.status === 'pending' ? await scheduleStartPatch(tx as unknown as typeof db, o, nextStatus, now) : null;
    const [updated] = await tx
      .update(orders)
      .set({
        paymentPlan: next,
        paymentStatus: 'awaiting',
        status: nextStatus,
        statusVersion: o.statusVersion + 1,
        ...(schedule ?? {}),
        updatedAt: now,
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, o.status)))
      .returning();
    if (!updated) throw new OrderError('This order was updated by someone else. Refresh and try again.');
    await tx.insert(orderEvents).values({
      orderId,
      type: 'payment',
      message: `Advance of ${formatMoney(plan.advanceAmount)} verified by ${opts.actor}. Remaining ${formatMoney(plan.remainingAmount)} is still cash on delivery. The receipt alone was not treated as payment.`,
      actor: opts.actor,
      actorType: 'admin',
      actorId: opts.actorId,
      source: 'admin',
    });
    if (o.status !== nextStatus) {
      await tx.insert(orderEvents).values({ orderId, type: 'status', message: `${o.status} → confirmed · advance verified`, actor: opts.actor, fromStatus: o.status, toStatus: nextStatus, actorType: 'admin', actorId: opts.actorId, source: 'admin' });
    }
    return updated;
  });
}

export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'awaiting_confirm', 'delivered', 'cancelled'] as const;

export const STATUS_FLOW: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  awaiting_confirm: ['delivered', 'out_for_delivery', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const DELIVERABLE = new Set(['processing', 'shipped', 'out_for_delivery', 'awaiting_confirm']);

export type StatusExtra = {
  carrier?: string;
  tracking?: string;
  note?: string;
  reason?: string;
  force?: boolean;
  customerNote?: string;
  source?: 'automatic' | 'admin' | 'customer';
  actorType?: 'system' | 'admin' | 'customer';
  actorId?: number | null;
  expectedStatus?: string;
  confirmDelivery?: boolean;
  verificationNote?: string;
};

export async function changeOrderStatus(orderId: number, status: string, actor: string, extra: StatusExtra = {}) {
  const db = await getDb();
  const updated = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
    if (!o) throw new OrderError('Order not found.');
    if (extra.expectedStatus && o.status !== extra.expectedStatus) throw new OrderError('This order changed before the scheduled step ran.');
    if (o.status === status) {
      if (extra.confirmDelivery) throw new OrderError(o.confirmationSource === 'customer' ? 'You already confirmed this delivery.' : 'This order is already delivered.');
      return o;
    }
    if (extra.source === 'automatic' && (STATUS_RANK[status] ?? 0) <= (STATUS_RANK[o.status] ?? 0)) {
      const moved = nextPatch(o.status, o.deliveryPlan);
      const [row] = await tx.update(orders).set({ ...moved, updatedAt: new Date() }).where(eq(orders.id, orderId)).returning();
      return row ?? o;
    }
    if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) throw new OrderError('Unknown order status.');
    if (['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'].includes(status) && advanceBlocksFulfilment(o.paymentPlan)) {
      throw new OrderError('Verify the advance payment before preparing this order. The uploaded receipt is not proof of payment.');
    }
    if (extra.source === 'automatic') {
      if (status === 'delivered' || status === 'cancelled') throw new OrderError('Automation cannot mark an order delivered or cancelled.');
      if (o.automationState !== 'active') throw new OrderError('This order has no active delivery schedule.');
      if (o.paymentMethod !== 'cod' && o.paymentStatus !== 'paid' && !o.paymentPlan?.applied) throw new OrderError('Unverified payments do not advance.');
      if (o.paymentPlan?.applied && advanceBlocksFulfilment(o.paymentPlan)) throw new OrderError('Unverified payments do not advance.');
      if (o.paymentStatus === 'failed') throw new OrderError('Rejected payments do not advance.');
    }
    if (status === 'cancelled' && !extra.reason && !extra.note && actor !== 'customer' && actor !== 'system') {
      throw new OrderError('Enter a cancellation reason.');
    }
    if (status === 'delivered' && !DELIVERABLE.has(o.status)) {
      throw new OrderError('Mark delivered only after the order is being prepared or is out for delivery. Pending and cancelled orders cannot be marked delivered.');
    }
    const delivering = status === 'delivered';
    if (delivering) {
      if (extra.source === 'automatic') throw new OrderError('Automation cannot confirm delivery.');
      if (!DELIVERABLE.has(o.status)) throw new OrderError('Mark delivered only after the order is being prepared or is out for delivery. Pending and cancelled orders stay as they are.');
      if (extra.source === 'customer' && !['out_for_delivery', 'awaiting_confirm'].includes(o.status)) {
        throw new OrderError('You can confirm delivery only while the order is out for delivery.');
      }
    }
    const allowed = extra.force || delivering || (STATUS_FLOW[o.status] ?? []).includes(status);
    if (!allowed) throw new OrderError(`Cannot move an order from “${o.status.replaceAll('_', ' ')}” to “${status.replaceAll('_', ' ')}”.`);
    const now = new Date();
    const source = extra.source ?? (actor === 'automation' || actor === 'system' ? 'automatic' : actor === 'customer' ? 'customer' : 'admin');
    const actorType = extra.actorType ?? (source === 'automatic' ? 'system' : source === 'customer' ? 'customer' : 'admin');
    let schedule: Awaited<ReturnType<typeof scheduleStartPatch>> = null;
    const codConfirmed = status === 'confirmed' && o.status === 'pending' && o.paymentMethod === 'cod' && source !== 'automatic';
    if (codConfirmed) schedule = await scheduleStartPatch(tx as unknown as typeof db, o, status, now);
    const plan = schedule?.deliveryPlan ?? o.deliveryPlan;
    const patch: Partial<Order> = { status, updatedAt: now, statusVersion: o.statusVersion + 1, ...(schedule ?? {}) };
    if (extra.customerNote) patch.customerVisibleNote = extra.customerNote.slice(0, 500);
    if (status === 'processing' && !o.processingAt) patch.processingAt = now;
    if (status === 'shipped') {
      patch.shippedAt = o.shippedAt ?? now;
      if (extra.carrier) patch.trackingCarrier = extra.carrier;
      if (extra.tracking) patch.trackingNumber = extra.tracking;
    }
    if (status === 'out_for_delivery') {
      patch.outForDeliveryAt = now;
      const delay = plan?.notificationDelayMinutes ?? 10;
      patch.notificationDueAt = notificationDueAt(now, delay);
    }
    if (status === 'delivered') {
      patch.deliveredAt = now;
      patch.deliveryConfirmedAt = now;
      patch.confirmationSource = source === 'customer' ? 'customer' : 'admin';
      patch.confirmedById = extra.actorId ?? null;
      patch.confirmationNote = (extra.verificationNote || extra.note || '').slice(0, 500) || null;
      patch.automationState = 'complete';
      patch.nextStatus = null;
      patch.nextStatusAt = null;
      if (source === 'customer') patch.deliveryResponse = 'yes';
      const collectRemaining = !!o.paymentPlan?.applied && o.paymentPlan.remainingMethod === 'cod' && o.paymentPlan.advanceStatus === 'verified' && o.paymentStatus !== 'paid';
      if ((o.paymentMethod === 'cod' && o.paymentStatus !== 'paid') || collectRemaining) {
        patch.paymentStatus = 'paid';
        patch.paidAt = now;
      }
    } else if (status === 'cancelled') {
      patch.cancelledAt = now;
      patch.cancelReason = (extra.reason || extra.note || 'Cancelled').slice(0, 500);
      patch.automationState = 'complete';
      patch.nextStatus = null;
      patch.nextStatusAt = null;
    } else if (schedule || o.automationState === 'active') {
      Object.assign(patch, nextPatch(status, plan));
    }
    const [row] = await tx.update(orders).set(patch).where(and(eq(orders.id, orderId), eq(orders.status, o.status), eq(orders.statusVersion, o.statusVersion))).returning();
    if (!row) throw new OrderError('This order was updated by someone else. Refresh and try again.');
    const label = status.replaceAll('_', ' ');
    const tracking = status === 'shipped' && (extra.tracking || o.trackingNumber) ? ` · ${extra.carrier || o.trackingCarrier || ''} ${extra.tracking || o.trackingNumber}` : '';
    const reason = extra.reason ? ` Reason: ${extra.reason}` : '';
    const who = source === 'automatic' ? 'Automatic' : source === 'customer' ? 'Customer' : 'Admin';
    await tx.insert(orderEvents).values({
      orderId,
      type: 'status',
      message: `${o.status} → ${label} · ${who}${tracking}${reason}${extra.note ? ` — ${extra.note}` : ''}`,
      actor,
      fromStatus: o.status,
      toStatus: status,
      actorType,
      actorId: extra.actorId ?? null,
      source,
    });
    if (status === 'delivered' && ((o.paymentMethod === 'cod' && o.paymentStatus !== 'paid') || (o.paymentPlan?.applied && o.paymentPlan.remainingMethod === 'cod' && o.paymentPlan.advanceStatus === 'verified' && o.paymentStatus !== 'paid'))) {
      await tx.insert(orderEvents).values({ orderId, type: 'payment', message: o.paymentPlan?.applied ? 'Remaining cash collected on delivery' : 'Cash collected on delivery', actor, actorType, actorId: extra.actorId ?? null, source });
    }
    await syncDeliverySideEffects(tx as unknown as typeof db, o, row, { source, actorId: extra.actorId, actor, note: extra.verificationNote || extra.note });
    return row;
  });
  if (status === 'cancelled' && updated.status === 'cancelled') await restockOrder(orderId, 'cancel', actor);
  return updated;
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
