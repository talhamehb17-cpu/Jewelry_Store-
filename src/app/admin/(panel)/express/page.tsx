import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { orders, paymentProofs } from '@/db/schema';
import { expressOrderSql, listOrders, type OrderFilters } from '@/lib/admin-orders';
import { Card, Empty, PageHeader, Pagination, qs } from '@/components/admin/ui';
import { StatusBadge } from '@/components/store/order-status';
import { formatMoney } from '@/lib/money';
import { formatDateTime, titleCase } from '@/lib/utils';

export const metadata = { title: 'Express orders' };

const FILTERS: { id: string; label: string; patch: Partial<OrderFilters> }[] = [
  { id: 'all', label: 'All express', patch: {} },
  { id: 'payment', label: 'Payment pending', patch: { payment: 'awaiting' } },
  { id: 'paid', label: 'Payment verified', patch: { payment: 'paid' } },
  { id: 'processing', label: 'Processing', patch: { status: 'processing' } },
  { id: 'shipped', label: 'Shipped', patch: { status: 'shipped' } },
  { id: 'out', label: 'Out for delivery', patch: { status: 'out_for_delivery' } },
  { id: 'confirmation', label: 'Confirmation pending', patch: { lane: 'confirmation' } },
  { id: 'issue', label: 'Delivery issues', patch: { lane: 'issue' } },
  { id: 'delivered', label: 'Delivered', patch: { status: 'delivered' } },
  { id: 'cancelled', label: 'Cancelled', patch: { status: 'cancelled' } },
];

export default async function ExpressOrders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const active = FILTERS.find((f) => f.id === sp.filter) ?? FILTERS[0]!;
  const page = Math.max(1, Number(sp.page) || 1);
  const filters: OrderFilters = { ...active.patch, q: sp.q, delivery: 'express' };
  const db = await getDb();
  const [stats, priority, list] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*) filter (where ${orders.status} <> 'cancelled')::int`,
        awaiting: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'awaiting' and ${orders.status} <> 'cancelled' and ${orders.paymentMethod} in ('bank', 'easypaisa', 'jazzcash', 'wallet'))::int`,
        paid: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'paid')::int`,
        confirmed: sql<number>`count(*) filter (where ${orders.status} = 'confirmed')::int`,
        processing: sql<number>`count(*) filter (where ${orders.status} = 'processing')::int`,
        shipped: sql<number>`count(*) filter (where ${orders.status} = 'shipped')::int`,
        out: sql<number>`count(*) filter (where ${orders.status} = 'out_for_delivery')::int`,
        pendingConfirm: sql<number>`count(*) filter (where ${orders.status} in ('out_for_delivery', 'awaiting_confirm') and ${orders.deliveryResponse} is null and ${orders.notificationDueAt} is not null and ${orders.notificationDueAt} <= now())::int`,
        issues: sql<number>`count(*) filter (where exists (select 1 from delivery_issues di where di.order_id = ${orders.id} and di.status = 'open'))::int`,
        delivered: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
      })
      .from(orders)
      .where(expressOrderSql),
    db
      .select({
        id: orders.id,
        number: orders.number,
        customerName: orders.customerName,
        email: orders.email,
        total: orders.total,
        paymentMethod: orders.paymentMethod,
        createdAt: orders.createdAt,
        proofToken: paymentProofs.token,
        proofMime: paymentProofs.mime,
      })
      .from(orders)
      .leftJoin(paymentProofs, eq(paymentProofs.orderId, orders.id))
      .where(sql`${expressOrderSql} and ${orders.paymentStatus} = 'awaiting' and ${orders.status} <> 'cancelled' and ${orders.paymentMethod} in ('bank', 'easypaisa', 'jazzcash', 'wallet')`)
      .orderBy(desc(orders.createdAt))
      .limit(8),
    listOrders(filters, page, 20),
  ]);
  const s = stats[0];
  const cards = [
    ['Express orders', s?.total ?? 0],
    ['Awaiting payment verification', s?.awaiting ?? 0],
    ['Payment verified', s?.paid ?? 0],
    ['Confirmed', s?.confirmed ?? 0],
    ['Processing', s?.processing ?? 0],
    ['Shipped', s?.shipped ?? 0],
    ['Out for delivery', s?.out ?? 0],
    ['Confirmation pending', s?.pendingConfirm ?? 0],
    ['Delivery issues', s?.issues ?? 0],
    ['Delivered', s?.delivered ?? 0],
  ] as const;
  return (
    <>
      <PageHeader title="Express orders" description="Only orders placed with Express delivery. Payment screenshots are not approved automatically." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-white px-4 py-3">
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className="mt-1 font-heading text-3xl">{value}</p>
          </div>
        ))}
      </div>
      <Card title="Priority payment verification" className="mb-6">
        <p className="mb-4 text-[0.8rem] text-muted">Express orders waiting on EasyPaisa, JazzCash or bank transfer. Open the receipt, then verify only if the funds match. Uploading a screenshot does not start delivery.</p>
        {priority.length === 0 ? (
          <p className="text-[0.82rem] text-muted">No express payments are waiting.</p>
        ) : (
          <div className="grid gap-3">
            {priority.map((o) => (
              <article key={o.id} className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3 sm:grid-cols-[72px_1fr_auto]">
                {o.proofToken && o.proofMime?.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/payment-proof/${o.proofToken}`} alt="" className="h-16 w-16 rounded object-cover" />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded bg-white text-[0.65rem] text-muted">No image</span>
                )}
                <div>
                  <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-amber-800">Priority</p>
                  <p className="font-medium">{o.number} · {o.customerName}</p>
                  <p className="text-[0.78rem] text-muted">{titleCase(o.paymentMethod)} · {formatMoney(o.total)} · {formatDateTime(o.createdAt)}</p>
                </div>
                <Link href={`/admin/orders/${o.id}`} className="btn btn-primary self-center">Open order</Link>
              </article>
            ))}
          </div>
        )}
      </Card>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.id} href={qs('/admin/express', { filter: f.id === 'all' ? undefined : f.id, q: sp.q })} className={`rounded-full border px-3 py-1 text-[0.78rem] ${active.id === f.id ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{f.label}</Link>
        ))}
      </div>
      <Card pad={false}>
        <form className="flex gap-2 border-b border-line p-4">
          {sp.filter && <input type="hidden" name="filter" value={sp.filter} />}
          <input name="q" defaultValue={sp.q} placeholder="Customer name or order number" className="field" />
          <button className="btn btn-secondary">Search</button>
        </form>
        {list.rows.length === 0 ? (
          <Empty title="No express orders match" />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-[0.84rem]">
              <thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Fulfilment</th><th>Expected</th><th className="!text-right">Total</th></tr></thead>
              <tbody>
                {list.rows.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link><span className="block text-[0.72rem] text-muted">{formatDateTime(o.createdAt)}</span></td>
                    <td>{o.customerName}<span className="block text-[0.72rem] text-muted">{o.email}</span></td>
                    <td><StatusBadge status={o.paymentStatus} kind="payment" /></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-muted">{o.expectedAt ? formatDateTime(o.expectedAt) : 'Starts after payment'}</td>
                    <td className="text-right">{formatMoney(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={list.pages} href={(n) => qs('/admin/express', { filter: sp.filter, q: sp.q, page: n })} />
      </Card>
    </>
  );
}
