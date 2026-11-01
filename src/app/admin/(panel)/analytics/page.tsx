import Link from 'next/link';
import { Card, PageHeader, Stat } from '@/components/admin/ui';
import { DonutChart, GrowthChart, OrdersChart, RevenueChart } from '@/components/admin/charts';
import { Img } from '@/components/ui/img';
import { breakdown, customerGrowth, kpis, salesByCategory, salesSeries, topProducts } from '@/lib/analytics';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Analytics' };
const RANGES = [7, 30, 90, 365];
const PM: Record<string, string> = { cod: 'Cash on Delivery', bank: 'Bank transfer', wallet: 'JazzCash / Easypaisa', card: 'Card' };

export default async function Analytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.range)) ? Number(sp.range) : 30;
  const [k, series, top, cats, pms, cities, growth] = await Promise.all([
    kpis(days),
    salesSeries(days),
    topProducts(days, 10),
    salesByCategory(days),
    breakdown(days, 'paymentMethod'),
    breakdown(days, 'city'),
    customerGrowth(Math.min(52, Math.max(8, Math.round(days / 7)))),
  ]);
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Sales, customers and product performance."
        actions={
          <div className="flex rounded-lg border border-line bg-white p-1">
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/analytics?range=${r}`} className={cn('rounded-md px-3 py-1.5 text-[0.8rem]', r === days ? 'bg-ink text-white' : 'text-muted hover:text-ink')}>{r === 365 ? '12 months' : `${r} days`}</Link>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Revenue" value={formatMoney(k.revenue)} change={k.revenueChange} hint={`prev. ${days}d`} />
        <Stat label="Orders" value={k.orders} change={k.ordersChange} />
        <Stat label="Average order" value={formatMoney(k.aov)} change={k.aovChange} />
        <Stat label="New customers" value={k.newCustomers} />
        <Stat label="Returning rate" value={`${k.returningRate}%`} hint="of buyers" />
      </div>
      <div className="mt-6"><Card title="Revenue trend"><RevenueChart data={series} height={320} /></Card></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Orders"><OrdersChart data={series} /></Card>
        <Card title="Customer growth"><GrowthChart data={growth} /></Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Sales by category"><DonutChart data={cats} money /></Card>
        <Card title="Payment methods"><DonutChart data={pms.map((p) => ({ name: PM[p.name] ?? p.name, value: p.value }))} /></Card>
        <Card title="Top cities" pad={false}>
          <ul className="divide-y divide-line">
            {cities.map((c) => (
              <li key={c.name} className="flex items-center justify-between px-5 py-2.5 text-[0.84rem]"><span>{c.name}</span><span className="text-muted">{c.value} orders · Rs {c.revenue.toLocaleString('en-PK')}</span></li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-6">
        <Card title="Best-selling products" pad={false}>
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-[0.84rem]">
              <thead><tr><th>#</th><th>Product</th><th className="!text-right">Units</th><th className="!text-right">Revenue</th><th className="!text-right">Share</th></tr></thead>
              <tbody>
                {top.map((t, i) => {
                  const total = top.reduce((a, b) => a + Number(b.revenue), 0);
                  return (
                    <tr key={`${t.productId}-${i}`}>
                      <td className="text-muted">{i + 1}</td>
                      <td><span className="flex items-center gap-3"><span className="relative h-9 w-9 overflow-hidden rounded-md bg-secondary"><Img src={t.image} alt="" sizes="36px" /></span>{t.productId ? <Link href={`/admin/products/${t.productId}`} className="hover:underline">{t.name}</Link> : t.name}</span></td>
                      <td className="text-right">{t.units}</td>
                      <td className="text-right">{formatMoney(Number(t.revenue))}</td>
                      <td className="text-right text-muted">{total ? Math.round((Number(t.revenue) / total) * 100) : 0}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
