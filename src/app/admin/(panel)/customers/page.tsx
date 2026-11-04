import Link from 'next/link';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { Search } from 'lucide-react';
import { getDb } from '@/db';
import { orders, users } from '@/db/schema';
import { Card, Empty, PageHeader, Pagination, Pill, TableWrap, qs } from '@/components/admin/ui';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Customers' };
const PER = 25;

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await getDb();
  const conds: SQL[] = [];
  if (sp.role) conds.push(eq(users.role, sp.role));
  else conds.push(eq(users.role, 'customer'));
  if (sp.status) conds.push(eq(users.status, sp.status));
  if (sp.q) conds.push(sql`(${users.email} ilike ${'%' + sp.q + '%'} or ${users.firstName} || ' ' || ${users.lastName} ilike ${'%' + sp.q + '%'} or ${users.phone} ilike ${'%' + sp.q + '%'})`);
  const where = and(...conds);
  const spent = sql<number>`coalesce((select sum(o.total) from ${orders} o where o.user_id = ${users.id} and o.status <> 'cancelled'),0)::bigint`;
  const count = sql<number>`(select count(*) from ${orders} o where o.user_id = ${users.id})::int`;
  const last = sql<Date | null>`(select max(o.created_at) from ${orders} o where o.user_id = ${users.id})`;
  const order = sp.sort === 'spent' ? desc(spent) : sp.sort === 'orders' ? desc(count) : desc(users.createdAt);
  const [rows, [{ total }]] = await Promise.all([
    db.select({ u: users, spent, count, last }).from(users).where(where).orderBy(order).limit(PER).offset((page - 1) * PER),
    db.select({ total: sql<number>`count(*)::int` }).from(users).where(where),
  ]);
  const pages = Math.max(1, Math.ceil(Number(total) / PER));
  const f = { q: sp.q, status: sp.status, role: sp.role, sort: sp.sort };
  return (
    <>
      <PageHeader title="Customers" description={`${total} ${sp.role ? sp.role + ' accounts' : 'customers'}`} />
      <Card pad={false}>
        <form className="grid gap-2 border-b border-line p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={sp.q} placeholder="Search name, email or phone" className="field !pl-9" />
          </div>
          <select name="status" defaultValue={sp.status ?? ''} className="field"><option value="">Any status</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
          <select name="role" defaultValue={sp.role ?? ''} className="field"><option value="">Customers</option><option value="staff">Staff</option><option value="admin">Admins</option></select>
          <select name="sort" defaultValue={sp.sort ?? ''} className="field"><option value="">Newest</option><option value="spent">Total spent</option><option value="orders">Most orders</option></select>
          <button className="btn btn-secondary">Apply</button>
        </form>
        {rows.length === 0 ? (
          <Empty title="No customers found" />
        ) : (
          <TableWrap>
            <table className="admin-table w-full text-[0.84rem]">
              <thead><tr><th>Customer</th><th>Phone</th><th>Status</th><th className="!text-right">Orders</th><th className="!text-right">Total spent</th><th>Last order</th><th>Joined</th></tr></thead>
              <tbody>
                {rows.map(({ u, spent: s, count: c, last: l }) => (
                  <tr key={u.id}>
                    <td className="is-primary" data-label="Customer"><Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">{u.firstName} {u.lastName}</Link><span className="block break-all text-[0.72rem] text-muted">{u.email}</span></td>
                    <td data-label="Phone" className="text-muted">{u.phone ?? '—'}</td>
                    <td data-label="Status"><Pill tone={u.status === 'active' ? 'green' : 'rose'}>{u.status}</Pill>{u.acceptsMarketing && <span className="ml-1"><Pill tone="gold">subscribed</Pill></span>}</td>
                    <td data-label="Orders" className="text-right">{c}</td>
                    <td data-label="Total spent" className="text-right font-medium">{formatMoney(Number(s))}</td>
                    <td data-label="Last order" className="text-muted">{l ? formatDate(l) : '—'}</td>
                    <td data-label="Joined" className="text-muted">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
        <Pagination page={page} pages={pages} href={(n) => qs('/admin/customers', { ...f, page: n })} />
      </Card>
    </>
  );
}
