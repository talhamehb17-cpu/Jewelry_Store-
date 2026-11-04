import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../src/db';
import { discounts, newsletterSubscribers, orders, productVariants, settings } from '../src/db/schema';
import { listSubscriberOffers } from '../src/lib/subscriber-offers';
import { validateDiscount } from '../src/lib/pricing';
import { createOrder } from '../src/lib/orders';
import { saveSetting } from '../src/lib/settings';

async function main() {
  const db = await getDb();
  const columns = await db.execute(sql`select column_name from information_schema.columns where table_name in ('discounts', 'orders') and column_name in ('audience', 'category_ids', 'payment_plan')`);
  const names = JSON.stringify(columns);
  if (!names.includes('audience') || !names.includes('category_ids') || !names.includes('payment_plan')) {
    throw new Error('Expected additive columns were not created.');
  }

  const email = 'rules-check@example.invalid';
  const code = `RULES${Date.now().toString(36).toUpperCase()}`;
  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
  await db.insert(newsletterSubscribers).values({ email, source: 'rules-check', status: 'subscribed', token: `rules-${Date.now()}` });
  const [row] = await db.insert(discounts).values({
    code,
    type: 'percentage',
    value: 10,
    audience: 'subscribers',
    appliesTo: 'all',
    active: true,
    startsAt: new Date(Date.now() + 60_000),
  }).returning();
  if (!row) throw new Error('Could not insert the test code.');

  const before = await listSubscriberOffers(email);
  if (before.some((offer) => offer.code === code)) throw new Error('A future code was visible before its start.');
  await db.update(discounts).set({ startsAt: new Date(Date.now() - 60_000) }).where(eq(discounts.id, row.id));
  const active = await listSubscriberOffers(email);
  if (!active.some((offer) => offer.code === code)) throw new Error('An active subscriber code was not visible to an existing subscriber.');
  await db.update(newsletterSubscribers).set({ status: 'unsubscribed', unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.email, email));
  const hidden = await listSubscriberOffers(email);
  if (hidden.some((offer) => offer.code === code)) throw new Error('An unsubscribed email still received the code.');

  const line = { variantId: 1, productId: 1, slug: 'test', name: 'Test', variantTitle: null, image: null, unitPrice: 100000, catalogUnitPrice: 100000, compareAtPrice: null, categoryId: null, campaignHit: false, quantity: 1, lineTotal: 100000, stock: 1, sku: null };
  const denied = await validateDiscount(code, { lines: [line], subtotal: 100000, email });
  if (!('error' in denied)) throw new Error('Unsubscribed validation should fail.');
  await db.update(newsletterSubscribers).set({ status: 'subscribed', unsubscribedAt: null }).where(eq(newsletterSubscribers.email, email));
  const allowed = await validateDiscount(code, { lines: [line], subtotal: 100000, email });
  if ('error' in allowed) throw new Error(`Subscribed validation failed: ${allowed.error}`);

  const clash = await db.select({ id: discounts.id }).from(discounts).where(and(eq(sql`upper(${discounts.code})`, code))).limit(2);
  if (clash.length !== 1) throw new Error('Test code was duplicated.');

  await db.delete(discounts).where(eq(discounts.id, row.id));
  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));

  const [variant] = await db.select().from(productVariants).where(sql`${productVariants.stock} > 0`).limit(1);
  if (!variant) throw new Error('No stocked variant for the payment snapshot check.');
  const [shipping] = await db.select().from(settings).where(eq(settings.key, 'shipping'));
  const [shoppingRow] = await db.select().from(settings).where(eq(settings.key, 'shopping'));
  await saveSetting('shopping', {
    minOrderEnabled: false,
    minOrderAmount: 0,
    highValue: {
      enabled: true,
      threshold: 100,
      advancePercent: 25,
      remainingPercent: 75,
      requireSlip: true,
      requireVerification: true,
      allowRemainingCod: true,
      advanceMethods: ['easypaisa', 'jazzcash', 'bank'],
      basis: 'payable',
    },
    audit: null,
  });
  const order = await createOrder({
    lines: [{ variantId: variant.id, quantity: 1 }],
    email: 'rules-order@example.invalid',
    phone: '03001234567',
    address: { firstName: 'Rules', lastName: 'Check', phone: '03001234567', line1: '1 Test Street', city: 'Lahore', province: 'Punjab', country: 'Pakistan' },
    shippingMethod: 'standard',
    paymentMethod: 'easypaisa',
  });
  if (!order.paymentPlan?.applied || order.paymentPlan.advanceAmount + order.paymentPlan.remainingAmount !== order.total) {
    throw new Error('The order did not snapshot an advance that adds up to the payable total.');
  }
  if (order.paymentStatus === 'paid') throw new Error('Creating the order marked the advance paid.');
  const snap = order.paymentPlan.advanceAmount;
  await saveSetting('shopping', {
    minOrderEnabled: false,
    minOrderAmount: 0,
    highValue: {
      enabled: false,
      threshold: 1,
      advancePercent: 50,
      remainingPercent: 50,
      requireSlip: false,
      requireVerification: false,
      allowRemainingCod: true,
      advanceMethods: ['bank'],
      basis: 'subtotal',
    },
    audit: null,
  });
  const [saved] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
  if (saved?.paymentPlan?.advanceAmount !== snap || saved.paymentPlan.advancePercent !== 25) {
    throw new Error('A later settings change recalculated an existing order.');
  }
  if (shipping) await db.update(settings).set({ value: shipping.value }).where(eq(settings.key, 'shipping'));
  if (shoppingRow) await db.update(settings).set({ value: shoppingRow.value }).where(eq(settings.key, 'shopping'));
  else await db.delete(settings).where(eq(settings.key, 'shopping'));
  console.log('commerce-db-check: ok');
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'commerce-db-check failed');
  process.exit(1);
});
