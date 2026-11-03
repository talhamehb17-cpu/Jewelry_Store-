'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, Play, X } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { isResizableRemote, reliableImageUrl, sizedUrl } from '@/lib/images';
import { useBodyLock } from './providers';
import { cn } from '@/lib/utils';
import type { PdpVariant } from '@/themes/types';

export type Media = { type: 'image' | 'video'; url: string; alt: string; poster?: string };

function ZoomImage({ m, priority, onOpen, zoom = true }: { m: Media; priority?: boolean; onOpen: () => void; zoom?: boolean }) {
  const [z, setZ] = useState<{ x: number; y: number } | null>(null);
  if (m.type === 'video') {
    return (
      <div className="absolute inset-0 bg-black">
        <video src={m.url} poster={m.poster} className="h-full w-full object-cover" controls playsInline muted loop autoPlay preload="metadata" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseMove={(e) => {
        if (!zoom) return;
        const r = e.currentTarget.getBoundingClientRect();
        setZ({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      onMouseLeave={() => setZ(null)}
        className="group absolute inset-0 block cursor-zoom-in overflow-hidden"
      aria-label={`Enlarge image: ${m.alt}`}
    >
      <Img
        src={m.url}
        alt={m.alt}
        priority={priority}
        sizes="(max-width:768px) 100vw, 55vw"
        quality={90}
        className="!object-contain transition-transform duration-300 ease-out will-change-transform"
      />
      {z && (
        <span className="pointer-events-none absolute inset-0 hidden md:block" style={{ transformOrigin: `${z.x}% ${z.y}%`, transform: 'scale(2)' }}>
          <Img src={m.url} alt="" sizes="110vw" quality={90} />
        </span>
      )}
      <span className="absolute bottom-3 right-3 rounded-full bg-bg/85 p-2 text-ink opacity-0 backdrop-blur transition group-hover:opacity-100"><Expand size={15} strokeWidth={1.25} /></span>
    </button>
  );
}

function Thumb({ m, active, onClick, className }: { m: Media; active: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={m.type === 'video' ? 'Play video' : `View ${m.alt}`} aria-current={active} className={cn('relative overflow-hidden bg-surface transition rounded-theme-sm', active ? 'ring-1 ring-ink ring-offset-2 ring-offset-bg' : 'opacity-70 hover:opacity-100', className)}>
      {m.type === 'video' ? (
        <>
          {m.poster && <Img src={m.poster} alt="" sizes="90px" />}
          <span className="absolute inset-0 grid place-items-center bg-black/30 text-white"><Play size={18} strokeWidth={1.5} className="fill-current" /></span>
        </>
      ) : (
        <Img src={m.url} alt="" sizes="90px" />
      )}
    </button>
  );
}

function Lightbox({ media, index, onClose }: { media: Media[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const [zoomed, setZoomed] = useState(false);
  useBodyLock(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % media.length);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + media.length) % media.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [media.length, onClose]);
  const m = media[i]!;
  return (
    <div className="fade-in fixed inset-0 z-[95] bg-bg" role="dialog" aria-modal="true" aria-label="Image viewer">
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-surface p-3" aria-label="Close"><X size={20} strokeWidth={1.25} /></button>
      <div className={cn('absolute inset-0 overflow-auto', zoomed ? 'cursor-zoom-out' : 'flex cursor-zoom-in items-center justify-center')} style={{ touchAction: 'pinch-zoom' }} onClick={() => m.type === 'image' && setZoomed((z) => !z)}>
        {m.type === 'video' ? (
          <video src={m.url} poster={m.poster} controls autoPlay className="max-h-full max-w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reliableImageUrl(m.url, 1800)} alt={m.alt} className={cn('select-none', zoomed ? 'max-w-none' : 'max-h-[100svh] max-w-full object-contain')} style={zoomed ? { width: '200%' } : undefined} onError={(e) => { const img = e.currentTarget; if (!img.dataset.tried && isResizableRemote(m.url)) { img.dataset.tried = '1'; img.src = `/api/img?src=${encodeURIComponent(sizedUrl(m.url, 1800))}`; return; } img.src = '/images/placeholder.svg'; }} />
        )}
      </div>
      {media.length > 1 && (
        <>
          <button onClick={() => { setZoomed(false); setI((x) => (x - 1 + media.length) % media.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-surface p-3" aria-label="Previous"><ChevronLeft size={20} strokeWidth={1.25} /></button>
          <button onClick={() => { setZoomed(false); setI((x) => (x + 1) % media.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-surface p-3" aria-label="Next"><ChevronRight size={20} strokeWidth={1.25} /></button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[0.8rem] text-muted">{i + 1} / {media.length}</p>
        </>
      )}
    </div>
  );
}

function MobileCarousel({ media, onOpen, className }: { media: Media[]; onOpen: (i: number) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  return (
    <div className={cn('relative', className)}>
      <div ref={ref} onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="no-scrollbar snap-x-mandatory flex overflow-x-auto">
        {media.map((m, k) => (
          <div key={k} className="relative aspect-[4/5] max-h-[52svh] w-full max-w-full shrink-0 snap-start overflow-hidden bg-surface">
            <ZoomImage m={m} priority={k === 0} onOpen={() => onOpen(k)} zoom={false} />
          </div>
        ))}
      </div>
      {media.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {media.map((_, k) => (
            <button key={k} onClick={() => ref.current?.scrollTo({ left: k * ref.current.clientWidth, behavior: 'smooth' })} className={cn('h-1.5 rounded-full bg-ink transition-all', k === i ? 'w-6' : 'w-1.5 opacity-30')} aria-label={`Image ${k + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function uniqueMedia(list: Media[]) {
  const seen = new Set<string>();
  return list.filter((m) => {
    const key = `${m.type}:${m.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ProductGallery({ media: incoming, badge }: { media: Media[]; layout?: PdpVariant; badge?: React.ReactNode }) {
  const media = uniqueMedia(incoming);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<number | null>(null);
  const current = media[Math.min(active, Math.max(0, media.length - 1))] ?? media[0];
  if (!current) return null;
  return (
    <>
      <div className="mx-auto w-full max-w-[min(100%,440px)] lg:hidden">
        <div className="relative aspect-[4/5] overflow-hidden rounded-theme-sm bg-surface">
          <ZoomImage key={current.url} m={current} priority onOpen={() => setBox(active)} zoom={false} />
          {badge}
        </div>
        {media.length > 1 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {media.map((m, k) => <Thumb key={`${m.url}-${k}`} m={m} active={k === active} onClick={() => setActive(k)} className="h-16 w-14 shrink-0" />)}
          </div>
        )}
      </div>
      <div className="hidden gap-4 lg:flex">
        {media.length > 1 && (
          <div className="flex w-20 shrink-0 flex-col gap-3">
            {media.map((m, k) => <Thumb key={`${m.url}-${k}`} m={m} active={k === active} onClick={() => setActive(k)} className="aspect-[4/5] w-full" />)}
          </div>
        )}
        <div className="relative aspect-[4/5] min-w-0 flex-1 overflow-hidden rounded-theme-sm bg-surface">
          <ZoomImage key={current.url} m={current} priority onOpen={() => setBox(active)} />
          {badge}
        </div>
      </div>
      {box != null && <Lightbox media={media} index={box} onClose={() => setBox(null)} />}
    </>
  );
}
