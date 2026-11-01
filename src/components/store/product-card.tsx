'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Plus, ShoppingBag, ArrowRight, Eye } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { Badge, Price, Stars, productBadges } from '@/components/ui/bits';
import { useStore } from './providers';
import { cn } from '@/lib/utils';
import type { CardProduct } from '@/lib/catalog';
import type { CardVariant } from '@/themes/types';

const SIZES = '(max-width: 767px) 50vw, (max-width: 1200px) 33vw, 25vw';

function useCardActions(p: CardProduct) {
  const { addToCart, setQuickView, toggleWishlist, inWishlist } = useStore();
  const quickAdd = () => {
    if (!p.inStock) return;
    if (p.variantCount === 1 && p.defaultVariantId) {
      addToCart({ variantId: p.defaultVariantId, productId: p.id, slug: p.slug, name: p.name, variantTitle: null, image: p.image, price: p.price });
    } else {
      setQuickView({ slug: p.slug });
    }
  };
  return { quickAdd, quickView: () => setQuickView({ slug: p.slug }), wish: () => toggleWishlist(p.id, p.name), wished: inWishlist(p.id) };
}

function Images({ p, className, priority }: { p: CardProduct; className?: string; priority?: boolean }) {
  const [altOn, setAltOn] = useState(false);
  return (
    <span className="absolute inset-0 block" onMouseEnter={() => p.image2 && setAltOn(true)} onFocus={() => p.image2 && setAltOn(true)}>
      <Img src={p.image} alt={p.name} sizes={SIZES} priority={priority} className={cn('transition-[opacity,transform] duration-[1200ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.04]', className)} />
      {altOn && p.image2 && <Img src={p.image2} alt="" sizes={SIZES} className="opacity-0 transition-opacity duration-700 group-hover:opacity-100" />}
    </span>
  );
}

function WishButton({ p, className }: { p: CardProduct; className?: string }) {
  const { wish, wished } = useCardActions(p);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        wish();
      }}
      aria-pressed={wished}
      aria-label={wished ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}
      className={cn('grid h-9 w-9 place-items-center rounded-full transition', className)}
    >
      <Heart size={17} strokeWidth={1.25} className={cn(wished && 'fill-current text-sale')} />
    </button>
  );
}

function Badges({ p, className }: { p: CardProduct; className?: string }) {
  const b = productBadges(p);
  if (!b.length) return null;
  return (
    <div className={cn('pointer-events-none absolute left-3 top-3 z-[2] flex flex-col items-start gap-1.5', className)}>
      {b.map((x) => (
        <Badge key={x.label} tone={x.tone}>
          {x.label}
        </Badge>
      ))}
    </div>
  );
}

