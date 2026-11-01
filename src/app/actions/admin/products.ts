'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { and, eq, inArray, ne, notInArray, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { collectionProducts, collections, inventoryMovements, productImages, products, productVariants } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import { slugify } from '@/lib/utils';

const money = z.coerce.number().min(0).max(100_000_000);
const optMoney = z.union([z.literal(''), z.null(), money]).transform((v) => (v === '' || v == null ? null : Math.round(Number(v) * 100)));

const productSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(2, 'Product name is required').max(200),
  slug: z.string().trim().max(160).optional().default(''),
  subtitle: z.string().trim().max(255).optional().default(''),
  description: z.string().trim().max(10_000).default(''),
  details: z.array(z.string().trim().max(300)).max(30).default([]),
  materials: z.array(z.string().trim().max(80)).max(20).default([]),
  care: z.string().trim().max(3000).optional().default(''),
  categoryId: z.number().int().nullable().default(null),
  collectionIds: z.array(z.number().int()).max(50).default([]),
  status: z.enum(['active', 'draft', 'archived']),
  price: money,
  compareAtPrice: optMoney,
  costPrice: optMoney,
  sku: z.string().trim().max(80).optional().default(''),
  barcode: z.string().trim().max(80).optional().default(''),
  tags: z.array(z.string().trim().max(40)).max(40).default([]),
  badges: z.array(z.enum(['new', 'bestseller', 'limited', 'sale', 'gift'])).default([]),
  featured: z.boolean().default(false),
  videoUrl: z.string().trim().max(500).optional().default(''),
  seoTitle: z.string().trim().max(200).optional().default(''),
  seoDescription: z.string().trim().max(400).optional().default(''),
  images: z.array(z.object({ url: z.string().trim().min(1).max(1000), alt: z.string().trim().max(255).optional().default('') })).max(20).default([]),
  variants: z
    .array(
      z.object({
        id: z.number().int().optional(),
        size: z.string().trim().max(60).nullable().default(null),
        color: z.string().trim().max(60).nullable().default(null),
        sku: z.string().trim().max(80).optional().default(''),
        barcode: z.string().trim().max(80).optional().default(''),
        price: optMoney,
        compareAtPrice: optMoney,
        stock: z.coerce.number().int().min(0).max(1_000_000),
        lowStockThreshold: z.coerce.number().int().min(0).max(10_000).default(3),
      }),
    )
    .min(1, 'At least one variant is required')
    .max(200),
});

export type ProductPayload = z.input<typeof productSchema>;
export type SaveResult = { ok: true; id: number } | { ok: false; error: string };

const safeUrl = (u: string) => /^(https?:\/\/|\/)/.test(u);

