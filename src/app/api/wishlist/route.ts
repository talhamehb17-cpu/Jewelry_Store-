import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { products, wishlistItems } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function list(userId: number) {
  const db = await getDb();
  const rows = await db.select({ id: wishlistItems.productId }).from(wishlistItems).where(eq(wishlistItems.userId, userId));
  return rows.map((r) => r.id);
}

async function validIds(ids: unknown): Promise<number[]> {
  const clean = (Array.isArray(ids) ? ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  if (!clean.length) return [];
  const db = await getDb();
  const rows = await db.select({ id: products.id }).from(products).where(inArray(products.id, clean));
  return rows.map((r) => r.id);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ids: [] });
  return NextResponse.json({ ids: await list(user.id) });
}

/** Merge a guest wishlist into the signed-in account and return the combined list. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = await validIds(body?.merge);
  if (ids.length) {
    const db = await getDb();
    await db.insert(wishlistItems).values(ids.map((productId) => ({ userId: user.id, productId }))).onConflictDoNothing();
  }
  return NextResponse.json({ ids: await list(user.id) });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const [id] = await validIds([body?.productId]);
  if (!id) return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
  const db = await getDb();
  await db.insert(wishlistItems).values({ userId: user.id, productId: id }).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.productId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
  const db = await getDb();
  await db.delete(wishlistItems).where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.productId, id)));
  return NextResponse.json({ ok: true });
}
