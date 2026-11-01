'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useStore } from './providers';
import { Img } from '@/components/ui/img';
import { Price } from '@/components/ui/bits';
import type { CardProduct } from '@/lib/catalog';
import type { CardVariant } from '@/themes/types';

export function WishlistView({ variant }: { variant: CardVariant }) {
  const { wishlist, cartReady, toggleWishlist, addToCart, setQuickView, loggedIn, toast } = useStore();
  const [items, setItems] = useState<CardProduct[] | null>(null);
  const key = wishlist.join(',');
  useEffect(() => {
    if (!cartReady) return;
    if (!wishlist.length) return setItems([]);
    fetch(`/api/products?ids=${key}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, [key, cartReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveToCart = (p: CardProduct) => {
    if (p.variantCount === 1 && p.defaultVariantId) {
      addToCart({ variantId: p.defaultVariantId, productId: p.id, slug: p.slug, name: p.name, variantTitle: null, image: p.image, price: p.price });
      toggleWishlist(p.id);
      toast({ title: 'Moved to your bag', body: p.name });
    } else setQuickView({ slug: p.slug });
  };

  return (
    <div className="container-x pb-24 pt-10 md:pt-14" data-card={variant}>
      <div className="mb-10 text-center">
        <p className="eyebrow">Saved for later</p>
        <h1 className="t-1 mt-3">Your Wishlist</h1>
        {!loggedIn && <p className="mt-3 text-[0.88rem] text-muted"><Link href="/account/login?next=/wishlist" className="underline underline-offset-4">Sign in</Link> to keep your wishlist across devices.</p>}
      </div>
      {items === null ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-[4/5] rounded-theme-sm" />)}</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <Heart size={42} strokeWidth={1} className="mx-auto text-muted" />
          <p className="font-heading mt-6 text-2xl">Your wishlist is empty</p>
          <p className="mt-2 text-muted">Tap the heart on any piece to save it here.</p>
          <Link href="/shop" className="btn btn-primary mt-8">Discover jewelry</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-[var(--grid-gap)] gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <article key={p.id} className="group">
              <Link href={`/products/${p.slug}`} className="relative block overflow-hidden bg-surface ratio-product rounded-theme-sm">
                <Img src={p.image} alt={p.name} sizes="(max-width:768px) 50vw, 25vw" className="transition duration-700 group-hover:scale-105" />
                {!p.inStock && <span className="absolute left-3 top-3 bg-ink px-2 py-1 text-[0.62rem] uppercase tracking-[0.14em] text-bg">Sold out</span>}
              </Link>
              <div className="mt-3">
                <Link href={`/products/${p.slug}`} className="font-heading text-[1.08rem]">{p.name}</Link>
                <div className="text-[0.85rem] text-muted"><Price price={p.price} compareAt={p.compareAtPrice} /></div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => moveToCart(p)} disabled={!p.inStock} className="btn btn-primary btn-sm flex-1"><ShoppingBag size={13} /> {p.variantCount > 1 ? 'Choose size' : 'Move to bag'}</button>
                <button onClick={() => toggleWishlist(p.id, p.name)} className="grid w-10 place-items-center border border-line rounded-theme-sm text-muted transition hover:text-sale" aria-label={`Remove ${p.name}`}><Trash2 size={15} strokeWidth={1.25} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
