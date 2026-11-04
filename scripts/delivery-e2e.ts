/**
 * Controlled delivery checks against an embedded database. Does not connect to Neon and does not use a customer order.
 */
import { rmSync } from 'node:fs';
import { and, eq } from 'drizzle-orm';

delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
process.env.PGLITE_DIR = '/tmp/evermoon-delivery-e2e';
process.env.AUTH_SECRET = 'delivery-e2e-secret-must-be-32-characters';
rmSync(process.env.PGLITE_DIR, { recursive: true, force: true });

async function main() {
const { addDaysPkt, DEFAULT_TIMELINE, snapshotTimeline, validateTimeline } = await import('../src/lib/delivery-schedule');

const failures: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
  else console.log(`ok  ${name}`);
}

const morning = new Date('2026-06-01T05:00:00.000Z'); // 10:00 PKT
const standard = snapshotTimeline('standard', morning, DEFAULT_TIMELINE);
check('standard processing is day 2', standard.processingAt === new Date(morning.getTime() + 2 * 86400000).toISOString());
check('standard ship is day 4 at 20:00 PKT', standard.shipAt === addDaysPkt(morning, 4, 20).toISOString());
check('standard out is day 5.5', standard.outAt === new Date(morning.getTime() + 5.5 * 86400000).toISOString());
check('standard expected is day 6', standard.expectedAt === new Date(morning.getTime() + 6 * 86400000).toISOString());
const evening = new Date('2026-06-01T17:00:00.000Z'); // 22:00 PKT
const eveningSnap = snapshotTimeline('standard', evening, DEFAULT_TIMELINE);
check('evening confirmation still ships after processing', new Date(eveningSnap.processingAt).getTime() < new Date(eveningSnap.shipAt).getTime());
const express = snapshotTimeline('express', morning, DEFAULT_TIMELINE);
check('express processing is 12 hours', express.processingAt === new Date(morning.getTime() + 12 * 3600000).toISOString());
check('express ship is 1 day', express.shipAt === new Date(morning.getTime() + 86400000).toISOString());
check('express out is 1.5 days', express.outAt === new Date(morning.getTime() + 36 * 3600000).toISOString());
check('express expected is 3 days', express.expectedAt === new Date(morning.getTime() + 3 * 86400000).toISOString());
check('invalid timeline is rejected', validateTimeline({ ...DEFAULT_TIMELINE, express: { ...DEFAULT_TIMELINE.express, outMinutes: 10 } }) !== null);
check('default timeline is valid', validateTimeline(DEFAULT_TIMELINE) === null);

const { getDb } = await import('../src/db');
const { orders, orderEvents, orderItems, users, customerNotifications, deliveryIssues, settings } = await import('../src/db/schema');
const { changeOrderStatus } = await import('../src/lib/orders');
const { progressOrders, ordersAwaitingDeliveryConfirmation, respondToDelivery } = await import('../src/lib/delivery-engine');
const { markDelivered } = await import('../src/app/actions/admin/orders');

const db = await getDb();
const [customer] = await db.insert(users).values({ email: 'delivery-e2e@example.com', passwordHash: 'not-a-login', firstName: 'Delivery', lastName: 'Test', role: 'customer' }).returning();
const [other] = await db.insert(users).values({ email: 'other-e2e@example.com', passwordHash: 'not-a-login', firstName: 'Other', lastName: 'Person', role: 'customer' }).returning();

async function makeOrder(service: 'standard' | 'express', paymentMethod: 'cod' | 'easypaisa' | 'bank' | 'jazzcash', paymentStatus: 'unpaid' | 'awaiting' | 'failed' | 'paid') {
  const [row] = await db.insert(orders).values({
    number: `TMP-${crypto.randomUUID().slice(0, 8)}`,
    userId: customer!.id,
    email: customer!.email,
    phone: '03001234567',
    customerName: 'Delivery Test',
    status: 'pending',
    paymentStatus,
    paymentMethod,
    shippingMethod: service,
    shippingMethodName: service === 'express' ? 'Express Delivery' : 'Normal Delivery',
    shippingAddress: { firstName: 'Delivery', lastName: 'Test', phone: '03001234567', line1: 'Controlled test lane', city: 'Lahore', province: 'Punjab', country: 'Pakistan' },
    subtotal: 100000,
    total: 100000,
    deliveryCode: service,
  }).returning();
  const number = `EM-TEST-${row!.id}`;
  await db.update(orders).set({ number }).where(eq(orders.id, row!.id));
  await db.insert(orderItems).values({ orderId: row!.id, name: 'Test solitaire', quantity: 1, unitPrice: 100000, lineTotal: 100000, image: '/images/brand/logo.webp' });
  return { ...row!, number };
}

