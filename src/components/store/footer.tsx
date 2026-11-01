import Link from 'next/link';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Instagram, Facebook } from '@/components/ui/brand-icons';
import { NewsletterForm } from './newsletter-form';
import { Logo } from './header';
import { cn } from '@/lib/utils';
import type { ThemeFooter, ThemeHeader } from '@/themes/types';
import type { StoreSettings } from '@/lib/settings';

type Props = { footer: ThemeFooter; header: ThemeHeader; settings: StoreSettings };

const PAYMENTS = ['Cash on Delivery', 'EasyPaisa', 'JazzCash', 'Bank Transfer'];

function Pinterest(props: { size?: number }) {
  return (
    <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M11 8.5c2.5-1 5 .5 4.6 3.2-.3 2-2 3.3-3.7 2.6M11.4 10.5 9.5 19" />
    </svg>
  );
}
function TikTok(props: { size?: number }) {
  return (
    <svg width={props.size ?? 18} height={props.size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.4 2.4 2.1 4 4.5 4.2" />
    </svg>
  );
}

function Social({ settings, className }: { settings: StoreSettings; className?: string }) {
  const s = settings.social;
  const items = [
    { href: s.instagram, label: 'Instagram', icon: <Instagram size={18} strokeWidth={1.25} /> },
    { href: s.facebook, label: 'Facebook', icon: <Facebook size={18} strokeWidth={1.25} /> },
    { href: s.pinterest, label: 'Pinterest', icon: <Pinterest /> },
    { href: s.tiktok, label: 'TikTok', icon: <TikTok /> },
  ].filter((x) => x.href);
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {items.map((i) => (
        <a key={i.label} href={i.href} target="_blank" rel="noopener noreferrer" aria-label={i.label} className="grid h-9 w-9 place-items-center rounded-full border border-current/20 transition hover:border-current hover:opacity-80">
          {i.icon}
        </a>
      ))}
    </div>
  );
}

