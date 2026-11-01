'use client';

import { Children, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Crossfading slider for hero sections. Slides are server-rendered and passed as children. */
export function FadeSlider({
  children,
  autoplay = true,
  interval = 6,
  dots = 'center',
  arrows = true,
  className,
  light = true,
}: {
  children: React.ReactNode;
  autoplay?: boolean;
  interval?: number;
  dots?: 'center' | 'left' | 'none' | 'lines';
  arrows?: boolean;
  className?: string;
  light?: boolean;
}) {
  const slides = Children.toArray(children);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const next = useCallback(() => setI((x) => (x + 1) % n), [n]);
  const prev = () => setI((x) => (x - 1 + n) % n);
  const touch = useRef<number | null>(null);
  useEffect(() => {
    if (!autoplay || n < 2 || paused) return;
    const t = setInterval(next, Math.max(3, interval) * 1000);
    return () => clearInterval(t);
  }, [autoplay, interval, n, next, paused]);
  return (
    <div
      className={cn('relative h-full w-full', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = e.touches[0]!.clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0]!.clientX - touch.current;
        if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
        touch.current = null;
      }}
      aria-roledescription="carousel"
    >
      {slides.map((s, k) => (
        <div key={k} className={cn('absolute inset-0 transition-opacity duration-[1200ms] ease-in-out', k === i ? 'z-[1] opacity-100' : 'z-0 opacity-0')} aria-hidden={k !== i} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}>
          <div className={cn('h-full w-full', k === i && '[&_.slide-img]:kenburns')}>{s}</div>
        </div>
      ))}
      {n > 1 && arrows && (
        <>
          <button onClick={prev} className={cn('absolute left-4 top-1/2 z-[3] hidden -translate-y-1/2 rounded-full p-3 backdrop-blur-sm transition md:block', light ? 'bg-white/15 text-white hover:bg-white/30' : 'bg-black/5 text-ink hover:bg-black/10')} aria-label="Previous slide">
            <ChevronLeft size={20} strokeWidth={1.25} />
          </button>
          <button onClick={next} className={cn('absolute right-4 top-1/2 z-[3] hidden -translate-y-1/2 rounded-full p-3 backdrop-blur-sm transition md:block', light ? 'bg-white/15 text-white hover:bg-white/30' : 'bg-black/5 text-ink hover:bg-black/10')} aria-label="Next slide">
            <ChevronRight size={20} strokeWidth={1.25} />
          </button>
        </>
      )}
      {n > 1 && dots !== 'none' && (
        <div className={cn('absolute bottom-6 z-[3] flex gap-2.5', dots === 'left' ? 'left-[var(--pad-x)]' : 'left-1/2 -translate-x-1/2')}>
          {slides.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`Go to slide ${k + 1}`}
              aria-current={k === i}
              className={cn('transition-all duration-500', dots === 'lines' ? 'h-[2px] w-10' : 'h-2 rounded-full', k === i ? (dots === 'lines' ? 'opacity-100' : 'w-7 opacity-100') : 'w-2 opacity-45', light ? 'bg-white' : 'bg-ink')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Horizontal scroll carousel with arrow controls (product rails, testimonials). */
export function Rail({ children, className, itemClass }: { children: React.ReactNode; className?: string; itemClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<{ start: boolean; end: boolean }>({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  useEffect(update, []);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className={cn('relative', className)}>
      <div ref={ref} onScroll={update} className="no-scrollbar snap-x-mandatory flex gap-[var(--grid-gap)] overflow-x-auto scroll-smooth pb-2">
        {Children.toArray(children).map((c, k) => (
          <div key={k} className={cn('snap-start shrink-0', itemClass ?? 'w-[72%] sm:w-[44%] md:w-[31%] lg:w-[calc((100%-3*var(--grid-gap))/4)]')}>
            {c}
          </div>
        ))}
      </div>
      <div className="mt-6 hidden justify-end gap-2 md:flex">
        <button onClick={() => scroll(-1)} disabled={edge.start} className="grid h-11 w-11 place-items-center rounded-full border border-line transition hover:border-ink disabled:opacity-30" aria-label="Scroll left">
          <ChevronLeft size={18} strokeWidth={1.25} />
        </button>
        <button onClick={() => scroll(1)} disabled={edge.end} className="grid h-11 w-11 place-items-center rounded-full border border-line transition hover:border-ink disabled:opacity-30" aria-label="Scroll right">
          <ChevronRight size={18} strokeWidth={1.25} />
        </button>
      </div>
    </div>
  );
}