export function ProductCard({ p, variant, index = 0, priority }: { p: CardProduct; variant: CardVariant; index?: number; priority?: boolean }) {
  const { quickAdd, quickView } = useCardActions(p);
  const href = `/products/${p.slug}`;
  const addLabel = p.inStock ? (p.variantCount > 1 ? 'Choose options' : 'Add to bag') : 'Sold out';

  switch (variant) {
    case 'minimal':
      return (
        <article className="group">
          <Link href={href} className="relative block overflow-hidden bg-surface ratio-product">
            <Images p={p} priority={priority} />
            <Badges p={p} />
          </Link>
          <button onClick={quickAdd} disabled={!p.inStock} aria-label={addLabel} className="relative z-[3] float-right -mt-12 mr-3 grid h-9 w-9 place-items-center bg-bg text-ink opacity-0 shadow-sm transition group-hover:opacity-100 max-md:opacity-100 disabled:hidden">
            <Plus size={18} strokeWidth={1.25} />
          </button>
          <div className="mt-3 flex items-start justify-between gap-3 text-[0.9rem]">
            <div className="min-w-0">
              <Link href={href} className="block truncate font-medium">{p.name}</Link>
              <p className="truncate text-[0.8rem] text-muted">{p.subtitle}</p>
            </div>
            <Price price={p.price} compareAt={p.compareAtPrice} className="shrink-0 flex-col items-end gap-0 text-right" />
          </div>
        </article>
      );

    case 'rounded':
      return (
        <article className="group rounded-theme bg-surface p-2.5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(120,60,70,.45)]">
          <div className="relative overflow-hidden rounded-[calc(var(--radius)*0.75)] ratio-product">
            <Link href={href} aria-label={p.name} className="absolute inset-0 block">
              <Images p={p} priority={priority} />
            </Link>
            <Badges p={p} className="[&>span]:rounded-full" />
            <WishButton p={p} className="absolute right-2.5 top-2.5 z-[3] bg-bg/90 text-ink shadow-sm" />
            <button onClick={quickView} className="absolute bottom-3 left-1/2 z-[3] -translate-x-1/2 translate-y-3 rounded-full bg-bg/95 px-4 py-2 text-[0.72rem] font-medium text-ink opacity-0 shadow transition duration-500 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden">
              <Eye size={13} strokeWidth={1.5} className="mr-1.5 inline" /> Quick view
            </button>
          </div>
          <div className="px-2 pb-2 pt-3.5 text-center">
            <Link href={href} className="font-heading text-[1.08rem] italic leading-snug">{p.name}</Link>
            <div className="mt-1 text-[0.88rem] text-primary"><Price price={p.price} compareAt={p.compareAtPrice} className="justify-center" /></div>
          </div>
        </article>
      );

    case 'noir':
      return (
        <article className="group">
          <Link href={href} className="relative block overflow-hidden bg-surface ratio-product">
            <Images p={p} priority={priority} />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <span className="pointer-events-none absolute inset-3 border border-accent/0 transition duration-700 group-hover:border-accent/60" />
            <Badges p={p} className="[&>span]:bg-accent [&>span]:text-black" />
          </Link>
          <div className="mt-5 text-center">
            <Link href={href} className="nav-link block text-[0.8rem] text-ink !tracking-[0.22em] !uppercase">{p.name}</Link>
            <div className="mt-2 text-[0.85rem] text-accent"><Price price={p.price} compareAt={p.compareAtPrice} className="justify-center" saleClass="text-accent" /></div>
            <button onClick={quickAdd} disabled={!p.inStock} className="mt-3 inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.22em] text-muted opacity-0 transition group-hover:opacity-100 hover:text-accent max-md:opacity-100 disabled:opacity-40">
              {addLabel} <ArrowRight size={12} strokeWidth={1.25} />
            </button>
          </div>
        </article>
      );

    case 'editorial':
      return (
        <article className="group">
          <Link href={href} className="relative block aspect-[3/4] overflow-hidden bg-surface">
            <Images p={p} priority={priority} className="duration-[2000ms] group-hover:scale-[1.06]" />
            <Badges p={p} className="[&>span]:bg-ink [&>span]:text-bg" />
          </Link>
          <div className="mt-4 grid grid-cols-[auto_1fr] items-baseline gap-x-4 border-t border-ink pt-3">
            <span className="text-[0.7rem] tracking-[0.2em] text-muted">No. {String(index + 1).padStart(2, '0')}</span>
            <div className="flex items-baseline justify-between gap-4">
              <Link href={href} className="font-heading text-[1.35rem] italic leading-tight">{p.name}</Link>
              <span className="whitespace-nowrap text-[0.78rem] uppercase tracking-[0.14em]"><Price price={p.price} compareAt={p.compareAtPrice} /></span>
            </div>
          </div>
          <button onClick={quickAdd} disabled={!p.inStock} className="mt-2 text-[0.72rem] uppercase tracking-[0.18em] text-muted underline-offset-4 opacity-0 transition group-hover:opacity-100 hover:underline max-md:opacity-100 disabled:opacity-40">
            {addLabel} +
          </button>
        </article>
      );

    case 'framed':
      return (
        <article className="group text-center">
          <Link href={href} className="frame-inset relative block overflow-hidden bg-surface ratio-product">
            <Images p={p} priority={priority} />
            <Badges p={p} className="left-5 top-5 [&>span]:bg-primary [&>span]:text-on-primary" />
          </Link>
          <div className="mt-5">
            <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted">{p.category}</p>
            <Link href={href} className="font-heading mt-1.5 block text-[1.15rem]">{p.name}</Link>
            <p className="accent-italic mt-0.5 text-[0.95rem] text-muted">{p.subtitle}</p>
            <div className="mt-2 text-[0.9rem]"><Price price={p.price} compareAt={p.compareAtPrice} className="justify-center" /></div>
            <Link href={href} className="link-line mt-3 inline-block text-[0.7rem] uppercase tracking-[0.18em]">View the piece</Link>
          </div>
        </article>
      );

    case 'nordic':
      return (
        <article className="group">
          <Link href={href} className="relative block overflow-hidden rounded-theme bg-surface ratio-product">
            <Images p={p} priority={priority} className="group-hover:scale-100" />
            <Badges p={p} className="[&>span]:rounded-full [&>span]:bg-bg [&>span]:normal-case [&>span]:tracking-normal" />
          </Link>
          <div className="mt-3 flex items-start justify-between gap-2">
            <div>
              <Link href={href} className="text-[0.92rem]">{p.name}</Link>
              <div className="text-[0.85rem] text-muted"><Price price={p.price} compareAt={p.compareAtPrice} /></div>
            </div>
            <button onClick={quickAdd} disabled={!p.inStock} className="mt-0.5 text-[0.8rem] text-muted underline-offset-4 transition hover:text-ink hover:underline disabled:opacity-40">
              {p.inStock ? 'Add' : 'Sold out'}
            </button>
          </div>
        </article>
      );

    case 'arch':
      return (
        <article className="group text-center">
          <div className="relative">
            <Link href={href} className="arch relative block overflow-hidden bg-surface ratio-product">
              <Images p={p} priority={priority} />
            </Link>
            <Badges p={p} className="left-1/2 top-auto bottom-4 -translate-x-1/2 items-center [&>span]:rounded-full" />
            <WishButton p={p} className="absolute right-1 top-[16%] z-[3] text-ink hover:text-sale" />
          </div>
          <Link href={href} className="font-heading mt-5 block text-[1.3rem] italic leading-tight">{p.name}</Link>
          <p className="mt-1 text-[0.7rem] uppercase tracking-[0.2em] text-muted">{p.subtitle}</p>
          <div className="mt-2 text-[0.9rem]"><Price price={p.price} compareAt={p.compareAtPrice} className="justify-center" /></div>
        </article>
      );

    case 'luxe':
      return (
        <article className="group flex flex-col rounded-theme border border-accent/25 bg-bg p-2 transition duration-500 hover:border-accent/70 hover:shadow-[0_20px_40px_-28px_rgba(168,124,42,.6)]">
          <div className="relative overflow-hidden rounded-[calc(var(--radius)*0.7)] ratio-product">
            <Link href={href} aria-label={p.name} className="absolute inset-0 block">
              <Images p={p} priority={priority} />
            </Link>
            <Badges p={p} className="[&>span]:rounded-sm" />
            <WishButton p={p} className="absolute right-2 top-2 z-[3] bg-bg/90 text-ink" />
          </div>
          <div className="flex flex-1 flex-col px-2 pt-3 text-center">
            {p.ratingCount > 0 && <Stars value={p.ratingAvg} count={p.ratingCount} className="justify-center" size={11} />}
            <Link href={href} className="font-heading mt-1 text-[1.12rem] leading-snug">{p.name}</Link>
            <div className="mt-1 text-[0.95rem] font-semibold"><Price price={p.price} compareAt={p.compareAtPrice} className="justify-center" /></div>
            <button onClick={quickAdd} disabled={!p.inStock} className="btn btn-primary btn-sm mt-3 w-full">
              <ShoppingBag size={14} strokeWidth={1.5} /> {addLabel}
            </button>
          </div>
        </article>
      );

    case 'overlay':
      return (
        <article className="group relative overflow-hidden rounded-theme bg-surface ratio-product transition duration-500 hover:-translate-y-1">
          <Link href={href} aria-label={p.name} className="absolute inset-0">
            <Images p={p} priority={priority} />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
          </Link>
          {p.category && <span className="absolute left-3 top-3 z-[2] rounded-full bg-bg/90 px-3 py-1 text-[0.7rem]">{p.category}</span>}
          <button onClick={quickAdd} disabled={!p.inStock} aria-label={addLabel} className="absolute right-3 top-3 z-[3] grid h-9 w-9 place-items-center rounded-full bg-ink text-bg transition hover:scale-110 disabled:opacity-40">
            <Plus size={17} strokeWidth={1.5} />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] p-4 text-white">
            {!p.inStock && <span className="mb-2 inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[0.65rem] text-black">Sold out</span>}
            <p className="font-heading text-[1.1rem] leading-tight">{p.name}</p>
            <div className="mt-1 text-[0.85rem] opacity-90"><Price price={p.price} compareAt={p.compareAtPrice} saleClass="text-white" /></div>
          </div>
        </article>
      );

    case 'classic':
    default:
      return (
        <article className="group">
          <div className="relative overflow-hidden bg-surface ratio-product rounded-theme-sm">
            <Link href={href} aria-label={p.name} className="absolute inset-0 block">
              <Images p={p} priority={priority} />
            </Link>
            <Badges p={p} />
            <WishButton p={p} className="absolute right-2 top-2 z-[3] bg-bg/80 text-ink opacity-0 backdrop-blur transition group-hover:opacity-100 max-md:opacity-100" />
            <button onClick={quickAdd} disabled={!p.inStock} className="absolute inset-x-0 bottom-0 z-[3] translate-y-full bg-bg/92 py-3 text-[0.7rem] uppercase tracking-[0.2em] text-ink backdrop-blur transition duration-500 group-hover:translate-y-0 max-md:hidden disabled:cursor-not-allowed">
              {addLabel}
            </button>
          </div>
          <div className="mt-4 text-center">
            <Link href={href} className="font-heading text-[1.15rem] leading-snug">{p.name}</Link>
            <div className="mt-1 text-[0.85rem] tracking-wide text-muted"><Price price={p.price} compareAt={p.compareAtPrice} className="justify-center" /></div>
          </div>
        </article>
      );
  }
}

export function ProductGrid({ products, variant, className }: { products: CardProduct[]; variant: CardVariant; className?: string }) {
  return (
    <div className={cn('product-grid', className)}>
      {products.map((p, i) => (
        <div key={p.id} className="reveal" style={{ ['--d' as string]: `${(i % 4) * 90}ms` }}>
          <ProductCard p={p} variant={variant} index={i} priority={i < 2} />
        </div>
      ))}
    </div>
  );
}