const unpaid = await makeOrder('standard', 'easypaisa', 'awaiting');
const jumped = await progressOrders(new Date(Date.now() + 10 * 86400000), unpaid.id);
check('unverified payment does not advance', jumped.advanced === 0);
const [unpaidFresh] = await db.select().from(orders).where(eq(orders.id, unpaid.id));
check('unverified order stays pending', unpaidFresh?.status === 'pending' && unpaidFresh.automationState === 'idle');

const cod = await makeOrder('standard', 'cod', 'unpaid');
await progressOrders(new Date(Date.now() + 8 * 86400000), cod.id);
const [codBefore] = await db.select().from(orders).where(eq(orders.id, cod.id));
check('COD does not start at placement', codBefore?.status === 'pending' && !codBefore.timelineStartAt);
const confirmed = await changeOrderStatus(cod.id, 'confirmed', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1, note: 'COD confirmed' });
check('COD confirmation starts the schedule', confirmed.automationState === 'active' && confirmed.status === 'confirmed' && !!confirmed.deliveryPlan?.snapshottedAt);
check('COD expected is about 6 days', Math.abs((confirmed.expectedAt!.getTime() - confirmed.timelineStartAt!.getTime()) / 86400000 - 6) < 0.01);
const savedPlan = confirmed.deliveryPlan!;
await db.insert(settings).values({ key: 'delivery_automation', value: { ...DEFAULT_TIMELINE, standard: { ...DEFAULT_TIMELINE.standard, expectedMinutes: 9 * 1440 } } }).onConflictDoUpdate({ target: settings.key, set: { value: { ...DEFAULT_TIMELINE, standard: { ...DEFAULT_TIMELINE.standard, expectedMinutes: 9 * 1440 } } } });
const [afterSettings] = await db.select().from(orders).where(eq(orders.id, cod.id));
check('settings change does not rewrite the saved plan', afterSettings?.deliveryPlan?.expectedAt === savedPlan.expectedAt);
await db.insert(settings).values({ key: 'delivery_automation', value: DEFAULT_TIMELINE }).onConflictDoUpdate({ target: settings.key, set: { value: DEFAULT_TIMELINE } });

await db.update(orders).set({
  nextStatus: 'processing',
  nextStatusAt: new Date(Date.now() - 1000),
  deliveryPlan: { ...savedPlan, processingAt: new Date(Date.now() - 1000).toISOString(), shipAt: new Date(Date.now() + 86400000).toISOString(), outAt: new Date(Date.now() + 2 * 86400000).toISOString() },
}).where(eq(orders.id, cod.id));
const step1 = await progressOrders(new Date(), cod.id);
check('overdue processing advances once', step1.advanced === 1);
const step1b = await progressOrders(new Date(), cod.id);
check('repeat cron does not duplicate processing', step1b.advanced === 0);
const [processing] = await db.select().from(orders).where(eq(orders.id, cod.id));
check('status is processing', processing?.status === 'processing' && !!processing.processingAt);

