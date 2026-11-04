import { desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import { orderConditions } from '@/lib/admin-orders';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // prevent CSV formula injection
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: Request) {
  try {
    await assertAdmin();
  } catch {
    return new Response('Not authorised', { status: 401 });
  }
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const db = await getDb();
  const rows = await db.select().from(orders).where(orderConditions(sp)).orderBy(desc(orders.createdAt)).limit(10000);
  const header = ['Order', 'Date', 'Customer', 'Email', 'Phone', 'City', 'Province', 'Status', 'Payment status', 'Payment method', 'Payment ref', 'Subtotal (PKR)', 'Discount (PKR)', 'Shipping (PKR)', 'Total (PKR)', 'Refunded (PKR)', 'Discount code', 'Tracking'];
  const lines = rows.map((o) =>
    [o.number, o.createdAt.toISOString(), o.customerName, o.email, o.phone, o.shippingAddress.city, o.shippingAddress.province, o.status, o.paymentStatus, o.paymentMethod, o.paymentRef, o.subtotal / 100, o.discountTotal / 100, o.shippingTotal / 100, o.total / 100, o.refundedAmount / 100, o.discountCode, [o.trackingCarrier, o.trackingNumber].filter(Boolean).join(' ')].map(cell).join(','),
  );
  const csv = '\uFEFF' + [header.join(','), ...lines].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="evermoon-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
