import { BRAND } from '@/lib/brand';
import { IMG } from '@/lib/images';
import type { SectionInstance, SectionSettings, SectionType } from './types';

let counter = 0;
export function section(
  type: SectionType,
  variant: string,
  settings: SectionSettings,
  opts: { visibility?: SectionInstance['visibility']; enabled?: boolean; id?: string } = {},
): SectionInstance {
  counter += 1;
  return {
    id: opts.id ?? `${type}-${counter}`,
    type,
    variant,
    enabled: opts.enabled ?? true,
    visibility: opts.visibility ?? 'all',
    settings,
  };
}

/* ----------------------------- shared copy ----------------------------- */

export const HERO_PRIMARY = {
  eyebrow: 'Evermoon Jewels',
  heading: 'Wear your little wonder.',
  subheading: 'Pretty little things for your everyday. Handpicked jewellery, finished to be worn — not saved for later.',
  primaryLabel: 'Shop the collection',
  primaryLink: '/shop',
  secondaryLabel: 'Our story',
  secondaryLink: '/about',
  image: BRAND.campaign,
  mobileImage: BRAND.jewelry,
};

export const HERO_PEARL = {
  eyebrow: 'The Pearl Edit',
  heading: 'Luminous by Nature',
  subheading: 'Freshwater pearls, hand-knotted and finished in 18k gold vermeil.',
  primaryLabel: 'Discover Pearls',
  primaryLink: '/collections/pearl-edit',
  secondaryLabel: 'Shop Gifts',
  secondaryLink: '/collections/gifts',
};

export const HERO_BRIDAL = {
  eyebrow: 'Bridal & Heirloom',
  heading: 'For the Moments That Last Forever',
  subheading: 'Lab-grown diamonds and heirloom sets for your nikkah, mehndi and beyond.',
  primaryLabel: 'Explore Bridal',
  primaryLink: '/collections/bridal',
  secondaryLabel: 'Book a Consultation',
  secondaryLink: '/contact',
};

export const BRAND_INTRO = {
  eyebrow: 'The house',
  heading: 'Pretty little things, made for every day.',
  body: 'Evermoon Jewels is a Lahore house of handpicked jewellery. Gold vermeil, freshwater pearls and quiet stones — luxury light enough for a Monday, a mehndi, or the market. Every piece is finished to feel considered, and entirely yours.',
  ctaLabel: 'Read our story',
  ctaLink: '/about',
  image: BRAND.jewelry,
  imagePosition: 'right',
};

export const BRAND_STORY = {
  eyebrow: 'Our story',
  heading: 'A studio table, then a house.',
  body: 'Evermoon began with a simple idea: jewellery should feel like a little wonder you wear, not a piece you lock away. Designed in Gulberg and finished by hand, our gold vermeil, sterling silver and pearls are made to be gifted, layered and lived in.',
  ctaLabel: 'Visit the atelier',
  ctaLink: '/about',
  signature: 'Evermoon Jewels, Lahore',
  image: BRAND.tray,
  image2: BRAND.leaves,
  stats: [
    { value: '18k', label: 'Gold vermeil' },
    { value: '925', label: 'Sterling silver' },
    { value: '7 days', label: 'Easy returns' },
  ],
};

export const EDITORIAL = {
  eyebrow: 'The edit',
  heading: 'Handpicked for the light.',
  body: 'Sun on stone, a flower earring, a chain that sits quietly. This is the Evermoon way of dressing — pretty, unforced, and made for the day you are actually having.',
  ctaLabel: 'Shop the collection',
  ctaLink: '/shop',
  image: BRAND.rings,
  imagePosition: 'left',
};

export const PROMO = {
  eyebrow: 'For someone you love',
  heading: 'Gifts, wrapped and ready.',
  body: 'Every order arrives in a signature box with a handwritten note. Pay by Cash on Delivery, EasyPaisa, JazzCash or bank transfer.',
  ctaLabel: 'Shop gifts',
  ctaLink: '/collections/gifts',
  image: BRAND.bracelet,
};

