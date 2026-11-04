'use server';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { z } from 'zod';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { addresses, orders, passwordResetTokens, users } from '@/db/schema';
import { createSession, destroySession, getCurrentUser, hashPassword, isStaff, logoutDestination, passwordProblems, verifyPassword } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { resetEmail, sendEmail } from '@/lib/email';
import { savePublicImage } from '@/lib/image-upload';
import { PROVINCES, siteUrl } from '@/lib/utils';
import { isThemeId } from '@/themes/engine';
import { VISITOR_THEME_COOKIE } from '@/lib/theme-server';

/** A guest look follows the person into their account, without touching anyone else's preference or the store default. */
async function adoptGuestTheme(userId: number) {
  const pick = (await cookies()).get(VISITOR_THEME_COOKIE)?.value;
  if (!isThemeId(pick)) return;
  const db = await getDb();
  await db.update(users).set({ themePreference: pick }).where(and(eq(users.id, userId), isNull(users.themePreference)));
}

export type FormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> } | null;

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(255);
const errs = (issues: z.core.$ZodIssue[]) => {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message;
  return out;
};
const safeNext = (n: unknown, fallback: string) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : fallback);

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.').max(200) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: 'Please check the highlighted fields.', fieldErrors: errs(parsed.error.issues) };
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 12, 10 * 60_000)) return { message: 'Too many sign-in attempts. Please wait a few minutes.' };
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const generic = 'Incorrect email or password.';
  if (!u) {
    await verifyPassword(parsed.data.password, '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Bm8c8Q2r5uSxb8ZJ3V8d0eCiMt6.'); // equalise timing
    return { message: generic };
  }
  if (u.lockedUntil && u.lockedUntil > new Date()) {
    const mins = Math.ceil((+u.lockedUntil - Date.now()) / 60000);
    return { message: `Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}, or reset your password.` };
  }
  const ok = await verifyPassword(parsed.data.password, u.passwordHash);
  if (!ok) {
    const fails = u.failedLogins + 1;
    await db.update(users).set({ failedLogins: fails >= 5 ? 0 : fails, lockedUntil: fails >= 5 ? new Date(Date.now() + 15 * 60_000) : null }).where(eq(users.id, u.id));
    return { message: fails >= 5 ? 'Too many failed attempts — your account is locked for 15 minutes.' : generic };
  }
  if (u.status !== 'active') return { message: 'This account has been disabled. Please contact client care.' };
  await db.update(users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, u.id));
  await adoptGuestTheme(u.id);
  await createSession(u);
  const adminArea = form.get('area') === 'admin';
  if (adminArea && !isStaff(u)) {
    await destroySession();
    return { message: 'This account does not have access to the admin panel.' };
  }
  redirect(safeNext(form.get('next'), isStaff(u) && adminArea ? '/admin' : isStaff(u) ? '/admin' : '/account'));
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(100),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100),
  email: emailSchema,
  password: z.string().max(128),
  marketing: z.string().optional(),
});

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: 'Please check the highlighted fields.', fieldErrors: errs(parsed.error.issues) };
  const pwProblem = passwordProblems(parsed.data.password);
  if (pwProblem) return { message: 'Please choose a stronger password.', fieldErrors: { password: pwProblem } };
  if (!rateLimit(`register:${await clientIp()}`, 6, 30 * 60_000)) return { message: 'Too many accounts created from this network. Please try again later.' };
  const db = await getDb();
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (exists) return { message: 'An account with this email already exists.', fieldErrors: { email: 'Already registered — try signing in.' } };
  const [u] = await db
    .insert(users)
    .values({ email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), firstName: parsed.data.firstName, lastName: parsed.data.lastName, acceptsMarketing: parsed.data.marketing === 'on', lastLoginAt: new Date() })
    .returning();
  // Attach previous guest orders placed with this email.
  await db.update(orders).set({ userId: u!.id }).where(and(eq(sql`lower(${orders.email})`, parsed.data.email), isNull(orders.userId)));
  await adoptGuestTheme(u!.id);
  await createSession(u!);
  redirect(safeNext(form.get('next'), '/account'));
}

export async function logoutAction(form?: FormData): Promise<{ ok: false; message: string } | void> {
  const user = await getCurrentUser().catch(() => null);
  const area = form instanceof FormData ? String(form.get('area') || '') : '';
  const destination = user ? logoutDestination(user.role) : area === 'admin' ? '/admin/login' : '/account/login';
  try {
    if (user) {
      const db = await getDb();
      await db.update(users).set({ tokenVersion: user.tokenVersion + 1 }).where(eq(users.id, user.id));
    }
    await destroySession();
  } catch {
    return { ok: false, message: 'Could not sign out. Your session is still active. Please try again.' };
  }
  redirect(destination);
}

