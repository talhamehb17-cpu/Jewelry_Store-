import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildQuote } from '@/lib/pricing';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const schema = z.object({
  lines: z.array(z.object({ variantId: z.number().int().positive(), quantity: z.number().int().min(1).max(20), giftPackaging: z.boolean().optional(), giftImageId: z.string().max(40).nullish() })).max(50),
  discountCode: z.string().max(60).nullish(),
  shippingMethod: z.string().max(40).nullish(),
  paymentMethod: z.string().max(20).nullish(),
  email: z.string().max(255).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid cart' }, { status: 400 });
  const user = await getCurrentUser();
  const quote = await buildQuote({ ...parsed.data, email: parsed.data.email || user?.email, userId: user?.id ?? null });
  return NextResponse.json(quote, { headers: { 'Cache-Control': 'no-store' } });
}
