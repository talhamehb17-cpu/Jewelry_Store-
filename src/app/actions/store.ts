'use server';

import { cookies } from 'next/headers';
import { refresh } from 'next/cache';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { contactMessages, newsletterSubscribers, orderItems, orders, reviews } from '@/db/schema';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { isThemeId } from '@/themes/engine';
import { VISITOR_THEME_COOKIE } from '@/lib/theme-server';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export type ActionResult = { ok: boolean; message: string; fieldErrors?: Record<string, string> };

const email = z.string().trim().toLowerCase().email('Please enter a valid email address.').max(255);

export async function subscribeNewsletter(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = email.safeParse(form.get('email'));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  if (!rateLimit(`nl:${await clientIp()}`, 8, 60_000)) return { ok: false, message: 'Too many attempts. Please try again in a minute.' };
  const source = String(form.get('source') || 'footer').slice(0, 60);
  const db = await getDb();
  await db.insert(newsletterSubscribers).values({ email: parsed.data, source }).onConflictDoNothing();
  return { ok: true, message: 'Welcome to the Aurelle Circle! Use code WELCOME10 for 10% off your first order.' };
}

export async function setVisitorTheme(themeId: string | null) {
  const jar = await cookies();
  if (!themeId) jar.set(VISITOR_THEME_COOKIE, '', { path: '/', maxAge: 0 });
  else if (isThemeId(themeId)) {
    const crossSite = process.env.COOKIE_CROSS_SITE === '1';
    jar.set(VISITOR_THEME_COOKIE, themeId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: crossSite ? 'none' : 'lax',
      secure: crossSite || process.env.NODE_ENV === 'production',
      partitioned: crossSite || undefined,
    });
  }
  refresh();
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
  return { ok: true, message: 'Thank you for reaching out — our client care team will reply within one working day.' };
}

const reviewSchema = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, 'Please choose a rating.').max(5),
  title: z.string().trim().max(200).optional().or(z.literal('')),
  body: z.string().trim().min(10, 'Please share a few more words (10+ characters).').max(3000),
  name: z.string().trim().min(2, 'Please enter your name.').max(80),
  email: email.optional().or(z.literal('')),
});

export async function submitReview(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, message: 'Please check the highlighted fields.', fieldErrors };
  }
  if (!rateLimit(`review:${await clientIp()}`, 5, 10 * 60_000)) return { ok: false, message: 'Too many reviews submitted. Please try again later.' };
  const user = await getCurrentUser();
  const db = await getDb();
  let verified = false;
  if (user) {
    const bought = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.userId, user.id), eq(orderItems.productId, parsed.data.productId), eq(orders.status, 'delivered')))
      .limit(1);
    verified = bought.length > 0;
  }
  const settings = await getSettings();
  const publish = verified && settings.reviews.autoPublishVerified;
  await db.insert(reviews).values({
    productId: parsed.data.productId,
    userId: user?.id ?? null,
    name: parsed.data.name,
    email: user?.email ?? (parsed.data.email || null),
    rating: parsed.data.rating,
    title: parsed.data.title || null,
    body: parsed.data.body,
    status: publish ? 'published' : 'pending',
    verified,
  });
  if (publish) {
    const { recalcProductRating } = await import('@/lib/reviews');
    await recalcProductRating(parsed.data.productId);
    refresh();
  }
  return { ok: true, message: publish ? 'Thank you! Your review is now live.' : 'Thank you! Your review will appear once our team has approved it.' };
}

export async function notifyBackInStock(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = email.safeParse(form.get('email'));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const product = String(form.get('product') || '').slice(0, 120);
  if (!rateLimit(`bis:${await clientIp()}`, 6, 60_000)) return { ok: false, message: 'Too many attempts. Please try again shortly.' };
  const db = await getDb();
  await db.insert(newsletterSubscribers).values({ email: parsed.data, source: `back-in-stock:${product}` }).onConflictDoNothing();
  return { ok: true, message: 'We’ll email you as soon as it’s back in stock.' };
}
