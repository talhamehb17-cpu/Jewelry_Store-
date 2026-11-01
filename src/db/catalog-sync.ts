import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { DB } from './index';
import * as s from './schema';
import { CARE_DEFAULT, SEED_CATEGORIES, SEED_COLLECTIONS, SEED_PRODUCTS } from './seed-data';

const DAY = 86_400_000;
const STUDIO_DOMAIN = 'studio.maisonaurelle.pk';

const LOCAL_CATEGORY_IMAGES: Record<string, string> = {
  rings: '/images/products/elara-solitaire-ring-1.webp',
  necklaces: '/images/products/amara-pendant-2.webp',
  earrings: '/images/products/celeste-pearl-earrings-1.webp',
  bracelets: '/images/products/luna-tennis-bracelet-1.webp',
  'jewelry-sets': '/images/products/serene-pearl-set-1.webp',
};

/** Homepage and theme JSON still store the old hotlinks. Swap them for local files. Idempotent. */
const THEME_IMAGE_SWAPS: [string, string][] = [
  ['https://images.unsplash.com/photo-1762505464779-17f78cbfa8b4', '/images/products/elara-solitaire-ring-1.webp'],
  ['https://images.unsplash.com/photo-1605100804763-247f67b3557e', '/images/products/elara-solitaire-ring-1.webp'],
  ['https://images.unsplash.com/photo-1763628212781-7d52844cf358', '/images/products/celeste-pearl-earrings-1.webp'],
  ['https://images.unsplash.com/photo-1682822749969-61a63203c501', '/images/products/celeste-pearl-earrings-1.webp'],
  ['https://images.unsplash.com/photo-1617038220319-276d3cfab638', '/images/products/isabella-gold-hoops-1.webp'],
  ['https://images.unsplash.com/photo-1763029513623-37d488cb97b1', '/images/products/luna-tennis-bracelet-1.webp'],
  ['https://images.unsplash.com/photo-1654699991494-892326ee8171', '/images/products/serene-pearl-set-1.webp'],
  ['https://images.unsplash.com/photo-1722410180687-b05b50922362', '/images/products/rania-bridal-set-1.webp'],
  ['https://images.unsplash.com/photo-1611107683227-e9060eccd846', '/images/products/zoya-link-chain-1.webp'],
  ['https://images.unsplash.com/photo-1598560917807-1bae44bd2be8', '/images/products/noor-gold-band-1.webp'],
  ['https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0', '/images/products/noor-gold-band-1.webp'],
];

const STUDIO_REVIEWS = [
  {
    email: `hira.ahmed@${STUDIO_DOMAIN}`,
    firstName: 'Hira',
    lastName: 'Ahmed',
    phone: '+92 321 4455667',
    city: 'Lahore',
    province: 'Punjab',
    line1: '12-B, Gulberg III',
    product: 'celeste-pearl-earrings',
    avatar: '/images/reviews/hira.webp',
    photo: '/images/reviews/hira.webp',
    rating: 5,
    title: 'Light enough for every day',
    body: 'Studio testimonial — not a verified purchase. The pearl drops are lighter than they look, and the gold hooks sit comfortably. Written by the Lahore styling desk as a sample review.',
  },
  {
    email: `mahnoor.siddiqui@${STUDIO_DOMAIN}`,
    firstName: 'Mahnoor',
    lastName: 'Siddiqui',
    phone: '+92 333 7788990',
    city: 'Karachi',
    province: 'Sindh',
    line1: '14 Khayaban-e-Shujaat, DHA Phase 5',
    product: 'elara-solitaire-ring',
    avatar: '/images/reviews/mahnoor.webp',
    photo: '/images/products/elara-solitaire-ring-1.webp',
    rating: 5,
    title: 'The stone reads clearly in daylight',
    body: 'Studio testimonial — not a verified purchase. Elara is a clean solitaire, easy to size, and the band does not snag. A sample note from the studio, not a customer order.',
  },
  {
    email: `ayesha.khan@${STUDIO_DOMAIN}`,
    firstName: 'Ayesha',
    lastName: 'Khan',
    phone: '+92 300 1122334',
    city: 'Islamabad',
    province: 'Islamabad',
    line1: 'House 7, Street 22, F-7/2',
    product: 'aurelia-gold-necklace',
    avatar: '/images/reviews/ayesha.webp',
    photo: '/images/products/aurelia-gold-necklace-2.webp',
    rating: 5,
    title: 'Lies flat under a neckline',
    body: 'Studio testimonial — not a verified purchase. The herringbone chain sits smoothly and layers without twisting. Sample styling note, not a verified buyer review.',
  },
] as const;

function barcode(n: number) {
  return `890${String(1000000000 + (n % 8999999999)).slice(0, 10)}`;
}

