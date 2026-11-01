import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { ProductGrid } from './product-card';
import { ActiveChips, FilterDrawerButton, FilterPanel, SortSelect, TopbarFilters, type ActiveFilters } from './filters';
import { Img } from '@/components/ui/img';
import { EmptyState } from '@/components/ui/bits';
import { getCategories, getCollections, getFacets, listProducts, SORT_OPTIONS, type ProductFilters, type SortKey } from '@/lib/catalog';
import { getThemeContext } from '@/lib/theme-server';
import { cn } from '@/lib/utils';
import type { Collection } from '@/db/schema';

export type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) =>
  (one(v) ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && n >= 0 && one(v) !== '' && one(v) != null ? n : undefined;
};

export function parseFilters(sp: SP): ActiveFilters & { page: number } {
  const sort = one(sp.sort) as SortKey;
  return {
    q: one(sp.q)?.slice(0, 80) || undefined,
    category: one(sp.category)?.slice(0, 60) || undefined,
    materials: list(sp.material),
    sizes: list(sp.size),
    colors: list(sp.color),
    min: num(sp.min),
    max: num(sp.max),
    availability: one(sp.availability) === 'in' ? 'in' : undefined,
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'featured',
    page: Math.max(1, Math.min(500, Number(one(sp.page)) || 1)),
  };
}

