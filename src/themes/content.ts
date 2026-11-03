import { IMG } from '@/lib/images';
import { LOOK, publicImage } from '@/lib/look';
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
  eyebrow: 'EVERMOON',
  heading: 'Wear your little wonder.',
  subheading: 'Pretty little things for your everyday. Handpicked jewellery, finished to be worn — not saved for later.',
  primaryLabel: 'Shop the collection',
  primaryLink: '/shop',
  secondaryLabel: 'Our story',
  secondaryLink: '/about',
  image: LOOK.hero,
  mobileImage: IMG.celeste1,
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
  eyebrow: 'Our story',
  heading: 'A studio table, then a house.',
  body: 'EVERMOON began with a simple idea: jewellery should feel like a little wonder you wear, not a piece you lock away. Gold vermeil, freshwater pearls and quiet stones — finished to be gifted, layered and lived in.',
  ctaLabel: 'Read our story',
  ctaLink: '/about',
  image: LOOK.story,
  image2: IMG.aurelia2,
  imagePosition: 'right',
  notes: [
    { k: '18k', v: 'Gold vermeil' },
    { k: 'Pearl', v: 'Freshwater' },
    { k: 'Lahore', v: 'Studio made' },
  ],
};

export const BRAND_STORY = {
  eyebrow: 'Our story',
  heading: 'A studio table, then a house.',
  body: 'EVERMOON began with a simple idea: jewellery should feel like a little wonder you wear, not a piece you lock away. Designed in Lahore and finished by hand, our gold vermeil, sterling silver and pearls are made to be gifted, layered and lived in.',
  ctaLabel: 'Visit the atelier',
  ctaLink: '/about',
  signature: 'EVERMOON, Lahore',
  image: LOOK.story,
  image2: IMG.elara1,
  stats: [
    { value: '18k', label: 'Gold vermeil' },
    { value: '925', label: 'Sterling silver' },
    { value: '7 days', label: 'Easy returns' },
  ],
};

export const EDITORIAL = {
  eyebrow: 'Luxury collection',
  heading: 'Light, caught in stone.',
  body: 'A quieter kind of luxury — a solitaire that reads in daylight, a chain fine enough to forget you are wearing it. Designed in Lahore, finished to be kept.',
  quote: 'Luxury light enough for a Monday.',
  caption: 'The solitaire edit',
  ctaLabel: 'Explore bridal',
  ctaLink: '/collections/bridal',
  image: LOOK.editorial,
  image2: IMG.isabella1,
  imagePosition: 'left',
};

export const PROMO = {
  eyebrow: 'For someone you love',
  heading: 'Gifts, wrapped and ready.',
  body: 'Every order arrives in a signature box with a handwritten note. Pay by Cash on Delivery, EasyPaisa, JazzCash or bank transfer.',
  ctaLabel: 'Shop gifts',
  ctaLink: '/collections/gifts',
  image: IMG.tennis1,
};

export const WHY_CHOOSE = [
  { icon: 'gem', title: 'Premium Quality', text: '18k gold vermeil over solid sterling silver, finished to be worn — not saved for a drawer.' },
  { icon: 'sparkles', title: 'Elegant Designs', text: 'Quiet shapes from the Lahore studio. Pearls, chains and stones that layer without effort.' },
  { icon: 'shield', title: 'Secure Shopping', text: 'Cash on Delivery, EasyPaisa, JazzCash or bank transfer. Receipts are checked before we dispatch.' },
  { icon: 'truck', title: 'Reliable Delivery', text: 'Three to five days across Pakistan. Express in Lahore, Karachi and Islamabad.' },
];

export const FINALE = {
  eyebrow: 'Begin here',
  heading: 'Find the piece you will actually wear.',
  body: 'A chain for Monday. Pearls for a mehndi. A ring you do not take off. The collection is ready when you are.',
  ctaLabel: 'Shop the collection',
  ctaLink: '/shop',
  cta2Label: 'Our story',
  cta2Link: '/about',
  image: IMG.serenePearl,
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
  disclaimer: 'By subscribing you agree to receive emails from EVERMOON. Unsubscribe anytime.',
};

export const COMPLETE_THE_LOOK = {
  eyebrow: 'Styled by EVERMOON',
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
  image: LOOK.story,
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

/** Shared premium homepage. Variants change the look; the About photograph is never used. */
export function buildHome(look: HomeLook): SectionInstance[] {
  const heroImage = publicImage(look.heroImage, look.hero === 'editorial' ? LOOK.worn : LOOK.hero);
  const slideBase = {
    ...HERO_PRIMARY,
    image: heroImage,
    mobileImage: look.hero === 'campaign' ? IMG.celeste1 : heroImage,
    image2: IMG.elara1,
    image3: IMG.isabella1,
    align: 'left' as const,
    textColor: look.hero === 'cinematic' ? ('light' as const) : ('dark' as const),
    overlay: look.hero === 'cinematic' ? 42 : 0,
  };
  const intro = publicImage(look.introImage, LOOK.story);
  const editorial = publicImage(look.editorialImage, LOOK.editorial);
  const promo = publicImage(look.promoImage, IMG.tennis1);
  return [
    section('hero', look.hero, {
      homeVersion: 4,
      height: 'large',
      autoplay: false,
      slides: [slideBase],
    }),
    section('categories', look.categories || 'tiles', {
      eyebrow: 'Shop by category',
      heading: 'Find your signature',
      items: CATEGORY_TILES.slice(0, 5),
    }),
    section('product-grid', look.featured === 'carousel' ? 'carousel' : 'asymmetric', gridHome('Featured pieces', 'featured', 'The edit', 5, '/shop')),
    section('product-grid', look.arrivals === 'grid' ? 'grid' : 'carousel', gridHome('New arrivals', 'new', 'Just in', 8, '/collections/new-arrivals')),
    section('product-grid', look.bestsellers === 'carousel' ? 'carousel' : 'offset', gridHome('Best sellers', 'bestsellers', 'Most loved', 4, '/collections/best-sellers')),
    section('image-text', 'magazine', {
      ...EDITORIAL,
      image: editorial,
      imagePosition: 'left',
    }),
    section('trust-badges', 'pillars', {
      eyebrow: 'Why Evermoon',
      heading: 'Made to be worn',
      items: WHY_CHOOSE,
    }),
    section('image-text', 'studio', {
      ...BRAND_INTRO,
      image: intro,
      image2: IMG.crescent1,
      imagePosition: 'left',
    }),
    section('testimonials', look.reviews || 'cards', {
      eyebrow: 'Studio notes',
      heading: 'Three voices from the styling desk',
      items: TESTIMONIALS.slice(0, 3),
    }),
    section('image-banner', 'locations', {
      eyebrow: 'Visit',
      heading: 'The studio',
      body: 'Private appointments for sizing, engraving and bridal. We also deliver across Pakistan.',
      ctaLabel: 'Book an appointment',
      ctaLink: '/contact',
      image: LOOK.atelier,
    }),
    section('newsletter', 'card', NEWSLETTER),
    section('image-banner', 'finale', { ...FINALE, image: promo }),
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
