import Link from 'next/link';
import { Download, Search } from 'lucide-react';
import { Card, Empty, PageHeader, Pagination, qs } from '@/components/admin/ui';
import { StatusBadge } from '@/components/store/order-status';
import { listOrders } from '@/lib/admin-orders';
import { formatMoney } from '@/lib/money';
import { formatDateTime, ORDER_STATUSES, PAYMENT_STATUSES, titleCase } from '@/lib/utils';

export const metadata = { title: 'Orders' };
const PM: Record<string, string> = { cod: 'COD', bank: 'Bank', wallet: 'Wallet', card: 'Card' };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const f = { q: sp.q, status: sp.status, payment: sp.payment, method: sp.method, from: sp.from, to: sp.to };
  const { rows, count, revenue, pages } = await listOrders(f, page);
  return (
    <>
      <PageHeader title="Orders" description={`${count} orders · ${formatMoney(revenue)} revenue (excl. cancelled)`} actions={<a href={qs('/api/admin/orders/export', f)} className="btn btn-secondary"><Download size={15} /> Export CSV</a>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {['', ...ORDER_STATUSES].map((s) => (
          <Link key={s || 'all'} href={qs('/admin/orders', { ...f, status: s || undefined })} className={`rounded-full border px-3 py-1 text-[0.78rem] ${(sp.status ?? '') === s ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink'}`}>{s ? titleCase(s) : 'All'}</Link>
        ))}
      </div>
      <Card pad={false}>
        <form className="grid gap-2 border-b border-line p-4 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
          <input type="hidden" name="status" value={sp.status ?? ''} />
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={sp.q} placeholder="Order #, name, email or phone" className="field !pl-9" />
          </div>
          <select name="payment" defaultValue={sp.payment ?? ''} className="field"><option value="">Any payment</option>{PAYMENT_STATUSES.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}</select>
          <select name="method" defaultValue={sp.method ?? ''} className="field"><option value="">Any method</option><option value="easypaisa">EasyPaisa</option><option value="jazzcash">JazzCash</option><option value="bank">Bank transfer</option><option value="cod">Cash on Delivery</option><option value="card">Card</option></select>
          <input type="date" name="from" defaultValue={sp.from} className="field" aria-label="From date" />
          <input type="date" name="to" defaultValue={sp.to} className="field" aria-label="To date" />
          <button className="btn btn-secondary">Apply</button>
        </form>
        {rows.length === 0 ? (
          <Empty title="No orders match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-[0.84rem]">
              <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>City</th><th>Method</th><th>Payment</th><th>Fulfilment</th><th className="!text-right">Total</th></tr></thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link></td>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt)}</td>
                    <td><span className="block">{o.customerName}</span><span className="text-[0.72rem] text-muted">{o.email}</span></td>
                    <td className="text-muted">{o.shippingAddress.city}</td>
                    <td>{PM[o.paymentMethod] ?? o.paymentMethod}</td>
                    <td><StatusBadge status={o.paymentStatus} kind="payment" /></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-right font-medium">{formatMoney(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} href={(n) => qs('/admin/orders', { ...f, page: n })} />
      </Card>
    </>
  );
}