await db.update(orders).set({
  nextStatus: 'shipped',
  nextStatusAt: new Date(Date.now() - 1000),
  deliveryPlan: { ...savedPlan, shipAt: new Date(Date.now() - 1000).toISOString(), outAt: new Date(Date.now() + 86400000).toISOString() },
}).where(eq(orders.id, cod.id));
await progressOrders(new Date(), cod.id);
await db.update(orders).set({ nextStatus: 'out_for_delivery', nextStatusAt: new Date(Date.now() - 1000) }).where(eq(orders.id, cod.id));
await progressOrders(new Date(), cod.id);
const [out] = await db.select().from(orders).where(eq(orders.id, cod.id));
check('automatic out for delivery does not deliver', out?.status === 'out_for_delivery' && out.confirmationSource == null);
check('question is 10 minutes after the actual out time', !!out?.outForDeliveryAt && !!out.notificationDueAt && out.notificationDueAt.getTime() - out.outForDeliveryAt.getTime() === 10 * 60_000);
const early = await ordersAwaitingDeliveryConfirmation(customer!.id, new Date(out!.notificationDueAt!.getTime() - 60_000));
check('question is closed 1 minute early', !early.some((p) => p.id === cod.id));
const due = await ordersAwaitingDeliveryConfirmation(customer!.id, out!.notificationDueAt!);
check('question opens at 10 minutes', due.some((p) => p.id === cod.id && p.productName === 'Test solitaire'));
const stranger = await respondToDelivery(cod.id, other!.id, true, out!.notificationDueAt!);
check('another customer cannot confirm', stranger.ok === false);
const yes = await respondToDelivery(cod.id, customer!.id, true, out!.notificationDueAt!);
check('customer yes delivers', yes.ok === true);
const [delivered] = await db.select().from(orders).where(eq(orders.id, cod.id));
check('confirmation source is customer', delivered?.status === 'delivered' && delivered.confirmationSource === 'customer' && delivered.confirmedById === customer!.id);
const again = await respondToDelivery(cod.id, customer!.id, true, out!.notificationDueAt!);
check('stale yes does not confirm again', again.ok === false && 'stale' in again && again.stale === true);
const deliveredEvents = await db.select().from(orderEvents).where(and(eq(orderEvents.orderId, cod.id), eq(orderEvents.toStatus, 'delivered')));
check('one delivered history row', deliveredEvents.length === 1);
const [note] = await db.select().from(customerNotifications).where(eq(customerNotifications.orderId, cod.id));
check('notification resolved', note?.status === 'answered_yes' || note?.status === 'resolved');
const still = await ordersAwaitingDeliveryConfirmation(customer!.id, new Date(Date.now() + 86400000));
check('popup is gone after yes', !still.some((p) => p.id === cod.id));

const manual = await makeOrder('express', 'cod', 'unpaid');
await changeOrderStatus(manual.id, 'confirmed', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1 });
await changeOrderStatus(manual.id, 'processing', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1 });
await changeOrderStatus(manual.id, 'shipped', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1 });
const manualOut = await changeOrderStatus(manual.id, 'out_for_delivery', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1 });
check('manual out does not wait for day 3', !!manualOut.notificationDueAt && manualOut.notificationDueAt.getTime() - Date.now() < 11 * 60_000);
check('manual out cancels later automatic delivery', manualOut.nextStatus == null);
const later = await progressOrders(new Date(Date.now() + 4 * 86400000), manual.id);
check('later cron does not deliver a manually advanced order', later.advanced === 0);
const [manualFresh] = await db.select().from(orders).where(eq(orders.id, manual.id));
check('manual order still out for delivery', manualFresh?.status === 'out_for_delivery');

const adminOrder = await makeOrder('express', 'bank', 'paid');
await changeOrderStatus(adminOrder.id, 'confirmed', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1, force: true });
await db.update(orders).set({ automationState: 'active', timelineStartAt: new Date(), paymentStatus: 'paid' }).where(eq(orders.id, adminOrder.id));
await changeOrderStatus(adminOrder.id, 'out_for_delivery', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1, force: true });
const denied = await markDelivered(adminOrder.id, 'should not run without a session');
check('mark delivered requires an authorised admin', denied.ok === false);
const adminDone = await changeOrderStatus(adminOrder.id, 'delivered', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1, confirmDelivery: true, verificationNote: 'Courier slip 44' });
check('admin delivery records identity', adminDone.status === 'delivered' && adminDone.confirmationSource === 'admin' && adminDone.confirmedById === 1 && adminDone.confirmationNote === 'Courier slip 44');
const adminPrompts = await ordersAwaitingDeliveryConfirmation(customer!.id, new Date(Date.now() + 86400000));
check('admin delivery clears the popup', !adminPrompts.some((p) => p.id === adminOrder.id));
const staleCustomer = await respondToDelivery(adminOrder.id, customer!.id, true);
check('old customer popup is rejected', staleCustomer.ok === false);

