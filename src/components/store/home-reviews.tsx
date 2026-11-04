'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { SectionHeading, Stars } from '@/components/ui/bits';
import { TextSlider } from '@/components/sections/text-slider';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { HomeReviewCard } from '@/lib/reviews';

function Person({ review, align = 'start' }: { review: HomeReviewCard; align?: 'start' | 'center' }) {
  return (
    <span className={cn('flex items-center gap-3', align === 'center' && 'justify-center')}>
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface">
        {review.avatar ? <Img src={review.avatar} alt="" sizes="44px" /> : <span className="grid h-full place-items-center text-[0.72rem]">{review.name.slice(0, 1)}</span>}
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-[0.84rem] font-medium normal-case tracking-normal">{review.name}</span>
        <span className="mt-0.5 block text-[0.62rem] uppercase tracking-[0.14em] text-muted">
          {review.verified ? (
            <span className="inline-flex items-center gap-1 text-accent"><BadgeCheck size={12} strokeWidth={1.5} /> Verified purchase</span>
          ) : review.studio ? (
            'Studio testimonial · not a verified purchase'
          ) : (
            'Customer note'
          )}
        </span>
      </span>
    </span>
  );
}

function Piece({ review }: { review: HomeReviewCard }) {
  if (!review.productSlug) return null;
  return (
    <Link href={`/products/${review.productSlug}`} className="mt-auto flex items-center gap-3 border-t border-line px-4 py-3 text-[0.82rem] transition hover:bg-surface">
      {review.productImage ? (
        <span className="relative block h-16 w-14 shrink-0 overflow-hidden bg-surface">
          <Img src={review.productImage} alt="" sizes="56px" />
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-[0.62rem] uppercase tracking-[0.14em] text-muted">The piece</span>
        <span className="mt-1 block truncate font-medium">{review.productName}</span>
      </span>
    </Link>
  );
}

function Card({ review, enter, delay, layout }: { review: HomeReviewCard; enter: boolean; delay: number; layout: 'card' | 'letter' | 'slide' | 'marquee' }) {
  const motion = enter ? 'review-enter' : '';
  const style = enter ? { animationDelay: `${delay}ms` } : undefined;
  if (layout === 'letter') {
    return (
      <figure className={cn('py-8 first:pt-0', motion)} style={style}>
        <Stars value={review.rating} size={13} />
        {review.title && <p className="mt-3 text-[0.95rem] font-medium">{review.title}</p>}
        <blockquote className="mt-3 font-heading text-[clamp(1.2rem,2vw,1.55rem)] italic leading-snug">“{review.quote}”</blockquote>
        {review.date && <p className="mt-3 text-[0.75rem] text-muted">{formatDate(review.date)}</p>}
        <figcaption className="mt-4">
          <Person review={review} />
          {review.productSlug && (
            <Link href={`/products/${review.productSlug}`} className="mt-4 flex items-center gap-3 text-[0.82rem]">
              {review.productImage && (
                <span className="relative block h-16 w-14 shrink-0 overflow-hidden rounded-theme-sm bg-bg">
                  <Img src={review.productImage} alt="" sizes="56px" />
                </span>
              )}
              <span className="min-w-0 truncate">{review.productName}</span>
            </Link>
          )}
        </figcaption>
      </figure>
    );
  }
  if (layout === 'slide') {
    return (
      <figure className={motion} style={style}>
        <Stars value={review.rating} size={14} className="justify-center" />
        {review.title && <p className="mt-4 text-[0.95rem]">{review.title}</p>}
        <blockquote className="font-heading mx-auto mt-5 max-w-3xl text-[clamp(1.35rem,3vw,2.2rem)] italic leading-snug text-balance">“{review.quote}”</blockquote>
        {review.date && <p className="mt-4 text-[0.75rem] text-muted">{formatDate(review.date)}</p>}
        <figcaption className="mt-6 flex flex-col items-center gap-4">
          <Person review={review} align="center" />
          {review.productSlug && (
            <Link href={`/products/${review.productSlug}`} className="flex items-center gap-3 text-[0.82rem]">
              {review.productImage && (
                <span className="relative block h-24 w-20 overflow-hidden rounded-theme-sm bg-bg">
                  <Img src={review.productImage} alt="" sizes="80px" />
                </span>
              )}
              <span className="text-left">
                <span className="block text-[0.62rem] uppercase tracking-[0.14em] text-muted">The piece</span>
                <span className="mt-1 block font-medium">{review.productName}</span>
              </span>
            </Link>
          )}
        </figcaption>
      </figure>
    );
  }
  if (layout === 'marquee') {
    return (
      <figure className={cn('w-[min(340px,78vw)] shrink-0 rounded-theme bg-surface p-6', motion)} style={style}>
        <Stars value={review.rating} size={12} />
        <blockquote className="mt-4 text-[0.95rem] leading-relaxed">“{review.quote}”</blockquote>
        <figcaption className="mt-4"><Person review={review} /></figcaption>
        {review.productSlug && (
          <Link href={`/products/${review.productSlug}`} className="mt-4 flex items-center gap-3 text-[0.8rem]">
            {review.productImage && <span className="relative block h-12 w-10 shrink-0 overflow-hidden bg-bg"><Img src={review.productImage} alt="" sizes="40px" /></span>}
            <span className="truncate">{review.productName}</span>
          </Link>
        )}
      </figure>
    );
  }
  return (
    <figure className={cn('flex h-full flex-col border border-line bg-bg', motion)} style={style}>
      <figcaption className="border-b border-line px-5 py-4">
        <Person review={review} />
      </figcaption>
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <Stars value={review.rating} size={13} />
        {review.date && <span className="text-[0.72rem] text-muted">{formatDate(review.date)}</span>}
      </div>
      {review.title && <p className="px-5 pt-3 text-[0.92rem] font-medium">{review.title}</p>}
      <blockquote className="flex-1 px-5 py-4 font-heading text-[1.12rem] italic leading-snug">“{review.quote}”</blockquote>
      <Piece review={review} />
    </figure>
  );
}

export function HomeReviews({
  variant,
  eyebrow,
  heading,
  initial,
}: {
  variant: string;
  eyebrow?: string;
  heading?: string;
  initial: HomeReviewCard[];
}) {
  const [items, setItems] = useState(initial);
  const [entering, setEntering] = useState<string[]>([]);
  const seen = useRef(new Set(initial.map((review) => review.id)));

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/reviews/home', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const incoming = (Array.isArray(data.reviews) ? data.reviews : []) as HomeReviewCard[];
        const arrived = incoming.filter((review) => !seen.current.has(review.id) && review.verified).map((review) => review.id);
        for (const review of incoming) seen.current.add(review.id);
        if (cancelled) return;
        if (arrived.length) setEntering((current) => [...new Set([...arrived, ...current])]);
        setItems(incoming);
      } catch {
        /* Keep the notes already on screen. */
      }
    };
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
  }, []);

  if (!items.length) return null;
  const card = (review: HomeReviewCard, layout: 'card' | 'letter' | 'slide' | 'marquee', key = review.id) => {
    const index = entering.indexOf(review.id);
    return <Card key={key} review={review} enter={index >= 0} delay={Math.min(Math.max(index, 0), 5) * 80} layout={layout} />;
  };

  if (variant === 'letter') {
    return (
      <section className="section-y container-x" aria-label="Customer reviews">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h2 className="t-2">{heading}</h2>
          </div>
          <div className="divide-y divide-line">{items.map((review) => card(review, 'letter'))}</div>
        </div>
      </section>
    );
  }
  if (variant === 'marquee') {
    return (
      <section className="section-y overflow-hidden" aria-label="Customer reviews">
        <div className="container-x"><SectionHeading heading={heading} align="left" /></div>
        <div className="marquee-pause">
          <div className="marquee-track flex gap-4" style={{ ['--marquee-speed' as string]: '55s' }}>
            {[...items, ...items].map((review, i) => card(review, 'marquee', `${review.id}-${i}`))}
          </div>
        </div>
      </section>
    );
  }
  if (variant === 'slider') {
    return (
      <section className="section-y bg-surface" aria-label="Customer reviews">
        <div className="container-x mx-auto max-w-4xl text-center">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          {heading && <h2 className="t-3 mb-10">{heading}</h2>}
          <TextSlider key={items[0]?.id}>{items.map((review) => card(review, 'slide'))}</TextSlider>
        </div>
      </section>
    );
  }
  return (
    <section className="section-y bg-surface/60" aria-label="Customer reviews">
      <div className="container-x">
        <SectionHeading eyebrow={eyebrow} heading={heading} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((review) => card(review, 'card'))}
        </div>
      </div>
    </section>
  );
}
