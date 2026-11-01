import { and, desc, eq, gte, lt, ne, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { categories, orderItems, orders, products, productVariants, users } from '@/db/schema';

const TZ = 'Asia/Karachi';
const DAY = 86_400_000;

function dayKey(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
}

export async function salesSeries(days: number) {
  const db = await getDb();
  const since = new Date(Date.now() - days * DAY);
  const rows = (
    await db.execute(sql`
      select to_char(date_trunc('day', ${orders.createdAt} at time zone ${TZ}), 'YYYY-MM-DD') as day,
             coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.total} else 0 end), 0)::bigint as revenue,
             count(*) filter (where ${orders.status} <> 'cancelled')::int as orders
      from ${orders} where ${orders.createdAt} >= ${since}
      group by 1 order by 1`)
  ).rows as { day: string; revenue: string | number; orders: number }[];
  const map = new Map(rows.map((r) => [r.day, r]));
  const out: { day: string; label: string; revenue: number; orders: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    const key = dayKey(d);
    const r = map.get(key);
    out.push({ day: key, label: d.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' }), revenue: Math.round(Number(r?.revenue ?? 0) / 100), orders: Number(r?.orders ?? 0) });
  }
  return out;
}

export async function kpis(days: number) {
  const db = await getDb();
  const now = Date.now();
  const cur = new Date(now - days * DAY);
  const prev = new Date(now - 2 * days * DAY);
  const q = async (from: Date, to: Date) => {
    const [r] = await db
      .select({
        revenue: sql<number>`coalesce(sum(${orders.total}),0)::bigint`,
        count: sql<number>`count(*)::int`,
        customers: sql<number>`count(distinct lower(${orders.email}))::int`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lt(orders.createdAt, to), ne(orders.status, 'cancelled')));
    return { revenue: Number(r?.revenue ?? 0), count: Number(r?.count ?? 0), customers: Number(r?.customers ?? 0) };
  };
  const [a, b, [newCust], [totals], [pending]] = await Promise.all([
    q(cur, new Date(now + DAY)),
    q(prev, cur),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, 'customer'), gte(users.createdAt, cur))),
    db.select({ customers: sql<number>`count(*) filter (where ${users.role} = 'customer')::int` }).from(users),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(sql`${orders.status} in ('pending','confirmed','processing')`),
  ]);
  const pct = (x: number, y: number) => (y ? Math.round(((x - y) / y) * 1000) / 10 : x ? 100 : 0);
  const aov = a.count ? Math.round(a.revenue / a.count) : 0;
  const aovPrev = b.count ? Math.round(b.revenue / b.count) : 0;
  // Returning customer rate: share of customers in range with more than one lifetime order
  const ret = (
    await db.execute(sql`
      with c as (select lower(email) e from ${orders} where ${orders.createdAt} >= ${cur} and ${orders.status} <> 'cancelled' group by 1)
      select count(*) filter (where (select count(*) from ${orders} o2 where lower(o2.email) = c.e and o2.status <> 'cancelled') > 1)::int as returning, count(*)::int as total from c`)
  ).rows[0] as { returning: number; total: number } | undefined;
  return {
    revenue: a.revenue,
    revenueChange: pct(a.revenue, b.revenue),
    orders: a.count,
    ordersChange: pct(a.count, b.count),
    aov,
    aovChange: pct(aov, aovPrev),
    newCustomers: Number(newCust?.n ?? 0),
    totalCustomers: Number(totals?.customers ?? 0),
    openOrders: Number(pending?.n ?? 0),
    returningRate: ret && ret.total ? Math.round((ret.returning / ret.total) * 100) : 0,
  };
}

export async function topProducts(days: number, limit = 6) {
  const db = await getDb();
  const since = new Date(Date.now() - days * DAY);
  return db
    .select({
      productId: orderItems.productId,
      name: orderItems.name,
      image: sql<string>`min(${orderItems.image})`,
      units: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.lineTotal})::bigint`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(gte(orders.createdAt, since), ne(orders.status, 'cancelled')))
    .groupBy(orderItems.productId, orderItems.name)
    .orderBy(desc(sql`sum(${orderItems.lineTotal})`))
    .limit(limit);
}

export async function salesByCategory(days: number) {
  const db = await getDb();
  const since = new Date(Date.now() - days * DAY);
  const rows = await db
    .select({ name: sql<string>`coalesce(${categories.name}, 'Uncategorised')`, revenue: sql<number>`sum(${orderItems.lineTotal})::bigint` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .leftJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(gte(orders.createdAt, since), ne(orders.status, 'cancelled')))
    .groupBy(sql`1`)
    .orderBy(desc(sql`2`));
  return rows.map((r) => ({ name: r.name, value: Math.round(Number(r.revenue) / 100) }));
}

export async function breakdown(days: number, field: 'paymentMethod' | 'status' | 'city') {
  const db = await getDb();
  const since = new Date(Date.now() - days * DAY);
  const col = field === 'paymentMethod' ? sql`${orders.paymentMethod}` : field === 'status' ? sql`${orders.status}` : sql`${orders.shippingAddress}->>'city'`;
  const rows = (
    await db.execute(sql`select ${col} as name, count(*)::int as value, coalesce(sum(${orders.total}),0)::bigint as revenue from ${orders} where ${orders.createdAt} >= ${since} group by 1 order by 2 desc limit 8`)
  ).rows as { name: string; value: number; revenue: string }[];
  return rows.map((r) => ({ name: r.name, value: Number(r.value), revenue: Math.round(Number(r.revenue) / 100) }));
}

export async function customerGrowth(weeks: number) {
  const db = await getDb();
  const since = new Date(Date.now() - weeks * 7 * DAY);
  const [base] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, 'customer'), lt(users.createdAt, since)));
  const rows = (
    await db.execute(sql`select to_char(date_trunc('week', ${users.createdAt} at time zone ${TZ}), 'YYYY-MM-DD') as wk, count(*)::int as n from ${users} where ${users.role} = 'customer' and ${users.createdAt} >= ${since} group by 1 order by 1`)
  ).rows as { wk: string; n: number }[];
  let total = Number(base?.n ?? 0);
  const map = new Map(rows.map((r) => [r.wk, Number(r.n)]));
  const out: { label: string; total: number; new: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * DAY);
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const n = map.get(key) ?? 0;
    total += n;
    out.push({ label: monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), total, new: n });
  }
  return out;
}

export async function lowStock(limit = 8) {
  const db = await getDb();
  return db
    .select({ id: productVariants.id, productId: products.id, name: products.name, slug: products.slug, title: productVariants.title, sku: productVariants.sku, stock: productVariants.stock, threshold: productVariants.lowStockThreshold })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(sql`${productVariants.stock} <= ${productVariants.lowStockThreshold}`, ne(products.status, 'archived')))
    .orderBy(productVariants.stock)
    .limit(limit);
}
