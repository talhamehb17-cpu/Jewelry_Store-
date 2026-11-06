'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Modal } from '@/components/ui/overlay';
import { Img } from '@/components/ui/img';
import { Price, Stars } from '@/components/ui/bits';
import { useStore } from './providers';
import { QtyStepper, VariantPicker, useVariantSelection, type PickerVariant } from './variant-picker';
import { GiftPackagingChoice, GiftPurchaseTotal, type GiftPreview } from './gift-packaging';
import { cn } from '@/lib/utils';

type QV = {
  product: { id: number; slug: string; name: string; subtitle: string | null; description: string; price: number; compareAtPrice: number | null; ratingAvg: number; ratingCount: number };
  images: { url: string; alt: string | null }[];
  variants: PickerVariant[];
  gift?: { price: number; images: GiftPreview[] } | null;
};

function Body({ data }: { data: QV }) {
  const { addToCart, setQuickView, toggleWishlist, inWishlist, cart, setGiftPackaging } = useStore();
  const state = useVariantSelection(data.variants);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [hint, setHint] = useState('');
  const [giftOn, setGiftOn] = useState(false);
  const [giftImageId, setGiftImageId] = useState<string | null>(data.gift?.images[0]?.id ?? null);
  const p = data.product;
  const v = state.selected;
  const price = v?.price ?? p.price;
  const compare = v?.compareAtPrice ?? p.compareAtPrice;
  const soldOut = v ? v.stock <= 0 : data.variants.every((x) => x.stock <= 0);
  useEffect(() => {
    if (!data.gift || !v) return;
    const existing = cart.find((item) => item.variantId === v.id);
    if (!existing) return;
    setGiftOn(!!existing.giftPackaging);
    if (existing.giftImageId) setGiftImageId(existing.giftImageId);
  }, [data.gift, v?.id, cart]);
  const add = () => {
    if (state.needsSize || !v) return setHint('Please select a size.');
    if (soldOut) return;
    addToCart({ variantId: v.id, productId: p.id, slug: p.slug, name: p.name, variantTitle: v.title === 'Default' ? null : v.title, image: data.images[0]?.url ?? null, price, giftPackaging: !!data.gift && giftOn, giftImageId: giftOn ? giftImageId : null }, qty);
    setQuickView(null);
  };
  return (
    <div className="grid md:grid-cols-2">
      <div className="bg-surface">
        <div className="relative aspect-[4/5]">
          <Img src={data.images[img]?.url} alt={p.name} sizes="(max-width:768px) 100vw, 450px" priority />
        </div>
        {data.images.length > 1 && (
          <div className="flex gap-2 p-3">
            {data.images.map((im, i) => (
              <button key={im.url} onClick={() => setImg(i)} className={cn('relative h-16 w-14 overflow-hidden border', i === img ? 'border-ink' : 'border-transparent opacity-70')} aria-label={`Image ${i + 1}`}>
                <Img src={im.url} alt="" sizes="60px" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col p-6 md:p-9">
        <h2 className="t-3">{p.name}</h2>
        {p.subtitle && <p className="mt-1 text-[0.85rem] text-muted">{p.subtitle}</p>}
        <div className="mt-3 flex items-center gap-4">
          <Price price={price} compareAt={compare} className="text-lg" />
          {p.ratingCount > 0 && <Stars value={p.ratingAvg} count={p.ratingCount} />}
        </div>
        <p className="mt-5 line-clamp-4 text-[0.9rem] leading-relaxed text-muted">{p.description}</p>
        <div className="mt-6">
          <VariantPicker variants={data.variants} state={state} compact />
        </div>
        {hint && state.needsSize && <p className="mt-3 text-[0.8rem] text-sale">{hint}</p>}
        {data.gift && (
          <>
            <GiftPackagingChoice
              price={data.gift.price}
              images={data.gift.images}
              selected={giftOn}
              imageId={giftImageId}
              quantity={qty}
              onChange={(on, id) => {
                setGiftOn(on);
                setGiftImageId(id);
                if (v && cart.some((item) => item.variantId === v.id)) setGiftPackaging(v.id, on, id);
              }}
            />
            <GiftPurchaseTotal productTotal={price * qty} packaging={data.gift.price * qty} selected={giftOn} />
          </>
        )}
        <div className="mt-6 flex items-center gap-3">
          <QtyStepper value={qty} onChange={setQty} max={Math.max(1, Math.min(20, v?.stock ?? 20))} />
          <button onClick={add} disabled={soldOut} className="btn btn-primary flex-1">{soldOut ? 'Sold out' : 'Add to bag'}</button>
          <button onClick={() => toggleWishlist(p.id, p.name)} className="grid h-12 w-12 place-items-center border border-line rounded-theme-sm" aria-label="Toggle wishlist">
            <Heart size={18} strokeWidth={1.25} className={cn(inWishlist(p.id) && 'fill-current text-sale')} />
          </button>
        </div>
        <Link href={`/products/${p.slug}`} onClick={() => setQuickView(null)} className="link-line mt-6 self-start text-[0.78rem] uppercase tracking-[0.16em]">
          View full details
        </Link>
      </div>
    </div>
  );
}

export function QuickView() {
  const { quickView, setQuickView } = useStore();
  const [data, setData] = useState<QV | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!quickView) return;
    setData(null);
    setError(false);
    fetch(`/api/products/${encodeURIComponent(quickView.slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [quickView]);
  return (
    <Modal open={!!quickView} onClose={() => setQuickView(null)} label="Quick view">
      {error ? (
        <p className="p-10 text-center text-muted">Sorry, this piece could not be loaded.</p>
      ) : data ? (
        <Body key={data.product.id} data={data} />
      ) : (
        <div className="grid md:grid-cols-2">
          <div className="skeleton aspect-[4/5]" />
          <div className="space-y-4 p-9">
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      )}
    </Modal>
  );
}
