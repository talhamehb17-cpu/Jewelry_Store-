import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { categories, collectionProducts, collections, productImages, products } from '@/db/schema';
import { PageHeader } from '@/components/admin/ui';
import { CollectionsManager } from '@/components/admin/collections-manager';

export const metadata = { title: 'Collections' };

export default async function CollectionsAdmin() {
  const db = await getDb();
  const [cols, cps, cats, prods, counts] = await Promise.all([
    db.select().from(collections).orderBy(asc(collections.position)),
    db.select().from(collectionProducts).orderBy(asc(collectionProducts.position)),
    db.select().from(categories).orderBy(asc(categories.position)),
    db.select({ id: products.id, name: products.name, image: sql<string | null>`(select url from ${productImages} pi where pi.product_id = ${products.id} order by position limit 1)` }).from(products).where(eq(products.status, 'active')).orderBy(asc(products.name)),
    db.select({ categoryId: products.categoryId, n: sql<number>`count(*)::int` }).from(products).groupBy(products.categoryId),
  ]);
  return (
    <>
      <PageHeader title="Collections & categories" description="Curate manual collections or create automatic ones (new arrivals, best sellers, sale, by category)." />
      <CollectionsManager
        collections={cols.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), productIds: cps.filter((p) => p.collectionId === c.id).map((p) => p.productId) }))}
        categories={cats.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), count: counts.find((x) => x.categoryId === c.id)?.n ?? 0 }))}
        products={prods}
      />
    </>
  );
}
