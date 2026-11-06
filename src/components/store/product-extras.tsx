'use client';

import { useActionState, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Star, Check, X } from 'lucide-react';
import { submitReview } from '@/app/actions/store';
import { ProductCard } from './product-card';
import { Rail } from '@/components/sections/slider';
import { Img } from '@/components/ui/img';
import { useBodyLock } from './providers';
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

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const MAX_IMAGE = 2 * 1024 * 1024;

function fileIssue(file: FormDataEntryValue | null, label: string) {
  if (!(file instanceof File) || file.size === 0) return '';
  if (file.type && !IMAGE_TYPES.has(file.type)) return `${label} must be a JPEG, PNG, WebP, GIF or AVIF.`;
  if (file.size > MAX_IMAGE) return `${label} is over 2 MB. Choose a smaller image.`;
  return '';
}

function useViewportBox(active: boolean) {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    if (!active) return;
    const sync = () => {
      const view = window.visualViewport;
      setBox(view ? { top: view.offsetTop, height: view.height } : null);
    };
    sync();
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    window.addEventListener('orientationchange', sync);
    window.addEventListener('focusin', sync);
    return () => {
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('focusin', sync);
    };
  }, [active]);
  return box;
}

/**
 * Write Review used to expand inline inside the delivered-order row.
 * That row is a non-wrapping flex line, and the form's min-content width
 * (nowrap buttons, file inputs, and max-w-xl padding) was wider than a
 * 320–430px screen. The form now opens in a dialog portaled out of that row.
 */
function ReviewSheet({ open, titleId, noteId, pending, pendingRef, onClose, children }: { open: boolean; titleId: string; noteId: string; pending: boolean; pendingRef: { current: boolean }; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const box = useViewportBox(open);
  const [mounted, setMounted] = useState(false);
  onCloseRef.current = onClose;
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open || !mounted) return;
    const root = panel.current;
    const previously = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = () => (root ? [...root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true') : []);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (pendingRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !root) return;
      const list = items();
      if (!list.length) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => root?.focus(), 20);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      previously?.focus();
    };
  }, [open, mounted, pendingRef]);
  if (!open || !mounted) return null;
  const frame = document.querySelector('[data-store-frame]');
  const theme = frame?.getAttribute('data-theme') || document.documentElement.dataset.theme;
  return createPortal(
    <div className="review-sheet" data-theme={theme || undefined} style={{ top: box ? `${box.top}px` : '0px', height: box ? `${Math.max(box.height, 1)}px` : '100dvh' }}>
      <div className="review-sheet-backdrop" onClick={() => { if (!pendingRef.current) onCloseRef.current(); }} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={noteId} tabIndex={-1} className="review-sheet-panel">
        <div className="review-sheet-header">
          <h2 id={titleId} className="min-w-0 font-heading text-[1.25rem] leading-tight">Write a review</h2>
          <button type="button" className="review-sheet-close" onClick={() => onCloseRef.current()} disabled={pending} aria-label="Close review">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    frame ?? document.body,
  );
}

