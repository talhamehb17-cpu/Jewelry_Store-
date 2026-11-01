import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { Wallet, ShoppingBag, Receipt, Users, Package, AlertTriangle } from 'lucide-react';
import { getDb } from '@/db';
import { orders, products } from '@/db/schema';
import { Card, PageHeader, Stat } from '@/components/admin/ui';
import { DonutChart, GrowthChart, OrdersChart, RevenueChart } from '@/components/admin/charts';
import { StatusBadge } from '@/components/store/order-status';
import { Img } from '@/components/ui/img';
import { breakdown, customerGrowth, kpis, lowStock, salesSeries, topProducts } from '@/lib/analytics';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const db = await getDb();
  const [user, k, series, top, recent, low, status, growth, [pc]] = await Promise.all([
    getCurrentUser(),
    kpis(30),
    salesSeries(30),
    topProducts(30, 5),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(7),
    lowStock(6),
    breakdown(30, 'status'),
    customerGrowth(12),
    db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.status, 'active')),
  ]);
  const hour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Karachi' }));
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <>
      {denied && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-[0.85rem] text-rose-800">That area requires an administrator account.</p>}
      <PageHeader title={`${greet}, ${user?.firstName ?? 'there'}`} description="Here’s how Maison Aurelle is performing over the last 30 days." actions={<><Link href="/admin/analytics" className="btn btn-secondary">Full analytics</Link><Link href="/admin/products/new" className="btn btn-primary">Add product</Link></>} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <Stat label="Revenue" value={formatMoney(k.revenue)} change={k.revenueChange} hint="vs prev. 30d" icon={<Wallet size={16} />} />
        <Stat label="Orders" value={k.orders} change={k.ordersChange} hint="vs prev. 30d" icon={<ShoppingBag size={16} />} />
        <Stat label="Avg. order" value={formatMoney(k.aov)} change={k.aovChange} icon={<Receipt size={16} />} />
        <Stat label="Customers" value={k.totalCustomers} hint={`+${k.newCustomers} new`} icon={<Users size={16} />} />
        <Stat label="Products" value={pc?.n ?? 0} hint="active" icon={<Package size={16} />} />
        <Stat label="To fulfil" value={k.openOrders} hint="open orders" icon={<AlertTriangle size={16} />} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Revenue" className="xl:col-span-2" actions={<span className="text-[0.75rem] text-muted">Last 30 days · PKR</span>}><RevenueChart data={series} /></Card>
        <Card title="Order status"><DonutChart data={status} /></Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Orders per day" className="xl:col-span-2"><OrdersChart data={series} /></Card>
        <Card title="Best sellers" actions={<Link href="/admin/analytics" className="text-[0.75rem] text-muted hover:text-ink">View all</Link>} pad={false}>
          <ul className="divide-y divide-line">
            {top.map((t, i) => (
              <li key={`${t.productId}-${i}`} className="flex items-center gap-3 px-5 py-3">
                <span className="w-4 text-[0.75rem] text-muted">{i + 1}</span>
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary"><Img src={t.image} alt="" sizes="40px" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[0.84rem]">{t.name}</span><span className="text-[0.72rem] text-muted">{t.units} sold</span></span>
                <span className="text-[0.84rem] font-medium">{formatMoney(Number(t.revenue))}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Recent orders" className="xl:col-span-2" actions={<Link href="/admin/orders" className="text-[0.75rem] text-muted hover:text-ink">All orders</Link>} pad={false}>
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-[0.84rem]">
              <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Status</th><th className="!text-right">Total</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.number}</Link></td>
                    <td className="text-muted">{formatDate(o.createdAt)}</td>
                    <td>{o.customerName}</td>
                    <td><StatusBadge status={o.paymentStatus} kind="payment" /></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-right">{formatMoney(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Low stock" actions={<Link href="/admin/inventory?filter=low" className="text-[0.75rem] text-muted hover:text-ink">Inventory</Link>} pad={false}>
          {low.length ? (
            <ul className="divide-y divide-line">
              {low.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.84rem]">
                  <span className="min-w-0"><Link href={`/admin/products/${v.productId}`} className="block truncate hover:underline">{v.name}</Link><span className="text-[0.72rem] text-muted">{v.title}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[0.72rem] font-medium ${v.stock <= 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{v.stock <= 0 ? 'Out of stock' : `${v.stock} left`}</span>
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-[0.85rem] text-muted">All variants are well stocked.</p>}
        </Card>
      </div>
      <div className="mt-6"><Card title="Customer growth" actions={<span className="text-[0.75rem] text-muted">Last 12 weeks</span>}><GrowthChart data={growth} /></Card></div>
    </>
  );
}
