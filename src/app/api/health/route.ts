import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb, getDbKind } from '@/db';
import { products, orders } from '@/db/schema';
import { stripeConfigured, mailboxConfigured } from '@/lib/settings';
import { blobAuthMode, blobConfigured } from '@/lib/blob-media';

export const dynamic = 'force-dynamic';

/** Public health check: confirms the app can reach its database. Exposes no secrets. */
export async function GET() {
  const started = Date.now();
  try {
    const db = await getDb();
    const [[p], [o]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(products),
      db.select({ n: sql<number>`count(*)::int` }).from(orders),
    ]);
    return NextResponse.json(
      {
        status: 'ok',
        database: { kind: await getDbKind(), connected: true, products: Number(p?.n ?? 0), orders: Number(o?.n ?? 0) },
        integrations: { stripe: stripeConfigured(), email: await mailboxConfigured(), blob: { configured: blobConfigured(), mode: blobAuthMode() } },
        latencyMs: Date.now() - started,
        time: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json({ status: 'error', database: { connected: false }, message: (e as Error).message.slice(0, 200) }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