function pageHref(base: string, sp: SP, page: number) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = one(v);
    if (val && k !== 'page') p.set(k, val);
  }
  if (page > 1) p.set('page', String(page));
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function CatalogView({
  base,
  sp,
  title,
  description,
  eyebrow,
  image,
  collection,
  fixedCategory,
  showCategoryFilter,
}: {
  base: string;
  sp: SP;
  title: string;
  description?: string | null;
  eyebrow?: string;
  image?: string | null;
  collection?: Collection | null;
  fixedCategory?: string;
  showCategoryFilter?: boolean;
}) {
  const active = parseFilters(sp);
  const ctx = await getThemeContext();
  const variant = ctx.config.settings.layout.collectionVariant;
  const cardVariant = ctx.config.settings.layout.cardVariant;
  const filters: ProductFilters = {
    q: active.q,
    category: fixedCategory ?? active.category,
    collection,
    materials: active.materials,
    sizes: active.sizes,
    colors: active.colors,
    minPrice: active.min != null ? active.min * 100 : undefined,
    maxPrice: active.max != null ? active.max * 100 : undefined,
    availability: active.availability as 'in' | undefined,
    sort: active.sort,
    page: active.page,
    perPage: 12,
  };
  const [result, facets, categories, collections] = await Promise.all([
    listProducts(filters),
    getFacets({ q: active.q, category: fixedCategory ?? active.category, collection }),
    showCategoryFilter ? getCategories() : Promise.resolve([]),
    getCollections(),
  ]);
  const cats = categories.map((c) => ({ slug: c.slug, name: c.name }));
  const cols = collections.map((c) => ({ slug: c.slug, name: c.name }));
  const filterProps = { facets, active, categories: showCategoryFilter ? cats : undefined, collections: cols, sortOptions: SORT_OPTIONS, total: result.total };

  const crumbs = (
    <nav aria-label="Breadcrumb" className="text-[0.75rem] text-muted">
      <Link href="/" className="hover:text-ink">Home</Link> <span className="mx-1.5">/</span>
      {base !== '/shop' && base !== '/search' && <><Link href="/collections" className="hover:text-ink">Collections</Link> <span className="mx-1.5">/</span></>}
      <span className="text-ink">{title}</span>
    </nav>
  );

  const toolbar = (
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-line pb-4">
      <p className="text-[0.82rem] text-muted">{result.total} {result.total === 1 ? 'piece' : 'pieces'}</p>
      <div className="flex items-center gap-3">
        {variant === 'drawer' && <FilterDrawerButton {...filterProps} label="Filters" side="left" className="max-lg:hidden" />}
        <SortSelect active={active} sortOptions={SORT_OPTIONS} className="max-lg:hidden" />
        <FilterDrawerButton {...filterProps} className="lg:hidden" />
      </div>
    </div>
  );

  const grid = result.items.length ? (
    <>
      <ActiveChips active={active} />
      <ProductGrid products={result.items} variant={cardVariant} className={variant === 'sidebar' || variant === 'banner' ? 'lg:!grid-cols-3' : ''} />
      {result.pages > 1 && (
        <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
          {result.page > 1 && <Link href={pageHref(base, sp, result.page - 1)} className="rounded-theme-sm border border-line px-4 py-2 text-[0.85rem] hover:border-ink" rel="prev">Previous</Link>}
          {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={pageHref(base, sp, n)} aria-current={n === result.page ? 'page' : undefined} className={cn('grid h-10 w-10 place-items-center rounded-theme-sm text-[0.85rem] transition', n === result.page ? 'bg-ink text-bg' : 'hover:bg-surface')}>
              {n}
            </Link>
          ))}
          {result.page < result.pages && <Link href={pageHref(base, sp, result.page + 1)} className="rounded-theme-sm border border-line px-4 py-2 text-[0.85rem] hover:border-ink" rel="next">Next</Link>}
        </nav>
      )}
    </>
  ) : (
    <EmptyState icon={<SearchX size={40} strokeWidth={1} />} title={active.q ? `No results for “${active.q}”` : 'No pieces match these filters'} body="Try removing a filter, or explore our best sellers.">
      <Link href={base + (active.q ? `?q=${encodeURIComponent(active.q)}` : '')} className="btn btn-secondary">Clear filters</Link>
      <Link href="/collections/best-sellers" className="btn btn-primary">Shop best sellers</Link>
    </EmptyState>
  );

  const header =
    variant === 'banner' && image ? (
      <div className="relative flex min-h-[340px] items-end overflow-hidden md:min-h-[420px]">
        <Img src={image} alt="" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/10" />
        <div className="container-x relative pb-10 text-white">
          <p className="mb-3 text-[0.72rem] uppercase tracking-[0.24em] text-white/80">{eyebrow ?? 'Collection'}</p>
          <h1 className="t-1">{title}</h1>
          {description && <p className="mt-3 max-w-xl text-white/85">{description}</p>}
        </div>
      </div>
    ) : variant === 'drawer' ? (
      <div className="container-x pb-8 pt-10 md:pt-16">
        {crumbs}
        <h1 className="mt-6 font-heading leading-[0.95] tracking-[-0.03em]" style={{ fontSize: 'calc(clamp(3rem, 9vw, 8rem) * var(--h-scale))' }}>{title}</h1>
        {description && <p className="mt-5 max-w-xl text-[1.02rem] text-muted">{description}</p>}
      </div>
    ) : variant === 'topbar' ? (
      <div className="container-x pb-6 pt-10 md:pt-14">
        {crumbs}
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="t-1">{title}</h1>
            {description && <p className="mt-3 max-w-xl text-muted">{description}</p>}
          </div>
        </div>
      </div>
    ) : (
      <div className="container-x pb-8 pt-10 text-center md:pt-14">
        {crumbs}
        {eyebrow && <p className="eyebrow mt-6">{eyebrow}</p>}
        <h1 className="t-1 mt-3">{title}</h1>
        {description && <p className="mx-auto mt-4 max-w-xl text-muted">{description}</p>}
      </div>
    );

  return (
    <div className="pb-[var(--section-y)]">
      {header}
      <div className={cn('container-x', variant === 'banner' && 'pt-10')}>
        {variant === 'banner' && image && <div className="mb-6">{crumbs}</div>}
        {variant === 'topbar' ? (
          <>
            <div className="mb-6 flex items-center justify-between gap-4 border-y border-line py-3">
              <TopbarFilters {...filterProps} />
              <p className="text-[0.82rem] text-muted lg:hidden">{result.total} pieces</p>
              <div className="flex items-center gap-3">
                <span className="hidden text-[0.82rem] text-muted lg:inline">{result.total} pieces</span>
                <SortSelect active={active} sortOptions={SORT_OPTIONS} className="max-lg:hidden" />
                <FilterDrawerButton {...filterProps} className="lg:hidden" />
              </div>
            </div>
            {grid}
          </>
        ) : variant === 'drawer' ? (
          <>
            {toolbar}
            {grid}
          </>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[250px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
                <p className="eyebrow mb-1">Refine</p>
                <FilterPanel facets={facets} active={active} categories={showCategoryFilter ? cats : undefined} collections={cols} />
              </div>
            </aside>
            <div>
              {toolbar}
              {grid}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
