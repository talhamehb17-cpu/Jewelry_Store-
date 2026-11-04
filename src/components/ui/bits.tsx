'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, percentOff } from '@/lib/money';
import { formatDisplay } from '@/lib/currency-format';
import { useCurrency } from '@/components/store/currency-context';

export function Price({ price, compareAt, className, saleClass }: { price: number; compareAt?: number | null; className?: string; saleClass?: string }) {
  const book = useCurrency();
  const label = (minor: number) => (book && book.code !== 'PKR' ? formatDisplay(minor, book.code, book.rates) : null) ?? formatMoney(minor);
  const sale = !!compareAt && compareAt > price;
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn(sale && (saleClass ?? 'text-sale'))}>{label(price)}</span>
      {sale && compareAt && <s className="text-[0.85em] text-muted opacity-80">{label(compareAt)}</s>}
    </span>
  );
}

export function Stars({ value, size = 12, className, count }: { value: number; size?: number; className?: string; count?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="inline-flex text-accent">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} strokeWidth={1.25} className={i <= Math.round(value) ? 'fill-current' : 'opacity-40'} />
        ))}
      </span>
      {count != null && <span className="text-[0.72rem] text-muted">({count})</span>}
    </span>
  );
}

export function Badge({ children, tone = 'default', className }: { children: React.ReactNode; tone?: 'default' | 'sale' | 'dark' | 'accent' | 'muted'; className?: string }) {
  const tones = {
    default: 'jewel-badge jewel-badge-neutral',
    sale: 'jewel-badge jewel-badge-sale',
    dark: 'jewel-badge jewel-badge-dark',
    accent: 'jewel-badge jewel-badge-limited',
    muted: 'jewel-badge jewel-badge-neutral',
  } as const;
  return <span className={cn(tones[tone], className)}>{children}</span>;
}

export function productBadges(p: { badges: string[]; compareAtPrice: number | null; price: number; inStock: boolean; isNew: boolean }) {
  const out: { label: string; tone: 'default' | 'sale' | 'dark' | 'accent' | 'muted' }[] = [];
  const off = percentOff(p.price, p.compareAtPrice);
  if (off) out.push({ label: `−${off}%`, tone: 'sale' });
  if (p.isNew || p.badges.includes('new')) out.push({ label: 'New', tone: 'default' });
  if (p.badges.includes('limited')) out.push({ label: 'Limited', tone: 'accent' });
  if (p.badges.includes('bestseller')) out.push({ label: 'Bestseller', tone: 'dark' });
  if (!p.inStock) out.push({ label: 'Sold out', tone: 'dark' });
  return out;
}

export function EmptyState({ icon, title, body, children }: { icon?: React.ReactNode; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      {icon && <div className="mb-6 text-muted">{icon}</div>}
      <h3 className="t-3">{title}</h3>
      {body && <p className="mt-3 text-sm text-muted">{body}</p>}
      {children && <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  heading,
  sub,
  align = 'center',
  className,
  children,
}: {
  eyebrow?: string;
  heading?: string;
  sub?: string;
  align?: 'center' | 'left';
  className?: string;
  children?: React.ReactNode;
}) {
  if (!eyebrow && !heading && !sub && !children) return null;
  return (
    <div className={cn('reveal mb-10 md:mb-14', align === 'center' ? 'mx-auto max-w-2xl text-center' : 'flex flex-wrap items-end justify-between gap-4', className)}>
      <div className={align === 'center' ? '' : 'max-w-2xl'}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        {heading && <h2 className="t-2 text-balance">{heading}</h2>}
        {sub && <p className="mt-4 text-[0.95rem] text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