export async function requestResetAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(form.get('email'));
  if (!parsed.success) return { message: parsed.error.issues[0]!.message };
  if (!rateLimit(`reset:${await clientIp()}`, 5, 15 * 60_000)) return { message: 'Too many requests. Please try again later.' };
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.email, parsed.data)).limit(1);
  const generic = 'If an account exists for that email, we’ve sent a reset link. It expires in 60 minutes.';
  if (!u || u.status !== 'active') return { ok: true, message: generic };
  const link = await createResetLink(u.id);
  const res = await sendEmail(u.email, 'Reset your EVERMOON password', resetEmail(link), 'password-reset');
  if (!res.sent) return { ok: true, message: `${generic} (Email delivery isn’t configured on this store yet — please contact client care, who can issue a reset link.)` };
  return { ok: true, message: generic };
}

export async function createResetLink(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  const db = await getDb();
  await db.insert(passwordResetTokens).values({ userId, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60 * 60_000) });
  return `${siteUrl()}/account/reset-password?token=${token}`;
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get('token') || '');
  const password = String(form.get('password') || '');
  const problem = passwordProblems(password);
  if (problem) return { message: problem, fieldErrors: { password: problem } };
  if (password !== form.get('confirm')) return { message: 'Passwords do not match.', fieldErrors: { confirm: 'Passwords do not match.' } };
  const db = await getDb();
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const [t] = await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, hash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1);
  if (!t) return { message: 'This reset link is invalid or has expired. Please request a new one.' };
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, t.id));
  const [u] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), tokenVersion: sql`${users.tokenVersion} + 1`, failedLogins: 0, lockedUntil: null })
    .where(eq(users.id, t.userId))
    .returning();
  await createSession(u!);
  redirect('/account?reset=1');
}

export async function updateAvatarAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect('/account/login');
  const saved = await savePublicImage(form.get('avatar'), 'avatars');
  if ('error' in saved) return { message: saved.error };
  if (!saved.url) return { message: 'Choose a picture first.' };
  const db = await getDb();
  await db.update(users).set({ avatar: saved.url }).where(eq(users.id, user.id));
  refresh();
  return { ok: true, message: 'Profile picture saved.' };
}

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect('/account/login');
  const parsed = z
    .object({ firstName: z.string().trim().min(1, 'Required').max(100), lastName: z.string().trim().min(1, 'Required').max(100), phone: z.string().trim().max(40).optional(), marketing: z.string().optional() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: 'Please check the highlighted fields.', fieldErrors: errs(parsed.error.issues) };
  const db = await getDb();
  await db.update(users).set({ firstName: parsed.data.firstName, lastName: parsed.data.lastName, phone: parsed.data.phone || null, acceptsMarketing: parsed.data.marketing === 'on' }).where(eq(users.id, user.id));
  refresh();
  return { ok: true, message: 'Profile updated.' };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect('/account/login');
  const current = String(form.get('current') || '');
  const next = String(form.get('password') || '');
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!u || !(await verifyPassword(current, u.passwordHash))) return { message: 'Your current password is incorrect.', fieldErrors: { current: 'Incorrect password.' } };
  const problem = passwordProblems(next);
  if (problem) return { message: problem, fieldErrors: { password: problem } };
  if (next !== form.get('confirm')) return { message: 'Passwords do not match.', fieldErrors: { confirm: 'Passwords do not match.' } };
  const [updated] = await db.update(users).set({ passwordHash: await hashPassword(next), tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, user.id)).returning();
  await createSession(updated!); // other sessions are invalidated by the token version bump
  return { ok: true, message: 'Password changed. Other devices have been signed out.' };
}

const addressSchema = z.object({
  id: z.coerce.number().int().optional(),
  label: z.string().trim().max(60).optional(),
  firstName: z.string().trim().min(1, 'Required').max(100),
  lastName: z.string().trim().min(1, 'Required').max(100),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(40),
  line1: z.string().trim().min(4, 'Enter your street address').max(255),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2, 'Required').max(100),
  province: z.enum(PROVINCES, { message: 'Select a province' }),
  postalCode: z.string().trim().max(20).optional(),
  isDefault: z.string().optional(),
});

export async function saveAddressAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect('/account/login');
  const raw = Object.fromEntries(form);
  const parsed = addressSchema.safeParse({ ...raw, id: raw.id || undefined });
  if (!parsed.success) return { message: 'Please check the highlighted fields.', fieldErrors: errs(parsed.error.issues) };
  const d = parsed.data;
  const db = await getDb();
  const values = { label: d.label || null, firstName: d.firstName, lastName: d.lastName, phone: d.phone, line1: d.line1, line2: d.line2 || null, city: d.city, province: d.province, postalCode: d.postalCode || null, isDefault: d.isDefault === 'on' };
  const count = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, user.id));
  if (values.isDefault || !count.length) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
    values.isDefault = true;
  }
  if (d.id) await db.update(addresses).set(values).where(and(eq(addresses.id, d.id), eq(addresses.userId, user.id)));
  else await db.insert(addresses).values({ ...values, userId: user.id });
  refresh();
  return { ok: true, message: 'Address saved.' };
}

export async function deleteAddressAction(id: number) {
  const user = await getCurrentUser();
  if (!user) redirect('/account/login');
  const db = await getDb();
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  refresh();
}

export async function setDefaultAddressAction(id: number) {
  const user = await getCurrentUser();
  if (!user) redirect('/account/login');
  const db = await getDb();
  await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  await db.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  refresh();
}
