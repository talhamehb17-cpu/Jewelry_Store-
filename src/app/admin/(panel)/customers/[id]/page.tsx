import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { addresses, orders, users, wishlistItems, products } from '@/db/schema';
import { Card, PageHeader, Pill, Stat, TableWrap } from '@/components/admin/ui';
import { StatusBadge } from '@/components/store/order-status';
import { ActionButton } from '@/components/admin/action-button';
import { CustomerNote, RoleSelect } from '@/components/admin/customer-controls';
import { generateResetLink, setCustomerStatus } from '@/app/actions/admin/commerce';
import { formatMoney } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Customer' };

export default async function CustomerAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = Number(id);
  if (!Number.isInteger(uid)) notFound();
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!u) notFound();
  const [list, addrs, wish, me] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, uid)).orderBy(desc(orders.createdAt)),
    db.select().from(addresses).where(eq(addresses.userId, uid)),
    db.select({ name: products.name, slug: products.slug }).from(wishlistItems).innerJoin(products, eq(products.id, wishlistItems.productId)).where(eq(wishlistItems.userId, uid)),
    getCurrentUser(),
  ]);
  const valid = list.filter((o) => o.status !== 'cancelled');
  const spent = valid.reduce((a, o) => a + o.total, 0);
  return (
    <>
      <PageHeader back={{ href: '/admin/customers', label: 'Customers' }} title={`${u.firstName} ${u.lastName}`} description={<span className="flex flex-wrap items-center gap-2 break-all">{u.email} <Pill tone={u.status === 'active' ? 'green' : 'rose'}>{u.status}</Pill> <Pill>{u.role}</Pill></span>} />
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Stat label="Total spent" value={formatMoney(spent)} />
        <Stat label="Orders" value={list.length} hint={`${list.length - valid.length} cancelled`} />
        <Stat label="Average order" value={formatMoney(valid.length ? Math.round(spent / valid.length) : 0)} />
        <Stat label="Customer since" value={formatDate(u.createdAt, { month: 'short', year: 'numeric' })} hint={u.lastLoginAt ? `Last login ${formatDate(u.lastLoginAt)}` : undefined} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card title="Orders" pad={false}>
          {list.length ? (
            <TableWrap>
            <table className="admin-table w-full text-[0.84rem]">
              <thead><tr><th>Order</th><th>Date</th><th>Payment</th><th>Status</th><th className="!text-right">Total</th></tr></thead>
              <tbody>{list.map((o) => <tr key={o.id}><td className="is-primary" data-label="Order"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link></td><td data-label="Date" className="text-muted">{formatDateTime(o.createdAt)}</td><td data-label="Payment"><StatusBadge status={o.paymentStatus} kind="payment" /></td><td data-label="Status"><StatusBadge status={o.status} /></td><td data-label="Total" className="text-right">{formatMoney(o.total)}</td></tr>)}</tbody>
            </table>
            </TableWrap>
          ) : <p className="p-5 text-[0.85rem] text-muted">No orders yet.</p>}
        </Card>
        <div className="space-y-6">
          <Card title="Account">
            <dl className="space-y-2 text-[0.84rem]">
              <div className="flex justify-between gap-3"><dt className="text-muted">Phone</dt><dd className="break-all text-right">{u.phone ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Marketing</dt><dd>{u.acceptsMarketing ? 'Subscribed' : 'Not subscribed'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Failed logins</dt><dd>{u.failedLogins}{u.lockedUntil && u.lockedUntil > new Date() ? ' (locked)' : ''}</dd></div>
            </dl>
            <div className="mt-5 flex flex-col gap-2">
              {u.id !== me?.id && (u.status === 'active'
                ? <ActionButton action={setCustomerStatus.bind(null, u.id, 'disabled')} confirmText="Disable this account? The customer will be signed out and unable to log in.">Disable account</ActionButton>
                : <ActionButton action={setCustomerStatus.bind(null, u.id, 'active')}>Enable account</ActionButton>)}
              <ActionButton action={generateResetLink.bind(null, u.id)}>Generate password reset link</ActionButton>
              {me?.role === 'admin' && u.id !== me.id && <RoleSelect userId={u.id} role={u.role} />}
            </div>
          </Card>
          <Card title="Addresses">
            {addrs.length ? addrs.map((a) => (
              <p key={a.id} className="mb-3 text-[0.84rem] leading-relaxed last:mb-0">{a.label && <span className="font-medium">{a.label}{a.isDefault && ' (default)'}<br /></span>}{a.line1}, {a.city}, {a.province}<br /><span className="text-muted">{a.phone}</span></p>
            )) : <p className="text-[0.85rem] text-muted">No saved addresses.</p>}
          </Card>
          <Card title={`Wishlist (${wish.length})`}>
            {wish.length ? <ul className="space-y-1 text-[0.84rem]">{wish.map((w) => <li key={w.slug}><a href={`/products/${w.slug}`} target="_blank" rel="noreferrer" className="hover:underline">{w.name}</a></li>)}</ul> : <p className="text-[0.85rem] text-muted">Empty.</p>}
          </Card>
          <Card title="Internal notes"><CustomerNote userId={u.id} initial={u.notes ?? ''} /></Card>
        </div>
      </div>
    </>
  );
}
