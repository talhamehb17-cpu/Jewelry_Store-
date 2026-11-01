/**
 * Central image registry.
 * - Local `/images/...` files are original artwork generated for Maison Aurelle.
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
  zoyaChain: U('1611107683227-e9060eccd846'),
  celeste1: U('1682822749969-61a63203c501'),
  celeste2: U('1763628212781-7d52844cf358'),
  isabella1: U('1617038220319-276d3cfab638'),
  isabella2: U('1708220040824-b273dd0a17cc'),
  margaux: U('1590166223826-12dee1677420'),
  opaline1: U('1632525230528-ec17c49bc168'),
  opaline2: U('1671644730555-916aa8d8157f'),
  elara1: U('1605100804763-247f67b3557e'),
  elara2: U('1762505464779-17f78cbfa8b4'),
  aurora: U('1607703829739-c05b7beddf60'),
  celine: U('1780250784120-c83d1bbbebe8'),
  rosalie: U('1603561591411-07134e71a2a9'),
  lyra: U('1543294001-f7cd5d7fb516'),
  noor1: U('1598560917807-1bae44bd2be8'),
  noor2: U('1617038260897-41a1f14a8ca0'),
  handRings: U('1762505464756-adda1bd2a343'),
  tennis1: U('1763029513623-37d488cb97b1'),
  tennis2: U('1573408301185-9146fe634ad0'),
  ariaChain: U('1602173574767-37ac01994b2a'),
  mehrId: U('1777999802051-f6f0296e76af'),
  amulet: U('1778000000743-87e855360c51'),
  nilam: U('1767921777873-81818b812a4d'),
  braceletWorn: U('1633810543462-77c4a3b13f07'),
  serenePearl: U('1654699991494-892326ee8171'),
  raniaBridal: U('1722410180687-b05b50922362'),
  heirloomPearl: U('1704957205327-9fbd44d683b7'),
} as const;

export const UNSPLASH_CREDITS: { image: string; photographer: string; profile: string; page: string }[] = [
  { image: IMG.zoyaChain, photographer: 'Syed F Hashemi', profile: 'https://unsplash.com/@sfhashemi', page: 'https://unsplash.com/photos/aldDZePniqg' },
  { image: IMG.celeste1, photographer: 'Nataliia Hordiiuk', profile: 'https://unsplash.com/@whynotnatali', page: 'https://unsplash.com/photos/3ai_aJpH9hA' },
  { image: IMG.celeste2, photographer: 'Giustina Barison', profile: 'https://unsplash.com/@_giuss_', page: 'https://unsplash.com/photos/vfgCzz5PFs0' },
  { image: IMG.isabella1, photographer: 'Nataliya Melnychuk', profile: 'https://unsplash.com/@natinati', page: 'https://unsplash.com/photos/5ngCICAXiH0' },
  { image: IMG.isabella2, photographer: 'Oscar Ramirez', profile: 'https://unsplash.com/@oscareduardohr', page: 'https://unsplash.com/photos/77vl4dH6KKQ' },
  { image: IMG.margaux, photographer: 'Kateryna Hliznitsova', profile: 'https://unsplash.com/@kate_gliz', page: 'https://unsplash.com/photos/P6NiFTyI294' },
  { image: IMG.opaline1, photographer: 'JESUS ECA', profile: 'https://unsplash.com/@jesus_eca', page: 'https://unsplash.com/photos/DRbPrVTyTyA' },
  { image: IMG.opaline2, photographer: 'Ruan Richard Rodrigues', profile: 'https://unsplash.com/@ricdeoliveira', page: 'https://unsplash.com/photos/s9idT2PQUt4' },
  { image: IMG.elara1, photographer: 'Sabrianna', profile: 'https://unsplash.com/@sabrinnaringquist', page: 'https://unsplash.com/photos/Y_bxfTa_iUA' },
  { image: IMG.elara2, photographer: 'Shoham Avisrur', profile: 'https://unsplash.com/@shoham_avisrur', page: 'https://unsplash.com/photos/SBSeFdJouZU' },
  { image: IMG.aurora, photographer: 'Sabrianna', profile: 'https://unsplash.com/@sabrinnaringquist', page: 'https://unsplash.com/@sabrinnaringquist' },
  { image: IMG.celine, photographer: 'Peter Muniz', profile: 'https://unsplash.com/@petepxl', page: 'https://unsplash.com/photos/EsjkVKMdN_I' },
  { image: IMG.rosalie, photographer: 'Sabrianna', profile: 'https://unsplash.com/@sabrinnaringquist', page: 'https://unsplash.com/photos/yEJwDxAoHc0' },
  { image: IMG.lyra, photographer: 'Cornelia Ng', profile: 'https://unsplash.com/@corneliang', page: 'https://unsplash.com/photos/zZLhoEwGCeM' },
  { image: IMG.noor1, photographer: 'Sabrianna', profile: 'https://unsplash.com/@sabrinnaringquist', page: 'https://unsplash.com/photos/NhrcL_C0sFA' },
  { image: IMG.noor2, photographer: 'Nataliya Melnychuk', profile: 'https://unsplash.com/@natinati', page: 'https://unsplash.com/photos/Ki7TPcA9204' },
  { image: IMG.handRings, photographer: 'Shoham Avisrur', profile: 'https://unsplash.com/@shoham_avisrur', page: 'https://unsplash.com/photos/Ce18NWJmA_Y' },
  { image: IMG.tennis1, photographer: 'Giustina Barison', profile: 'https://unsplash.com/@_giuss_', page: 'https://unsplash.com/photos/yc8hHj3KqXA' },
  { image: IMG.tennis2, photographer: 'Carlos Esteves', profile: 'https://unsplash.com/@dimage_carlos', page: 'https://unsplash.com/photos/1MWbwTaeJIA' },
  { image: IMG.ariaChain, photographer: 'Nataliya Melnychuk', profile: 'https://unsplash.com/@natinati', page: 'https://unsplash.com/photos/oO0JAOJhquk' },
  { image: IMG.mehrId, photographer: 'Diego Castañeda', profile: 'https://unsplash.com/@disfruta_cafe', page: 'https://unsplash.com/photos/Jno26Xf1-WI' },
  { image: IMG.amulet, photographer: 'Diego Castañeda', profile: 'https://unsplash.com/@disfruta_cafe', page: 'https://unsplash.com/photos/y7xmVsIXNUI' },
  { image: IMG.nilam, photographer: 'Adi Albulescu', profile: 'https://unsplash.com/@adialbulescu', page: 'https://unsplash.com/photos/wjTCK8I-9Ag' },
  { image: IMG.braceletWorn, photographer: 'Sama Hosseini', profile: 'https://unsplash.com/@samahosseini', page: 'https://unsplash.com/photos/h_ssRPj8UZo' },
  { image: IMG.serenePearl, photographer: 'Paige Johnson', profile: 'https://unsplash.com/@paigelizabethj', page: 'https://unsplash.com/photos/o-prrTRWj88' },
  { image: IMG.raniaBridal, photographer: 'PRAHANT STUDIO', profile: 'https://unsplash.com/@prahantstudio', page: 'https://unsplash.com/photos/vbsN7MUXyT4' },
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
    return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }
  return src;
}

export function isResizableRemote(src: string) {
  return UNSPLASH.test(src);
}