/**
 * Inserts the store catalog and three labeled studio testimonials if they are missing.
 * Never deletes or overwrites products, orders, customers, or stock an admin has already changed.
 */
export async function ensureCatalog(db: DB, log: (m: string) => void = () => {}) {
  await db
    .insert(s.categories)
    .values(SEED_CATEGORIES.map((c, i) => ({ ...c, position: i })))
    .onConflictDoNothing({ target: s.categories.slug });
  await db
    .insert(s.collections)
    .values(
      SEED_COLLECTIONS.map((c, i) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
        image: c.image,
        rule: c.rule,
        ruleValue: 'ruleValue' in c ? c.ruleValue : null,
        featured: 'featured' in c ? !!c.featured : false,
        position: i,
      })),
    )
    .onConflictDoNothing({ target: s.collections.slug });

  for (const [slug, image] of Object.entries(LOCAL_CATEGORY_IMAGES)) {
    await db
      .update(s.categories)
      .set({ image })
      .where(and(eq(s.categories.slug, slug), sql`${s.categories.image} like '%unsplash.com%'`));
    await db
      .update(s.collections)
      .set({ image })
      .where(and(eq(s.collections.slug, slug), sql`${s.collections.image} like '%unsplash.com%'`));
  }

  const cats = await db.select().from(s.categories);
  const cols = await db.select().from(s.collections);
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  const colId = Object.fromEntries(cols.map((c) => [c.slug, c.id]));
  const existing = new Set((await db.select({ slug: s.products.slug }).from(s.products)).map((p) => p.slug));

  let added = 0;
  const now = Date.now();
  for (const [index, p] of SEED_PRODUCTS.entries()) {
    if (existing.has(p.slug)) {
      await refreshRemoteImages(db, p.slug, p.images, p.name);
      continue;
    }
    const created = new Date(now - p.daysAgo * DAY);
    const [row] = await db
      .insert(s.products)
      .values({
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle,
        description: p.description,
        details: p.details,
        materials: p.materials,
        care: CARE_DEFAULT,
        categoryId: catId[p.category] ?? null,
        status: 'active',
        price: p.price * 100,
        compareAtPrice: p.compareAt ? p.compareAt * 100 : null,
        costPrice: p.cost ? p.cost * 100 : null,
        sku: p.sku,
        barcode: barcode(310000000 + index),
        tags: p.tags,
        badges: p.badges,
        featured: !!p.featured,
        videoUrl: p.videoUrl ?? null,
        seoTitle: `${p.name} — ${p.subtitle}`,
        seoDescription: p.description.slice(0, 155),
        createdAt: created,
        updatedAt: created,
      })
      .onConflictDoNothing({ target: s.products.slug })
      .returning();
    if (!row) continue;
    await db.insert(s.productImages).values(p.images.map((url, i) => ({ productId: row.id, url, alt: `${p.name}${i ? ' — detail' : ''}`, position: i })));

    const sizes = p.sizes ?? [null];
    const colors = p.colors ?? [null];
    const variants: (typeof s.productVariants.$inferInsert)[] = [];
    let pos = 0;
    for (const color of colors) {
      for (const size of sizes) {
        const key = [size, colors.length > 1 ? color : null].filter(Boolean).join('/');
        const stock = typeof p.stock === 'number' ? p.stock : (p.stock[key] ?? p.stock[size ?? ''] ?? 5);
        const title = [color, size].filter(Boolean).join(' / ') || 'Default';
        variants.push({
          productId: row.id,
          title,
          size,
          color,
          sku: `${p.sku}${color ? '-' + color.replace(/\s+/g, '').slice(0, 3).toUpperCase() : ''}${size ? '-' + size.replace(/\s+/g, '').replace('.', '') : ''}`,
          barcode: barcode(720000000 + index * 20 + pos),
          stock,
          lowStockThreshold: p.price > 50000 ? 1 : 3,
          position: pos++,
        });
      }
    }
    const vrows = await db.insert(s.productVariants).values(variants).returning();
    if (vrows.length) {
      await db.insert(s.inventoryMovements).values(
        vrows.map((v) => ({
          variantId: v.id,
          productId: row.id,
          change: v.stock,
          stockAfter: v.stock,
          reason: 'initial',
          note: 'Opening stock',
        })),
      );
    }
    const manual = (p.collections ?? []).filter((c) => SEED_COLLECTIONS.find((x) => x.slug === c)?.rule === 'manual');
    if (manual.length) {
      await db
        .insert(s.collectionProducts)
        .values(manual.filter((slug) => colId[slug]).map((slug, i) => ({ collectionId: colId[slug]!, productId: row.id, position: i })))
        .onConflictDoNothing();
    }
    added++;
  }
  log(`catalog: ${added} products added, ${SEED_PRODUCTS.length - added} already present`);

  await ensureStudioReviews(db, log);
  await swapThemeImages(db, log);
}

