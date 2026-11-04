import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { orders, paymentProofs } from '@/db/schema';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { verifyOrderToken } from '@/lib/orders';
import { isBlobUrl, readBlob } from '@/lib/blob-media';

export const runtime = 'nodejs';

/** Payment receipts are never public. Staff, the order owner, or a guest with the order token may view one. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length > 80) return new NextResponse('Not found', { status: 404 });
  const db = await getDb();
  const [proof] = await db.select().from(paymentProofs).where(eq(paymentProofs.token, token)).limit(1);
  if (!proof) return new NextResponse('Not found', { status: 404 });

  const user = await getCurrentUser();
  let allowed = isStaff(user);
  if (!allowed && proof.orderId && user) {
    const [order] = await db.select({ userId: orders.userId }).from(orders).where(eq(orders.id, proof.orderId)).limit(1);
    allowed = order?.userId === user.id;
  }
  if (!allowed && proof.orderId) {
    const orderToken = req.nextUrl.searchParams.get('orderToken');
    const orderNumber = req.nextUrl.searchParams.get('order');
    if (orderNumber && verifyOrderToken(orderNumber, orderToken)) {
      const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.number, orderNumber)).limit(1);
      allowed = order?.id === proof.orderId;
    }
  }
  if (!allowed) return new NextResponse('Not found', { status: 404 });

  let bytes: Uint8Array | null = proof.data ? new Uint8Array(proof.data) : null;
  if (!bytes && proof.url && isBlobUrl(proof.url)) {
    const blob = await readBlob(proof.url);
    if (blob?.stream) bytes = new Uint8Array(await new Response(blob.stream).arrayBuffer());
  } else if (!bytes && proof.url) {
    const remote = await fetch(proof.url);
    if (remote.ok) bytes = new Uint8Array(await remote.arrayBuffer());
  }
  if (!bytes) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': proof.mime,
      'Content-Disposition': `${proof.mime === 'application/pdf' ? 'attachment' : 'inline'}; filename="${proof.filename.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
