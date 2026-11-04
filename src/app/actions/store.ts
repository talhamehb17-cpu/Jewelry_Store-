'use server';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { refresh } from 'next/cache';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/db';
import { contactMessages, newsletterSubscribers, products, reviews, users } from '@/db/schema';
import { listSubscriberOffers, type SubscriberOffer } from '@/lib/subscriber-offers';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { isThemeId } from '@/themes/engine';
import { VISITOR_THEME_COOKIE } from '@/lib/theme-server';
import { getCurrentUser } from '@/lib/auth';
import { savePublicImage } from '@/lib/image-upload';
import { eligiblePurchases } from '@/lib/reviews';

export type ActionResult = { ok: boolean; message: string; fieldErrors?: Record<string, string>; offers?: SubscriberOffer[] };

const email = z.string().trim().toLowerCase().email('Please enter a valid email address.').max(255);

export async function subscribeNewsletter(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = email.safeParse(form.get('email'));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  if (!rateLimit(`nl:${await clientIp()}`, 8, 60_000)) return { ok: false, message: 'Too many attempts. Please try again in a minute.' };
  const source = String(form.get('source') || 'footer').slice(0, 60);
  const db = await getDb();
  await db
    .insert(newsletterSubscribers)
    .values({ email: parsed.data, source, status: 'subscribed', token: crypto.randomBytes(24).toString('hex') })
    .onConflictDoUpdate({ target: newsletterSubscribers.email, set: { status: 'subscribed', unsubscribedAt: null, source } });
  const offers = await listSubscriberOffers(parsed.data);
  return {
    ok: true,
    offers,
    message: offers.length
      ? 'You are subscribed. Current subscriber offers are below. A future code appears here and in your account when it becomes active — you do not need to subscribe again.'
      : 'You are subscribed. There is no active subscriber code right now. A future code will appear here and in your account when it becomes active.',
  };
}

export async function lookupSubscriberOffers(emailInput: string): Promise<ActionResult> {
  const parsed = email.safeParse(emailInput);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message, offers: [] };
  if (!rateLimit(`offers:${await clientIp()}`, 12, 60_000)) return { ok: false, message: 'Too many attempts. Please try again in a minute.', offers: [] };
  const offers = await listSubscriberOffers(parsed.data);
  return {
    ok: true,
    offers,
    message: offers.length ? 'Current subscriber offers for this email.' : 'There are no active subscriber offers for that email right now.',
  };
}

export async function setVisitorTheme(themeId: string | null) {
  const value = themeId && isThemeId(themeId) ? themeId : null;
  const jar = await cookies();
  const crossSite = process.env.COOKIE_CROSS_SITE === '1';
  jar.set(VISITOR_THEME_COOKIE, value ?? '', {
    path: '/',
    maxAge: value ? 60 * 60 * 24 * 365 : 0,
    sameSite: crossSite ? 'none' : 'lax',
    secure: crossSite || process.env.NODE_ENV === 'production',
    partitioned: crossSite || undefined,
  });
  const user = await getCurrentUser();
  if (user) {
    const db = await getDb();
    await db.update(users).set({ themePreference: value }).where(eq(users.id, user.id));
  }
}

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  email,
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  subject: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Please write a little more (10+ characters).').max(4000),
});

export async function submitContact(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, message: 'Please check the highlighted fields.', fieldErrors };
  }
  if (form.get('company')) return { ok: true, message: 'Thank you — we’ll be in touch shortly.' }; // honeypot
  if (!rateLimit(`contact:${await clientIp()}`, 4, 10 * 60_000)) return { ok: false, message: 'Too many messages. Please try again later.' };
  const db = await getDb();
  await db.insert(contactMessages).values({ ...parsed.data, phone: parsed.data.phone || null, subject: parsed.data.subject || null });
  const { sendEmail } = await import('@/lib/email');
  const { brandEmailLayout } = await import('@/lib/mailer');
  const mail = await sendEmail(
    parsed.data.email,
    'We received your message — EVERMOON',
    brandEmailLayout('Message received', `<p>Thank you, ${parsed.data.name}. Client care has your note and will reply within one working day when the mailbox is working.</p>`),
    'contact-confirmation',
  );
  return {
    ok: true,
    message: mail.sent
      ? 'Thank you. Your message is saved and a confirmation was accepted by the mail server.'
      : 'Thank you. Your message is saved. A confirmation email was not accepted — client care still has it.',
  };
}