async function refreshRemoteImages(db: DB, slug: string, images: string[], name: string) {
  if (!images.every((url) => url.startsWith('/'))) return;
  const [product] = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, slug)).limit(1);
  if (!product) return;
  const current = await db.select({ url: s.productImages.url }).from(s.productImages).where(eq(s.productImages.productId, product.id));
  if (!current.some((img) => img.url.includes('unsplash.com'))) return;
  await db.delete(s.productImages).where(eq(s.productImages.productId, product.id));
  await db.insert(s.productImages).values(images.map((url, i) => ({ productId: product.id, url, alt: `${name}${i ? ' — detail' : ''}`, position: i })));
}

async function ensureStudioReviews(db: DB, log: (m: string) => void) {
  const password = process.env.SEED_CUSTOMER_PASSWORD || crypto.randomBytes(9).toString('base64url');
  if (!process.env.SEED_CUSTOMER_PASSWORD) log('SEED_CUSTOMER_PASSWORD not set — generated a password for studio profiles (not printed)');
  const passwordHash = await bcrypt.hash(password, 10);
  let created = 0;
  for (const demo of STUDIO_REVIEWS) {
    const [existingUser] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, demo.email)).limit(1);
    const user =
      existingUser ??
      (
        await db
          .insert(s.users)
          .values({
            email: demo.email,
            passwordHash,
            firstName: demo.firstName,
            lastName: demo.lastName,
            phone: demo.phone,
            role: 'customer',
            status: 'active',
            notes: 'Studio testimonial profile. Not a real customer and not a verified buyer.',
            acceptsMarketing: false,
          })
          .onConflictDoNothing({ target: s.users.email })
          .returning({ id: s.users.id })
      )[0];
    if (!user) continue;
    const [address] = await db.select({ id: s.addresses.id }).from(s.addresses).where(eq(s.addresses.userId, user.id)).limit(1);
    if (!address) {
      await db.insert(s.addresses).values({
        userId: user.id,
        label: 'Home',
        firstName: demo.firstName,
        lastName: demo.lastName,
        phone: demo.phone,
        line1: demo.line1,
        city: demo.city,
        province: demo.province,
        country: 'Pakistan',
        isDefault: true,
      });
    }
    const [product] = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, demo.product)).limit(1);
    if (!product) continue;
    const [review] = await db
      .select({ id: s.reviews.id })
      .from(s.reviews)
      .where(and(eq(s.reviews.productId, product.id), eq(s.reviews.email, demo.email)))
      .limit(1);
    if (review) continue;
    await db.insert(s.reviews).values({
      productId: product.id,
      userId: user.id,
      name: `${demo.firstName} ${demo.lastName}`,
      email: demo.email,
      rating: demo.rating,
      title: demo.title,
      body: demo.body,
      avatar: demo.avatar,
      photo: demo.photo,
      status: 'published',
      verified: false,
    });
    await refreshRating(db, product.id);
    created++;
  }
  log(`studio testimonials: ${created} added`);
}

async function refreshRating(db: DB, productId: number) {
  const [r] = await db
    .select({ avg: sql<number>`coalesce(avg(${s.reviews.rating}), 0)::float`, count: sql<number>`count(*)::int` })
    .from(s.reviews)
    .where(and(eq(s.reviews.productId, productId), eq(s.reviews.status, 'published')));
  await db
    .update(s.products)
    .set({ ratingAvg: Math.round(Number(r?.avg ?? 0) * 10) / 10, ratingCount: Number(r?.count ?? 0) })
    .where(eq(s.products.id, productId));
}

async function swapThemeImages(db: DB, log: (m: string) => void) {
  const rows = await db.select({ themeId: s.themeConfigs.themeId, published: s.themeConfigs.published, draft: s.themeConfigs.draft }).from(s.themeConfigs);
  let changed = 0;
  for (const row of rows) {
    const nextPublished = swapJson(row.published);
    const nextDraft = row.draft ? swapJson(row.draft) : row.draft;
    if (nextPublished === row.published && nextDraft === row.draft) continue;
    await db
      .update(s.themeConfigs)
      .set({ published: nextPublished as typeof row.published, draft: (nextDraft ?? null) as typeof row.draft, updatedAt: new Date() })
      .where(eq(s.themeConfigs.themeId, row.themeId));
    changed++;
  }
  if (changed) log(`theme images refreshed on ${changed} themes`);
}

function swapJson(value: unknown) {
  let text = JSON.stringify(value);
  for (const [from, to] of THEME_IMAGE_SWAPS) text = text.split(from).join(to);
  return JSON.parse(text) as unknown;
}
