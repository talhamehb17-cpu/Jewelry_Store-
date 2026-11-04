'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

const GOLD = '#a8844a';
const INK = '#23201d';
const PALETTE = ['#a8844a', '#23201d', '#c9a96e', '#8a7f74', '#d8c3a0', '#5c5249', '#e8dcc6', '#b76e79'];
const rs = (v: number) => `Rs ${v >= 100000 ? `${(v / 1000).toFixed(0)}k` : v.toLocaleString('en-PK')}`;
const tooltipStyle = { borderRadius: 10, border: '1px solid #e7e2da', fontSize: 12, boxShadow: '0 10px 30px -18px rgba(0,0,0,.3)' };

function ChartFrame({ height, children }: { height: number; children: React.ReactNode }) {
  return <div className="w-full min-w-0 overflow-hidden" style={{ height }}>{children}</div>;
}

export function RevenueChart({ data, height = 280 }: { data: { label: string; revenue: number; orders: number }[]; height?: number }) {
  return (
    <ChartFrame height={height}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#efebe4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7c756d' }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickFormatter={rs} tick={{ fontSize: 11, fill: '#7c756d' }} tickLine={false} axisLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => (n === 'revenue' ? [`Rs ${Number(v).toLocaleString('en-PK')}`, 'Revenue'] : [v, 'Orders'])} />
        <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} fill="url(#rev)" activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
    </ChartFrame>
  );
}

export function OrdersChart({ data, height = 240 }: { data: { label: string; orders: number }[]; height?: number }) {
  return (
    <ChartFrame height={height}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#efebe4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7c756d' }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7c756d' }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f7f5f1' }} formatter={(v) => [v, 'Orders']} />
        <Bar dataKey="orders" fill={INK} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
    </ChartFrame>
  );
}

export function GrowthChart({ data, height = 240 }: { data: { label: string; total: number; new: number }[]; height?: number }) {
  return (
    <ChartFrame height={height}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#efebe4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7c756d' }} tickLine={false} axisLine={false} minTickGap={20} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7c756d' }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, width: '100%' }} />
        <Line type="monotone" dataKey="total" name="Total customers" stroke={GOLD} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="new" name="New this week" stroke={INK} strokeWidth={1.5} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
    </ChartFrame>
  );
}

export function DonutChart({ data, height = 240, money }: { data: { name: string; value: number }[]; height?: number; money?: boolean }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
      <div className="w-full min-w-0 overflow-hidden sm:w-1/2" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => (money ? `Rs ${Number(v).toLocaleString('en-PK')}` : v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full min-w-0 space-y-2 text-[0.8rem] sm:w-1/2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="min-w-0 flex-1 capitalize">{d.name}</span>
            <span className="text-muted">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
