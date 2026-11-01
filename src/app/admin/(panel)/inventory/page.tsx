import Link from 'next/link';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { Search } from 'lucide-react';
import { getDb } from '@/db';
import { inventoryMovements, products, productVariants, users } from '@/db/schema';
import { Card, Empty, PageHeader, Pagination, qs } from '@/components/admin/ui';
import { StockRow } from '@/components/admin/stock-row';
import { formatDateTime, titleCase } from '@/lib/utils';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Inventory' };
const PER = 30;

export default async function InventoryAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await getDb();
  const conds: SQL[] = [sql`${products.status} <> 'archived'`];
  if (sp.filter === 'low') conds.push(sql`${productVariants.stock} > 0 and ${productVariants.stock} <= ${productVariants.lowStockThreshold}`);
  if (sp.filter === 'out') conds.push(sql`${productVariants.stock} <= 0`);
  if (sp.q) conds.push(sql`(${products.name} ilike ${'%' + sp.q + '%'} or ${productVariants.sku} ilike ${'%' + sp.q + '%'})`);
  const where = and(...conds);
  const variantFilter = sp.variant ? Number(sp.variant) : null;
  const [rows, [{ count }], [summary], history] = await Promise.all([
    db
      .select({ v: productVariants, name: products.name, productId: products.id })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(where)
      .orderBy(asc(productVariants.stock), asc(products.name))
      .limit(PER)
      .offset((page - 1) * PER),
    db.select({ count: sql<number>`count(*)::int` }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(where),
    db
      .select({
        units: sql<number>`coalesce(sum(${productVariants.stock}),0)::int`,
        low: sql<number>`count(*) filter (where ${productVariants.stock} > 0 and ${productVariants.stock} <= ${productVariants.lowStockThreshold})::int`,
        out: sql<number>`count(*) filter (where ${productVariants.stock} <= 0)::int`,
        value: sql<number>`coalesce(sum(${productVariants.stock} * coalesce(${products.costPrice}, ${products.price} / 2)),0)::bigint`,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(sql`${products.status} <> 'archived'`),
    db
      .select({ m: inventoryMovements, name: products.name, title: productVariants.title, actor: users.firstName })
      .from(inventoryMovements)
      .innerJoin(productVariants, eq(productVariants.id, inventoryMovements.variantId))
      .innerJoin(products, eq(products.id, inventoryMovements.productId))
      .leftJoin(users, eq(users.id, inventoryMovements.actorId))
      .where(variantFilter ? eq(inventoryMovements.variantId, variantFilter) : undefined)
      .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
      .limit(variantFilter ? 200 : 40),
  ]);
  const pages = Math.max(1, Math.ceil(Number(count) / PER));
  const f = { q: sp.q, filter: sp.filter };
  return (
    <>
      <PageHeader title="Inventory" description={`${summary?.units ?? 0} units on hand · ${summary?.low ?? 0} low · ${summary?.out ?? 0} out of stock · est. value Rs ${Math.round(Number(summary?.value ?? 0) / 100).toLocaleString('en-PK')}`} />
      <div className="mb-4 flex gap-2">
        {[['', 'All variants'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([k, l]) => (
          <Link key={k} href={qs('/admin/inventory', { ...f, filter: k || undefined })} className={cn('rounded-full border px-3 py-1 text-[0.78rem]', (sp.filter ?? '') === k ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink')}>{l}</Link>
        ))}
      </div>
      <Card pad={false}>
        <form className="flex gap-2 border-b border-line p-4">
          <input type="hidden" name="filter" value={sp.filter ?? ''} />
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={sp.q} placeholder="Search product or SKU" className="field !pl-9" />
          </div>
          <button className="btn btn-secondary">Search</button>
        </form>
        {rows.length === 0 ? <Empty title="Nothing to show" body="No variants match this view." /> : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-[0.82rem]">
              <thead><tr><th>Product / variant</th><th>SKU</th><th>Low at</th><th>In stock</th><th>Adjust</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => <StockRow key={r.v.id} variant={{ id: r.v.id, title: r.v.title, sku: r.v.sku ?? '', stock: r.v.stock, threshold: r.v.lowStockThreshold }} product={{ id: r.productId, name: r.name }} />)}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} href={(n) => qs('/admin/inventory', { ...f, page: n })} />
      </Card>
      <div className="mt-6">
        <Card title={variantFilter ? 'Variant stock history' : 'Recent stock movements'} actions={variantFilter ? <Link href="/admin/inventory" className="text-[0.75rem] text-muted underline">Show all</Link> : null} pad={false}>
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-[0.82rem]">
              <thead><tr><th>Date</th><th>Product</th><th>Reason</th><th className="!text-right">Change</th><th className="!text-right">Stock after</th><th>By / note</th></tr></thead>
              <tbody>
                {history.map(({ m, name, title, actor }) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(m.createdAt)}</td>
                    <td><Link href={qs('/admin/inventory', { variant: m.variantId })} className="hover:underline">{name}</Link><span className="block text-[0.72rem] text-muted">{title}</span></td>
                    <td>{titleCase(m.reason)}</td>
                    <td className={cn('text-right font-medium', m.change > 0 ? 'text-emerald-700' : m.change < 0 ? 'text-rose-700' : '')}>{m.change > 0 ? '+' : ''}{m.change}</td>
                    <td className="text-right">{m.stockAfter}</td>
                    <td className="text-muted">{actor ?? (m.orderId ? 'Order' : 'System')}{m.note ? ` · ${m.note}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