function Columns({ settings, className, titleClass }: { settings: StoreSettings; className?: string; titleClass?: string }) {
  return (
    <>
      {settings.navigation.footer.map((col) => (
        <div key={col.title} className={className}>
          <p className={cn('mb-5 text-[0.7rem] font-medium uppercase tracking-[0.2em] opacity-60', titleClass)}>{col.title}</p>
          <ul className="space-y-3 text-[0.9rem]">
            {col.links.map((l) => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="opacity-85 transition hover:opacity-100 link-u">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function Payments({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Accepted payment methods">
      {PAYMENTS.map((p) => (
        <li key={p} className="rounded-sm border border-current/20 px-2 py-1 text-[0.62rem] uppercase tracking-[0.1em] opacity-70">{p}</li>
      ))}
    </ul>
  );
}

function Contact({ settings, className }: { settings: StoreSettings; className?: string }) {
  const s = settings.store;
  return (
    <ul className={cn('space-y-3 text-[0.88rem] opacity-85', className)}>
      <li className="flex gap-3"><MapPin size={16} strokeWidth={1.25} className="mt-1 shrink-0" />{s.address}</li>
      <li className="flex gap-3"><Phone size={16} strokeWidth={1.25} className="mt-1 shrink-0" /><a href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a></li>
      <li className="flex gap-3"><Mail size={16} strokeWidth={1.25} className="mt-1 shrink-0" /><a href={`mailto:${s.email}`}>{s.email}</a></li>
      <li className="flex gap-3"><Clock size={16} strokeWidth={1.25} className="mt-1 shrink-0" />{s.hours}</li>
    </ul>
  );
}

const year = new Date().getFullYear();

export function Footer({ footer, header, settings }: Props) {
  const name = settings.store.name;
  const shell = 'bg-[var(--c-footer-bg)] text-[var(--c-footer-text)]';
  const copy = <p className="text-[0.75rem] opacity-60">© {year} {name}. All rights reserved.</p>;

  switch (footer.variant) {
    case 'minimal':
      return (
        <footer className={cn(shell, 'border-t border-line')}>
          <div className="container-x grid gap-12 py-16 md:grid-cols-[1.3fr_2fr]">
            <div>
              <p className="font-heading text-2xl tracking-tight">{footer.tagline}</p>
              {footer.showNewsletter && <NewsletterForm className="mt-6 max-w-sm" variant="arrow" />}
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3"><Columns settings={settings} titleClass="normal-case tracking-normal text-[0.85rem] opacity-50" /></div>
          </div>
          <div className="container-x flex flex-wrap items-center justify-between gap-4 border-t border-line py-6">{copy}{footer.showSocial && <Social settings={settings} />}</div>
        </footer>
      );
    case 'boutique':
      return (
        <footer className={cn(shell, 'rounded-t-[calc(var(--radius)*2)]')}>
          <div className="container-x flex flex-col items-center py-20 text-center">
            <Logo header={header} />
            <p className="mt-4 max-w-md text-[0.95rem] opacity-80">{footer.tagline}</p>
            {footer.showNewsletter && <NewsletterForm className="mt-8 max-w-md" variant="pill" />}
            <nav className="mt-12 flex max-w-3xl flex-wrap justify-center gap-x-7 gap-y-3 text-[0.88rem]">
              {settings.navigation.footer.flatMap((c) => c.links).map((l) => (
                <Link key={l.href + l.label} href={l.href} className="link-u opacity-85 hover:opacity-100">{l.label}</Link>
              ))}
            </nav>
            {footer.showSocial && <Social settings={settings} className="mt-10" />}
            {footer.showPayments && <Payments className="mt-8 justify-center" />}
            <div className="mt-8">{copy}</div>
          </div>
        </footer>
      );
    case 'noir':
      return (
        <footer className={shell}>
          <div className="hairline-gold" />
          <div className="container-x py-20">
            <div className="text-center"><Logo header={header} className="text-accent" /></div>
            <div className="mt-16 grid gap-12 md:grid-cols-4">
              <Columns settings={settings} titleClass="text-accent opacity-100 tracking-[0.26em]" />
              <div>
                <p className="mb-5 text-[0.7rem] uppercase tracking-[0.26em] text-accent">Private Client</p>
                <p className="text-[0.88rem] opacity-75">{footer.tagline}</p>
                {footer.showNewsletter && <NewsletterForm className="mt-5" variant="line" buttonLabel="Join" />}
              </div>
            </div>
            <div className="mt-16 flex flex-col items-center gap-6 border-t border-line pt-8 md:flex-row md:justify-between">
              {copy}
              {footer.showPayments && <Payments />}
              {footer.showSocial && <Social settings={settings} />}
            </div>
          </div>
        </footer>
      );
    case 'editorial':
      return (
        <footer className={cn(shell, 'overflow-hidden')}>
          <div className="container-x grid gap-12 pb-10 pt-20 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <p className="eyebrow !text-current opacity-60">The Aurelle Journal</p>
              <p className="font-heading mt-3 text-3xl italic">{footer.tagline}</p>
              {footer.showNewsletter && <NewsletterForm className="mt-6 max-w-sm" variant="line" dark />}
            </div>
            <Columns settings={settings} />
          </div>
          <div className="container-x flex flex-wrap items-center justify-between gap-4 py-6 text-[0.75rem]">{copy}{footer.showSocial && <Social settings={settings} />}</div>
          <p aria-hidden className="font-heading select-none whitespace-nowrap text-center leading-[0.78] tracking-[-0.04em] opacity-95" style={{ fontSize: 'clamp(4rem, 19vw, 20rem)' }}>
            {header.logoText}
          </p>
        </footer>
      );
    case 'heritage':
      return (
        <footer className={shell}>
          <div className="container-x py-20">
            <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr_1fr_1.3fr]">
              <div>
                <Logo header={header} className="items-start" />
                <p className="accent-italic mt-5 text-lg opacity-85">{footer.tagline}</p>
              </div>
              <Columns settings={settings} titleClass="[font-variant:small-caps] normal-case tracking-[0.12em] text-[0.95rem] opacity-80" />
              <div>
                <p className="mb-5 text-[0.95rem] tracking-[0.12em] opacity-80 [font-variant:small-caps]">The Atelier</p>
                <Contact settings={settings} />
              </div>
            </div>
            {footer.showNewsletter && (
              <div className="mt-16 grid items-center gap-6 border-y border-current/15 py-8 md:grid-cols-2">
                <p className="font-heading text-xl">Correspondence from the Maison</p>
                <NewsletterForm variant="line" dark />
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">{copy}{footer.showPayments && <Payments />}</div>
          </div>
        </footer>
      );
    case 'nordic':
      return (
        <footer className={shell}>
          <div className="container-x grid gap-14 py-24 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="max-w-xs">
              <Logo header={header} className="items-start" />
              <p className="mt-5 text-[0.92rem] opacity-70">{footer.tagline}</p>
              {footer.showNewsletter && <NewsletterForm className="mt-8" variant="arrow" />}
            </div>
            <Columns settings={settings} titleClass="normal-case tracking-[0.04em] text-[0.88rem] opacity-50" />
          </div>
          <div className="container-x flex flex-wrap items-center justify-between gap-4 pb-10">{copy}{footer.showSocial && <Social settings={settings} />}</div>
        </footer>
      );
    case 'parisian':
      return (
        <footer className={cn(shell, 'border-t border-line')}>
          <div className="container-x py-20 text-center">
            <p className="font-heading text-[clamp(3rem,7vw,5.5rem)] italic leading-none">Merci</p>
            <p className="mx-auto mt-4 max-w-md opacity-75">{footer.tagline}</p>
            {footer.showNewsletter && (
              <div className="mx-auto mt-10 max-w-md">
                <p className="nav-link mb-3">Les Nouvelles</p>
                <NewsletterForm variant="line" buttonLabel="S’inscrire" />
              </div>
            )}
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-10 text-left sm:grid-cols-3"><Columns settings={settings} /></div>
            {footer.showSocial && <Social settings={settings} className="mt-12 justify-center" />}
            <div className="mt-8">{copy}</div>
          </div>
        </footer>
      );
    case 'glamour':
      return (
        <footer className={shell}>
          {footer.showNewsletter && (
            <div className="border-b border-white/10">
              <div className="container-x grid items-center gap-8 py-14 md:grid-cols-2">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.26em] text-accent">✦ The Aurelle Circle ✦</p>
                  <p className="font-heading mt-3 text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">Join &amp; enjoy 10% off your first order</p>
                </div>
                <NewsletterForm variant="pill" buttonLabel="Unlock 10%" className="[&_input]:text-ink" />
              </div>
            </div>
          )}
          <div className="container-x grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <Logo header={header} className="items-start" />
              <p className="mt-5 text-[0.9rem] opacity-75">{footer.tagline}</p>
              {footer.showSocial && <Social settings={settings} className="mt-6 text-accent" />}
            </div>
            <Columns settings={settings} titleClass="text-accent opacity-100" />
          </div>
          <div className="container-x flex flex-col gap-5 border-t border-white/10 py-7 md:flex-row md:items-center md:justify-between">{copy}{footer.showPayments && <Payments />}</div>
        </footer>
      );
    case 'bento':
      return (
        <footer className="bg-bg pb-4">
          <div className="container-x grid gap-3 md:grid-cols-4">
            <div className="rounded-theme bg-accent p-8 text-white md:col-span-2 md:row-span-2 md:p-10">
              <p className="font-heading text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">Get on the list.</p>
              <p className="mt-3 max-w-sm opacity-90">New drops, private sales and 10% off your first order.</p>
              {footer.showNewsletter && <NewsletterForm variant="line" className="mt-8 max-w-md" dark />}
            </div>
            {settings.navigation.footer.map((col) => (
              <div key={col.title} className="rounded-theme bg-[var(--c-footer-bg)] p-7 text-[var(--c-footer-text)]">
                <p className="mb-4 text-[0.75rem] opacity-50">{col.title}</p>
                <ul className="space-y-2 text-[0.9rem]">
                  {col.links.map((l) => (
                    <li key={l.href + l.label}><Link href={l.href} className="link-u">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex flex-col justify-between rounded-theme bg-surface p-7">
              <Logo header={header} className="items-start" />
              <div>
                <p className="mt-4 text-[0.85rem] text-muted">{footer.tagline}</p>
                {footer.showSocial && <Social settings={settings} className="mt-4" />}
              </div>
            </div>
          </div>
          <div className="container-x mt-6 flex flex-wrap items-center justify-between gap-4 text-ink">{copy}{footer.showPayments && <Payments />}</div>
        </footer>
      );
    case 'soft':
    default:
      return (
        <footer className={shell}>
          {footer.showNewsletter && (
            <div className="border-b border-line">
              <div className="container-x mx-auto max-w-xl py-16 text-center">
                <p className="eyebrow">The Aurelle Circle</p>
                <p className="font-heading mt-3 text-3xl">Join for early access &amp; 10% off</p>
                <NewsletterForm className="mx-auto mt-7 max-w-md" variant="line" />
              </div>
            </div>
          )}
          <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo header={header} className="items-start" />
              <p className="mt-5 max-w-xs text-[0.9rem] opacity-75">{footer.tagline}</p>
              {footer.showSocial && <Social settings={settings} className="mt-6" />}
            </div>
            <Columns settings={settings} />
          </div>
          <div className="container-x flex flex-col gap-5 border-t border-line py-7 md:flex-row md:items-center md:justify-between">{copy}{footer.showPayments && <Payments />}</div>
        </footer>
      );
  }
}
