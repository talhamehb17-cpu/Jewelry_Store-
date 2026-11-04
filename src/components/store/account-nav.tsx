'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, LayoutGrid, Package, MapPin, UserRound, Heart, Palette, Star } from 'lucide-react';
import { LogoutButton } from './logout-button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/account', label: 'Overview', icon: LayoutGrid },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/reviews', label: 'Reviews', icon: Star },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/profile', label: 'Profile & security', icon: UserRound },
  { href: '/account/appearance', label: 'Appearance', icon: Palette },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
];

export function AccountNav({ alerts = 0 }: { alerts?: number }) {
  const pathname = usePathname();
  const links = [{ href: '/account/notifications', label: alerts ? `Updates (${alerts})` : 'Updates', icon: Bell }, ...LINKS];
  return (
    <nav className="no-scrollbar -mx-[var(--pad-x)] flex gap-1 overflow-x-auto px-[var(--pad-x)] lg:mx-0 lg:flex-col lg:px-0">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === '/account' ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={cn('flex shrink-0 items-center gap-3 rounded-theme-sm px-4 py-3 text-[0.9rem] transition', active ? 'bg-surface text-ink' : 'text-muted hover:bg-surface/60 hover:text-ink')}>
            <Icon size={17} strokeWidth={1.25} /> {label}
          </Link>
        );
      })}
      <LogoutButton area="store" className="flex w-full items-center gap-3 rounded-theme-sm px-4 py-3 text-[0.9rem] text-muted transition hover:bg-surface/60 hover:text-sale" />
    </nav>
  );
}
