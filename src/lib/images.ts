/**
 * Central image registry.
 * - Local `/images/...` files are original artwork generated for EVERMOON.
 * - `images.unsplash.com/photo-*` files are free-licence Unsplash photos (Unsplash License: free for
 *   commercial use, no permission needed). They are hot-linked from Unsplash's CDN, per Unsplash
 *   guidelines, and credited in UNSPLASH_CREDITS and on the /pages/credits page.
 */
const U = (id: string) => `https://images.unsplash.com/photo-${id}`;

export const IMG = {
  heroMain: '/images/hero/hero-main.webp',
  aurelia1: '/images/products/aurelia-gold-necklace-1.webp',
  aurelia2: '/images/products/aurelia-gold-necklace-2.webp',
  amara1: '/images/products/amara-pendant-1.webp',
  amara2: '/images/products/amara-pendant-2.webp',
  celestine1: '/images/products/celestine-pearl-necklace-1.webp',
  celestine2: '/images/products/celestine-pearl-necklace-2.webp',
  crescent1: '/images/products/luna-crescent-necklace-1.webp',
  crescent2: '/images/products/luna-crescent-necklace-2.webp',
  soleil1: '/images/products/soleil-medallion-necklace-1.webp',
  zoyaChain: '/images/products/zoya-link-chain-1.webp',
  celeste1: '/images/products/celeste-pearl-earrings-1.webp',
  celeste2: '/images/products/celeste-pearl-earrings-1.webp',
  isabella1: '/images/products/isabella-gold-hoops-1.webp',
  isabella2: U('1708220040824-b273dd0a17cc'),
  margaux: U('1590166223826-12dee1677420'),
  opaline1: U('1632525230528-ec17c49bc168'),
  opaline2: U('1671644730555-916aa8d8157f'),
  elara1: '/images/products/elara-solitaire-ring-1.webp',
  elara2: '/images/products/elara-solitaire-ring-1.webp',
  aurora: U('1607703829739-c05b7beddf60'),
  celine: U('1780250784120-c83d1bbbebe8'),
  rosalie: U('1603561591411-07134e71a2a9'),
  lyra: U('1543294001-f7cd5d7fb516'),
  noor1: '/images/products/noor-gold-band-1.webp',
  noor2: '/images/products/noor-gold-band-1.webp',
  handRings: U('1762505464756-adda1bd2a343'),
  tennis1: '/images/products/luna-tennis-bracelet-1.webp',
  tennis2: U('1573408301185-9146fe634ad0'),
  ariaChain: U('1602173574767-37ac01994b2a'),
  mehrId: U('1777999802051-f6f0296e76af'),
  amulet: U('1778000000743-87e855360c51'),
  nilam: U('1767921777873-81818b812a4d'),
  braceletWorn: U('1633810543462-77c4a3b13f07'),
  serenePearl: '/images/products/serene-pearl-set-1.webp',
  raniaBridal: '/images/products/rania-bridal-set-1.webp',
  heirloomPearl: U('1704957205327-9fbd44d683b7'),
} as const;

export const UNSPLASH_CREDITS: { image: string; photographer: string; profile: string; page: string }[] = [
  { image: IMG.isabella2, photographer: 'Oscar Ramirez', profile: 'https://unsplash.com/@oscareduardohr', page: 'https://unsplash.com/photos/77vl4dH6KKQ' },
  { image: IMG.margaux, photographer: 'Kateryna Hliznitsova', profile: 'https://unsplash.com/@kate_gliz', page: 'https://unsplash.com/photos/P6NiFTyI294' },
  { image: IMG.opaline1, photographer: 'JESUS ECA', profile: 'https://unsplash.com/@jesus_eca', page: 'https://unsplash.com/photos/DRbPrVTyTyA' },
  { image: IMG.opaline2, photographer: 'Ruan Richard Rodrigues', profile: 'https://unsplash.com/@ricdeoliveira', page: 'https://unsplash.com/photos/s9idT2PQUt4' },
  { image: IMG.aurora, photographer: 'Sabrianna', profile: 'https://unsplash.com/@sabrinnaringquist', page: 'https://unsplash.com/@sabrinnaringquist' },
  { image: IMG.celine, photographer: 'Peter Muniz', profile: 'https://unsplash.com/@petepxl', page: 'https://unsplash.com/photos/EsjkVKMdN_I' },
  { image: IMG.rosalie, photographer: 'Sabrianna', profile: 'https://unsplash.com/@sabrinnaringquist', page: 'https://unsplash.com/photos/yEJwDxAoHc0' },
  { image: IMG.lyra, photographer: 'Cornelia Ng', profile: 'https://unsplash.com/@corneliang', page: 'https://unsplash.com/photos/zZLhoEwGCeM' },
  { image: IMG.handRings, photographer: 'Shoham Avisrur', profile: 'https://unsplash.com/@shoham_avisrur', page: 'https://unsplash.com/photos/Ce18NWJmA_Y' },
  { image: IMG.tennis2, photographer: 'Carlos Esteves', profile: 'https://unsplash.com/@dimage_carlos', page: 'https://unsplash.com/photos/1MWbwTaeJIA' },
  { image: IMG.ariaChain, photographer: 'Nataliya Melnychuk', profile: 'https://unsplash.com/@natinati', page: 'https://unsplash.com/photos/oO0JAOJhquk' },
  { image: IMG.mehrId, photographer: 'Diego Castañeda', profile: 'https://unsplash.com/@disfruta_cafe', page: 'https://unsplash.com/photos/Jno26Xf1-WI' },
  { image: IMG.amulet, photographer: 'Diego Castañeda', profile: 'https://unsplash.com/@disfruta_cafe', page: 'https://unsplash.com/photos/y7xmVsIXNUI' },
  { image: IMG.nilam, photographer: 'Adi Albulescu', profile: 'https://unsplash.com/@adialbulescu', page: 'https://unsplash.com/photos/wjTCK8I-9Ag' },
  { image: IMG.braceletWorn, photographer: 'Sama Hosseini', profile: 'https://unsplash.com/@samahosseini', page: 'https://unsplash.com/photos/h_ssRPj8UZo' },
  { image: IMG.heirloomPearl, photographer: 'Raindrops Photography', profile: 'https://unsplash.com/@reignedropsphotography', page: 'https://unsplash.com/photos/-Hl1n-iHAYk' },
];

export function isRemote(src: string) {
  return /^https?:\/\//.test(src);
}

const UNSPLASH = /^https:\/\/images\.unsplash\.com\//;

/** Builds a sized URL for remote CDNs that support on-the-fly resizing (Unsplash/imgix). */
export function sizedUrl(src: string, width: number, quality = 75) {
  if (UNSPLASH.test(src)) {
    const base = src.split('?')[0];
    const height = Math.round(width * 1.25);
    return `${base}?auto=format&fit=crop&w=${width}&h=${height}&q=${quality}`;
  }
  return src;
}

export function isResizableRemote(src: string) {
  return UNSPLASH.test(src);
}

/** Same-origin copy written by scripts/mirror-images.mjs. */
export function catalogMirror(src: string) {
  const match = src.match(/images\.unsplash\.com\/(photo-[A-Za-z0-9_-]+)/);
  return match ? `/images/catalog/${match[1]}.webp` : null;
}

/** Prefer the local mirror, then the same-origin proxy. Never return a third-party hotlink. */
export function reliableImageUrl(src: string, width = 1600) {
  return catalogMirror(src) || (isResizableRemote(src) ? `/api/img?src=${encodeURIComponent(sizedUrl(src, width))}` : src);
}
