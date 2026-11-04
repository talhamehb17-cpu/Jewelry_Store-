import { NextResponse } from 'next/server';
import { progressOrders } from '@/lib/fulfillment';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Vercel Cron calls this with Authorization: Bearer CRON_SECRET. It never marks an order delivered. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.VERCEL) {
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  const result = await progressOrders();
  return NextResponse.json({ ok: true, ...result });
}
