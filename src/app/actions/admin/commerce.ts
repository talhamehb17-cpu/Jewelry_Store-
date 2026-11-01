'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { and, eq, ne, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { discounts, inventoryMovements, productVariants, reviews, users, contactMessages, newsletterSubscribers } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import { createResetLink } from '@/app/actions/auth';
import { recalcProductRating } from '@/lib/reviews';

type R = { ok: boolean; message: string; data?: string };

/* ----------------------------- customers ----------------------------- */

export async function setCustomerStatus(userId: number, status: 'active' | 'disabled'): Promise<R> {
  const me = await assertAdmin();
  if (me.id === userId) return { ok: false, message: 'You cannot disable your own account.' };
  const db = await getDb();
  await db.update(users).set({ status, tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, userId));
  revalidatePath(`/admin/customers/${userId}`);
  return { ok: true, message: status === 'disabled' ? 'Account disabled and signed out everywhere.' : 'Account enabled.' };
}

export async function setCustomerRole(userId: number, role: 'customer' | 'staff' | 'admin'): Promise<R> {
  const me = await assertAdmin({ adminOnly: true });
  if (me.id === userId) return { ok: false, message: 'You cannot change your own role.' };
  const db = await getDb();
  await db.update(users).set({ role, tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, userId));
  revalidatePath(`/admin/customers/${userId}`);
  return { ok: true, message: `Role changed to ${role}.` };
}

export async function saveCustomerNote(userId: number, notes: string): Promise<R> {
  await assertAdmin();
  const db = await getDb();
  await db.update(users).set({ notes: notes.slice(0, 4000) }).where(eq(users.id, userId));
  revalidatePath(`/admin/customers/${userId}`);
  return { ok: true, message: 'Note saved.' };
}

export async function generateResetLink(userId: number): Promise<R> {
  await assertAdmin();
  const link = await createResetLink(userId);
  return { ok: true, message: 'Reset link created — valid for 60 minutes. Share it securely with the customer.', data: link };
}

/* ----------------------------- inventory ----------------------------- */

export async function adjustStock(variantId: number, mode: 'add' | 'set', amount: number, reason: string, note: string): Promise<R> {
  const me = await assertAdmin();
  if (!Number.isInteger(amount)) return { ok: false, message: 'Enter a whole number.' };
  const allowed = ['restock', 'adjustment', 'damage', 'return', 'count'];
  const why = allowed.includes(reason) ? reason : 'adjustment';
  const db = await getDb();
  const res = await db.transaction(async (tx) => {
    const [v] = await tx.select().from(productVariants).where(eq(productVariants.id, variantId)).for('update');
    if (!v) return null;
    const next = Math.max(0, mode === 'set' ? amount : v.stock + amount);
    if (next === v.stock) return { stock: v.stock, change: 0 };
    await tx.update(productVariants).set({ stock: next }).where(eq(productVariants.id, variantId));
    await tx.insert(inventoryMovements).values({ variantId, productId: v.productId, change: next - v.stock, stockAfter: next, reason: why, note: note.slice(0, 300) || null, actorId: me.id });
    return { stock: next, change: next - v.stock };
  });
  if (!res) return { ok: false, message: 'Variant not found.' };
  revalidatePath('/admin/inventory');
  revalidatePath('/', 'layout');
  return { ok: true, message: res.change === 0 ? 'No change.' : `Stock is now ${res.stock} (${res.change > 0 ? '+' : ''}${res.change}).` };
}

export async function updateVariantMeta(variantId: number, sku: string, threshold: number): Promise<R> {
  await assertAdmin();
  const db = await getDb();
  await db.update(productVariants).set({ sku: sku.trim().slice(0, 80) || null, lowStockThreshold: Math.max(0, Math.min(10000, Math.floor(threshold) || 0)) }).where(eq(productVariants.id, variantId));
  revalidatePath('/admin/inventory');
  return { ok: true, message: 'Saved.' };
}

/* ----------------------------- discounts ----------------------------- */