const noOrder = await makeOrder('standard', 'cod', 'unpaid');
await changeOrderStatus(noOrder.id, 'confirmed', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1 });
await changeOrderStatus(noOrder.id, 'out_for_delivery', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1, force: true });
const [noFresh] = await db.select().from(orders).where(eq(orders.id, noOrder.id));
const no = await respondToDelivery(noOrder.id, customer!.id, false, noFresh!.notificationDueAt!);
check('customer no keeps out for delivery', no.ok === true);
const [noAfter] = await db.select().from(orders).where(eq(orders.id, noOrder.id));
check('no does not deliver', noAfter?.status === 'out_for_delivery' && noAfter.deliveryResponse === 'no');
const [issue] = await db.select().from(deliveryIssues).where(eq(deliveryIssues.orderId, noOrder.id));
check('no opens an issue', issue?.status === 'open' && issue.customerResponse === 'no');
const hidden = await ordersAwaitingDeliveryConfirmation(customer!.id, noFresh!.notificationDueAt!);
check('explicit no does not force the popup again', !hidden.some((p) => p.id === noOrder.id));
const resolved = await changeOrderStatus(noOrder.id, 'delivered', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1, confirmDelivery: true, verificationNote: 'Handed over after the customer said no' });
check('admin can deliver after a no', resolved.status === 'delivered' && resolved.deliveryResponse === 'no' && resolved.confirmationSource === 'admin');
const [issueAfter] = await db.select().from(deliveryIssues).where(eq(deliveryIssues.id, issue!.id));
check('issue is resolved and the no is kept', issueAfter?.status === 'resolved' && issueAfter.customerResponse === 'no');

const cancelled = await makeOrder('express', 'cod', 'unpaid');
await changeOrderStatus(cancelled.id, 'confirmed', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1 });
await changeOrderStatus(cancelled.id, 'cancelled', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1, reason: 'Test cancel' });
const cancelRun = await progressOrders(new Date(Date.now() + 5 * 86400000), cancelled.id);
check('cancelled order does not advance', cancelRun.advanced === 0);

const rejected = await makeOrder('express', 'jazzcash', 'failed');
await db.update(orders).set({ automationState: 'active', status: 'confirmed', nextStatus: 'processing', nextStatusAt: new Date(Date.now() - 1000), timelineStartAt: new Date(), deliveryPlan: express }).where(eq(orders.id, rejected.id));
let rejectedError = false;
try {
  await changeOrderStatus(rejected.id, 'processing', 'automation', { source: 'automatic', expectedStatus: 'confirmed' });
} catch {
  rejectedError = true;
}
check('rejected payment is not advanced by automation', rejectedError);

await db.insert(settings).values({ key: 'delivery_worker_lock', value: { until: new Date(Date.now() + 60_000).toISOString() } }).onConflictDoUpdate({ target: settings.key, set: { value: { until: new Date(Date.now() + 60_000).toISOString() } } });
const locked = await progressOrders(new Date());
check('overlapping worker is skipped', locked.skipped === true);
await db.update(settings).set({ value: { until: null } }).where(eq(settings.key, 'delivery_worker_lock'));

const pendingDeliver = await makeOrder('standard', 'cod', 'unpaid');
let blocked = false;
try {
  await changeOrderStatus(pendingDeliver.id, 'delivered', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1, confirmDelivery: true });
} catch {
  blocked = true;
}
check('pending cannot be marked delivered', blocked);

const catchup = await makeOrder('express', 'cod', 'unpaid');
const catchConfirmed = await changeOrderStatus(catchup.id, 'confirmed', 'atelier', { source: 'admin', actorType: 'admin', actorId: 1 });
const past = new Date(Date.now() - 60_000).toISOString();
await db.update(orders).set({
  deliveryPlan: { ...catchConfirmed.deliveryPlan!, processingAt: past, shipAt: past, outAt: past },
  nextStatus: 'processing',
  nextStatusAt: new Date(Date.now() - 60_000),
}).where(eq(orders.id, catchup.id));
const caught = await progressOrders(new Date(), catchup.id);
check('missed cron catches processing, shipped and out for delivery', caught.advanced === 3);
const [caughtOrder] = await db.select().from(orders).where(eq(orders.id, catchup.id));
check('catch-up never marks delivered', caughtOrder?.status === 'out_for_delivery');

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nAll delivery checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
