'use client';

import { Children, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Stacked crossfade slider that sizes itself to the tallest slide (no absolute positioning). */
export function TextSlider({ children, interval = 6 }: { children: React.ReactNode; interval?: number }) {
  const slides = Children.toArray(children);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), interval * 1000);
    return () => clearInterval(t);
  }, [slides.length, interval]);
  return (
    <div>
      <div className="grid">
        {slides.map((s, k) => (
          <div key={k} className={cn('[grid-area:1/1] transition-all duration-700', k === i ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0')} aria-hidden={k !== i}>
            {s}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="mt-10 flex justify-center gap-2.5">
          {slides.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Show testimonial ${k + 1}`} className={cn('h-1.5 rounded-full bg-ink transition-all duration-500', k === i ? 'w-7' : 'w-1.5 opacity-30')} />
          ))}
        </div>
      )}
    </div>
  );
}

export function VideoPlayer({ src, poster, className, rounded }: { src: string; poster?: string; className?: string; rounded?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return poster ? <img src={poster} alt="" className={cn('absolute inset-0 h-full w-full object-cover', rounded && 'rounded-theme', className)} /> : null;
  }
  return (
    <video
      className={cn('absolute inset-0 h-full w-full object-cover', rounded && 'rounded-theme', className)}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
      aria-hidden
    />
  );
}
