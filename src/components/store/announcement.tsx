'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThemeAnnouncement } from '@/themes/types';

export function AnnouncementBar({ data, hideOnMobile }: { data: ThemeAnnouncement; hideOnMobile: boolean }) {
  const [i, setI] = useState(0);
  const msgs = data.messages;
  useEffect(() => {
    if (data.style !== 'rotate' || msgs.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % msgs.length), 4500);
    return () => clearInterval(t);
  }, [data.style, msgs.length]);
  if (!data.enabled || !msgs.length) return null;
  const item = (m: { text: string; link?: string }, key?: number) =>
    m.link ? (
      <Link key={key} href={m.link} className="underline-offset-4 hover:underline">{m.text}</Link>
    ) : (
      <span key={key}>{m.text}</span>
    );
  return (
    <div id="announcement" className={cn('relative z-[51] bg-[var(--c-ann-bg)] text-[var(--c-ann-text)]', hideOnMobile && 'max-md:hidden')}>
      {data.style === 'marquee' ? (
        <div className="marquee-pause overflow-hidden py-2.5 text-[0.72rem] tracking-[0.14em] uppercase">
          <div className="marquee-track flex gap-16 whitespace-nowrap" style={{ ['--marquee-speed' as string]: `${Math.max(18, msgs.length * 12)}s` }}>
            {[...msgs, ...msgs, ...msgs, ...msgs].map((m, k) => (
              <span key={k} className="flex items-center gap-16">{item(m)}<span aria-hidden className="opacity-50">✦</span></span>
            ))}
          </div>
        </div>
      ) : data.style === 'static' ? (
        <p className="container-x py-2.5 text-center text-[0.74rem] tracking-[0.08em]">{item(msgs[0]!)}</p>
      ) : (
        <div className="container-x flex items-center justify-between gap-3 py-2.5 text-[0.74rem] tracking-[0.1em]">
          <button onClick={() => setI((x) => (x - 1 + msgs.length) % msgs.length)} className="opacity-60 transition hover:opacity-100" aria-label="Previous announcement">
            <ChevronLeft size={14} strokeWidth={1.25} />
          </button>
          <div className="relative h-[1.3em] flex-1 overflow-hidden text-center" aria-live="polite">
            {msgs.map((m, k) => (
              <div key={k} className={cn('absolute inset-0 truncate transition-all duration-700', k === i ? 'translate-y-0 opacity-100' : k < i ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0')}>
                {item(m)}
              </div>
            ))}
          </div>
          <button onClick={() => setI((x) => (x + 1) % msgs.length)} className="opacity-60 transition hover:opacity-100" aria-label="Next announcement">
            <ChevronRight size={14} strokeWidth={1.25} />
          </button>
        </div>
      )}
    </div>
  );
}
