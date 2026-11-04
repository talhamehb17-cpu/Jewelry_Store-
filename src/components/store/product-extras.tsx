'use client';

import { useActionState, useEffect, useState } from 'react';
import { Star, Check } from 'lucide-react';
import { submitReview } from '@/app/actions/store';
import { ProductCard } from './product-card';
import { Rail } from '@/components/sections/slider';
import { cn } from '@/lib/utils';
import type { CardProduct } from '@/lib/catalog';
import type { CardVariant } from '@/themes/types';

const RV_KEY = 'aurelle.recentlyViewed';

export function TrackRecentlyViewed({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const prev: string[] = JSON.parse(localStorage.getItem(RV_KEY) || '[]');
      localStorage.setItem(RV_KEY, JSON.stringify([slug, ...prev.filter((s) => s !== slug)].slice(0, 12)));
    } catch {}
  }, [slug]);
  return null;
}

export function RecentlyViewed({ exclude, variant }: { exclude: string; variant: CardVariant }) {
  const [items, setItems] = useState<CardProduct[]>([]);
  useEffect(() => {
    let slugs: string[] = [];
    try {
      slugs = (JSON.parse(localStorage.getItem(RV_KEY) || '[]') as string[]).filter((s) => s !== exclude).slice(0, 8);
    } catch {}
    if (!slugs.length) return;
    fetch(`/api/products?slugs=${slugs.join(',')}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, [exclude]);
  if (!items.length) return null;
  return (
    <section className="section-y-sm container-x">
      <h2 className="t-3 mb-8">Recently viewed</h2>
      <Rail>{items.map((p, i) => <ProductCard key={p.id} p={p} variant={variant} index={i} />)}</Rail>
    </section>
  );
}

export function ReviewForm({ productId, defaultName, avatar, purchases, signedIn, returnTo = '/account' }: { productId: number; defaultName?: string; avatar?: string | null; purchases: { orderId: number; number: string; name: string }[]; signedIn: boolean; returnTo?: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [preview, setPreview] = useState(avatar || '');
  const [state, action, pending] = useActionState(submitReview, null);
  if (!signedIn) return <p className="text-[0.88rem] text-muted">Sign in to review a piece from a delivered order. <a className="text-ink underline underline-offset-4" href={`/account/login?next=${encodeURIComponent(returnTo)}`}>Sign in</a></p>;
  if (!purchases.length) return <p className="text-[0.88rem] text-muted">A review opens here after this piece is in an order marked delivered. Each purchase can be reviewed once.</p>;
  if (state?.ok) return <p className="flex items-center gap-2 rounded-theme-sm bg-surface p-4 text-[0.9rem]"><Check size={16} className="text-accent" /> {state.message}</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="btn btn-secondary">Write a review</button>;
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="slide-up max-w-xl space-y-4 rounded-theme-sm border border-line p-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <p className="label">Your rating</p>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="text-accent">
              <Star size={24} strokeWidth={1.25} className={cn((hover || rating) >= n && 'fill-current')} />
            </button>
          ))}
        </div>
        {err.rating && <p className="mt-1 text-[0.8rem] text-sale">{err.rating}</p>}
      </div>
      {purchases.length > 1 && (
        <div>
          <label className="label" htmlFor="rv-order">Purchase</label>
          <select id="rv-order" name="orderId" className="field" defaultValue={purchases[0]!.orderId}>
            {purchases.map((purchase) => <option key={purchase.orderId} value={purchase.orderId}>{purchase.number} · {purchase.name}</option>)}
          </select>
        </div>
      )}
      {purchases.length === 1 && <input type="hidden" name="orderId" value={purchases[0]!.orderId} />}
      <div>
        <label className="label" htmlFor="rv-name">Name</label>
        <input id="rv-name" name="name" defaultValue={defaultName} className="field" required />
        {err.name && <p className="mt-1 text-[0.8rem] text-sale">{err.name}</p>}
      </div>
      <div>
        <label className="label" htmlFor="rv-title">Title</label>
        <input id="rv-title" name="title" className="field" placeholder="Summarise your experience" />
      </div>
      <div>
        <label className="label" htmlFor="rv-body">Review</label>
        <textarea id="rv-body" name="body" rows={4} className="field" required placeholder="How does it look and feel? How’s the fit?" />
        {err.body && <p className="mt-1 text-[0.8rem] text-sale">{err.body}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="relative h-12 w-12 overflow-hidden rounded-full bg-surface">{preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[0.75rem]">{(defaultName || 'Y').slice(0, 1)}</span>}</span>
        <div>
          <label className="label" htmlFor="rv-avatar">Profile picture</label>
          <input id="rv-avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="text-[0.8rem]" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); }} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[0.82rem]"><input type="checkbox" name="saveAvatar" className="checkbox" /> Use this picture on my account too</label>
      <div>
        <label className="label" htmlFor="rv-photo">Review photo, optional</label>
        <input id="rv-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="text-[0.8rem]" />
        <p className="mt-1 text-[0.75rem] text-muted">JPEG, PNG, WebP, GIF or AVIF, up to 2 MB. The picture is stored as an image file, not in the database.</p>
      </div>
      {state && !state.ok && !Object.keys(err).length && <p className="text-[0.85rem] text-sale">{state.message}</p>}
      <div className="flex gap-3">
        <button disabled={pending} className="btn btn-primary">{pending ? 'Submitting…' : 'Submit review'}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
