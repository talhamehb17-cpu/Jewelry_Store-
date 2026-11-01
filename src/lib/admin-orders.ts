import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/db';
import { orders } from '@/db/schema';

export type OrderFilters = { q?: string; status?: string; payment?: string; method?: string; from?: string; to?: string };

export function orderConditions(f: OrderFilters) {
  const conds: SQL[] = [];
  if (f.q) {
    const like = `%${f.q.trim()}%`;
    conds.push(sql`(${orders.number} ilike ${like} or ${orders.email} ilike ${like} or ${orders.customerName} ilike ${like} or ${orders.phone} ilike ${like})`);
  }
  if (f.status) conds.push(eq(orders.status, f.status));
  if (f.payment) conds.push(eq(orders.paymentStatus, f.payment));
  if (f.method) conds.push(eq(orders.paymentMethod, f.method));
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) conds.push(gte(orders.createdAt, new Date(`${f.from}T00:00:00+05:00`)));
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) conds.push(lte(orders.createdAt, new Date(`${f.to}T23:59:59+05:00`)));
  return conds.length ? and(...conds) : undefined;
}

export async function listOrders(f: OrderFilters, page: number, per = 20) {
  const db = await getDb();
  const where = orderConditions(f);
  const [rows, [{ count, revenue }]] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(per).offset((page - 1) * per),
    db.select({ count: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.total} else 0 end),0)::bigint` }).from(orders).where(where),
  ]);
  return { rows, count: Number(count), revenue: Number(revenue), pages: Math.max(1, Math.ceil(Number(count) / per)) };
}
