import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, type User } from '@/db/schema';

export const SESSION_COOKIE = 'aurelle_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET || (process.env.NODE_ENV !== 'production' ? 'aurelle-dev-only-secret-change-me-0123456789' : '');
  if (!s || s.length < 32) throw new Error('AUTH_SECRET must be set (32+ characters).');
  return new TextEncoder().encode(s);
}

export function cookieOptions(maxAge = MAX_AGE) {
  const crossSite = process.env.COOKIE_CROSS_SITE === '1';
  return {
    httpOnly: true,
    secure: crossSite || process.env.NODE_ENV === 'production',
    sameSite: crossSite ? ('none' as const) : ('lax' as const),
    partitioned: crossSite || undefined,
    path: '/',
    maxAge,
  };
}

export type SessionUser = Omit<User, 'passwordHash'>;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(user: Pick<User, 'id' | 'role' | 'tokenVersion'>) {
  const token = await new SignJWT({ role: user.role, ver: user.tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions());
}

export async function destroySession() {
  (await cookies()).set(SESSION_COOKIE, '', cookieOptions(0));
}

export async function readSessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return { userId: Number(payload.sub), role: String(payload.role ?? 'customer'), ver: Number(payload.ver ?? 0) };
  } catch {
    return null;
  }
}

/** Current signed-in user (validated against the database on every request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session || !Number.isFinite(session.userId)) return null;
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!u || u.status !== 'active' || u.tokenVersion !== session.ver) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = u;
  return safe;
});

export const isStaff = (u: Pick<User, 'role'> | null | undefined) => !!u && (u.role === 'admin' || u.role === 'staff');
export function logoutDestination(role: string | null | undefined) {
  return role === 'admin' || role === 'staff' ? '/admin/login' : '/account/login';
}

export async function requireUser(next = '/account') {
  const u = await getCurrentUser();
  if (!u) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return u;
}

/** Use in admin pages/layouts. Redirects non-staff to the admin login. */
export async function requireAdminPage(opts: { adminOnly?: boolean } = {}) {
  const u = await getCurrentUser();
  if (!u || !isStaff(u)) redirect('/admin/login');
  if (opts.adminOnly && u.role !== 'admin') redirect('/admin?denied=1');
  return u;
}

export class AuthError extends Error {}

/** Use in admin server actions and route handlers. Throws if not authorised. */
export async function assertAdmin(opts: { adminOnly?: boolean } = {}) {
  const u = await getCurrentUser();
  if (!u || !isStaff(u)) throw new AuthError('Not authorised');
  if (opts.adminOnly && u.role !== 'admin') throw new AuthError('Administrator access required');
  return u;
}

export function passwordProblems(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw.length > 128) return 'Password is too long.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use at least one letter and one number.';
  return null;
}