export async function saveProduct(payload: ProductPayload): Promise<SaveResult> {
  const actor = await assertAdmin();
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)[0]! };
  const d = parsed.data;
  if (d.images.some((i) => !safeUrl(i.url)) || (d.videoUrl && !safeUrl(d.videoUrl))) return { ok: false, error: 'Media URLs must start with https:// or /' };
  const db = await getDb();
  const slug = slugify(d.slug || d.name) || `product-${Date.now()}`;
  const clash = await db.select({ id: products.id }).from(products).where(and(eq(products.slug, slug), d.id ? ne(products.id, d.id) : undefined)).limit(1);
  if (clash.length) return { ok: false, error: `The URL handle “${slug}” is already used by another product.` };
  const price = Math.round(d.price * 100);
  if (d.compareAtPrice != null && d.compareAtPrice <= price) d.compareAtPrice = null;

  const id = await db.transaction(async (tx) => {
    const values = {
      name: d.name,
      slug,
      subtitle: d.subtitle || null,
      description: d.description,
      details: d.details.filter(Boolean),
      materials: d.materials.filter(Boolean),
      care: d.care || null,
      categoryId: d.categoryId,
      status: d.status,
      price,
      compareAtPrice: d.compareAtPrice,
      costPrice: d.costPrice,
      sku: d.sku || null,
      barcode: d.barcode || null,
      tags: [...new Set(d.tags.filter(Boolean).map((t) => t.toLowerCase()))],
      badges: d.badges,
      featured: d.featured,
      videoUrl: d.videoUrl || null,
      seoTitle: d.seoTitle || null,
      seoDescription: d.seoDescription || null,
      updatedAt: new Date(),
    };
    let pid = d.id;
    if (pid) {
      const updated = await tx.update(products).set(values).where(eq(products.id, pid)).returning({ id: products.id });
      if (!updated.length) throw new Error('Product not found');
    } else {
      const [row] = await tx.insert(products).values(values).returning({ id: products.id });
      pid = row!.id;
    }
    await tx.delete(productImages).where(eq(productImages.productId, pid));
    if (d.images.length) await tx.insert(productImages).values(d.images.map((im, i) => ({ productId: pid!, url: im.url, alt: im.alt || d.name, position: i })));

    const existing = await tx.select().from(productVariants).where(eq(productVariants.productId, pid));
    const keepIds = d.variants.map((v) => v.id).filter((x): x is number => !!x && existing.some((e) => e.id === x));
    if (existing.length) {
      const remove = existing.filter((e) => !keepIds.includes(e.id)).map((e) => e.id);
      if (remove.length) await tx.delete(productVariants).where(inArray(productVariants.id, remove));
    }
    for (const [i, v] of d.variants.entries()) {
      const title = [v.color, v.size].filter(Boolean).join(' / ') || 'Default';
      const vals = { title, size: v.size || null, color: v.color || null, sku: v.sku || null, barcode: v.barcode || null, price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock, lowStockThreshold: v.lowStockThreshold, position: i };
      const prev = v.id ? existing.find((e) => e.id === v.id) : undefined;
      if (prev) {
        await tx.update(productVariants).set(vals).where(eq(productVariants.id, prev.id));
        if (prev.stock !== v.stock) await tx.insert(inventoryMovements).values({ variantId: prev.id, productId: pid, change: v.stock - prev.stock, stockAfter: v.stock, reason: 'adjustment', note: 'Edited in product editor', actorId: actor.id });
      } else {
        const [nv] = await tx.insert(productVariants).values({ ...vals, productId: pid }).returning({ id: productVariants.id });
        await tx.insert(inventoryMovements).values({ variantId: nv!.id, productId: pid, change: v.stock, stockAfter: v.stock, reason: 'initial', note: 'Variant created', actorId: actor.id });
      }
    }

    const manual = await tx.select({ id: collections.id }).from(collections).where(eq(collections.rule, 'manual'));
    const manualIds = manual.map((m) => m.id);
    const wanted = d.collectionIds.filter((c) => manualIds.includes(c));
    if (manualIds.length) {
      await tx.delete(collectionProducts).where(and(eq(collectionProducts.productId, pid), inArray(collectionProducts.collectionId, manualIds), wanted.length ? notInArray(collectionProducts.collectionId, wanted) : undefined));
    }
    if (wanted.length) await tx.insert(collectionProducts).values(wanted.map((c) => ({ collectionId: c, productId: pid!, position: 999 }))).onConflictDoNothing();
    return pid;
  });
  revalidatePath('/', 'layout');
  return { ok: true, id };
}

export async function duplicateProduct(id: number): Promise<SaveResult> {
  await assertAdmin();
  const db = await getDb();
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) return { ok: false, error: 'Product not found' };
  let slug = `${p.slug}-copy`;
  for (let i = 2; (await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1)).length; i++) slug = `${p.slug}-copy-${i}`;
  const newId = await db.transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt, updatedAt, ...rest } = p;
    const [np] = await tx.insert(products).values({ ...rest, slug, name: `${p.name} (Copy)`, status: 'draft', salesCount: 0, ratingAvg: 0, ratingCount: 0 }).returning({ id: products.id });
    const imgs = await tx.select().from(productImages).where(eq(productImages.productId, id));
    if (imgs.length) await tx.insert(productImages).values(imgs.map((im) => ({ productId: np!.id, url: im.url, alt: im.alt, position: im.position })));
    const vars = await tx.select().from(productVariants).where(eq(productVariants.productId, id));
    if (vars.length) await tx.insert(productVariants).values(vars.map((v) => ({ productId: np!.id, title: v.title, size: v.size, color: v.color, sku: v.sku ? `${v.sku}-C` : null, price: v.price, compareAtPrice: v.compareAtPrice, stock: 0, lowStockThreshold: v.lowStockThreshold, position: v.position })));
    const cols = await tx.select().from(collectionProducts).where(eq(collectionProducts.productId, id));
    if (cols.length) await tx.insert(collectionProducts).values(cols.map((c) => ({ collectionId: c.collectionId, productId: np!.id, position: c.position })));
    return np!.id;
  });
  revalidatePath('/admin/products');
  return { ok: true, id: newId };
}

export async function setProductStatus(id: number, status: 'active' | 'draft' | 'archived') {
  await assertAdmin();
  const db = await getDb();
  await db.update(products).set({ status, updatedAt: new Date() }).where(eq(products.id, id));
  revalidatePath('/', 'layout');
}

export async function deleteProduct(id: number) {
  await assertAdmin({ adminOnly: true });
  const db = await getDb();
  await db.delete(products).where(eq(products.id, id));
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function bulkStatus(ids: number[], status: 'active' | 'draft' | 'archived') {
  await assertAdmin();
  if (!ids.length) return;
  const db = await getDb();
  await db.update(products).set({ status, updatedAt: sql`now()` }).where(inArray(products.id, ids.slice(0, 200)));
  revalidatePath('/', 'layout');
}
