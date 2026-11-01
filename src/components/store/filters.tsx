'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { Drawer } from '@/components/ui/overlay';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import type { Facets, SortKey } from '@/lib/catalog';

export type ActiveFilters = {
  q?: string;
  category?: string;
  materials: string[];
  sizes: string[];
  colors: string[];
  min?: number;
  max?: number;
  availability?: string;
  sort: SortKey;
};

type Props = {
  facets: Facets;
  active: ActiveFilters;
  categories?: { slug: string; name: string }[];
  collections?: { slug: string; name: string }[];
  sortOptions: { value: SortKey; label: string }[];
  total: number;
};

const PRICE_PRESETS = [
  { label: 'Under Rs 10,000', min: undefined, max: 10000 },
  { label: 'Rs 10,000 – 25,000', min: 10000, max: 25000 },
  { label: 'Rs 25,000 – 75,000', min: 25000, max: 75000 },
  { label: 'Over Rs 75,000', min: 75000, max: undefined },
];

function toParams(a: ActiveFilters) {
  const p = new URLSearchParams();
  if (a.q) p.set('q', a.q);
  if (a.category) p.set('category', a.category);
  if (a.materials.length) p.set('material', a.materials.join(','));
  if (a.sizes.length) p.set('size', a.sizes.join(','));
  if (a.colors.length) p.set('color', a.colors.join(','));
  if (a.min != null) p.set('min', String(a.min));
  if (a.max != null) p.set('max', String(a.max));
  if (a.availability) p.set('availability', a.availability);
  if (a.sort && a.sort !== 'featured') p.set('sort', a.sort);
  return p;
}

function useNavigate(active: ActiveFilters) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const go = (patch: Partial<ActiveFilters>) => {
    const qs = toParams({ ...active, ...patch }).toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { go, pending };
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Group({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-line py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[0.78rem] uppercase tracking-[0.16em] [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown size={14} strokeWidth={1.25} className="transition group-open:rotate-180" />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function Check({ label, checked, onChange, count }: { label: string; checked: boolean; onChange: () => void; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[0.88rem]">
      <input type="checkbox" className="checkbox" checked={checked} onChange={onChange} />
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-[0.75rem] text-muted">{count}</span>}
    </label>
  );
}

export function FilterPanel({ facets, active, categories, collections, onlyGroup }: Omit<Props, 'sortOptions' | 'total'> & { onlyGroup?: string }) {
  const show = (g: string) => !onlyGroup || onlyGroup === g;
  const { go, pending } = useNavigate(active);
  const [min, setMin] = useState(active.min?.toString() ?? '');
  const [max, setMax] = useState(active.max?.toString() ?? '');
  const pathname = usePathname();
  return (
    <div className={cn('transition-opacity', pending && 'pointer-events-none opacity-60')}>
      {show('Category') && categories && categories.length > 0 && (
        <Group title="Category">
          <ul className="space-y-1.5 text-[0.9rem]">
            <li><button onClick={() => go({ category: undefined })} className={cn('transition hover:text-accent', !active.category && 'font-medium underline underline-offset-4')}>All jewelry</button></li>
            {categories.map((c) => (
              <li key={c.slug}>
                <button onClick={() => go({ category: c.slug })} className={cn('transition hover:text-accent', active.category === c.slug && 'font-medium underline underline-offset-4')}>{c.name}</button>
              </li>
            ))}
          </ul>
        </Group>
      )}
      {show('Collection') && collections && collections.length > 0 && (
        <Group title="Collection" defaultOpen={false}>
          <ul className="space-y-1.5 text-[0.9rem]">
            {collections.map((c) => (
              <li key={c.slug}><Link href={`/collections/${c.slug}`} className={cn('transition hover:text-accent', pathname === `/collections/${c.slug}` && 'font-medium underline underline-offset-4')}>{c.name}</Link></li>
            ))}
          </ul>
        </Group>
      )}
      {show('Price') && <Group title="Price">
        <div className="space-y-1.5">
          {PRICE_PRESETS.map((p) => {
            const on = active.min === p.min && active.max === p.max;
            return <Check key={p.label} label={p.label} checked={on} onChange={() => (on ? go({ min: undefined, max: undefined }) : go({ min: p.min, max: p.max }))} />;
          })}
        </div>
        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go({ min: min ? Math.max(0, Number(min)) : undefined, max: max ? Math.max(0, Number(max)) : undefined });
          }}
        >
          <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={`Rs ${Math.floor(facets.minPrice / 100)}`} className="field !py-2 text-[0.8rem]" aria-label="Minimum price" />
          <span className="text-muted">–</span>
          <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={`Rs ${Math.ceil(facets.maxPrice / 100)}`} className="field !py-2 text-[0.8rem]" aria-label="Maximum price" />
          <button className="btn btn-secondary btn-sm !px-3">Go</button>
        </form>
      </Group>}
      {show('Material') && facets.materials.length > 0 && (
        <Group title="Material">
          {facets.materials.map((m) => <Check key={m} label={m} checked={active.materials.includes(m)} onChange={() => go({ materials: toggle(active.materials, m) })} />)}
        </Group>
      )}
      {show('Metal colour') && facets.colors.length > 0 && (
        <Group title="Metal colour">
          {facets.colors.map((c) => <Check key={c} label={c} checked={active.colors.includes(c)} onChange={() => go({ colors: toggle(active.colors, c) })} />)}
        </Group>
      )}
      {show('Size') && facets.sizes.length > 0 && (
        <Group title="Size" defaultOpen={!!onlyGroup}>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <button key={s} onClick={() => go({ sizes: toggle(active.sizes, s) })} aria-pressed={active.sizes.includes(s)} className={cn('min-w-11 rounded-theme-sm border px-3 py-1.5 text-[0.8rem] transition', active.sizes.includes(s) ? 'border-ink bg-ink text-bg' : 'border-line hover:border-ink')}>
                {s}
              </button>
            ))}
          </div>
        </Group>
      )}
      {show('Availability') && (
        <Group title="Availability">
          <Check label="In stock only" checked={active.availability === 'in'} onChange={() => go({ availability: active.availability === 'in' ? undefined : 'in' })} />
        </Group>
      )}
    </div>
  );
}

