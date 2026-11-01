'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { addresses, orderItems } from '@/db/schema';
import { createOrder, OrderError, orderAccessToken } from '@/lib/orders';
import { buildQuote } from '@/lib/pricing';
import { getCurrentUser } from '@/lib/auth';
import { getSettings, stripeConfigured } from '@/lib/settings';
import { createCheckoutSession, cancelUnpaidCardOrder } from '@/lib/stripe';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { orderConfirmationEmail, sendEmail } from '@/lib/email';
import { formatMoney } from '@/lib/money';
import { PROVINCES, siteUrl } from '@/lib/utils';

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+92|0092|92|0)?3\d{9}$/.test(v) || /^\+?\d{10,15}$/.test(v), 'Enter a valid mobile number, e.g. 0300 1234567.');

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(255),
  phone,
  firstName: z.string().trim().min(1, 'First name is required.').max(100),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100),
  line1: z.string().trim().min(4, 'Enter your street address.').max(255),
  line2: z.string().trim().max(255).optional().default(''),
  city: z.string().trim().min(2, 'City is required.').max(100),
  province: z.string().refine((v) => (PROVINCES as readonly string[]).includes(v), 'Select a province.'),
  postalCode: z.string().trim().max(20).optional().default(''),
  shippingMethod: z.string().max(40),
  paymentMethod: z.enum(['cod', 'bank', 'wallet', 'card']),
  paymentRef: z.string().trim().max(120).optional().default(''),
  discountCode: z.string().trim().max(60).optional().default(''),
  note: z.string().trim().max(1000).optional().default(''),
  saveAddress: z.boolean().optional().default(false),
  lines: z.array(z.object({ variantId: z.number().int().positive(), quantity: z.number().int().min(1).max(20) })).min(1, 'Your bag is empty.').max(50),
});

export type CheckoutInput = z.input<typeof schema>;
export type CheckoutResult = { ok: true; redirect: string; external?: boolean } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : siteUrl();
}

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: 'Please check the highlighted fields.', fieldErrors };
  }
  const d = parsed.data;
  if (!rateLimit(`checkout:${await clientIp()}`, 12, 10 * 60_000)) return { ok: false, error: 'Too many checkout attempts. Please wait a few minutes and try again.' };

  const settings = await getSettings();
  const pm = settings.payments;
  if (d.paymentMethod === 'cod' && !pm.cod.enabled) return { ok: false, error: 'Cash on Delivery is currently unavailable.' };
  if (d.paymentMethod === 'bank' && !pm.bank.enabled) return { ok: false, error: 'Bank transfer is currently unavailable.' };
  if (d.paymentMethod === 'wallet' && !pm.wallet.enabled) return { ok: false, error: 'Mobile wallet payments are currently unavailable.' };
  if (d.paymentMethod === 'card' && !(pm.card.enabled && stripeConfigured())) return { ok: false, error: 'Card payments are not available yet. Please choose another payment method.' };

  const user = await getCurrentUser();
  const quote = await buildQuote({ lines: d.lines, discountCode: d.discountCode || null, shippingMethod: d.shippingMethod, paymentMethod: d.paymentMethod, email: d.email, userId: user?.id });
  if (d.paymentMethod === 'cod' && pm.cod.maxOrder && quote.total > pm.cod.maxOrder) {
    return { ok: false, error: `Cash on Delivery is available for orders up to ${formatMoney(pm.cod.maxOrder)}. Please choose bank transfer or a wallet.` };
  }

  let order;
  try {
    order = await createOrder({
      lines: d.lines,
      email: d.email,
      phone: d.phone,
      address: { firstName: d.firstName, lastName: d.lastName, phone: d.phone, line1: d.line1, line2: d.line2 || null, city: d.city, province: d.province, postalCode: d.postalCode || null, country: 'Pakistan' },
      shippingMethod: d.shippingMethod,
      paymentMethod: d.paymentMethod,
      paymentRef: d.paymentMethod === 'bank' || d.paymentMethod === 'wallet' ? d.paymentRef || null : null,
      discountCode: d.discountCode || null,
      customerNote: d.note || null,
      userId: user?.id ?? null,
    });
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    console.error('createOrder failed', e);
    return { ok: false, error: 'We could not place your order. Please try again.' };
  }

  const db = await getDb();
  if (user && d.saveAddress) {
    const existing = await db.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.userId, user.id), eq(addresses.line1, d.line1), eq(addresses.city, d.city))).limit(1);
    if (!existing.length) {
      const hasAny = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, user.id)).limit(1);
      await db.insert(addresses).values({ userId: user.id, label: 'Home', firstName: d.firstName, lastName: d.lastName, phone: d.phone, line1: d.line1, line2: d.line2 || null, city: d.city, province: d.province, postalCode: d.postalCode || null, isDefault: !hasAny.length });
    }
  }

  const base = await origin();
  const token = orderAccessToken(order.number);
  const link = `${base}/checkout/success?order=${encodeURIComponent(order.number)}&token=${token}`;

  if (d.paymentMethod === 'card') {
    try {
      const session = await createCheckoutSession(order, base);
      return { ok: true, redirect: session.url!, external: true };
    } catch (e) {
      console.error('Stripe session failed', e);
      await cancelUnpaidCardOrder(order.id, 'Payment session could not be created');
      return { ok: false, error: 'We could not start the secure card payment. Please try again or choose another payment method.' };
    }
  }

  after(async () => {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    await sendEmail(order.email, `Your Maison Aurelle order ${order.number}`, orderConfirmationEmail(order, items, link));
  });
  return { ok: true, redirect: `/checkout/success?order=${encodeURIComponent(order.number)}&token=${token}` };
}
