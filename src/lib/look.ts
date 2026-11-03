import { IMG } from '@/lib/images';

/** Homepage and editorial stills. These are not the About Us photograph. */
export const LOOK = {
  hero: '/images/lookbook/hero.webp',
  editorial: '/images/lookbook/editorial.webp',
  story: '/images/lookbook/story.webp',
  atelier: '/images/lookbook/atelier.webp',
  worn: '/images/hero/hero-main.webp',
} as const;

const RETIRED = [
  '/images/brand/campaign',
  '/images/brand/jewelry',
  '/images/brand/rings',
  '/images/brand/tray',
  '/images/brand/bracelet',
  '/images/brand/leaves',
  '/images/brand/about',
];

/** Keeps the supplied About photograph off every section except the About page. */
export function publicImage(src: string | null | undefined, fallback: string = IMG.aurelia1) {
  if (!src) return fallback;
  if (RETIRED.some((p) => src.includes(p))) return fallback;
  return src;
}
