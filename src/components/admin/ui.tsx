import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, back }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && <Link href={back.href} className="mb-2 inline-block text-[0.8rem] text-muted hover:text-ink">← {back.label}</Link>}
        <h1 className="font-heading text-[2rem] leading-tight">{title}</h1>
        {description && <p className="mt-1 text-[0.86rem] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, pad = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn('admin-card', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-[0.92rem] font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, change, hint, icon }: { label: string; value: React.ReactNode; change?: number; hint?: string; icon?: React.ReactNode }) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between text-muted">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.1em]">{label}</p>
        {icon}
      </div>
      <p className="mt-3 font-heading text-[1.9rem] leading-none">{value}</p>
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
    <nav className="flex items-center justify-between border-t border-line px-5 py-3 text-[0.82rem]">
      <span className="text-muted">Page {page} of {pages}</span>
      <div className="flex items-center gap-1">
        {page > 1 && <Link href={href(page - 1)} className="rounded-md px-2.5 py-1 hover:bg-secondary">Prev</Link>}
        {nums.map((n, i) => (
          <span key={n} className="flex items-center">
            {i > 0 && nums[i - 1]! < n - 1 && <span className="px-1 text-muted">…</span>}
            <Link href={href(n)} className={cn('rounded-md px-2.5 py-1', n === page ? 'bg-ink text-white' : 'hover:bg-secondary')}>{n}</Link>
          </span>
        ))}
        {page < pages && <Link href={href(page + 1)} className="rounded-md px-2.5 py-1 hover:bg-secondary">Next</Link>}
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

export function qs(base: string, params: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}
