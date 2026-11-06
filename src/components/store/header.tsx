'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search, User, Heart, ShoppingBag, Menu, X, ChevronDown, Phone, CalendarDays, Plus, Minus } from 'lucide-react';
import { useStore } from './providers';
import { LogoutButton } from './logout-button';
import { CurrencySwitcher } from './currency-context';
import { Drawer } from '@/components/ui/overlay';
import { Img } from '@/components/ui/img';
import { BRAND } from '@/lib/brand';
import { activeNavHref } from '@/lib/nav';
import { cn } from '@/lib/utils';
import type { ThemeHeader } from '@/themes/types';
import type { NavItem } from '@/lib/settings';

export type HeaderProps = {
  header: ThemeHeader;
  mobileVariant: 'center' | 'left';
  nav: NavItem[];
  user: { firstName: string; isStaff: boolean } | null;
  mega: { title: string; image: string | null; href: string }[];
  phone: string;
  alerts?: number;
};

const SW = 1.25;

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const on = () => setY(window.scrollY);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return y;
}

function useAnnouncementHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = document.getElementById('announcement');
    if (!el) return;
    const measure = () => setH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return h;
}

export function Logo({ header, className, size }: { header: ThemeHeader; className?: string; size?: number }) {
  const s = size ?? Math.min(Math.max(header.logoSize, 56), 84);
  return (
    <span className={cn('relative block shrink-0', className)} style={{ height: s, width: s }}>
      <Image src={BRAND.logo} alt={`${BRAND.name} — ${BRAND.tagline}`} fill sizes="96px" className="object-contain" priority />
    </span>
  );
}