export function SortSelect({ active, sortOptions, className }: { active: ActiveFilters; sortOptions: Props['sortOptions']; className?: string }) {
  const { go } = useNavigate(active);
  return (
    <label className={cn('flex items-center gap-2 text-[0.85rem]', className)}>
      <span className="text-muted max-sm:sr-only">Sort by</span>
      <select value={active.sort} onChange={(e) => go({ sort: e.target.value as SortKey })} className="field !w-auto !py-2 !pl-3 text-[0.85rem]">
        {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function ActiveChips({ active }: { active: ActiveFilters }) {
  const { go } = useNavigate(active);
  const chips: { label: string; clear: Partial<ActiveFilters> }[] = [];
  active.materials.forEach((m) => chips.push({ label: m, clear: { materials: active.materials.filter((x) => x !== m) } }));
  active.colors.forEach((c) => chips.push({ label: c, clear: { colors: active.colors.filter((x) => x !== c) } }));
  active.sizes.forEach((s) => chips.push({ label: `Size ${s}`, clear: { sizes: active.sizes.filter((x) => x !== s) } }));
  if (active.min != null || active.max != null)
    chips.push({ label: `${active.min != null ? formatMoney(active.min * 100) : 'Rs 0'} – ${active.max != null ? formatMoney(active.max * 100) : 'any'}`, clear: { min: undefined, max: undefined } });
  if (active.availability === 'in') chips.push({ label: 'In stock', clear: { availability: undefined } });
  if (!chips.length) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button key={c.label} onClick={() => go(c.clear)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.78rem] transition hover:border-ink">
          {c.label} <X size={12} strokeWidth={1.5} />
        </button>
      ))}
      <button onClick={() => go({ materials: [], colors: [], sizes: [], min: undefined, max: undefined, availability: undefined })} className="text-[0.78rem] text-muted underline underline-offset-4 hover:text-ink">
        Clear all
      </button>
    </div>
  );
}

export function FilterDrawerButton(props: Props & { label?: string; className?: string; side?: 'left' | 'bottom' }) {
  const [open, setOpen] = useState(false);
  const count = props.active.materials.length + props.active.colors.length + props.active.sizes.length + (props.active.min != null || props.active.max != null ? 1 : 0) + (props.active.availability ? 1 : 0);
  return (
    <>
      <button onClick={() => setOpen(true)} className={cn('inline-flex items-center gap-2 rounded-theme-sm border border-line px-4 py-2.5 text-[0.82rem] transition hover:border-ink', props.className)}>
        <SlidersHorizontal size={15} strokeWidth={1.25} /> {props.label ?? 'Filter & sort'} {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.65rem] text-bg">{count}</span>}
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side={props.side ?? 'bottom'}
        title="Filter & sort"
        footer={
          <div className="px-6 py-4">
            <button onClick={() => setOpen(false)} className="btn btn-primary w-full">Show {props.total} {props.total === 1 ? 'piece' : 'pieces'}</button>
          </div>
        }
      >
        <div className="px-6 pb-6">
          <div className="border-b border-line py-5"><SortSelect active={props.active} sortOptions={props.sortOptions} /></div>
          <FilterPanel facets={props.facets} active={props.active} categories={props.categories} collections={props.collections} />
        </div>
      </Drawer>
    </>
  );
}

export function TopbarFilters(props: Props) {
  return (
    <div className="hidden flex-wrap items-center gap-2 lg:flex">
      {(['Category', 'Price', 'Material', 'Metal colour', 'Size', 'Availability'] as const).map((g) => {
        if (g === 'Category' && !props.categories?.length) return null;
        return (
          <details key={g} className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[0.82rem] transition hover:border-ink [&::-webkit-details-marker]:hidden">
              {g} <ChevronDown size={13} strokeWidth={1.25} className="transition group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-full z-30 mt-2 w-72 border border-line bg-bg p-4 shadow-xl rounded-theme-sm [&_details]:border-0 [&_details]:py-0 [&_summary]:hidden">
              <FilterPanel
                facets={props.facets}
                active={props.active}
                categories={props.categories}
                onlyGroup={g}
              />
            </div>
          </details>
        );
      })}
    </div>
  );
}
