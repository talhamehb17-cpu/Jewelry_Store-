import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, back }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-7 sm:gap-4">
      <div className="min-w-0 max-w-full">
        {back && <Link href={back.href} className="mb-2 inline-block text-[0.8rem] text-muted hover:text-ink">← {back.label}</Link>}
        <h1 className="break-words font-heading text-[1.65rem] leading-tight sm:text-[2rem]">{title}</h1>
        {description && <div className="mt-1 max-w-full break-words text-[0.86rem] text-muted">{description}</div>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, pad = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn('admin-card', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3 sm:items-center sm:px-5 sm:py-3.5">
          {title && <h2 className="min-w-0 text-[0.92rem] font-semibold">{title}</h2>}
          {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={pad ? 'p-4 sm:p-5' : ''}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, change, hint, icon }: { label: string; value: React.ReactNode; change?: number; hint?: string; icon?: React.ReactNode }) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="admin-card min-w-0 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 text-muted">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.1em]">{label}</p>
        {icon}
      </div>
      <p className="mt-3 break-words font-heading text-[1.45rem] leading-none tracking-tight sm:text-[1.65rem] xl:text-[1.5rem] 2xl:text-[1.85rem]">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-[0.75rem]">
        {change != null && (
          <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium', up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}%
          </span>
        )}
        {hint && <span className="text-muted">{hint}</span>}
      </div>
    </div>
  );
}

export function Pill({ children, tone = 'stone' }: { children: React.ReactNode; tone?: 'stone' | 'green' | 'amber' | 'rose' | 'sky' | 'violet' | 'gold' }) {
  const t = {
    stone: 'bg-stone-100 text-stone-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
    gold: 'bg-[#f6efe2] text-[#8a6a2f]',
  }[tone];
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium', t)}>{children}</span>;
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {body && <p className="mt-1 text-[0.85rem] text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[0.82rem] sm:px-5">
      <span className="text-muted">Page {page} of {pages}</span>
      <div className="flex flex-wrap items-center gap-1">
        {page > 1 && <Link href={href(page - 1)} className="inline-flex min-h-9 items-center rounded-md px-2.5 py-1 hover:bg-secondary">Prev</Link>}
        {nums.map((n, i) => (
          <span key={n} className="flex items-center">
            {i > 0 && nums[i - 1]! < n - 1 && <span className="px-1 text-muted">…</span>}
            <Link href={href(n)} className={cn('inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-2.5 py-1', n === page ? 'bg-ink text-white' : 'hover:bg-secondary')}>{n}</Link>
          </span>
        ))}
        {page < pages && <Link href={href(page + 1)} className="inline-flex min-h-9 items-center rounded-md px-2.5 py-1 hover:bg-secondary">Next</Link>}
      </div>
    </nav>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[0.72rem] text-muted">{hint}</p>}
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="admin-scroll admin-cards">{children}</div>;
}

export function qs(base: string, params: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}
