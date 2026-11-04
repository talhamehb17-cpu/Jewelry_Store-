import crypto from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { getDb } from '@/db';
import { productVariants, products, reviews, settings, users } from '@/db/schema';
import { hashPassword } from '@/lib/auth';
import { changeOrderStatus, createOrder } from '@/lib/orders';
import { recalcProductRating } from '@/lib/reviews';
import { storeBlob } from '@/lib/blob-media';

const TOKEN_KEY = 'review_check_token';
const RUN_KEY = 'review_check_run';
const PRODUCT_SLUG = 'celeste-pearl-earrings';

type TokenRecord = { hash?: string; expiresAt?: number };
type RunRecord = {
  email: string;
  approvedOrder: string;
  rejectedOrder: string;
  approvedId: number;
  rejectedId: number;
  approvedBody: string;
  rejectedBody: string;
  avatar: string | null;
  approved: boolean;
  rejected: boolean;
};

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function readToken() {
  const db = await getDb();
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, TOKEN_KEY)).limit(1);
  return (row?.value ?? null) as TokenRecord | null;
}

export async function reviewCheckAuthorised(token: string | null) {
  if (!token || token.length < 32) return false;
  const saved = await readToken();
  if (!saved?.hash || (saved.expiresAt && saved.expiresAt < Date.now())) return false;
  const given = hashToken(token);
  if (given.length !== saved.hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(saved.hash));
}

async function readRun() {
  const db = await getDb();
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, RUN_KEY)).limit(1);
  return (row?.value ?? null) as RunRecord | null;
}

async function saveRun(value: RunRecord) {
  const db = await getDb();
  await db.insert(settings).values({ key: RUN_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));

async function deliver(orderId: number) {
  await changeOrderStatus(orderId, 'confirmed', 'review-check', { source: 'admin', actorType: 'admin', note: 'Review display check' });
  await changeOrderStatus(orderId, 'processing', 'review-check', { source: 'admin', actorType: 'admin', note: 'Review display check' });
  await changeOrderStatus(orderId, 'delivered', 'review-check', { source: 'admin', actorType: 'admin', confirmDelivery: true, note: 'Review display check' });
}

export async function prepareReviewCheck() {
  const existing = await readRun();
  if (existing) return { created: false, ...existing, slug: PRODUCT_SLUG };
  const db = await getDb();
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, PRODUCT_SLUG)).limit(1);
  if (!product) throw new Error('The Celeste product is not in the catalogue.');
  const [variant] = await db.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.productId, product.id), gt(productVariants.stock, 1))).limit(1);
  if (!variant) throw new Error('Celeste does not have two units in stock, so the check was not started.');
  const stamp = Date.now().toString(36);
  const email = `review.check.${stamp}@example.com`;
  const [buyer] = await db.insert(users).values({
    email,
    passwordHash: await hashPassword(`ReviewCheck#${stamp}1a`),
    firstName: 'Review',
    lastName: 'Check',
    role: 'customer',
    acceptsMarketing: false,
  }).returning();
  let avatar: string | null = null;
  try {
    avatar = (await storeBlob({ bytes: png, contentType: 'image/png', folder: 'avatars', filename: 'review-check.png' })).url;
  } catch {
    avatar = null;
  }
  const address = { firstName: 'Review', lastName: 'Check', phone: '03001234567', line1: 'Review check lane', city: 'Lahore', province: 'Punjab', country: 'Pakistan' };
  const approvedOrder = await createOrder({
    lines: [{ variantId: variant.id, quantity: 1 }],
    email,
    phone: '03001234567',
    address,
    shippingMethod: 'standard',
    paymentMethod: 'cod',
    customerNote: `Review display check ${stamp}. Not a customer sale.`,
    userId: buyer!.id,
  });
  await deliver(approvedOrder.id);
  const rejectedOrder = await createOrder({
    lines: [{ variantId: variant.id, quantity: 1 }],
    email,
    phone: '03001234567',
    address,
    shippingMethod: 'standard',
    paymentMethod: 'cod',
    customerNote: `Rejected review check ${stamp}. Not a customer sale.`,
    userId: buyer!.id,
  });
  await deliver(rejectedOrder.id);
  const approvedBody = `The pearl sits lightly and the gold hook is comfortable. Live check ${stamp}.`;
  const rejectedBody = `This note must stay hidden from the product page. Live check ${stamp}.`;
  const [approved] = await db.insert(reviews).values({
    productId: product.id,
    userId: buyer!.id,
    orderId: approvedOrder.id,
    name: 'Review Check',
    email,
    rating: 5,
    title: `Checked ${stamp}`,
    body: approvedBody,
    avatar,
    status: 'pending',
    verified: true,
  }).returning({ id: reviews.id });
  const [rejected] = await db.insert(reviews).values({
    productId: product.id,
    userId: buyer!.id,
    orderId: rejectedOrder.id,
    name: 'Review Check',
    email,
    rating: 2,
    title: `Hidden ${stamp}`,
    body: rejectedBody,
    avatar,
    status: 'pending',
    verified: true,
  }).returning({ id: reviews.id });
  const run: RunRecord = {
    email,
    approvedOrder: approvedOrder.number,
    rejectedOrder: rejectedOrder.number,
    approvedId: approved!.id,
    rejectedId: rejected!.id,
    approvedBody,
    rejectedBody,
    avatar,
    approved: false,
    rejected: false,
  };
  await saveRun(run);
  return { created: true, slug: PRODUCT_SLUG, ...run };
}

export async function approveReviewCheck() {
  const run = await readRun();
  if (!run) throw new Error('The review check has not been prepared.');
  const db = await getDb();
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, PRODUCT_SLUG)).limit(1);
  if (!product) throw new Error('The Celeste product is not in the catalogue.');
  await db.update(reviews).set({ status: 'published' }).where(and(eq(reviews.id, run.approvedId), eq(reviews.productId, product.id), eq(reviews.email, run.email)));
  await recalcProductRating(product.id);
  const next = { ...run, approved: true };
  await saveRun(next);
  return { slug: PRODUCT_SLUG, ...next };
}

export async function rejectReviewCheck() {
  const run = await readRun();
  if (!run) throw new Error('The review check has not been prepared.');
  const db = await getDb();
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, PRODUCT_SLUG)).limit(1);
  if (!product) throw new Error('The Celeste product is not in the catalogue.');
  await db.update(reviews).set({ status: 'hidden' }).where(and(eq(reviews.id, run.rejectedId), eq(reviews.productId, product.id), eq(reviews.email, run.email)));
  await recalcProductRating(product.id);
  const next = { ...run, rejected: true };
  await saveRun(next);
  return { slug: PRODUCT_SLUG, ...next };
}

export async function finishReviewCheck() {
  const db = await getDb();
  await db.delete(settings).where(eq(settings.key, TOKEN_KEY));
  return { closed: true };
}
