import Image from 'next/image';
import { cn } from '@/lib/utils';
import { isRemote, isResizableRemote, sizedUrl } from '@/lib/images';

type Props = {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
};

const WIDTHS = [320, 480, 640, 828, 1080, 1400, 1800];

/** Fills its (relatively positioned) parent. Optimises local images with next/image and Unsplash via CDN srcset. */
export function Img({ src, alt, sizes = '100vw', className, priority, quality = 80 }: Props) {
  if (!src) return <div aria-hidden className={cn('absolute inset-0 bg-surface', className)} />;
  const base = cn('absolute inset-0 h-full w-full object-cover', className);
  if (isResizableRemote(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sizedUrl(src, 1080)}
        srcSet={WIDTHS.map((w) => `${sizedUrl(src, w)} ${w}w`).join(', ')}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className={base}
      />
    );
  }
  if (isRemote(src) || src.startsWith('/api/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className={base} />;
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
    />
  );
}
