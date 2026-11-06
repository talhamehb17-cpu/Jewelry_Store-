'use server';

import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { addresses, orderItems, paymentProofs } from '@/db/schema';
import { changeOrderStatus, createOrder, OrderError, orderAccessToken } from '@/lib/orders';
import { buildQuote } from '@/lib/pricing';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { orderConfirmationEmail, sendEmail } from '@/lib/email';
import { formatMoney } from '@/lib/money';
import { CURRENCY_COOKIE, getRateBook, isCurrency } from '@/lib/currency';
import { isManualMethod } from '@/lib/payments';
import { methodAllowedForQuote } from '@/lib/shopping-rules';
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
  paymentMethod: z.enum(['cod', 'bank', 'wallet', 'easypaisa', 'jazzcash', 'card']),
  paymentRef: z.string().trim().max(120).optional().default(''),
  proofToken: z.string().trim().max(80).optional().default(''),
  discountCode: z.string().trim().max(60).optional().default(''),
  note: z.string().trim().max(1000).optional().default(''),
  saveAddress: z.boolean().optional().default(false),
  lines: z.array(z.object({ variantId: z.number().int().positive(), quantity: z.number().int().min(1).max(20), giftPackaging: z.boolean().optional(), giftImageId: z.string().max(40).nullish() })).min(1, 'Your bag is empty.').max(50),
});

export type CheckoutInput = z.input<typeof schema>;
export type CheckoutResult = { ok: true; redirect: string; external?: boolean } | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function displaySnapshot() {
  const code = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (!isCurrency(code) || code === 'PKR') return { displayCurrency: 'PKR', displayRate: 1 };
  const book = await getRateBook();
  const rate = book.rates[code];
  if (!rate || rate <= 0) return { displayCurrency: 'PKR', displayRate: 1 };
  return { displayCurrency: code, displayRate: rate };
}

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
  if (d.paymentMethod === 'easypaisa' && !pm.easypaisa?.enabled) return { ok: false, error: 'EasyPaisa is currently unavailable.' };
  if (d.paymentMethod === 'jazzcash' && !pm.jazzcash?.enabled) return { ok: false, error: 'JazzCash is currently unavailable.' };
  if (d.paymentMethod === 'wallet') return { ok: false, error: 'Choose EasyPaisa or JazzCash.' };
  if (d.paymentMethod === 'card') return { ok: false, error: 'Card payments are not available. Please choose Cash on Delivery, EasyPaisa, JazzCash or bank transfer.' };

  const user = await getCurrentUser();
  const db = await getDb();
  const quote = await buildQuote({ lines: d.lines, discountCode: d.discountCode || null, shippingMethod: d.shippingMethod, paymentMethod: d.paymentMethod, email: d.email, userId: user?.id });
  if (quote.checkoutBlock) return { ok: false, error: quote.checkoutBlock };
  if (quote.highValue.applied && !methodAllowedForQuote(d.paymentMethod, quote.highValue)) {
    return { ok: false, error: 'This order needs an advance by EasyPaisa, JazzCash or bank transfer. Cash on Delivery covers only the remaining balance.' };
  }
  if (!quote.highValue.applied && d.paymentMethod === 'cod' && pm.cod.maxOrder && quote.total > pm.cod.maxOrder) {
    return { ok: false, error: `Cash on Delivery is available for orders up to ${formatMoney(pm.cod.maxOrder)}. Please choose EasyPaisa, JazzCash or bank transfer.` };
  }
  const slipRequired = quote.highValue.applied ? quote.highValue.requireSlip : isManualMethod(d.paymentMethod);
  if (slipRequired && !d.proofToken) return { ok: false, error: 'Upload a payment receipt before placing the order. The upload does not confirm the payment.' };
  let proofId: number | null = null;
  if (d.proofToken && isManualMethod(d.paymentMethod)) {
    const [proof] = await db.select({ id: paymentProofs.id, orderId: paymentProofs.orderId }).from(paymentProofs).where(eq(paymentProofs.token, d.proofToken)).limit(1);
    if (!proof || proof.orderId) return { ok: false, error: 'Upload a payment receipt before placing the order. The upload does not confirm the payment.' };
    proofId = proof.id;
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
      paymentRef: isManualMethod(d.paymentMethod) ? d.paymentRef || null : null,
      discountCode: d.discountCode || null,
      customerNote: d.note || null,
      userId: user?.id ?? null,
      ...(await displaySnapshot()),
    });
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    console.error('createOrder failed', e);
    return { ok: false, error: 'We could not place your order. Please try again.' };
  }

  if (proofId) {
    const linked = await db.update(paymentProofs).set({ orderId: order.id }).where(and(eq(paymentProofs.id, proofId), sql`order_id is null`)).returning({ id: paymentProofs.id });
    if (!linked.length) {
      await changeOrderStatus(order.id, 'cancelled', 'system', { note: 'Payment receipt could not be attached' }).catch(() => undefined);
      return { ok: false, error: 'That receipt was already used. Please upload it again.' };
    }
  }

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

  let emailSent = false;
  let emailNote = 'Confirmation email is still pending. The order is saved.';
  try {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const mail = await Promise.race([
      sendEmail(order.email, `Your EVERMOON order ${order.number}`, orderConfirmationEmail(order, items, link), 'order-confirmation', { orderId: order.id }),
      new Promise<{ sent: false; reason: string }>((resolve) => setTimeout(() => resolve({ sent: false, reason: 'The mail server did not answer within 20 seconds.' }), 20_000)),
    ]);
    emailSent = mail.sent;
    emailNote = mail.sent ? 'The mail server accepted the confirmation.' : `Confirmation email was not accepted: ${mail.reason || 'not sent'}. The order is saved.`;
  } catch (error) {
    emailNote = `Confirmation email failed: ${error instanceof Error ? error.message : 'unknown error'}. The order is saved.`;
  }
  const flag = emailSent ? 'sent' : 'pending';
  return { ok: true, redirect: `/checkout/success?order=${encodeURIComponent(order.number)}&token=${token}&email=${flag}&note=${encodeURIComponent(emailNote)}` };
}