function NavDropdown({ item, current, mega, luxe }: { item: NavItem; current: string | null; mega: HeaderProps['mega']; luxe?: boolean }) {
  const pathname = usePathname().split('?')[0] || '/';
  const active = current === item.href;
  if (!item.children?.length) {
    return (
      <Link href={item.href} onClick={(e) => e.currentTarget.blur()} className="nav-link link-u py-2" aria-current={active ? 'page' : undefined}>
        {item.label}
      </Link>
    );
  }
  return (
    <div className="group/dd relative">
      <Link href={item.href} onClick={(e) => e.currentTarget.blur()} className="nav-link link-u inline-flex items-center gap-1 py-2" aria-current={active ? 'page' : undefined} aria-haspopup="true">
        {item.label}
        <ChevronDown size={12} strokeWidth={1.5} className="opacity-60 transition group-hover/dd:rotate-180" />
      </Link>
      <div className="invisible fixed inset-x-0 top-[4.5rem] z-50 flex justify-center px-4 opacity-0 transition duration-300 group-hover/dd:visible group-hover/dd:opacity-100 group-focus-within/dd:visible group-focus-within/dd:opacity-100">
        <div className="max-h-[70vh] w-[min(920px,calc(100vw-2rem))] overflow-auto rounded-theme border border-line bg-bg text-ink shadow-[0_24px_48px_-28px_rgba(0,0,0,.35)]">
          <div className={cn('p-4', luxe ? 'grid gap-6 md:grid-cols-[180px_minmax(0,1fr)] md:p-6' : 'py-2')}>
            <ul className={cn(luxe && 'space-y-1')}>
              {item.children.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} onClick={(e) => e.currentTarget.blur()} className={cn('block text-[0.86rem] transition hover:text-accent', (pathname === c.href || pathname.startsWith(`${c.href}/`)) && 'font-medium text-accent', luxe ? 'py-1.5' : 'px-5 py-2 hover:bg-surface')}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
            {luxe && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {mega.slice(0, 3).map((m) => (
                  <Link key={m.href} href={m.href} className="group/m block min-w-0">
                    <span className="relative block aspect-[4/5] overflow-hidden rounded-theme-sm bg-surface">
                      <Img src={m.image} alt={m.title} sizes="180px" className="object-cover transition duration-700 group-hover/m:scale-105" />
                    </span>
                    <span className="mt-2 block truncate text-center font-heading text-[0.95rem]">{m.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Icons({ textLabels, user, compact, alerts = 0 }: { textLabels?: boolean; user: HeaderProps['user']; compact?: boolean; alerts?: number }) {
  const { setSearchOpen, setCartOpen, cartCount, wishlist, cartReady } = useStore();
  const count = cartReady ? cartCount : 0;
  const wcount = cartReady ? wishlist.length : 0;
  const accountHref = user ? (user.isStaff ? '/admin' : '/account') : '/account/login';
  if (textLabels) {
    return (
      <div className="nav-link flex items-center gap-6">
        <button onClick={() => setSearchOpen(true)} className="link-u">Search</button>
        <Link href={alerts ? '/account/notifications' : accountHref} className="link-u">{user ? 'Account' : 'Sign in'}{alerts > 0 ? ` (${alerts})` : ''}</Link>
        {user && <LogoutButton area={user.isStaff ? 'admin' : 'store'} className="link-u" />}
        <Link href="/wishlist" className="link-u">Wishlist ({wcount})</Link>
        <button onClick={() => setCartOpen(true)} className="link-u">Bag ({count})</button>
      </div>
    );
  }
  const btn = 'relative grid h-10 w-10 place-items-center rounded-full transition hover:opacity-60';
  return (
    <div className={cn('flex items-center', compact ? 'gap-0' : 'gap-1')}>
      <CurrencySwitcher compact />
      <button onClick={() => setSearchOpen(true)} className={btn} aria-label="Search">
        <Search size={19} strokeWidth={SW} />
      </button>
      {user && <span className="hidden lg:inline-flex"><LogoutButton area={user.isStaff ? 'admin' : 'store'} className="nav-link px-2 text-[0.78rem]" /></span>}
      <Link href={alerts ? '/account/notifications' : accountHref} className={cn(btn, 'max-lg:hidden')} aria-label={alerts ? `Account, ${alerts} delivery updates` : user ? 'Your account' : 'Sign in'}>
        <User size={19} strokeWidth={SW} />
        {alerts > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.58rem] font-semibold text-white">{alerts}</span>}
      </Link>
      <Link href="/wishlist" className={cn(btn, 'max-lg:hidden')} aria-label={`Wishlist (${wcount})`}>
        <Heart size={19} strokeWidth={SW} />
        {wcount > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.58rem] font-semibold text-white">{wcount}</span>}
      </Link>
      <button onClick={() => setCartOpen(true)} className={btn} aria-label={`Shopping bag (${count} items)`}>
        <ShoppingBag size={19} strokeWidth={SW} />
        {count > 0 && <span className="absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-semibold text-on-primary">{count}</span>}
      </button>
    </div>
  );
}

function MobileMenu({ nav, user, phone, current }: { nav: NavItem[]; user: HeaderProps['user']; phone: string; current: string | null }) {
  const { menuOpen, setMenuOpen } = useStore();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const pathname = usePathname();
  useEffect(() => setMenuOpen(false), [pathname, setMenuOpen]);
  return (
    <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" title="Menu">
      <nav className="px-6 py-4">
        {nav.map((item, i) => (
          <div key={item.href} className="border-b border-line">
            {item.children?.length ? (
              <>
                <button className={cn('flex w-full items-center justify-between py-4 text-left font-heading text-xl', current === item.href && 'text-accent')} onClick={() => setOpenIdx(openIdx === i ? null : i)} aria-expanded={openIdx === i} aria-current={current === item.href ? 'page' : undefined}>
                  {item.label}
                  {openIdx === i ? <Minus size={16} strokeWidth={SW} /> : <Plus size={16} strokeWidth={SW} />}
                </button>
                <div className={cn('grid overflow-hidden transition-all duration-500', openIdx === i ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]')}>
                  <ul className="min-h-0 space-y-3 pl-1">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} className="text-[0.95rem] text-muted transition hover:text-ink">{c.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <Link href={item.href} className={cn('block py-4 font-heading text-xl', current === item.href && 'text-accent')} aria-current={current === item.href ? 'page' : undefined}>{item.label}</Link>
            )}
          </div>
        ))}
        <div className="mt-8 space-y-4 text-[0.92rem]">
          <Link href={user ? (user.isStaff ? '/admin' : '/account') : '/account/login'} className="flex items-center gap-3"><User size={17} strokeWidth={SW} /> {user ? `Hello, ${user.firstName}` : 'Sign in / Register'}</Link>
          <Link href="/wishlist" className="flex items-center gap-3"><Heart size={17} strokeWidth={SW} /> Wishlist</Link>
          <Link href="/contact" className="flex items-center gap-3"><Phone size={17} strokeWidth={SW} /> {phone}</Link>
          {user && <LogoutButton area={user.isStaff ? 'admin' : 'store'} className="flex items-center gap-3 text-[0.92rem] text-muted" />}
        </div>
      </nav>
    </Drawer>
  );
}

function FullscreenMenu({ nav, open, onClose }: { nav: NavItem[]; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => onClose(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={cn('fixed inset-0 z-[65] bg-bg transition duration-500', open ? 'visible opacity-100' : 'invisible opacity-0')}>
      <div className="container-x flex h-20 items-center justify-end">
        <button onClick={onClose} className="nav-link inline-flex items-center gap-2">Close <X size={18} strokeWidth={SW} /></button>
      </div>
      <div className="container-x grid gap-12 pt-8 md:grid-cols-[2fr_1fr]">
        <ul className="space-y-2">
          {nav.map((n, i) => (
            <li key={n.href} className={cn('transition duration-700', open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')} style={{ transitionDelay: `${i * 60 + 100}ms` }}>
              <Link href={n.href} className="font-heading text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1.15] transition hover:pl-3 hover:text-accent">{n.label}</Link>
            </li>
          ))}
        </ul>
        <div className="space-y-6 text-[0.95rem] text-muted">
          {nav.filter((n) => n.children?.length).map((n) => (
            <div key={n.href}>
              <p className="eyebrow mb-3">{n.label}</p>
              <ul className="space-y-2">
                {n.children!.map((c) => (
                  <li key={c.href}><Link href={c.href} className="transition hover:text-ink">{c.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Header({ header, mobileVariant, nav, user, mega, phone, alerts = 0 }: HeaderProps) {
  const pathname = usePathname();
  const current = activeNavHref(pathname, nav);
  const { setMenuOpen } = useStore();
  const y = useScrollY();
  const annH = useAnnouncementHeight();
  const scrolled = y > 24;
  const [fsOpen, setFsOpen] = useState(false);
  const v = header.variant;
  const overlayMode = header.transparentOnHome && pathname === '/';
  const transparent = overlayMode && !scrolled;
  const half = Math.ceil(nav.length / 2);

  const shell = cn(
    'z-50 w-full transition-[background-color,box-shadow,color,backdrop-filter] duration-500',
    overlayMode ? 'fixed inset-x-0' : header.sticky ? 'sticky top-0' : 'relative',
    transparent ? 'bg-gradient-to-b from-black/35 to-transparent text-white' : 'bg-[var(--c-header-bg)] text-[var(--c-header-text)]',
    !transparent && header.borderBottom && 'border-b border-line',
    !transparent && scrolled && 'shadow-[0_8px_30px_-22px_rgba(0,0,0,.35)]',
  );

  const mobileBar = (
    <div className={cn('flex h-[72px] items-center justify-between lg:hidden', mobileVariant === 'left' && 'gap-2')}>
      {mobileVariant === 'center' ? (
        <>
          <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center" aria-label="Open menu">
            <Menu size={21} strokeWidth={SW} />
          </button>
          <Link href="/" aria-label="Home" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><Logo header={header} size={40} /></Link>
          <Icons alerts={alerts} user={user} compact />
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <button onClick={() => setMenuOpen(true)} className="-ml-2 grid h-10 w-10 place-items-center" aria-label="Open menu">
              <Menu size={21} strokeWidth={SW} />
            </button>
            <Link href="/" aria-label="Home"><Logo header={header} size={40} /></Link>
          </div>
          <Icons alerts={alerts} user={user} compact />
        </>
      )}
    </div>
  );

  let desktop: React.ReactNode;
  switch (v) {
    case 'inline':
      desktop = (
        <div className="hidden min-h-[72px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2 lg:grid">
          <Link href="/" aria-label="Home" className="justify-self-start"><Logo header={header} size={56} /></Link>
          <nav className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-1">{nav.map((n) => <NavDropdown key={n.href} item={n} current={current} mega={mega} />)}</nav>
          <div className="justify-self-end"><Icons alerts={alerts} user={user} /></div>
        </div>
      );
      break;
    case 'boutique':
      desktop = (
        <div className="hidden lg:block">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center py-5">
            <SearchPill />
            <Link href="/" aria-label="Home"><Logo header={header} /></Link>
            <div className="justify-self-end"><Icons alerts={alerts} user={user} /></div>
          </div>
          <nav className="flex items-center justify-center gap-3 pb-4">
            {nav.map((n, i) => (
              <span key={n.href} className="flex items-center gap-3">
                {i > 0 && <span className="text-accent">·</span>}
                <NavDropdown item={n} current={current} mega={mega} />
              </span>
            ))}
          </nav>
        </div>
      );
      break;
    case 'split':
      desktop = (
        <div className="hidden min-h-[88px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2 lg:grid">
          <nav className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">{nav.slice(0, half).map((n) => <NavDropdown key={n.href} item={n} current={current} mega={mega} />)}</nav>
          <Link href="/" aria-label="Home" className="px-2 xl:px-6"><Logo header={header} size={64} /></Link>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
            <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1">{nav.slice(half).map((n) => <NavDropdown key={n.href} item={n} current={current} mega={mega} />)}</nav>
            <Icons alerts={alerts} user={user} />
          </div>
        </div>
      );
      break;
    case 'masthead':
      desktop = (
        <div className="hidden lg:block">
          <div className="flex items-center justify-between py-2.5 text-[0.7rem] uppercase tracking-[0.2em] text-muted">
            <span>{header.logoTagline}</span>
            <Icons alerts={alerts} user={user} />
          </div>
          <div className={cn('overflow-hidden text-center transition-all duration-500', scrolled ? 'max-h-0 opacity-0' : 'max-h-40 border-t border-line pb-3 pt-4 opacity-100')}>
            <Link href="/" aria-label="Home" className="inline-block leading-none"><Logo header={header} /></Link>
          </div>
          <nav className="flex items-center justify-center gap-10 border-t border-ink py-3">
            {scrolled && <Link href="/" aria-label="Home" className="mr-3"><Logo header={header} size={40} /></Link>}
            {nav.map((n) => <NavDropdown key={n.href} item={n} current={current} mega={mega} />)}
          </nav>
        </div>
      );
      break;
    case 'heritage':
      desktop = (
        <div className="hidden lg:block">
          <div className="-mx-[var(--pad-x)] flex items-center justify-between border-b border-line px-[var(--pad-x)] py-2 text-[0.72rem] tracking-[0.08em] text-muted">
            <span className="inline-flex items-center gap-2"><Phone size={13} strokeWidth={SW} /> {phone}</span>
            <Link href="/contact" className="inline-flex items-center gap-2 transition hover:text-ink"><CalendarDays size={13} strokeWidth={SW} /> Book a private appointment</Link>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center py-5">
            <span />
            <Link href="/" aria-label="Home" className="text-center"><Logo header={header} /></Link>
            <div className="justify-self-end"><Icons alerts={alerts} user={user} /></div>
          </div>
          <nav className="flex items-center justify-center gap-12 border-t border-line py-3.5 [font-variant:small-caps]">{nav.map((n) => <NavDropdown key={n.href} item={n} current={current} mega={mega} />)}</nav>
        </div>
      );
      break;
    case 'menu':
      desktop = (
        <div className="hidden h-[84px] items-center justify-between lg:flex">
          <Link href="/" aria-label="Home"><Logo header={header} /></Link>
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-8">{nav.slice(0, 3).map((n) => <Link key={n.href} href={n.href} onClick={(e) => e.currentTarget.blur()} className="nav-link link-u" aria-current={current === n.href ? 'page' : undefined}>{n.label}</Link>)}</nav>
            <button onClick={() => setFsOpen(true)} className="nav-link inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 transition hover:border-ink">
              <Menu size={15} strokeWidth={SW} /> Menu
            </button>
            <Icons alerts={alerts} user={user} />
          </div>
        </div>
      );
      break;
    case 'parisian':
      desktop = (
        <div className="hidden h-[96px] grid-cols-[1fr_auto_1fr] items-center lg:grid">
          <nav className="flex items-center gap-7">{nav.slice(0, 3).map((n) => <NavDropdown key={n.href} item={n} current={current} mega={mega} />)}</nav>
          <Link href="/" aria-label="Home" className="px-8"><Logo header={header} /></Link>
          <div className="justify-self-end"><Icons alerts={alerts} user={user} textLabels /></div>
        </div>
      );
      break;
    case 'luxe':
      desktop = (
        <div className="hidden lg:block">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center py-5">
            <SearchPill />
            <Link href="/" aria-label="Home"><Logo header={header} /></Link>
            <div className="justify-self-end"><Icons alerts={alerts} user={user} /></div>
          </div>
          <div className="hairline-gold" />
          <nav className="flex items-center justify-center gap-6 py-3 xl:gap-11">{nav.map((n) => <NavDropdown key={n.href} item={n} current={current} mega={mega} luxe />)}</nav>
        </div>
      );
      break;
    case 'floating':
      desktop = null;
      break;
    case 'centered':
    default:
      desktop = (
        <div className="hidden lg:block">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center pb-4 pt-6">
            <SearchPill minimal />
            <Link href="/" aria-label="Home"><Logo header={header} /></Link>
            <div className="justify-self-end"><Icons alerts={alerts} user={user} /></div>
          </div>
          <nav className="flex items-center justify-center gap-11 pb-4">{nav.map((n) => <NavDropdown key={n.href} item={n} current={current} mega={mega} />)}</nav>
        </div>
      );
  }

  if (v === 'floating') {
    return (
      <>
        <div className={cn('z-50 w-full px-3 pt-3 md:px-5', header.sticky ? 'sticky top-0' : 'relative')}>
          <div className={cn('mx-auto flex h-[60px] max-w-[var(--container)] items-center justify-between rounded-full border border-black/5 bg-[var(--c-header-bg)]/85 px-4 text-[var(--c-header-text)] backdrop-blur-xl transition-shadow duration-500 md:px-6', scrolled ? 'shadow-[0_14px_40px_-20px_rgba(0,0,0,.35)]' : 'shadow-[0_6px_24px_-18px_rgba(0,0,0,.25)]')}>
            <div className="flex items-center gap-2">
              <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center lg:hidden" aria-label="Open menu"><Menu size={20} strokeWidth={SW} /></button>
              <Link href="/" aria-label="Home" className="[&>span]:max-lg:!h-10 [&>span]:max-lg:!w-10"><Logo header={header} /></Link>
            </div>
            <nav className="hidden items-center gap-1 lg:flex">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} onClick={(e) => e.currentTarget.blur()} aria-current={current === n.href ? 'page' : undefined} className={cn('nav-link rounded-full px-4 py-2 transition hover:bg-surface', current === n.href && 'bg-surface text-accent')}>{n.label}</Link>
              ))}
            </nav>
            <Icons alerts={alerts} user={user} compact />
          </div>
        </div>
        <MobileMenu nav={nav} user={user} phone={phone} current={current} />
      </>
    );
  }

  return (
    <>
      <header className={shell} style={overlayMode ? { top: Math.max(0, annH - y) } : undefined}>
        <div className="container-x">
          {desktop}
          {mobileBar}
        </div>
      </header>
      <MobileMenu nav={nav} user={user} phone={phone} current={current} />
      {v === 'menu' && <FullscreenMenu nav={nav} open={fsOpen} onClose={() => setFsOpen(false)} />}
    </>
  );
}

function SearchPill({ minimal }: { minimal?: boolean }) {
  const { setSearchOpen } = useStore();
  if (minimal) {
    return (
      <button onClick={() => setSearchOpen(true)} className="nav-link inline-flex items-center gap-2 justify-self-start opacity-80 transition hover:opacity-100">
        <Search size={16} strokeWidth={SW} /> Search
      </button>
    );
  }
  return (
    <button onClick={() => setSearchOpen(true)} className="inline-flex w-56 items-center gap-2 justify-self-start rounded-full border border-line px-4 py-2 text-[0.82rem] text-muted transition hover:border-ink">
      <Search size={15} strokeWidth={SW} /> Search jewelry…
    </button>
  );
}
