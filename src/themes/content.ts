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
  eyebrow: 'The Autumn Edit',
  heading: 'Jewelry Made for Your Moments',
  subheading: 'Timeless pieces designed to elevate your everyday elegance.',
  primaryLabel: 'Shop Collection',
  primaryLink: '/shop',
  secondaryLabel: 'Explore New Arrivals',
  secondaryLink: '/collections/new-arrivals',
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

export const BRAND_STORY = {
  eyebrow: 'Our Philosophy',
  heading: 'Made to Be Remembered',
  body:
    'Our jewelry is crafted to celebrate beauty, confidence, and life’s most meaningful moments. From everyday essentials to statement pieces, every design is created with elegance and individuality in mind.',
  ctaLabel: 'Discover Our Story',
  ctaLink: '/about',
  signature: 'Maison Aurelle, Lahore',
  stats: [
    { value: '18k', label: 'Gold vermeil' },
    { value: '925', label: 'Sterling silver' },
    { value: '7 days', label: 'Easy returns' },
  ],
};

export const TESTIMONIALS = [
  {
    quote:
      'The Celeste earrings arrived in the most beautiful box — they look even more delicate in person. I have worn them every single day since.',
    name: 'Hira A.',
    location: 'Lahore',
    rating: 5,
    product: 'Celeste Pearl Earrings',
  },
  {
    quote:
      'I chose the Elara ring for my nikkah and it was perfect. The team helped me with sizing on WhatsApp within minutes.',
    name: 'Mahnoor S.',
    location: 'Karachi',
    rating: 5,
    product: 'Elara Solitaire Ring',
  },
  {
    quote:
      'Finally, a brand that understands understated luxury. The Aurelia necklace layers beautifully and still looks brand new.',
    name: 'Ayesha K.',
    location: 'Islamabad',
    rating: 5,
    product: 'Aurelia Gold Necklace',
  },
  {
    quote:
      'Gifted the Serene Pearl Set to my mother on Eid and she was in tears. Packaging, quality and delivery were flawless.',
    name: 'Zainab R.',
    location: 'Faisalabad',
    rating: 5,
    product: 'Serene Pearl Set',
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
    q: 'Do you offer Cash on Delivery?',
    a: 'Absolutely — Cash on Delivery is available nationwide. You can also pay by bank transfer, JazzCash or Easypaisa.',
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
  eyebrow: 'The Aurelle Circle',
  heading: 'Join the Aurelle Circle',
  body: 'Be the first to discover new collections, private sales and styling notes — and enjoy 10% off your first order.',
  buttonLabel: 'Subscribe',
  disclaimer: 'By subscribing you agree to receive emails from Maison Aurelle. Unsubscribe anytime.',
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
    'Each Maison Aurelle piece is designed in our Lahore studio and finished by hand in 18k gold vermeil, sterling silver and responsibly sourced stones — made to be layered, gifted and treasured for years.',
  ctaLabel: 'Meet the Maison',
  ctaLink: '/about',
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
