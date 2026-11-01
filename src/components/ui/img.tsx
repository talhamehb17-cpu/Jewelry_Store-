'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { catalogMirror, isRemote, isResizableRemote, sizedUrl } from '@/lib/images';

type Props = {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
};

const WIDTHS = [320, 480, 640, 828, 1080, 1400];

function Fallback({ alt, className }: { alt: string; className?: string }) {
  return (
    <span className={cn('media-fill grid place-items-center bg-surface text-muted', className)} role="img" aria-label={alt || 'Image unavailable'}>
      <span className="flex flex-col items-center gap-2 px-4 text-center">
        <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden>
          <circle cx="24" cy="24" r="11" fill="none" stroke="currentColor" strokeWidth="1.25" />
          <path d="M24 13.5l2.2 5.6 6.1.7-4.6 4 1.4 6-5.1-3.2-5.1 3.2 1.4-6-4.6-4 6.1-.7z" fill="currentColor" />
        </svg>
        <span className="text-[0.68rem] uppercase tracking-[0.18em]">Image unavailable</span>
      </span>
    </span>
  );
}

/**
 * Fills a relatively positioned parent. Local files use next/image.
 * Unsplash photos use a same-origin mirror, then a same-origin proxy, then a visible fallback.
 * A failed remote image never leaves a broken icon or a half-empty frame.
 */
export function Img({ src, alt, sizes = '100vw', className, priority, quality = 80 }: Props) {
  const [stage, setStage] = useState<'mirror' | 'proxy' | 'direct' | 'fail'>('mirror');
  if (!src || stage === 'fail') return <Fallback alt={alt} className={className} />;

  const base = cn('media-fill-img absolute inset-0 h-full w-full object-cover', className);
  const remote = isResizableRemote(src);
  const mirror = remote ? catalogMirror(src) : null;

  if (remote && stage === 'mirror' && mirror) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mirror}
        alt={alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className={base}
        onError={() => setStage('proxy')}
      />
    );
  }

  if (remote && (stage === 'proxy' || !mirror)) {
    const proxied = (w: number) => `/api/img?src=${encodeURIComponent(sizedUrl(src, w))}`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={proxied(1080)}
        srcSet={WIDTHS.map((w) => `${proxied(w)} ${w}w`).join(', ')}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className={base}
        onError={() => setStage('fail')}
      />
    );
  }

  if (isRemote(src) || src.startsWith('/api/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className={base} onError={() => setStage('fail')} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={quality}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      className={base}
      onError={() => setStage('fail')}
    />
  );
}
