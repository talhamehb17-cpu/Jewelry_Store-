'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Package, Layers, ShoppingCart, Users, Boxes, BadgePercent, LayoutTemplate, Palette, FileText, BarChart3, Settings, MessageSquare, Star, ExternalLink, LogOut, Menu, X, Database, Megaphone, MapPin, Truck, Coins,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { group: 'Overview', items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }, { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 }] },
  {
    group: 'Commerce',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, badgeKey: 'orders' },
      { href: '/admin/express', label: 'Express orders', icon: Truck, badgeKey: 'express' },
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/collections', label: 'Collections', icon: Layers },
      { href: '/admin/inventory', label: 'Inventory', icon: Boxes, badgeKey: 'lowStock' },
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/discounts', label: 'Discounts', icon: BadgePercent },
      { href: '/admin/marketing', label: 'Events & campaigns', icon: Megaphone },
      { href: '/admin/delivery', label: 'Delivery settings', icon: Truck },
      { href: '/admin/locations', label: 'Locations', icon: MapPin },
      { href: '/admin/currency', label: 'Currency', icon: Coins },
      { href: '/admin/reviews', label: 'Reviews', icon: Star, badgeKey: 'reviews' },
    ],
  },
  {
    group: 'Online store',
    items: [
      { href: '/admin/themes', label: 'Themes', icon: Palette },
      { href: '/admin/builder', label: 'Homepage builder', icon: LayoutTemplate },
      { href: '/admin/pages', label: 'Pages', icon: FileText },
      { href: '/admin/messages', label: 'Messages', icon: MessageSquare, badgeKey: 'messages' },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
] as const;

export function AdminShell({ children, user, badges, dbWarning }: { children: React.ReactNode; user: { name: string; email: string; role: string }; badges: Record<string, number>; dbWarning?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const fullBleed = pathname.startsWith('/admin/themes/') || pathname.startsWith('/admin/builder');
  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-3 px-5 py-5">
        <Image src="/images/brand/logo.webp" alt="EVERMOON" width={44} height={44} className="h-11 w-11 object-contain" />
        <span>
          <span className="block font-heading text-[1.05rem] leading-none tracking-[0.08em]">EVERMOON</span>
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted">Admin</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-3 pb-1.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href);
                const badge = 'badgeKey' in it ? badges[it.badgeKey] : 0;
                return (
                  <li key={it.href}>
                    <Link href={it.href} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-[0.84rem] transition', active ? 'bg-ink text-white' : 'text-[#4a443e] hover:bg-secondary')}>
                      <it.icon size={16} strokeWidth={1.5} />
                      <span className="flex-1">{it.label}</span>
                      {badge ? <span className={cn('rounded-full px-1.5 text-[0.65rem] font-semibold', active ? 'bg-white/20' : 'bg-[#f6efe2] text-[#8a6a2f]')}>{badge}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[0.84rem] text-[#4a443e] hover:bg-secondary"><ExternalLink size={16} strokeWidth={1.5} /> View store</Link>
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[0.84rem] text-[#4a443e] hover:bg-secondary"><LogOut size={16} strokeWidth={1.5} /> Sign out</button>
        </form>
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-secondary px-3 py-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#a8844a] text-[0.75rem] font-semibold text-white">{user.name.slice(0, 1)}</span>
          <span className="min-w-0">
            <span className="block truncate text-[0.8rem] font-medium">{user.name}</span>
            <span className="block truncate text-[0.7rem] capitalize text-muted">{user.role}</span>
          </span>
        </div>
      </div>
    </div>
  );
  return (
    <div className="admin-root min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-white lg:block">{sidebar}</aside>
      <div className={cn('fixed inset-0 z-50 lg:hidden', open ? 'visible' : 'invisible')}>
        <div className={cn('absolute inset-0 bg-black/30 transition', open ? 'opacity-100' : 'opacity-0')} onClick={() => setOpen(false)} />
        <aside className={cn('absolute inset-y-0 left-0 w-72 bg-white shadow-xl transition-transform', open ? 'translate-x-0' : '-translate-x-full')}>{sidebar}</aside>
      </div>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <Image src="/images/brand/logo.webp" alt="EVERMOON" width={36} height={36} className="h-9 w-9 object-contain" />
          <Link href="/" target="_blank" aria-label="View store"><ExternalLink size={18} /></Link>
        </header>
        {dbWarning && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-[0.8rem] text-amber-900">
            <Database size={14} /> {dbWarning} <Link href="/admin/settings#system" className="underline">Details</Link>
          </div>
        )}
        <main className={cn(fullBleed ? '' : 'mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8')}>{children}</main>
      </div>
      {open && <button className="fixed right-4 top-3 z-[60] lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={22} /></button>}
    </div>
  );
}