export const TESTIMONIALS = [
  {
    quote:
      'Studio note — not a verified purchase. The Celeste drops are lighter than they look, and the gold hooks sit comfortably for a full day.',
    name: 'Hira Ahmed',
    location: 'Lahore',
    rating: 5,
    product: 'Celeste Pearl Earrings',
  },
  {
    quote:
      'Studio note — not a verified purchase. Elara reads clearly in daylight. The band is smooth, and sizing help on WhatsApp was immediate.',
    name: 'Mahnoor Siddiqui',
    location: 'Karachi',
    rating: 5,
    product: 'Elara Solitaire Ring',
  },
  {
    quote:
      'Studio note — not a verified purchase. The Aurelia chain lies flat under a neckline and layers without twisting. A quiet everyday piece.',
    name: 'Ayesha Khan',
    location: 'Islamabad',
    rating: 5,
    product: 'Aurelia Gold Necklace',
  },
];

export const TRUST_BADGES = [
  { icon: 'truck', title: 'Complimentary Shipping', text: 'On all orders over Rs 10,000' },
  { icon: 'gift', title: 'Gift-Ready Packaging', text: 'Signature ivory box & handwritten note' },
  { icon: 'shield', title: 'Hypoallergenic Metals', text: 'Nickel-free, made for sensitive skin' },
  { icon: 'refresh', title: '7-Day Easy Returns', text: 'Exchanges and returns, hassle-free' },
];

export const FAQ_ITEMS = [
  {
    q: 'Is your jewelry suitable for everyday wear?',
    a: 'Yes. Our 18k gold vermeil is a thick layer of gold over solid 925 sterling silver, made to be worn daily. Avoid perfume, chlorine and showering to keep the shine for years.',
  },
  {
    q: 'How can I pay?',
    a: 'Pay by Cash on Delivery, EasyPaisa, JazzCash or bank transfer. Wallet and bank payments need a receipt at checkout and are confirmed only after we verify them. Cash on Delivery is paid to the courier. Card payments are not offered.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery takes 3–5 working days across Pakistan. Express delivery (1–2 days) is available in Lahore, Karachi and Islamabad.',
  },
  {
    q: 'Can I return or exchange a piece?',
    a: 'You can return or exchange unworn pieces in their original packaging within 7 days of delivery. Earrings are final sale for hygiene reasons unless faulty.',
  },
];

export const INSTAGRAM_IMAGES = [IMG.aurelia2, IMG.celeste2, IMG.crescent2, IMG.elara2, IMG.celestine2, IMG.isabella1];

export const CATEGORY_TILES = [
  { title: 'Rings', image: IMG.elara2, link: '/collections/rings' },
  { title: 'Necklaces', image: IMG.amara2, link: '/collections/necklaces' },
  { title: 'Earrings', image: IMG.celeste2, link: '/collections/earrings' },
  { title: 'Bracelets', image: IMG.tennis1, link: '/collections/bracelets' },
  { title: 'Jewelry Sets', image: IMG.serenePearl, link: '/collections/jewelry-sets' },
  { title: 'Gifts', image: IMG.celestine1, link: '/collections/gifts' },
];

export const NEWSLETTER = {
  eyebrow: 'The Evermoon Circle',
  heading: 'Join the Evermoon Circle',
  body: 'New collections, private sales and styling notes — plus 10% off your first order.',
  buttonLabel: 'Subscribe',
  disclaimer: 'By subscribing you agree to receive emails from Evermoon Jewels. Unsubscribe anytime.',
};

export const COMPLETE_THE_LOOK = {
  eyebrow: 'Styled by Aurelle',
  heading: 'Complete the Look',
  body: 'Layer the Aurelia chain with the Luna crescent, then finish with pearl drops for effortless evening elegance.',
  image: IMG.aurelia2,
  products: ['aurelia-gold-necklace', 'luna-crescent-necklace', 'celeste-pearl-earrings', 'aria-chain-bracelet'],
  hotspots: [
    { x: 52, y: 58, product: 'aurelia-gold-necklace' },
    { x: 38, y: 12, product: 'celeste-pearl-earrings' },
  ],
};

export const GIFT_BANNER = {
  eyebrow: 'Complimentary',
  heading: 'Gifts She’ll Treasure',
  body: 'Every order arrives in our signature ivory box with a handwritten note — ready for Eid, birthdays and every moment in between.',
  ctaLabel: 'Shop Gifts',
  ctaLink: '/collections/gifts',
};