const discountSchema = z.object({
  id: z.number().int().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, 'Use 3–40 letters, numbers, dashes or underscores.'),
  description: z.string().trim().max(255).optional().default(''),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.coerce.number().min(0).max(10_000_000),
  minOrder: z.coerce.number().min(0).max(100_000_000).default(0),
  appliesTo: z.enum(['all', 'products', 'collections']),
  productIds: z.array(z.number().int()).max(500).default([]),
  collectionIds: z.array(z.number().int()).max(100).default([]),
  startsAt: z.string().optional().default(''),
  endsAt: z.string().optional().default(''),
  usageLimit: z.union([z.literal(''), z.coerce.number().int().min(1)]).optional(),
  oncePerCustomer: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type DiscountInput = z.input<typeof discountSchema>;

export async function saveDiscount(input: DiscountInput): Promise<R> {
  await assertAdmin();
  const parsed = discountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const d = parsed.data;
  if (d.type === 'percentage' && (d.value <= 0 || d.value > 100)) return { ok: false, message: 'Percentage must be between 1 and 100.' };
  if (d.type === 'fixed' && d.value <= 0) return { ok: false, message: 'Enter a discount amount.' };
  const db = await getDb();
  const clash = await db.select({ id: discounts.id }).from(discounts).where(and(eq(sql`upper(${discounts.code})`, d.code), d.id ? ne(discounts.id, d.id) : undefined)).limit(1);
  if (clash.length) return { ok: false, message: `The code ${d.code} already exists.` };
  const toDate = (s: string) => (s ? new Date(s.length === 10 ? `${s}T00:00:00+05:00` : s) : null);
  const values = {
    code: d.code,
    description: d.description || null,
    type: d.type,
    value: d.type === 'percentage' ? Math.round(d.value) : d.type === 'fixed' ? Math.round(d.value * 100) : 0,
    minOrderAmount: Math.round(d.minOrder * 100),
    appliesTo: d.appliesTo,
    productIds: d.appliesTo === 'products' ? d.productIds : [],
    collectionIds: d.appliesTo === 'collections' ? d.collectionIds : [],
    startsAt: toDate(d.startsAt),
    endsAt: d.endsAt ? new Date(d.endsAt.length === 10 ? `${d.endsAt}T23:59:59+05:00` : d.endsAt) : null,
    usageLimit: d.usageLimit === '' || d.usageLimit == null ? null : Number(d.usageLimit),
    oncePerCustomer: d.oncePerCustomer,
    active: d.active,
  };
  if (d.id) await db.update(discounts).set(values).where(eq(discounts.id, d.id));
  else await db.insert(discounts).values(values);
  revalidatePath('/admin/discounts');
  return { ok: true, message: d.id ? 'Discount updated.' : 'Discount created.' };
}

export async function toggleDiscount(id: number, active: boolean) {
  await assertAdmin();
  const db = await getDb();
  await db.update(discounts).set({ active }).where(eq(discounts.id, id));
  revalidatePath('/admin/discounts');
}

export async function deleteDiscount(id: number) {
  await assertAdmin();
  const db = await getDb();
  await db.delete(discounts).where(eq(discounts.id, id));
  revalidatePath('/admin/discounts');
}

/* ------------------------- reviews & messages ------------------------- */

export async function moderateReview(id: number, status: 'published' | 'hidden' | 'delete') {
  await assertAdmin();
  const db = await getDb();
  const [r] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  if (!r) return;
  if (status === 'delete') await db.delete(reviews).where(eq(reviews.id, id));
  else await db.update(reviews).set({ status }).where(eq(reviews.id, id));
  await recalcProductRating(r.productId);
  revalidatePath('/admin/reviews');
  revalidatePath('/', 'layout');
}

export async function markMessage(id: number, read: boolean | 'delete') {
  await assertAdmin();
  const db = await getDb();
  if (read === 'delete') await db.delete(contactMessages).where(eq(contactMessages.id, id));
  else await db.update(contactMessages).set({ read }).where(eq(contactMessages.id, id));
  revalidatePath('/admin/messages');
}

export async function removeSubscriber(id: number) {
  await assertAdmin();
  const db = await getDb();
  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
  revalidatePath('/admin/messages');
}
