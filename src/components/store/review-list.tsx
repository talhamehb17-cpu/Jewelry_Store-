'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { Stars } from '@/components/ui/bits';
import { formatDate } from '@/lib/utils';
import type { PublicReview } from '@/lib/reviews';

type Bar = { star: number; count: number };

function Card({ review, enter, delay }: { review: PublicReview; enter: boolean; delay: number }) {
  return (
    <article
      className={`grid gap-5 py-7 first:pt-0 sm:grid-cols-[auto_1fr]${enter ? ' review-enter' : ''}`}
      style={enter ? { animationDelay: `${delay}ms` } : undefined}
    >
      <div className="flex items-start gap-4">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-surface">
          {review.avatar ? <Img src={review.avatar} alt="" sizes="56px" /> : <span className="grid h-full place-items-center text-[0.8rem]">{review.name.slice(0, 1)}</span>}
        </span>
        {review.photo && (
          <span className="relative hidden h-24 w-20 overflow-hidden rounded-theme-sm bg-surface sm:block">
            <Img src={review.photo} alt={`${review.name} wearing the piece`} sizes="80px" />
          </span>
        )}
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Stars value={review.rating} size={13} />
          <span className="text-[0.75rem] text-muted">{formatDate(review.createdAt)}</span>
        </div>
        {review.title && <h3 className="mt-3 text-[1rem] font-medium">{review.title}</h3>}
        <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">{review.body}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[0.8rem]">
          {review.name}
          {review.verified && <span className="inline-flex items-center gap-1 text-[0.72rem] text-accent"><BadgeCheck size={14} strokeWidth={1.5} /> Verified purchase</span>}
          {review.studio && <span className="text-[0.68rem] uppercase tracking-[0.14em] text-muted">Studio testimonial · not a verified purchase</span>}
        </p>
        {review.photo && (
          <span className="relative mt-4 block aspect-[4/5] max-w-[180px] overflow-hidden rounded-theme-sm bg-surface sm:hidden">
            <Img src={review.photo} alt="" sizes="180px" />
          </span>
        )}
      </div>
    </article>
  );
}

export function ReviewsSection({
  slug,
  initial,
  total,
  average,
  distribution,
  children,
}: {
  slug: string;
  initial: PublicReview[];
  total: number;
  average: number;
  distribution: Bar[];
  children?: ReactNode;
}) {
  const [items, setItems] = useState(initial);
  const [count, setCount] = useState(total);
  const [avg, setAvg] = useState(average);
  const [bars, setBars] = useState(distribution);
  const [entering, setEntering] = useState<number[]>(() => initial.filter((review) => review.verified && !review.studio).map((review) => review.id));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const seen = useRef(new Set(initial.map((review) => review.id)));
  const lengthRef = useRef(initial.length);

  useEffect(() => {
    lengthRef.current = items.length;
  }, [items.length]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const limit = Math.min(24, Math.max(12, lengthRef.current));
        const res = await fetch(`/api/reviews?slug=${encodeURIComponent(slug)}&offset=0&limit=${limit}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const incoming = (Array.isArray(data.reviews) ? data.reviews : []) as PublicReview[];
        const arrived = incoming.filter((review) => !seen.current.has(review.id) && review.verified && !review.studio).map((review) => review.id);
        for (const review of incoming) seen.current.add(review.id);
        if (cancelled) return;
        if (arrived.length) setEntering((current) => [...new Set([...arrived, ...current])]);
        setItems(incoming);
        setCount(Number(data.total ?? incoming.length));
        setAvg(Number(data.average ?? 0));
        if (Array.isArray(data.distribution)) setBars(data.distribution);
      } catch {
        /* Keep the reviews already on screen if a refresh fails. */
      }
    };
    void pull();
    const timer = window.setInterval(() => void pull(), 4000);
    const onShow = () => {
      if (document.visibilityState === 'visible') void pull();
    };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
    };
  }, [slug]);

  const shown = count || items.length;
  const more = items.length < count;
  return (
    <div className="container-x grid gap-12 md:grid-cols-[1fr_2fr]">
      <div>
        <h2 className="t-2">Reviews</h2>
        {shown > 0 ? (
          <>
            <p className="font-heading mt-6 text-[3.5rem] leading-none">{avg.toFixed(1)}</p>
            <Stars value={avg} size={16} className="mt-2" />
            <p className="mt-2 text-[0.85rem] text-muted">Based on {shown} reviews</p>
            <div className="mt-6 space-y-2">
              {bars.map((row) => (
                <div key={row.star} className="flex items-center gap-3 text-[0.8rem]">
                  <span className="w-6 text-muted">{row.star}★</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-accent" style={{ width: `${shown ? (row.count / shown) * 100 : 0}%` }} /></span>
                  <span className="w-6 text-right text-muted">{row.count}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 text-muted">No reviews yet — be the first to share your thoughts.</p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
      <div>
        <div className="divide-y divide-line" aria-live="polite">
          {items.map((review) => {
            const index = entering.indexOf(review.id);
            return <Card key={review.id} review={review} enter={index >= 0} delay={Math.min(Math.max(index, 0), 6) * 80} />;
          })}
        </div>
        {more && (
          <button
            type="button"
            className="btn btn-secondary mt-6"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError('');
              try {
                const res = await fetch(`/api/reviews?slug=${encodeURIComponent(slug)}&offset=${items.length}&limit=12`, { cache: 'no-store' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Could not load more reviews.');
                const extra = (Array.isArray(data.reviews) ? data.reviews : []) as PublicReview[];
                const arrived = extra.filter((review) => !seen.current.has(review.id) && review.verified && !review.studio).map((review) => review.id);
                for (const review of extra) seen.current.add(review.id);
                if (arrived.length) setEntering((current) => [...new Set([...arrived, ...current])]);
                setItems((current) => {
                  const known = new Set(current.map((review) => review.id));
                  return [...current, ...extra.filter((review) => !known.has(review.id))];
                });
                setCount(Number(data.total ?? count));
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not load more reviews.');
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? 'Loading…' : 'Load more reviews'}
          </button>
        )}
        {error && <p className="mt-3 text-[0.85rem] text-sale">{error}</p>}
      </div>
    </div>
  );
}