const reviewSchema = z.object({
  productId: z.coerce.number().int().positive(),
  orderId: z.coerce.number().int().positive().optional(),
  rating: z.coerce.number().int().min(1, 'Please choose a rating.').max(5),
  title: z.string().trim().max(200).optional().or(z.literal('')),
  body: z.string().trim().min(10, 'Please share a few more words (10+ characters).').max(3000),
  name: z.string().trim().min(2, 'Please enter your name.').max(80),
});

function clean(value: string) {
  return value.replace(/<[^>]*>/g, '').trim();
}

export async function submitReview(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Sign in to review a piece from an order that has been delivered to you.' };
  const parsed = reviewSchema.safeParse({
    productId: form.get('productId'),
    orderId: form.get('orderId') || undefined,
    rating: form.get('rating'),
    title: form.get('title'),
    body: form.get('body'),
    name: form.get('name'),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: 'Please check the highlighted fields.', fieldErrors };
  }
  if (!rateLimit(`review:${user.id}`, 5, 10 * 60_000)) return { ok: false, message: 'Too many reviews submitted. Please try again later.' };
  const purchases = await eligiblePurchases(user.id, user.email, parsed.data.productId);
  const purchase = parsed.data.orderId ? purchases.find((item) => item.orderId === parsed.data.orderId) : purchases[0];
  if (!purchase) {
    return { ok: false, message: parsed.data.orderId ? 'That order cannot be reviewed from this account.' : 'Reviews open only after this piece is in an order marked delivered, and only once for that purchase.' };
  }
  const avatar = await savePublicImage(form.get('avatar'), 'avatars');
  if ('error' in avatar) return { ok: false, message: avatar.error || 'Could not save the profile picture.' };
  const photo = await savePublicImage(form.get('photo'), 'reviews');
  if ('error' in photo) return { ok: false, message: photo.error || 'Could not save the review photo.' };
  const db = await getDb();
  if (avatar.url && form.get('saveAvatar') === 'on') {
    await db.update(users).set({ avatar: avatar.url }).where(eq(users.id, user.id));
  }
  try {
    await db.insert(reviews).values({
      productId: parsed.data.productId,
      userId: user.id,
      orderId: purchase.orderId,
      orderItemId: purchase.itemId,
      name: clean(parsed.data.name),
      email: user.email,
      rating: parsed.data.rating,
      title: clean(parsed.data.title || '') || null,
      body: clean(parsed.data.body),
      avatar: avatar.url || user.avatar || null,
      photo: photo.url,
      status: 'pending',
      verified: true,
    });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
    if (code === '23505' || (error instanceof Error && /unique|duplicate/i.test(error.message))) {
      return { ok: false, message: 'You have already reviewed this purchase.' };
    }
    throw error;
  }
  const [product] = await db.select({ slug: products.slug }).from(products).where(eq(products.id, parsed.data.productId)).limit(1);
  revalidatePath('/admin/reviews');
  revalidatePath('/account/reviews');
  if (product) revalidatePath(`/products/${product.slug}`);
  refresh();
  return { ok: true, message: 'Thank you. Your review is saved and will appear on this product page and the homepage after it is approved.' };
}

export async function notifyBackInStock(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = email.safeParse(form.get('email'));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const product = String(form.get('product') || '').slice(0, 120);
  if (!rateLimit(`bis:${await clientIp()}`, 6, 60_000)) return { ok: false, message: 'Too many attempts. Please try again shortly.' };
  const db = await getDb();
  await db
    .insert(newsletterSubscribers)
    .values({ email: parsed.data, source: `back-in-stock:${product}`, status: 'subscribed', token: crypto.randomBytes(24).toString('hex') })
    .onConflictDoUpdate({ target: newsletterSubscribers.email, set: { status: 'subscribed', unsubscribedAt: null } });
  return { ok: true, message: 'We’ll email you as soon as it’s back in stock.' };
}
