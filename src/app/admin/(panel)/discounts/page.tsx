import { asc, desc, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { categories, collections, discountUsages, discounts, products } from '@/db/schema';
import { PageHeader } from '@/components/admin/ui';
import { DiscountManager } from '@/components/admin/discount-manager';

export const metadata = { title: 'Discounts' };

export default async function DiscountsAdmin() {
  const db = await getDb();
  const [list, prods, cols, cats, usage] = await Promise.all([
    db.select().from(discounts).orderBy(desc(discounts.createdAt)),
    db.select({ id: products.id, name: products.name }).from(products).orderBy(asc(products.name)),
    db.select({ id: collections.id, name: collections.name }).from(collections).orderBy(asc(collections.position)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.position)),
    db.select({ discountId: discountUsages.discountId, customers: sql<number>`count(distinct lower(${discountUsages.email}))::int` }).from(discountUsages).groupBy(discountUsages.discountId),
  ]);
  const customers = new Map(usage.map((row) => [row.discountId, row.customers]));
  return (
    <>
      <PageHeader title="Discounts" description="Codes are separate from events. Subscriber-only codes are shared, not copied per subscriber." />
      <DiscountManager
        discounts={list.map((d) => ({ ...d, customers: customers.get(d.id) ?? 0, startsAt: d.startsAt?.toISOString() ?? null, endsAt: d.endsAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString() }))}
        products={prods}
        collections={cols}
        categories={cats}
      />
    </>
  );
}
