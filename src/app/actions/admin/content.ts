'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { and, eq, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { categories, collectionProducts, collections, pages } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import { saveSetting, type StoreSettings } from '@/lib/settings';
import { slugify } from '@/lib/utils';

type R = { ok: boolean; message: string; id?: number };
const safeMedia = (u: string | null | undefined) => !u || /^(https?:\/\/|\/)/.test(u);

/* ------------------------------- pages ------------------------------- */

const pageSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().max(120).optional().default(''),
  content: z.string().max(100_000),
  template: z.enum(['default', 'about', 'faq', 'contact', 'policy']),
  status: z.enum(['published', 'draft']),
  seoTitle: z.string().trim().max(200).optional().default(''),
  seoDescription: z.string().trim().max(400).optional().default(''),
});

export async function savePage(input: z.input<typeof pageSchema>): Promise<R> {
  await assertAdmin();
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const d = parsed.data;
  const db = await getDb();
  let slug = slugify(d.slug || d.title);
  if (d.id) {
    const [cur] = await db.select().from(pages).where(eq(pages.id, d.id)).limit(1);
    if (cur?.system) slug = cur.slug; // system page URLs are fixed
  }
  const clash = await db.select({ id: pages.id }).from(pages).where(and(eq(pages.slug, slug), d.id ? ne(pages.id, d.id) : undefined)).limit(1);
  if (clash.length) return { ok: false, message: `A page with the URL “${slug}” already exists.` };
  const values = { title: d.title, slug, content: d.content, template: d.template, status: d.status, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null, updatedAt: new Date() };
  let id = d.id;
  if (id) await db.update(pages).set(values).where(eq(pages.id, id));
  else id = (await db.insert(pages).values(values).returning({ id: pages.id }))[0]!.id;
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Page saved.', id };
}

export async function deletePage(id: number): Promise<R> {
  await assertAdmin();
  const db = await getDb();
  const [p] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!p) return { ok: false, message: 'Page not found.' };
  if (p.system) return { ok: false, message: 'System pages cannot be deleted — set them to draft instead.' };
  await db.delete(pages).where(eq(pages.id, id));
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Page deleted.' };
}

/* ---------------------------- collections ---------------------------- */

const collectionSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional().default(''),
  description: z.string().trim().max(2000).optional().default(''),
  image: z.string().trim().max(1000).optional().default(''),
  rule: z.enum(['manual', 'new', 'bestsellers', 'sale', 'category']),
  ruleValue: z.string().trim().max(120).optional().default(''),
  featured: z.boolean().default(false),
  status: z.enum(['active', 'hidden']),
  seoTitle: z.string().trim().max(200).optional().default(''),
  seoDescription: z.string().trim().max(400).optional().default(''),
  productIds: z.array(z.number().int()).max(500).default([]),
});

export async function saveCollection(input: z.input<typeof collectionSchema>): Promise<R> {
  await assertAdmin();
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const d = parsed.data;
  if (!safeMedia(d.image)) return { ok: false, message: 'Image URL must start with https:// or /' };
  if (d.rule === 'category' && !d.ruleValue) return { ok: false, message: 'Choose a category for this collection.' };
  const db = await getDb();
  const slug = slugify(d.slug || d.name);
  const clash = await db.select({ id: collections.id }).from(collections).where(and(eq(collections.slug, slug), d.id ? ne(collections.id, d.id) : undefined)).limit(1);
  if (clash.length) return { ok: false, message: `The URL “${slug}” is already used.` };
  const values = { name: d.name, slug, description: d.description || null, image: d.image || null, rule: d.rule, ruleValue: d.rule === 'category' ? d.ruleValue : null, featured: d.featured, status: d.status, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null };
  const id = await db.transaction(async (tx) => {
    let cid = d.id;
    if (cid) await tx.update(collections).set(values).where(eq(collections.id, cid));
    else cid = (await tx.insert(collections).values({ ...values, position: 99 }).returning({ id: collections.id }))[0]!.id;
    if (d.rule === 'manual') {
      await tx.delete(collectionProducts).where(eq(collectionProducts.collectionId, cid));
      if (d.productIds.length) await tx.insert(collectionProducts).values(d.productIds.map((p, i) => ({ collectionId: cid!, productId: p, position: i })));
    }
    return cid;
  });
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Collection saved.', id };
}

export async function deleteCollection(id: number): Promise<R> {
  await assertAdmin();
  const db = await getDb();
  await db.delete(collections).where(eq(collections.id, id));
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Collection deleted.' };
}

/* ----------------------------- categories ---------------------------- */

const categorySchema = z.object({ id: z.number().int().optional(), name: z.string().trim().min(2).max(120), slug: z.string().trim().max(120).optional().default(''), description: z.string().trim().max(1000).optional().default(''), image: z.string().trim().max(1000).optional().default(''), position: z.coerce.number().int().min(0).max(999).default(0) });

export async function saveCategory(input: z.input<typeof categorySchema>): Promise<R> {
  await assertAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const d = parsed.data;
  if (!safeMedia(d.image)) return { ok: false, message: 'Image URL must start with https:// or /' };
  const db = await getDb();
  const slug = slugify(d.slug || d.name);
  const clash = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.slug, slug), d.id ? ne(categories.id, d.id) : undefined)).limit(1);
  if (clash.length) return { ok: false, message: `The URL “${slug}” is already used.` };
  const values = { name: d.name, slug, description: d.description || null, image: d.image || null, position: d.position };
  if (d.id) await db.update(categories).set(values).where(eq(categories.id, d.id));
  else await db.insert(categories).values(values);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Category saved.' };
}

export async function deleteCategory(id: number): Promise<R> {
  await assertAdmin();
  const db = await getDb();
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Category deleted. Its products are now uncategorised.' };
}

/* ------------------------------ settings ----------------------------- */

const SETTINGS_KEYS = ['store', 'shipping', 'payments', 'tax', 'social', 'navigation', 'search', 'seo', 'reviews', 'theme'] as const;

export async function saveSettingsSection<K extends (typeof SETTINGS_KEYS)[number]>(key: K, value: StoreSettings[K]): Promise<R> {
  await assertAdmin({ adminOnly: true });
  if (!SETTINGS_KEYS.includes(key)) return { ok: false, message: 'Unknown settings section.' };
  if (value == null || typeof value !== 'object') return { ok: false, message: 'Invalid settings.' };
  const json = JSON.stringify(value);
  if (json.length > 50_000) return { ok: false, message: 'Settings payload too large.' };
  if (key === 'navigation') {
    const nav = value as StoreSettings['navigation'];
    const links = [...nav.main.flatMap((m) => [m.href, ...(m.children ?? []).map((c) => c.href)]), ...nav.footer.flatMap((c) => c.links.map((l) => l.href))];
    if (links.some((h) => !/^(\/|https?:\/\/|mailto:|tel:)/.test(h))) return { ok: false, message: 'Menu links must start with /, https://, mailto: or tel:' };
  }
  if (key === 'shipping') {
    const s = value as StoreSettings['shipping'];
    if (!s.methods.some((m) => m.enabled)) return { ok: false, message: 'Enable at least one shipping method.' };
  }
  await saveSetting(key, value);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Settings saved.' };
}
