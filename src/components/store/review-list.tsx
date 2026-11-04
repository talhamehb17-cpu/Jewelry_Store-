'use client';

import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { Stars } from '@/components/ui/bits';
import { formatDate } from '@/lib/utils';
import type { PublicReview } from '@/lib/reviews';

function Card({ review }: { review: PublicReview }) {
  return (
    <article className="grid gap-5 py-7 first:pt-0 sm:grid-cols-[auto_1fr]">
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

export function ReviewList({ slug, initial, total }: { slug: string; initial: PublicReview[]; total: number }) {
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const more = items.length < total;
  return (
    <div>
      <div className="divide-y divide-line">{items.map((review) => <Card key={review.id} review={review} />)}</div>
      {more && (
        <button
          type="button"
          className="btn btn-secondary mt-6"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError('');
            try {
              const res = await fetch(`/api/reviews?slug=${encodeURIComponent(slug)}&offset=${items.length}&limit=8`);
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Could not load more reviews.');
              setItems((current) => [...current, ...(data.reviews as PublicReview[])]);
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
  );
}
