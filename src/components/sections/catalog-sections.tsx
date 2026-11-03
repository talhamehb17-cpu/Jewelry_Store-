import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { SectionHeading } from '@/components/ui/bits';
import { ProductCard, ProductGrid } from '@/components/store/product-card';
import { Rail } from './slider';
import { Hotspot } from './hotspot';
import { getCardsBySlugs, getCollections, getProductsForSection } from '@/lib/catalog';
import { publicImage } from '@/lib/look';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import type { SectionInstance, ThemeConfig } from '@/themes/types';

type Props = { section: SectionInstance; config: ThemeConfig };
type Tile = { title: string; image?: string; link: string };

export function CategoriesSection({ section }: Props) {
  const st = section.settings;
  const items: Tile[] = Array.isArray(st.items) ? st.items : [];
  if (!items.length) return null;
  switch (section.variant) {
    case 'circles':
      return (
        <section className="section-y-sm container-x">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} />
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-6 md:gap-10">
            {items.map((t, i) => (
              <Link key={t.link + i} href={t.link} className="reveal group flex w-[42%] max-w-[9rem] flex-col items-center sm:w-36" style={{ ['--d' as string]: `${i * 70}ms` }}>
                <span className="relative block h-24 w-24 overflow-hidden rounded-full border-4 border-bg bg-surface shadow-[0_10px_30px_-18px_rgba(0,0,0,.4)] ring-1 ring-line transition duration-500 group-hover:ring-primary md:h-36 md:w-36">
                  <Img src={publicImage(t.image)} alt={t.title} sizes="150px" className="transition duration-700 group-hover:scale-110" />
                </span>
                <span className="mt-4 text-[0.92rem] font-medium">{t.title}</span>
              </Link>
            ))}
          </div>
        </section>
      );
    case 'list':
      return (
        <section className="section-y container-x">
          <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
            <div>
              {st.eyebrow && <p className="mb-3 text-[0.8rem] text-muted">{st.eyebrow}</p>}
              <h2 className="t-2">{st.heading}</h2>
            </div>
            <ul className="border-t border-line">
              {items.map((t, i) => (
                <li key={t.link + i} className="reveal border-b border-line">
                  <Link href={t.link} className="group relative flex items-center justify-between py-5 md:py-6">
                    <span className="flex items-baseline gap-6">
                      <span className="text-[0.75rem] tabular-nums text-muted">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-heading text-[clamp(1.6rem,3.4vw,3rem)] leading-none tracking-tight transition duration-500 group-hover:translate-x-3">{t.title}</span>
                    </span>
                    <span className="pointer-events-none absolute right-16 top-1/2 hidden h-36 w-28 -translate-y-1/2 rotate-3 scale-90 overflow-hidden opacity-0 shadow-xl transition duration-500 group-hover:rotate-0 group-hover:scale-100 group-hover:opacity-100 md:block">
                      <Img src={publicImage(t.image)} alt="" sizes="120px" />
                    </span>
                    <ArrowUpRight size={22} strokeWidth={1.25} className="text-muted transition group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      );
    case 'framed':
      return (
        <section className="section-y container-x">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} />
          <div className="grid gap-8 md:grid-cols-3">
            {items.slice(0, 3).map((t, i) => (
              <Link key={t.link + i} href={t.link} className="reveal group text-center" style={{ ['--d' as string]: `${i * 120}ms` }}>
                <span className="frame-inset relative block aspect-[4/5] overflow-hidden bg-surface">
                  <Img src={publicImage(t.image)} alt={t.title} sizes="(max-width:768px) 100vw, 33vw" className="transition duration-[1500ms] group-hover:scale-105" />
                </span>
                <span className="font-heading mt-6 block text-[1.5rem]">{t.title}</span>
                <span className="mt-2 inline-block text-[0.7rem] uppercase tracking-[0.2em] text-muted [font-variant:small-caps] group-hover:text-ink">Discover the collection</span>
              </Link>
            ))}
          </div>
        </section>
      );
    case 'grid':
      return (
        <section className="section-y container-x">
          <SectionHeading heading={st.heading} align="left" />
          <div className="grid grid-cols-2 gap-[var(--grid-gap)] md:grid-cols-4">
            {items.slice(0, 4).map((t, i) => (
              <Link key={t.link + i} href={t.link} className="reveal group" style={{ ['--d' as string]: `${i * 80}ms` }}>
                <span className="relative block aspect-square overflow-hidden rounded-theme bg-surface">
                  <Img src={publicImage(t.image)} alt={t.title} sizes="(max-width:768px) 50vw, 25vw" className="transition duration-700 group-hover:scale-[1.03]" />
                </span>
                <span className="mt-3 flex items-center justify-between text-[0.95rem]">
                  {t.title} <ArrowRight size={15} strokeWidth={1.25} className="text-muted transition group-hover:translate-x-1 group-hover:text-ink" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      );
    case 'pills':
      return (
        <section className="section-y-sm container-x">
          {st.heading && <h2 className="t-3 mb-6">{st.heading}</h2>}
          <div className="flex flex-wrap gap-3">
            {items.map((t, i) => (
              <Link key={t.link + i} href={t.link} className="group flex min-w-0 items-center gap-3 rounded-full border border-line bg-bg py-2 pl-2 pr-6 transition hover:border-ink hover:bg-ink hover:text-bg">
                <span className="relative block h-12 w-12 overflow-hidden rounded-full bg-surface"><Img src={publicImage(t.image)} alt="" sizes="48px" /></span>
                <span className="text-[0.95rem] font-medium">{t.title}</span>
              </Link>
            ))}
          </div>
        </section>
      );
    case 'tiles':
    default:
      return (
        <section className="section-y container-x">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {items.map((t, i) => (
              <Link key={t.link + i} href={t.link} className="reveal group min-w-0" style={{ ['--d' as string]: `${i * 80}ms` }}>
                <span className="frame-inset relative block aspect-[3/4] overflow-hidden border border-line bg-surface">
                  <Img src={publicImage(t.image)} alt={t.title} sizes="(max-width:768px) 46vw, 18vw" className="transition duration-[1200ms] group-hover:scale-[1.04]" />
                </span>
                <span className="mt-3 block text-center">
                  <span className="font-heading block text-[1.02rem] leading-tight sm:text-[1.2rem]">{t.title}</span>
                  <span className="mt-1 block text-[0.62rem] uppercase tracking-[0.16em] text-muted transition group-hover:text-accent">Shop</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      );
  }
}

export async function FeaturedCollectionsSection({ section }: Props) {
  const st = section.settings;
  const slugs: string[] = Array.isArray(st.collections) ? st.collections : [];
  const all = await getCollections();
  const cols = slugs.map((s) => all.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => !!c);
  if (!cols.length) return null;
  switch (section.variant) {
    case 'arches':
      return (
        <section className="section-y container-x">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} />
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {cols.slice(0, 3).map((c, i) => (
              <Link key={c.id} href={`/collections/${c.slug}`} className="reveal group text-center" style={{ ['--d' as string]: `${i * 150}ms` }}>
                <span className="arch relative mx-auto block aspect-[3/4] max-w-[380px] overflow-hidden bg-surface">
                  <Img src={publicImage(c.image)} alt={c.name} sizes="(max-width:768px) 90vw, 33vw" className="transition duration-[1500ms] group-hover:scale-105" />
                </span>
                <span className="font-heading mt-6 block text-[1.8rem] italic">{c.name}</span>
                <span className="mx-auto mt-2 block max-w-xs text-[0.88rem] text-muted">{c.description}</span>
              </Link>
            ))}
          </div>
        </section>
      );
    case 'numbered':
      return (
        <section className="section-y container-x">
          <div className="mb-10 flex items-end justify-between border-b border-ink pb-4">
            <div>
              {st.eyebrow && <p className="eyebrow mb-2">{st.eyebrow}</p>}
              <h2 className="t-2">{st.heading}</h2>
            </div>
            <Link href="/collections" className="link-line text-[0.75rem] uppercase tracking-[0.2em]">All collections</Link>
          </div>
          <ol>
            {cols.map((c, i) => (
              <li key={c.id} className="reveal border-b border-line">
                <Link href={`/collections/${c.slug}`} className="group grid grid-cols-[3rem_1fr_auto] items-center gap-4 py-6 md:grid-cols-[5rem_1fr_1fr_auto] md:py-8">
                  <span className="font-heading text-[1.6rem] italic text-muted">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-heading text-[clamp(1.6rem,3.6vw,3.2rem)] leading-none transition duration-500 group-hover:italic">{c.name}</span>
                  <span className="hidden text-[0.9rem] text-muted md:block">{c.description}</span>
                  <span className="relative h-16 w-12 overflow-hidden bg-surface md:h-24 md:w-20"><Img src={publicImage(c.image)} alt="" sizes="80px" className="transition duration-700 group-hover:scale-110" /></span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      );
    case 'tiles':
    default:
      return (
        <section className="section-y container-x">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} />
          <div className={cn('grid gap-[var(--grid-gap)]', cols.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
            {cols.slice(0, 3).map((c, i) => (
              <Link key={c.id} href={`/collections/${c.slug}`} className="reveal group relative block aspect-[4/5] overflow-hidden bg-surface" style={{ ['--d' as string]: `${i * 140}ms` }}>
                <Img src={publicImage(c.image)} alt={c.name} sizes="(max-width:768px) 100vw, 33vw" className="transition duration-[1600ms] group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-7 text-white">
                  <span className="font-heading block text-[1.7rem]">{c.name}</span>
                  <span className="mt-3 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.24em] text-accent">Explore <ArrowRight size={13} strokeWidth={1.25} className="transition group-hover:translate-x-1" /></span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      );
  }
}

export async function ProductGridSection({ section, config }: Props) {
  const st = section.settings;
  const products = await getProductsForSection(st);
  if (!products.length) return null;
  const variant = config.settings.layout.cardVariant;
  const viewAll = st.viewAllLink ? (
    <Link href={st.viewAllLink} className="btn btn-secondary">{st.viewAllLabel || 'View all'}</Link>
  ) : null;
  const headingAlign = ['minimal', 'nordic', 'overlay', 'editorial'].includes(variant) ? 'left' : 'center';

  switch (section.variant) {
    case 'carousel':
      return (
        <section className="section-y container-x overflow-hidden">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} sub={st.subheading} align={headingAlign}>
            {headingAlign === 'left' && viewAll}
          </SectionHeading>
          <Rail>
            {products.map((p, i) => <ProductCard key={p.id} p={p} variant={variant} index={i} />)}
          </Rail>
          {headingAlign === 'center' && viewAll && <div className="mt-6 text-center md:-mt-11">{viewAll}</div>}
        </section>
      );
    case 'asymmetric':
      return (
        <section className="section-y container-x">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} sub={st.subheading} align="left">{viewAll}</SectionHeading>
          <div className="grid grid-cols-2 gap-x-[var(--grid-gap)] gap-y-12 md:grid-cols-4">
            {products.map((p, i) => (
              <div key={p.id} className={cn('reveal', i === 0 && 'col-span-2 md:row-span-2')} style={{ ['--d' as string]: `${(i % 3) * 120}ms` }}>
                <ProductCard p={p} variant={variant} index={i} priority={i === 0} />
              </div>
            ))}
          </div>
        </section>
      );
    case 'offset':
      return (
        <section className="section-y container-x">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} sub={st.subheading} align="left">{viewAll}</SectionHeading>
          <div className="product-grid">
            {products.map((p, i) => (
              <div key={p.id} className={cn('reveal', i % 2 === 1 && 'md:mt-10')} style={{ ['--d' as string]: `${(i % 4) * 90}ms` }}>
                <ProductCard p={p} variant={variant} index={i} />
              </div>
            ))}
          </div>
        </section>
      );
    case 'grid':
    default:
      return (
        <section className="section-y container-x">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} sub={st.subheading} align={headingAlign}>
            {headingAlign === 'left' && viewAll}
          </SectionHeading>
          <ProductGrid products={products} variant={variant} />
          {headingAlign === 'center' && viewAll && <div className="mt-14 text-center">{viewAll}</div>}
        </section>
      );
  }
}

export async function CompleteTheLookSection({ section, config }: Props) {
  const st = section.settings;
  const slugs: string[] = Array.isArray(st.products) ? st.products : [];
  const products = await getCardsBySlugs(slugs.slice(0, 6));
  if (!products.length) return null;
  const hotspots: { x: number; y: number; product: string }[] = Array.isArray(st.hotspots) ? st.hotspots : [];
  const total = products.reduce((a, p) => a + p.price, 0);
  return (
    <section className="section-y bg-surface">
      <div className="container-x grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="reveal relative aspect-[4/5] overflow-hidden rounded-theme-sm bg-bg">
          <Img src={st.image} alt={st.heading ?? 'Styled look'} sizes="(max-width:768px) 100vw, 50vw" />
          {hotspots.map((h, i) => {
            const p = products.find((x) => x.slug === h.product);
            return p ? <Hotspot key={i} x={h.x} y={h.y} product={p} /> : null;
          })}
        </div>
        <div>
          {st.eyebrow && <p className="eyebrow mb-3">{st.eyebrow}</p>}
          <h2 className="t-2">{st.heading}</h2>
          {st.body && <p className="mt-4 max-w-md text-muted">{st.body}</p>}
          <div className="mt-8 grid grid-cols-2 gap-[var(--grid-gap)]">
            {products.slice(0, 4).map((p, i) => <ProductCard key={p.id} p={p} variant={config.settings.layout.cardVariant === 'overlay' ? 'overlay' : 'minimal'} index={i} />)}
          </div>
          <p className="mt-6 text-[0.85rem] text-muted">The complete look: <span className="text-ink">{formatMoney(total)}</span></p>
        </div>
      </div>
    </section>
  );
}
