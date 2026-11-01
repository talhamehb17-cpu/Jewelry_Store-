'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { useStore, useBodyLock } from './providers';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { CardProduct } from '@/lib/catalog';

const RECENT_KEY = 'aurelle.recentSearches';
type Results = { products: CardProduct[]; total?: number; collections: { slug: string; name: string }[]; categories: { slug: string; name: string }[] };

export function pushRecentSearch(q: string) {
  try {
    const prev: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6)));
  } catch {}
}

export function SearchOverlay({ popular }: { popular: string[] }) {
  const { searchOpen, setSearchOpen } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  useBodyLock(searchOpen);

  useEffect(() => setSearchOpen(false), [pathname, setSearchOpen]);
  useEffect(() => {
    if (!searchOpen) return;
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'));
    } catch {}
    setTimeout(() => input.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSearchOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    const term = q.trim();
    setActive(-1);
    if (term.length < 2) {
      setRes(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setRes(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    pushRecentSearch(t);
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = res?.products ?? [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(list.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && list[active]) {
        pushRecentSearch(q.trim());
        setSearchOpen(false);
        router.push(`/products/${list[active]!.slug}`);
      } else go(q);
    }
  };

  // Autocomplete: suggest the first matching product name as inline completion text
  const completion = res?.products.find((p) => p.name.toLowerCase().startsWith(q.trim().toLowerCase()))?.name;

  return (
    <div className={cn('fixed inset-0 z-[75]', searchOpen ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!searchOpen}>
      <div className={cn('absolute inset-0 bg-black/35 transition-opacity duration-500', searchOpen ? 'opacity-100' : 'opacity-0')} onClick={() => setSearchOpen(false)} />
      <div role="dialog" aria-modal="true" aria-label="Search" className={cn('absolute inset-x-0 top-0 max-h-[92vh] overflow-y-auto bg-bg text-ink shadow-2xl transition duration-500 ease-[cubic-bezier(.2,.7,.2,1)]', searchOpen ? 'translate-y-0' : '-translate-y-full')}>
        <div className="container-x py-6 md:py-10">
          <div className="flex items-center gap-4 border-b border-ink pb-3">
            <Search size={22} strokeWidth={1.25} className="shrink-0" />
            <div className="relative flex-1">
              {completion && q.trim().length >= 2 && (
                <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center whitespace-pre font-heading text-[clamp(1.4rem,3vw,2.2rem)] text-muted/50">
                  <span className="invisible">{q}</span>
                  {completion.slice(q.length)}
                </span>
              )}
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && completion && q.trim().length >= 2) {
                    e.preventDefault();
                    setQ(completion);
                  } else onKeyDown(e);
                }}
                placeholder="Search rings, pearls, gifts…"
                className="relative w-full bg-transparent font-heading text-[clamp(1.4rem,3vw,2.2rem)] outline-none placeholder:text-muted/60"
                aria-label="Search the store"
                role="combobox"
                aria-expanded={!!res}
                aria-controls="search-results"
                aria-autocomplete="both"
              />
            </div>
            <button onClick={() => setSearchOpen(false)} className="p-2 text-muted transition hover:text-ink" aria-label="Close search">
              <X size={22} strokeWidth={1.25} />
            </button>
          </div>

          {!res ? (
            <div className="grid gap-10 py-10 md:grid-cols-2">
              <div>
                <p className="eyebrow mb-4 flex items-center gap-2"><TrendingUp size={13} strokeWidth={1.5} /> Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {popular.map((p) => (
                    <button key={p} onClick={() => go(p)} className="rounded-full border border-line px-4 py-2 text-[0.85rem] transition hover:border-ink">{p}</button>
                  ))}
                </div>
              </div>
              {recent.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="eyebrow flex items-center gap-2"><Clock size={13} strokeWidth={1.5} /> Recent searches</p>
                    <button onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }} className="text-[0.75rem] text-muted underline underline-offset-4 hover:text-ink">Clear</button>
                  </div>
                  <ul className="space-y-2">
                    {recent.map((r) => (
                      <li key={r}><button onClick={() => go(r)} className="text-[0.95rem] transition hover:text-accent">{r}</button></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div id="search-results" className="grid gap-10 py-8 md:grid-cols-[1fr_3fr]">
              <div className="space-y-6 text-[0.92rem]">
                {res.categories.length > 0 && (
                  <div>
                    <p className="eyebrow mb-3">Categories</p>
                    <ul className="space-y-2">{res.categories.map((c) => <li key={c.slug}><Link href={`/collections/${c.slug}`} className="link-u">{c.name}</Link></li>)}</ul>
                  </div>
                )}
                {res.collections.length > 0 && (
                  <div>
                    <p className="eyebrow mb-3">Collections</p>
                    <ul className="space-y-2">{res.collections.map((c) => <li key={c.slug}><Link href={`/collections/${c.slug}`} className="link-u">{c.name}</Link></li>)}</ul>
                  </div>
                )}
                <div>
                  <p className="eyebrow mb-3">Suggestions</p>
                  <ul className="space-y-2">
                    {res.products.slice(0, 4).map((p) => (
                      <li key={p.id}><button onClick={() => go(p.name)} className="text-left transition hover:text-accent">{p.name}</button></li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="eyebrow">Products {res.total != null && `(${res.total})`}</p>
                  {loading && <span className="text-[0.75rem] text-muted">Searching…</span>}
                </div>
                {res.products.length ? (
                  <>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                      {res.products.map((p, i) => (
                        <li key={p.id}>
                          <Link href={`/products/${p.slug}`} onClick={() => pushRecentSearch(q.trim())} className={cn('group block rounded-theme-sm transition', active === i && 'ring-1 ring-accent ring-offset-4 ring-offset-bg')}>
                            <span className="relative block aspect-[4/5] overflow-hidden rounded-theme-sm bg-surface">
                              <Img src={p.image} alt={p.name} sizes="180px" className="transition duration-700 group-hover:scale-105" />
                            </span>
                            <span className="mt-2 block text-[0.85rem] leading-snug">{p.name}</span>
                            <span className="text-[0.8rem] text-muted">{formatMoney(p.price)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => go(q)} className="btn btn-secondary mt-8">View all results <ArrowRight size={14} strokeWidth={1.25} /></button>
                  </>
                ) : (
                  <p className="py-6 text-muted">No pieces match “{q}”. Try “pearl”, “hoops” or “ring”.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
