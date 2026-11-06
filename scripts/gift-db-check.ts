/**
 * Premium gift packaging against an embedded database only.
 * Does not read DATABASE_URL and does not touch a live store.
 */
import { rmSync } from 'node:fs';
import { eq } from 'drizzle-orm';

delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
process.env.PGLITE_DIR = '/tmp/evermoon-gift-check';
process.env.AUTH_SECRET = 'gift-packaging-check-secret-32-chars';
rmSync(process.env.PGLITE_DIR, { recursive: true, force: true });

const address = {
  firstName: 'Test',
  lastName: 'Buyer',
  phone: '03001234567',
  line1: '1 Sample Lane',
  city: 'Lahore',
  province: 'Punjab',
  postalCode: '54000',
  country: 'Pakistan',
};

async function main() {
  const { getDb } = await import('../src/db');
  const { products, productVariants, orderItems, orders } = await import('../src/db/schema');
  const { buildQuote } = await import('../src/lib/pricing');
  const { createOrder } = await import('../src/lib/orders');
  const { saveSetting, getSettings } = await import('../src/lib/settings');
  const { GIFT_SEED_SLUGS } = await import('../src/lib/gift-packaging');
  const db = await getDb();

  const rows = await db
    .select({ id: products.id, slug: products.slug, gift: products.giftPackaging, variantId: productVariants.id })
    .from(products)
    .innerJoin(productVariants, eq(productVariants.productId, products.id));
  const eligible = rows.find((r) => r.slug === 'celeste-pearl-earrings');
  const otherEligible = rows.find((r) => r.slug === 'amara-pendant');
  const ineligible = rows.find((r) => r.slug === 'aurelia-gold-necklace');
  if (!eligible || !otherEligible || !ineligible) throw new Error('Expected seed products were missing.');
  if (!eligible.gift || !otherEligible.gift) throw new Error('Seed packaging was not enabled on the jewelry subset.');
  if (ineligible.gift) throw new Error('Packaging was enabled on a product outside the subset.');
  const flagged = new Set(rows.filter((r) => r.gift).map((r) => r.slug));
  for (const slug of flagged) {
    if (!GIFT_SEED_SLUGS.includes(slug as (typeof GIFT_SEED_SLUGS)[number])) throw new Error(`Unexpected packaging flag on ${slug}`);
  }

  const settings = await getSettings();
  if (settings.giftPackaging.price !== 25_000) throw new Error(`Expected default price 25000, got ${settings.giftPackaging.price}`);
  if (!settings.giftPackaging.images.every((img) => img.url.startsWith('/images/packaging/') && img.url.endsWith('.webp'))) {
    throw new Error('Default packaging images are not persistent site files.');
  }

  const denied = await buildQuote({
    lines: [{ variantId: ineligible.variantId, quantity: 1, giftPackaging: true, giftImageId: 'box' }],
    shippingMethod: 'standard',
    paymentMethod: 'cod',
  });
  if (denied.lines[0]?.giftSelected || denied.giftTotal !== 0) throw new Error('Ineligible product was charged for packaging.');

  const once = await buildQuote({
    lines: [{ variantId: eligible.variantId, quantity: 2, giftPackaging: true, giftImageId: 'pouch' }],
    shippingMethod: 'standard',
    paymentMethod: 'cod',
  });
  const twice = await buildQuote({
    lines: [{ variantId: eligible.variantId, quantity: 2, giftPackaging: true, giftImageId: 'pouch' }],
    shippingMethod: 'standard',
    paymentMethod: 'cod',
  });
  if (once.giftTotal !== 50_000 || twice.giftTotal !== 50_000) throw new Error(`Quantity should charge 250 twice, got ${once.giftTotal}`);
  if (once.lines[0]?.giftUnitPrice !== 25_000 || once.lines[0]?.giftLineTotal !== 50_000) throw new Error('Line snapshot does not match the admin price.');
  if (once.lines[0]?.giftImage !== '/images/packaging/gift-pouch.webp') throw new Error('Selected packaging image was not kept.');
  const withoutGift = once.total - once.giftTotal;
  if (once.total !== withoutGift + once.giftTotal) throw new Error('Packaging was not included once in the payable total.');

  const mixed = await buildQuote({
    lines: [
      { variantId: eligible.variantId, quantity: 1, giftPackaging: true, giftImageId: 'box' },
      { variantId: otherEligible.variantId, quantity: 3, giftPackaging: false },
    ],
    shippingMethod: 'standard',
    paymentMethod: 'cod',
  });
  if (mixed.giftTotal !== 25_000) throw new Error(`Independent selection failed: ${mixed.giftTotal}`);
  if (mixed.lines.find((l) => l.variantId === otherEligible.variantId)?.giftSelected) throw new Error('An unselected line was charged.');

  const order = await createOrder({
    lines: [{ variantId: eligible.variantId, quantity: 2, giftPackaging: true, giftImageId: 'box' }],
    email: 'gift-check@example.invalid',
    phone: '03001234567',
    address,
    shippingMethod: 'standard',
    paymentMethod: 'cod',
  });
  const [saved] = await db.select().from(orders).where(eq(orders.id, order.id));
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  if (!saved || saved.giftTotal !== 50_000) throw new Error('Order did not store the packaging total.');
  if (!items[0]?.giftPackaging || items[0].giftUnitPrice !== 25_000 || items[0].giftLineTotal !== 50_000) throw new Error('Order item did not snapshot packaging.');

  await saveSetting('giftPackaging', { ...settings.giftPackaging, price: 40_000, initialized: true });
  const next = await buildQuote({
    lines: [{ variantId: eligible.variantId, quantity: 1, giftPackaging: true, giftImageId: 'box' }],
    shippingMethod: 'standard',
    paymentMethod: 'cod',
  });
  const [still] = await db.select().from(orders).where(eq(orders.id, order.id));
  const [stillItem] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  if (next.giftTotal !== 40_000) throw new Error('A new quote did not use the updated admin price.');
  if (still?.giftTotal !== 50_000 || stillItem?.giftUnitPrice !== 25_000) throw new Error('A price change altered an existing order.');

  await db.update(products).set({ giftPackaging: false }).where(eq(products.id, eligible.id));
  const hidden = await buildQuote({
    lines: [{ variantId: eligible.variantId, quantity: 1, giftPackaging: true }],
    shippingMethod: 'standard',
    paymentMethod: 'cod',
  });
  if (hidden.giftTotal !== 0 || hidden.lines[0]?.giftEligible) throw new Error('Turning a product off did not remove the charge.');

  console.log('gift database checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