export function ReviewForm({ productId, productName, image, defaultName, avatar, purchases, signedIn, returnTo = '/account' }: { productId: number; productName?: string; image?: string | null; defaultName?: string; avatar?: string | null; purchases: { orderId: number; number: string; name: string }[]; signedIn: boolean; returnTo?: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState(avatar || '');
  const [photoPreview, setPhotoPreview] = useState('');
  const [local, setLocal] = useState<Record<string, string> | null>(null);
  const [state, action, pending] = useActionState(submitReview, null);
  const lock = useRef(false);
  const pendingRef = useRef(false);
  const titleId = useId();
  const noteId = useId();
  const fieldId = useId();
  pendingRef.current = pending;
  useBodyLock(open && !state?.ok);
  useEffect(() => {
    if (!pending) lock.current = false;
  }, [pending]);
  useEffect(() => {
    if (!open) return;
    document.querySelector('.review-sheet [data-error="1"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, local, state]);
  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);
  useEffect(() => () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);
  const close = () => {
    if (pendingRef.current) return;
    setOpen(false);
  };
  if (!signedIn) return <p className="text-[0.88rem] text-muted">Sign in to review a piece from a delivered order. <a className="text-ink underline underline-offset-4" href={`/account/login?next=${encodeURIComponent(returnTo)}`}>Sign in</a></p>;
  if (!purchases.length) return <p className="text-[0.88rem] text-muted">A review opens here after this piece is in an order marked delivered. Each purchase can be reviewed once.</p>;
  if (state?.ok) return <p className="flex items-start gap-2 rounded-theme-sm bg-surface p-4 text-[0.9rem]"><Check size={16} className="mt-0.5 shrink-0 text-accent" /> <span>{state.message}</span></p>;
  const err = { ...(local ?? {}), ...(state?.fieldErrors ?? {}) };
  const banner = local?.upload || (state && !state.ok && !Object.keys(state.fieldErrors ?? {}).length ? state.message : '');
  const piece = productName || purchases[0]?.name || 'this piece';
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (lock.current || pending) {
      event.preventDefault();
      return;
    }
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const body = String(data.get('body') || '').trim();
    const next: Record<string, string> = {};
    if (!rating) next.rating = 'Please choose a rating.';
    if (name.length < 2) next.name = 'Please enter your name.';
    if (body.length < 10) next.body = 'Please share a few more words (10+ characters).';
    const avatarIssue = fileIssue(data.get('avatar'), 'The profile picture');
    const photoIssue = fileIssue(data.get('photo'), 'The review photo');
    if (avatarIssue || photoIssue) next.upload = avatarIssue || photoIssue;
    if (Object.keys(next).length) {
      event.preventDefault();
      setLocal(next);
      return;
    }
    setLocal(null);
    lock.current = true;
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary" aria-haspopup="dialog" aria-expanded={open}>Write a review</button>
      <ReviewSheet open={open} titleId={titleId} noteId={noteId} pending={pending} pendingRef={pendingRef} onClose={close}>
        <form className="review-sheet-form" action={action} onSubmit={onSubmit} noValidate aria-busy={pending}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="rating" value={rating} />
          <div className="review-sheet-body">
            <div className="review-sheet-product">
              {image ? <span className="review-sheet-thumb"><Img src={image} alt="" sizes="72px" /></span> : null}
              <p className="min-w-0 break-words text-[0.95rem]">{piece}</p>
            </div>
            <p id={noteId} className="mt-2 text-[0.8rem] text-muted">Only this delivered purchase can be reviewed. It stays private until the atelier approves it.</p>
            <div className="mt-4">
              <p className="label" id={`${fieldId}-rating`}>Your rating</p>
              <div className="review-sheet-stars" role="group" aria-labelledby={`${fieldId}-rating`} onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} aria-pressed={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="text-accent">
                    <Star size={22} strokeWidth={1.25} className={cn((hover || rating) >= n && 'fill-current')} />
                  </button>
                ))}
              </div>
              {err.rating && <p className="mt-1 text-[0.8rem] text-sale" data-error="1">{err.rating}</p>}
            </div>
            {purchases.length > 1 && (
              <div className="mt-4">
                <label className="label" htmlFor={`${fieldId}-order`}>Purchase</label>
                <select id={`${fieldId}-order`} name="orderId" className="field" defaultValue={purchases[0]!.orderId}>
                  {purchases.map((purchase) => <option key={purchase.orderId} value={purchase.orderId}>{purchase.number} · {purchase.name}</option>)}
                </select>
              </div>
            )}
            {purchases.length === 1 && <input type="hidden" name="orderId" value={purchases[0]!.orderId} />}
            <div className="mt-4">
              <label className="label" htmlFor={`${fieldId}-name`}>Name</label>
              <input id={`${fieldId}-name`} name="name" defaultValue={defaultName} className="field" autoComplete="name" aria-invalid={err.name ? true : undefined} aria-describedby={err.name ? `${fieldId}-name-err` : undefined} />
              {err.name && <p id={`${fieldId}-name-err`} className="mt-1 text-[0.8rem] text-sale" data-error="1">{err.name}</p>}
            </div>
            <div className="mt-4">
              <label className="label" htmlFor={`${fieldId}-title`}>Title</label>
              <input id={`${fieldId}-title`} name="title" className="field" placeholder="Summarise your experience" />
            </div>
            <div className="mt-4">
              <label className="label" htmlFor={`${fieldId}-body`}>Review</label>
              <textarea id={`${fieldId}-body`} name="body" rows={4} className="field" placeholder="How does it look and feel? How’s the fit?" aria-invalid={err.body ? true : undefined} aria-describedby={err.body ? `${fieldId}-body-err` : undefined} />
              {err.body && <p id={`${fieldId}-body-err`} className="mt-1 text-[0.8rem] text-sale" data-error="1">{err.body}</p>}
            </div>
            <div className="mt-4 flex min-w-0 items-center gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface">{avatarPreview ? <img src={avatarPreview} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[0.75rem]">{(defaultName || 'Y').slice(0, 1)}</span>}</span>
              <div className="min-w-0 flex-1">
                <label className="label" htmlFor={`${fieldId}-avatar`}>Profile picture</label>
                <input id={`${fieldId}-avatar`} name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="review-sheet-file" onChange={(event) => { const file = event.target.files?.[0]; setAvatarPreview(file ? URL.createObjectURL(file) : avatar || ''); }} />
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2 text-[0.82rem]"><input type="checkbox" name="saveAvatar" className="checkbox mt-0.5" /> Use this picture on my account too</label>
            <div className="mt-4">
              <label className="label" htmlFor={`${fieldId}-photo`}>Review photo, optional</label>
              <input id={`${fieldId}-photo`} name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="review-sheet-file" onChange={(event) => { const file = event.target.files?.[0]; setPhotoPreview(file ? URL.createObjectURL(file) : ''); }} />
              {photoPreview && <img src={photoPreview} alt="Review photo preview" className="review-sheet-preview" />}
              <p className="mt-1 text-[0.75rem] text-muted">JPEG, PNG, WebP, GIF or AVIF, up to 2 MB. The picture is stored as an image file, not in the database.</p>
            </div>
          </div>
          <div className="review-sheet-footer">
            {banner && <p className="mb-2 w-full text-[0.85rem] text-sale" data-error="1">{banner}</p>}
            <button type="submit" disabled={pending} className="btn btn-primary">{pending ? 'Sending…' : 'Submit review'}</button>
            <button type="button" onClick={close} disabled={pending} className="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </ReviewSheet>
    </>
  );
}
