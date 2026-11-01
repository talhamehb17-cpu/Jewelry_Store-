import { asc, desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { collections, discounts, products } from '@/db/schema';
import { PageHeader } from '@/components/admin/ui';
import { DiscountManager } from '@/components/admin/discount-manager';

export const metadata = { title: 'Discounts' };

export default async function DiscountsAdmin() {
  const db = await getDb();
  const [list, prods, cols] = await Promise.all([
    db.select().from(discounts).orderBy(desc(discounts.createdAt)),
    db.select({ id: products.id, name: products.name }).from(products).orderBy(asc(products.name)),
    db.select({ id: collections.id, name: collections.name }).from(collections).orderBy(asc(collections.position)),
  ]);
  return (
    <>
      <PageHeader title="Discounts" description="Percentage, fixed-amount and free-shipping codes with limits and scheduling." />
      <DiscountManager
        discounts={list.map((d) => ({ ...d, startsAt: d.startsAt?.toISOString() ?? null, endsAt: d.endsAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString() }))}
        products={prods}
        collections={cols}
      />
    </>
  );
}
