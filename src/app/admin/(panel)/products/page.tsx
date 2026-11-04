import Link from 'next/link';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { Plus, Search } from 'lucide-react';
import { getDb } from '@/db';
import { categories, productImages, products, productVariants } from '@/db/schema';
import { Card, Empty, PageHeader, Pagination, Pill, TableWrap, qs } from '@/components/admin/ui';
import { ProductRowActions } from '@/components/admin/product-row-actions';
import { Img } from '@/components/ui/img';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Products' };
const PER = 20;

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await getDb();
  const conds: SQL[] = [];
  if (sp.q) conds.push(sql`(${products.name} ilike ${'%' + sp.q + '%'} or ${products.sku} ilike ${'%' + sp.q + '%'} or ${products.tags}::text ilike ${'%' + sp.q + '%'})`);
  if (sp.status) conds.push(eq(products.status, sp.status));
  if (sp.category) conds.push(eq(products.categoryId, Number(sp.category)));
  const where = conds.length ? and(...conds) : undefined;
  const sort = sp.sort === 'price' ? asc(products.price) : sp.sort === 'sales' ? desc(products.salesCount) : sp.sort === 'name' ? asc(products.name) : desc(products.updatedAt);
  const [rows, [{ count }], cats] = await Promise.all([
    db.select().from(products).where(where).orderBy(sort).limit(PER).offset((page - 1) * PER),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
    db.select().from(categories).orderBy(asc(categories.position)),
  ]);
  const ids = rows.map((r) => r.id);
  const [imgs, stock] = ids.length
    ? await Promise.all([
        db.select().from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.position)),
        db.select({ productId: productVariants.productId, stock: sql<number>`sum(${productVariants.stock})::int`, variants: sql<number>`count(*)::int` }).from(productVariants).where(inArray(productVariants.productId, ids)).groupBy(productVariants.productId),
      ])
    : [[], []];
  const pages = Math.max(1, Math.ceil(Number(count) / PER));
  const base = { q: sp.q, status: sp.status, category: sp.category, sort: sp.sort };
  return (
    <>
      <PageHeader title="Products" description={`${count} products in your catalogue`} actions={<Link href="/admin/products/new" className="btn btn-primary"><Plus size={15} /> Add product</Link>} />
      <Card pad={false}>
        <form className="grid gap-2 border-b border-line p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={sp.q} placeholder="Search name, SKU or tag" className="field !pl-9" />
          </div>
          <select name="status" defaultValue={sp.status ?? ''} className="field"><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
          <select name="category" defaultValue={sp.category ?? ''} className="field"><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select name="sort" defaultValue={sp.sort ?? ''} className="field"><option value="">Recently updated</option><option value="sales">Best selling</option><option value="price">Price</option><option value="name">Name</option></select>
          <button className="btn btn-secondary">Filter</button>
          {(sp.q || sp.status || sp.category) && <Link href="/admin/products" className="text-[0.8rem] text-muted underline">Clear</Link>}
        </form>
        {rows.length === 0 ? (
          <Empty title="No products found" body="Try a different search or add your first product." action={<Link href="/admin/products/new" className="btn btn-primary">Add product</Link>} />
        ) : (
          <TableWrap>
            <table className="admin-table w-full text-[0.84rem]">
              <thead><tr><th>Product</th><th>Status</th><th>Inventory</th><th>Category</th><th className="!text-right">Price</th><th className="!text-right">Sold</th><th /></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const img = imgs.find((i) => i.productId === p.id);
                  const st = stock.find((s) => s.productId === p.id);
                  const total = Number(st?.stock ?? 0);
                  return (
                    <tr key={p.id}>
                      <td className="is-primary" data-label="Product">
                        <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-secondary"><Img src={img?.url} alt="" sizes="44px" /></span>
                          <span className="min-w-0"><span className="block font-medium hover:underline">{p.name}</span><span className="text-[0.72rem] text-muted">{p.sku}</span></span>
                        </Link>
                      </td>
                      <td data-label="Status"><Pill tone={p.status === 'active' ? 'green' : p.status === 'draft' ? 'amber' : 'stone'}>{p.status}</Pill>{p.featured && <span className="ml-1"><Pill tone="gold">featured</Pill></span>}</td>
                      <td data-label="Inventory" className={cn(total <= 0 ? 'text-rose-600' : total <= 5 ? 'text-amber-700' : '')}>{total <= 0 ? 'Out of stock' : `${total} in stock`}<span className="block text-[0.72rem] text-muted">{st?.variants ?? 0} variants</span></td>
                      <td data-label="Category" className="text-muted">{cats.find((c) => c.id === p.categoryId)?.name ?? '—'}</td>
                      <td data-label="Price" className="text-right">{formatMoney(p.price)}{p.compareAtPrice && <s className="block text-[0.72rem] text-muted">{formatMoney(p.compareAtPrice)}</s>}</td>
                      <td data-label="Sold" className="text-right">{p.salesCount}</td>
                      <td data-label="" className="text-right"><ProductRowActions id={p.id} slug={p.slug} status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
        <Pagination page={page} pages={pages} href={(n) => qs('/admin/products', { ...base, page: n })} />
      </Card>
    </>
  );
}