export const STATEMENT = {
  eyebrow: 'Designed in Lahore',
  heading: 'Designed in Lahore. Worn everywhere.',
  body:
    'Each Evermoon piece is designed in our Lahore studio and finished by hand in 18k gold vermeil, sterling silver and responsibly sourced stones — made to be layered, gifted and treasured for years.',
  ctaLabel: 'Meet the house',
  ctaLink: '/about',
  image: BRAND.leaves,
};

export const VIDEO = {
  eyebrow: 'Inside the Atelier',
  heading: 'Crafted Slowly, Finished by Hand',
  body: 'From the first sketch to the final polish — every piece passes through the hands of our artisans.',
  videoUrl: '/videos/atelier.mp4',
  poster: IMG.aurelia1,
  ctaLabel: 'Our Craft',
  ctaLink: '/about',
};

export type HomeLook = {
  hero: 'campaign' | 'split' | 'arch' | 'cinematic' | 'classic' | 'minimal' | 'editorial' | 'mosaic';
  heroImage?: string;
  categories?: 'tiles' | 'circles' | 'list' | 'framed' | 'grid' | 'pills';
  featured?: 'grid' | 'carousel' | 'asymmetric';
  arrivals?: 'grid' | 'carousel';
  bestsellers?: 'grid' | 'carousel';
  story?: 'split' | 'centered' | 'heritage';
  reviews?: 'cards' | 'slider' | 'letter';
  editorialImage?: string;
  promoImage?: string;
  introImage?: string;
};

/** Shared premium homepage. Variants change the look; the story stays complete. */
export function buildHome(look: HomeLook): SectionInstance[] {
  const heroImage = look.heroImage || (look.hero === 'campaign' || look.hero === 'classic' ? BRAND.campaign : BRAND.jewelry);
  const slideBase = {
    ...HERO_PRIMARY,
    image: heroImage,
    mobileImage: look.hero === 'campaign' ? BRAND.jewelry : heroImage,
    image2: BRAND.tray,
    image3: BRAND.rings,
    align: 'left' as const,
    textColor: look.hero === 'cinematic' ? 'light' as const : 'dark' as const,
    overlay: look.hero === 'cinematic' ? 42 : 0,
  };
  return [
    section('hero', look.hero, {
      homeVersion: 3,
      height: look.hero === 'cinematic' ? 'large' : 'large',
      autoplay: false,
      slides: [slideBase],
    }),
    section('image-text', 'split', {
      ...BRAND_INTRO,
      image: look.introImage || BRAND.jewelry,
      imagePosition: 'right',
    }),
    section('categories', look.categories || 'tiles', {
      eyebrow: 'Shop by category',
      heading: 'Find your signature',
      items: CATEGORY_TILES.slice(0, 5),
    }),
    section('product-grid', look.featured || 'grid', gridHome('Featured pieces', 'featured', 'The edit', 8, '/shop')),
    section('image-text', 'magazine', {
      ...EDITORIAL,
      image: look.editorialImage || BRAND.rings,
      imagePosition: 'left',
    }),
    section('product-grid', look.arrivals || 'carousel', gridHome('New arrivals', 'new', 'Just in', 8, '/collections/new-arrivals')),
    section('product-grid', look.bestsellers || 'grid', gridHome('Best sellers', 'bestsellers', 'Most loved', 8, '/collections/best-sellers')),
    section('brand-story', look.story || 'split', { ...BRAND_STORY, image: BRAND.tray, image2: BRAND.leaves }),
    section('image-banner', 'promo', { ...PROMO, image: look.promoImage || BRAND.bracelet, align: 'left', textColor: 'dark', overlay: 0, height: 'medium' }),
    section('testimonials', look.reviews || 'cards', {
      eyebrow: 'Studio notes',
      heading: 'Three voices from the styling desk',
      items: TESTIMONIALS.slice(0, 3),
    }),
    section('newsletter', 'centered', NEWSLETTER),
  ];
}

function gridHome(heading: string, source: string, eyebrow: string, limit: number, viewAllLink: string) {
  return {
    eyebrow,
    heading,
    subheading: source === 'new' ? 'The latest pieces from the Lahore studio.' : source === 'bestsellers' ? 'The pieces clients return to, again and again.' : 'A handpicked edit, ready to wear today.',
    source,
    collection: '',
    category: '',
    products: [] as string[],
    limit,
    viewAllLabel: 'View all',
    viewAllLink,
  };
}
