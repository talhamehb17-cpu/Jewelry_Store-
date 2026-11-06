import { eq, inArray, sql } from 'drizzle-orm';
import { products, settings } from './schema';
import { DEFAULT_GIFT_IMAGES, DEFAULT_GIFT_PRICE, GIFT_SEED_SLUGS, normalizeGift } from '@/lib/gift-packaging';
import type { DB } from './index';

const ready = new WeakSet<object>();

/** Additive only. Does not delete rows, codes, orders, or subscribers. */
export async function ensureCommerceColumns(db: DB) {
  if (ready.has(db)) return;
  await db.execute(sql`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "audience" varchar(20) NOT NULL DEFAULT 'public'`);
  await db.execute(sql`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "category_ids" jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_plan" jsonb`);
  await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gift_packaging" boolean NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gift_total" integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gift_packaging" boolean NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gift_unit_price" integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gift_line_total" integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gift_image" text`);
  const [row] = await db.select().from(settings).where(eq(settings.key, 'giftPackaging')).limit(1);
  const current = normalizeGift(row?.value);
  const images = current.images.map((img) =>
    img.url === '/images/packaging/gift-box.png'
      ? { ...img, url: '/images/packaging/gift-box.webp' }
      : img.url === '/images/packaging/gift-pouch.png'
        ? { ...img, url: '/images/packaging/gift-pouch.webp' }
        : img,
  );
  if (current.initialized && images.some((img, i) => img.url !== current.images[i]?.url)) {
    await db.update(settings).set({ value: { ...current, images }, updatedAt: new Date() }).where(eq(settings.key, 'giftPackaging'));
  }
  if (!current.initialized) {
    await db.update(products).set({ giftPackaging: true }).where(inArray(products.slug, [...GIFT_SEED_SLUGS]));
    await db
      .insert(settings)
      .values({
        key: 'giftPackaging',
        value: { enabled: true, price: DEFAULT_GIFT_PRICE, images: DEFAULT_GIFT_IMAGES, initialized: true, audit: null },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: { ...current, images: images.length ? images : DEFAULT_GIFT_IMAGES, initialized: true },
          updatedAt: new Date(),
        },
      });
  }
  ready.add(db);
}
