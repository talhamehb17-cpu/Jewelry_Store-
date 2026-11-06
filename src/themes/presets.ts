import { IMG } from '@/lib/images';
import { BRAND } from '@/lib/brand';
import { LOOK } from '@/lib/look';
import {
  BRAND_STORY,
  CATEGORY_TILES,
  COMPLETE_THE_LOOK,
  FAQ_ITEMS,
  GIFT_BANNER,
  HERO_BRIDAL,
  HERO_PEARL,
  HERO_PRIMARY,
  INSTAGRAM_IMAGES,
  NEWSLETTER,
  STATEMENT,
  TESTIMONIALS,
  TRUST_BADGES,
  VIDEO,
  buildHome,
  section,
} from './content';
import type { ThemeAnnouncement, ThemeDefinition, ThemeId, ThemeMobile } from './types';

const ANNOUNCEMENT: ThemeAnnouncement = {
  enabled: true,
  style: 'rotate',
  messages: [
    { text: 'Complimentary shipping on orders over Rs 10,000', link: '/shop' },
    { text: 'Cash on Delivery, EasyPaisa, JazzCash and bank transfer' },
    { text: 'New in — The Pearl Edit', link: '/collections/pearl-edit' },
  ],
};

const MOBILE: ThemeMobile = {
  baseSize: 15,
  sectionSpacing: 64,
  gridColumns: 2,
  heroHeight: '75',
  headerVariant: 'center',
  stickyAtc: true,
  showAnnouncement: true,
  containerPadding: 20,
};

const slide = (base: Record<string, unknown>, image: string, extra: Record<string, unknown> = {}) => ({
  ...base,
  image,
  mobileImage: '',
  video: '',
  align: 'left',
  textColor: 'light',
  overlay: 25,
  ...extra,
});

const grid = (heading: string, source: string, extra: Record<string, unknown> = {}) => ({
  eyebrow: '',
  heading,
  subheading: '',
  source,
  collection: '',
  category: '',
  products: [] as string[],
  limit: 8,
  viewAllLabel: 'View all',
  viewAllLink: source === 'new' ? '/collections/new-arrivals' : source === 'bestsellers' ? '/collections/best-sellers' : '/shop',
  ...extra,
});

/* =================================================================== */

const softLuxury: ThemeDefinition = {
  id: 'soft-luxury',
  name: 'Soft Luxury',
  tagline: 'Ivory, champagne & whispered gold',
  description: 'Warm ivory surfaces, Cormorant Garamond headlines and a centred two-tier header. Gentle fade-up reveals and portrait product imagery.',
  mood: ['Ivory', 'Champagne', 'Romantic serif'],
  settings: {
    colors: {
      background: '#FBF7F1', surface: '#F3EADF', text: '#2B2622', muted: '#8A7F74', primary: '#2B2622', primaryText: '#FBF7F1',
      secondary: '#EADCCB', accent: '#B8955A', border: '#E6DCCF', sale: '#A35D4F', headerBg: '#FBF7F1', headerText: '#2B2622',
      footerBg: '#F3EADF', footerText: '#2B2622', announcementBg: '#2B2622', announcementText: '#F3EADF',
    },
    typography: {
      headingFont: 'cormorant', bodyFont: 'inter', navFont: 'tenor', accentFont: 'cormorant', baseSize: 15, headingScale: 1.15,
      headingWeight: 400, bodyWeight: 400, headingTracking: -0.01, headingCase: 'none', navTracking: 0.16, navCase: 'uppercase', navSize: 12, lineHeight: 1.65,
    },
    layout: {
      containerWidth: 1320, sectionSpacing: 120, gridColumns: 4, gridGap: 28, radius: 2, imageRatio: 'portrait',
      cardVariant: 'classic', pdpVariant: 'thumbs-left', pdpStyle: 'soft', collectionVariant: 'sidebar',
    },
    buttons: { shape: 'square', style: 'solid', hover: 'fill', uppercase: true, tracking: 0.18, size: 'md', weight: 500 },
    header: { variant: 'centered', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: BRAND.tagline, logoImage: BRAND.logo, logoSize: 72, borderBottom: true },
    footer: { variant: 'soft', tagline: 'Pretty little things, made for everyday.', showNewsletter: true, showSocial: true, showPayments: true },
    announcement: ANNOUNCEMENT,
    mobile: { ...MOBILE },
    animation: { style: 'fade-up', speed: 900 },
  },
  sections: [
    section('hero', 'fullbleed', { height: 'large', autoplay: true, interval: 6, slides: [slide(HERO_PRIMARY, IMG.heroMain), slide(HERO_PEARL, IMG.celestine2, { align: 'center', overlay: 35 })] }),
    section('categories', 'tiles', { eyebrow: 'Shop by Category', heading: 'Find Your Signature', items: CATEGORY_TILES.slice(0, 5) }),
    section('product-grid', 'grid', grid('Our Best Sellers', 'bestsellers', { eyebrow: 'Most Loved', subheading: 'The pieces our clients return to, again and again.' })),
    section('brand-story', 'split', { ...BRAND_STORY, image: IMG.aurelia2, image2: IMG.crescent1 }),
    section('product-grid', 'carousel', grid('New Arrivals', 'new', { eyebrow: 'Just In', limit: 10 })),
    section('image-banner', 'fullwidth', { ...GIFT_BANNER, image: IMG.celestine1, align: 'center', textColor: 'light', overlay: 35, height: 'medium' }),
    section('complete-the-look', 'hotspots', { ...COMPLETE_THE_LOOK }),
    section('testimonials', 'slider', { eyebrow: 'Kind Words', heading: 'Loved by Our Clients', items: TESTIMONIALS }),
    section('instagram', 'grid', { heading: 'Worn with EVERMOON', handle: 'EVERMOON', link: 'https://instagram.com/', images: INSTAGRAM_IMAGES }),
    section('newsletter', 'centered', { ...NEWSLETTER }),
  ],
};

const modernMinimal: ThemeDefinition = {
  id: 'modern-minimal',
  name: 'Modern Minimal',
  tagline: 'Monochrome, precise, quietly confident',
  description: 'Pure white canvas, Inter Tight typography and an inline header. Square imagery, tight grids, hover-reveal category list and crisp fades.',
  mood: ['Monochrome', 'Grotesk', 'Architectural'],
  settings: {
    colors: {
      background: '#FFFFFF', surface: '#F4F4F2', text: '#0A0A0A', muted: '#6E6E6E', primary: '#0A0A0A', primaryText: '#FFFFFF',
      secondary: '#ECECEA', accent: '#0A0A0A', border: '#E6E6E6', sale: '#B4471F', headerBg: '#FFFFFF', headerText: '#0A0A0A',
      footerBg: '#FFFFFF', footerText: '#0A0A0A', announcementBg: '#F4F4F2', announcementText: '#0A0A0A',
    },
    typography: {
      headingFont: 'intertight', bodyFont: 'intertight', navFont: 'intertight', accentFont: 'intertight', baseSize: 15, headingScale: 1.05,
      headingWeight: 500, bodyWeight: 400, headingTracking: -0.035, headingCase: 'none', navTracking: 0, navCase: 'none', navSize: 14, lineHeight: 1.55,
    },
    layout: {
      containerWidth: 1440, sectionSpacing: 104, gridColumns: 4, gridGap: 12, radius: 0, imageRatio: 'square',
      cardVariant: 'minimal', pdpVariant: 'grid', pdpStyle: 'minimal', collectionVariant: 'topbar',
    },
    buttons: { shape: 'square', style: 'solid', hover: 'arrow', uppercase: false, tracking: 0, size: 'md', weight: 500 },
    header: { variant: 'inline', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: '', logoImage: '', logoSize: 22, borderBottom: true },
    footer: { variant: 'minimal', tagline: 'Fine jewelry, reduced to the essential.', showNewsletter: true, showSocial: true, showPayments: false },
    announcement: { ...ANNOUNCEMENT, style: 'static', messages: [{ text: 'Free shipping over Rs 10,000 · Cash on Delivery, EasyPaisa, JazzCash and bank transfer', link: '/shop' }] },
    mobile: { ...MOBILE, headerVariant: 'left', sectionSpacing: 56 },
    animation: { style: 'fade', speed: 500 },
  },
  sections: [
    section('hero', 'split', { height: 'large', slides: [slide(HERO_PRIMARY, IMG.aurelia1, { textColor: 'dark', overlay: 0, eyebrow: 'Collection 05' })] }),
    section('product-grid', 'grid', grid('Best sellers', 'bestsellers', { limit: 8 })),
    section('categories', 'list', { eyebrow: 'Index', heading: 'Shop by category', items: CATEGORY_TILES }),
    section('image-text', 'split', { ...STATEMENT, image: IMG.crescent1, imagePosition: 'right' }),
    section('product-grid', 'grid', grid('New arrivals', 'new', { limit: 4 })),
    section('testimonials', 'cards', { eyebrow: '', heading: 'Notes from clients', items: TESTIMONIALS.slice(0, 3) }),
    section('trust-badges', 'row', { items: TRUST_BADGES }),
    section('newsletter', 'inline', { ...NEWSLETTER, heading: 'Newsletter', body: 'New releases and private sales. 10% off your first order.' }),
  ],
};

const roseBoutique: ThemeDefinition = {
  id: 'rose-boutique',
  name: 'Rose Boutique',
  tagline: 'Blush, pearls & playful romance',
  description: 'Blush tones, Playfair Display italics and a boutique header with a centred script-style logo. Rounded cards, arch hero and soft scale animations.',
  mood: ['Blush', 'Italic serif', 'Feminine'],
  settings: {
    colors: {
      background: '#FFF8F6', surface: '#FBEAE7', text: '#4A2C32', muted: '#9C7A80', primary: '#B76E79', primaryText: '#FFFFFF',
      secondary: '#F6DCDD', accent: '#D4A5A5', border: '#F1D9D6', sale: '#B4505F', headerBg: '#FFF8F6', headerText: '#4A2C32',
      footerBg: '#FBEAE7', footerText: '#4A2C32', announcementBg: '#F6DCDD', announcementText: '#4A2C32',
    },
    typography: {
      headingFont: 'playfair', bodyFont: 'dmsans', navFont: 'dmsans', accentFont: 'playfair', baseSize: 15, headingScale: 1.05,
      headingWeight: 400, bodyWeight: 400, headingTracking: -0.01, headingCase: 'none', navTracking: 0.04, navCase: 'none', navSize: 14, lineHeight: 1.65,
    },
    layout: {
      containerWidth: 1280, sectionSpacing: 104, gridColumns: 4, gridGap: 24, radius: 18, imageRatio: 'portrait',
      cardVariant: 'rounded', pdpVariant: 'carousel', pdpStyle: 'boutique', collectionVariant: 'banner',
    },
    buttons: { shape: 'pill', style: 'solid', hover: 'lift', uppercase: false, tracking: 0.02, size: 'md', weight: 500 },
    header: { variant: 'boutique', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: 'jewelry boutique', logoImage: '', logoSize: 34, borderBottom: false },
    footer: { variant: 'boutique', tagline: 'Little luxuries for every chapter of you.', showNewsletter: true, showSocial: true, showPayments: true },
    announcement: { ...ANNOUNCEMENT, style: 'marquee' },
    mobile: { ...MOBILE },
    animation: { style: 'scale', speed: 800 },
  },
  sections: [
    section('hero', 'arch', { height: 'large', slides: [slide(HERO_PEARL, IMG.celeste2, { textColor: 'dark', overlay: 0, heading: 'Little Luxuries, Endless Love' })] }),
    section('categories', 'circles', { eyebrow: 'Shop by Category', heading: 'Something for Every Moment', items: CATEGORY_TILES }),
    section('product-grid', 'grid', grid('Most Loved Pieces', 'bestsellers', { eyebrow: 'Best Sellers' })),
    section('image-banner', 'framed', { ...GIFT_BANNER, image: IMG.serenePearl, align: 'left', textColor: 'light', overlay: 30, height: 'medium' }),
    section('product-grid', 'carousel', grid('Fresh from the Studio', 'new', { eyebrow: 'New Arrivals', limit: 10 })),
    section('testimonials', 'cards', { eyebrow: 'Love Notes', heading: 'From Our Clients', items: TESTIMONIALS }),
    section('instagram', 'strip', { heading: 'Worn with EVERMOON', handle: 'EVERMOON', link: 'https://instagram.com/', images: INSTAGRAM_IMAGES }),
    section('newsletter', 'card', { ...NEWSLETTER, heading: 'Join Our Love Letters' }),
  ],
};

const darkLuxury: ThemeDefinition = {
  id: 'dark-luxury',
  name: 'Dark Luxury',
  tagline: 'Midnight black, champagne gold',
  description: 'Deep black canvas with champagne-gold accents, Marcellus engraved capitals and a transparent split header. Cinematic hero and mask-reveal motion.',
  mood: ['Noir', 'Gold leaf', 'Cinematic'],
  settings: {
    colors: {
      background: '#0C0B0A', surface: '#221C17', text: '#F7F1E6', muted: '#D7C7B0', primary: '#C9A96E', primaryText: '#14110E',
      secondary: '#322A23', accent: '#E4C98A', border: '#B08958', sale: '#E7A08A', headerBg: '#100E0C', headerText: '#F7F1E6',
      footerBg: '#080706', footerText: '#F7F1E6', announcementBg: '#C9A96E', announcementText: '#14110E',
    },
    typography: {
      headingFont: 'marcellus', bodyFont: 'montserrat', navFont: 'marcellus', accentFont: 'cormorant', baseSize: 14, headingScale: 1.0,
      headingWeight: 400, bodyWeight: 300, headingTracking: 0.08, headingCase: 'uppercase', navTracking: 0.22, navCase: 'uppercase', navSize: 12, lineHeight: 1.75,
    },
    layout: {
      containerWidth: 1400, sectionSpacing: 136, gridColumns: 4, gridGap: 20, radius: 0, imageRatio: 'portrait',
      cardVariant: 'noir', pdpVariant: 'stacked', pdpStyle: 'noir', collectionVariant: 'drawer',
    },
    buttons: { shape: 'square', style: 'solid', hover: 'darken', uppercase: true, tracking: 0.18, size: 'md', weight: 500 },
    header: { variant: 'split', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: BRAND.tagline, logoImage: BRAND.logo, logoSize: 72, borderBottom: true },
    footer: { variant: 'noir', tagline: 'Fine jewellery for evenings worth remembering.', showNewsletter: true, showSocial: true, showPayments: true },
    announcement: { ...ANNOUNCEMENT, style: 'rotate' },
    mobile: { ...MOBILE, heroHeight: '90', sectionSpacing: 72 },
    animation: { style: 'reveal', speed: 1100 },
  },
  sections: [
    section('hero', 'cinematic', { height: 'full', slides: [slide(HERO_BRIDAL, IMG.handRings, { overlay: 45, heading: 'The Art of Brilliance' }), slide(HERO_PRIMARY, IMG.heroMain, { overlay: 55 })] }),
    section('featured-collections', 'tiles', { eyebrow: 'Collections', heading: 'Curated for the Evening', collections: ['bridal', 'pearl-edit', 'best-sellers'] }),
    section('product-grid', 'grid', grid('Signature Pieces', 'bestsellers', { eyebrow: 'The Icons' })),
    section('brand-story', 'centered', { ...BRAND_STORY, image: IMG.elara1 }),
    section('video', 'fullwidth', { ...VIDEO, poster: IMG.handRings }),
    section('product-grid', 'grid', grid('New Arrivals', 'new', { eyebrow: 'Just Arrived', limit: 4 })),
    section('testimonials', 'letter', { eyebrow: 'Testimonials', heading: 'In Their Words', items: TESTIMONIALS }),
    section('newsletter', 'split', { ...NEWSLETTER, image: IMG.elara2, heading: 'Private Client List' }),
  ],
};

const editorial: ThemeDefinition = {
  id: 'editorial',
  name: 'Editorial Magazine',
  tagline: 'Fashion-week pages, oversized serif',
  description: 'Paper-toned pages, Bodoni Moda display type and a magazine masthead header. Asymmetric product layouts, numbered collection lists and rising motion.',
  mood: ['Paper', 'Didone', 'Asymmetric'],
  settings: {
    colors: {
      background: '#F4F1EC', surface: '#E9E4DC', text: '#111111', muted: '#6B6560', primary: '#111111', primaryText: '#F4F1EC',
      secondary: '#DCD3C6', accent: '#8C2F2B', border: '#D5CEC4', sale: '#8C2F2B', headerBg: '#F4F1EC', headerText: '#111111',
      footerBg: '#111111', footerText: '#F4F1EC', announcementBg: '#111111', announcementText: '#F4F1EC',
    },
    typography: {
      headingFont: 'bodoni', bodyFont: 'figtree', navFont: 'figtree', accentFont: 'bodoni', baseSize: 15, headingScale: 1.3,
      headingWeight: 400, bodyWeight: 400, headingTracking: -0.03, headingCase: 'none', navTracking: 0.14, navCase: 'uppercase', navSize: 11, lineHeight: 1.6,
    },
    layout: {
      containerWidth: 1480, sectionSpacing: 128, gridColumns: 3, gridGap: 32, radius: 0, imageRatio: 'tall',
      cardVariant: 'editorial', pdpVariant: 'stacked', pdpStyle: 'editorial', collectionVariant: 'drawer',
    },
    buttons: { shape: 'square', style: 'solid', hover: 'invert', uppercase: true, tracking: 0.16, size: 'md', weight: 500 },
    header: { variant: 'masthead', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: 'Issue No. 12 — The Jewelry Issue', logoImage: '', logoSize: 64, borderBottom: true },
    footer: { variant: 'editorial', tagline: 'Subscribe to The EVERMOON Journal.', showNewsletter: true, showSocial: true, showPayments: false },
    announcement: { ...ANNOUNCEMENT, style: 'marquee' },
    mobile: { ...MOBILE, headerVariant: 'left', heroHeight: 'auto' },
    animation: { style: 'rise', speed: 1000 },
  },
  sections: [
    section('hero', 'editorial', {
      height: 'large',
      slides: [slide(HERO_PRIMARY, IMG.aurelia2, { image2: IMG.isabella1, image3: IMG.celestine2, eyebrow: 'The Jewelry Issue', heading: 'Jewelry Made for Your Moments' })],
    }),
    section('rich-text', 'statement', { ...STATEMENT, align: 'left', size: 'xl' }),
    section('product-grid', 'asymmetric', grid('The Edit: Best Sellers', 'bestsellers', { eyebrow: 'Chapter I', limit: 5 })),
    section('image-text', 'magazine', { ...BRAND_STORY, image: IMG.celestine2, imagePosition: 'left', quote: 'Jewelry should feel like a memory you can wear.' }),
    section('featured-collections', 'numbered', { eyebrow: 'Chapter II', heading: 'Collections', collections: ['new-arrivals', 'pearl-edit', 'bridal', 'everyday-gold', 'gifts'] }),
    section('product-grid', 'offset', grid('New This Season', 'new', { eyebrow: 'Chapter III', limit: 6 })),
    section('instagram', 'mosaic', { heading: 'On the Street', handle: 'EVERMOON', link: 'https://instagram.com/', images: INSTAGRAM_IMAGES }),
    section('newsletter', 'split', { ...NEWSLETTER, image: IMG.crescent2, heading: 'The EVERMOON Journal' }),
  ],
};

const oldMoney: ThemeDefinition = {
  id: 'old-money',
  name: 'Old Money Elegance',
  tagline: 'Heritage, parchment & antique gold',
  description: 'Parchment and deep brown palette with Libre Baskerville and EB Garamond small caps. Heritage header with crest, framed product cards and slow, stately fades.',
  mood: ['Heritage', 'Parchment', 'Small caps'],
  settings: {
    colors: {
      background: '#F2EBDD', surface: '#E8DDC8', text: '#3B2A1E', muted: '#7D6A58', primary: '#3F2B1F', primaryText: '#F2EBDD',
      secondary: '#DCCDB2', accent: '#8C6A3F', border: '#D6C6AC', sale: '#8B3A2E', headerBg: '#F2EBDD', headerText: '#3B2A1E',
      footerBg: '#3F2B1F', footerText: '#EFE4D0', announcementBg: '#3F2B1F', announcementText: '#EFE4D0',
    },
    typography: {
      headingFont: 'baskerville', bodyFont: 'karla', navFont: 'ebgaramond', accentFont: 'ebgaramond', baseSize: 16, headingScale: 0.95,
      headingWeight: 400, bodyWeight: 400, headingTracking: 0, headingCase: 'none', navTracking: 0.12, navCase: 'uppercase', navSize: 13, lineHeight: 1.7,
    },
    layout: {
      containerWidth: 1240, sectionSpacing: 120, gridColumns: 3, gridGap: 36, radius: 0, imageRatio: 'portrait',
      cardVariant: 'framed', pdpVariant: 'thumbs-left', pdpStyle: 'heritage', collectionVariant: 'sidebar',
    },
    buttons: { shape: 'square', style: 'solid', hover: 'darken', uppercase: true, tracking: 0.14, size: 'md', weight: 500 },
    header: { variant: 'heritage', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: 'Est. 2019 · Lahore', logoImage: '', logoSize: 28, borderBottom: true },
    footer: { variant: 'heritage', tagline: 'Heirlooms in the making since 2019.', showNewsletter: true, showSocial: false, showPayments: true },
    announcement: { ...ANNOUNCEMENT, style: 'static', messages: [{ text: 'Client care replies from the contact page', link: '/contact' }] },
    mobile: { ...MOBILE, gridColumns: 2, baseSize: 15 },
    animation: { style: 'slow', speed: 1400 },
  },
  sections: [
    section('hero', 'classic', { height: 'large', slides: [slide(HERO_PEARL, IMG.celestine1, { align: 'center', textColor: 'dark', overlay: 0, heading: 'Heirlooms in the Making', eyebrow: 'Since 2019' })] }),
    section('categories', 'framed', { eyebrow: 'The Collections', heading: 'Browse the House', items: CATEGORY_TILES.slice(0, 3) }),
    section('brand-story', 'heritage', { ...BRAND_STORY, image: IMG.celestine2, signature: 'Founded in Lahore, 2019' }),
    section('product-grid', 'grid', grid('Enduring Favourites', 'bestsellers', { eyebrow: 'Best Sellers', limit: 6 })),
    section('image-banner', 'fullwidth', { ...HERO_BRIDAL, image: IMG.elara1, align: 'center', textColor: 'light', overlay: 45, height: 'medium', ctaLabel: 'View the Bridal Salon', ctaLink: '/collections/bridal', body: HERO_BRIDAL.subheading }),
    section('testimonials', 'letter', { eyebrow: 'Correspondence', heading: 'Letters from Clients', items: TESTIMONIALS }),
    section('faq', 'accordion', { eyebrow: 'Enquiries', heading: 'Frequently Asked', items: FAQ_ITEMS }),
    section('newsletter', 'centered', { ...NEWSLETTER, heading: 'Letters from EVERMOON' }),
  ],
};

const scandinavian: ThemeDefinition = {
  id: 'scandinavian',
  name: 'Scandinavian Minimal',
  tagline: 'Airy, calm, soft grey light',
  description: 'Soft greys and oat tones with light-weight Jost throughout. A spacious menu-overlay header, geometric cards and quick, quiet fades.',
  mood: ['Airy', 'Oat & grey', 'Geometric'],
  settings: {
    colors: {
      background: '#FAFAF8', surface: '#F0EFEC', text: '#2E2E2E', muted: '#8C8C8A', primary: '#2E2E2E', primaryText: '#FFFFFF',
      secondary: '#E8E6E1', accent: '#B5A897', border: '#E6E5E1', sale: '#B15C4A', headerBg: '#FAFAF8', headerText: '#2E2E2E',
      footerBg: '#F0EFEC', footerText: '#2E2E2E', announcementBg: '#E8E6E1', announcementText: '#2E2E2E',
    },
    typography: {
      headingFont: 'jost', bodyFont: 'jost', navFont: 'jost', accentFont: 'jost', baseSize: 15, headingScale: 0.95,
      headingWeight: 300, bodyWeight: 400, headingTracking: 0.02, headingCase: 'none', navTracking: 0.08, navCase: 'none', navSize: 14, lineHeight: 1.7,
    },
    layout: {
      containerWidth: 1360, sectionSpacing: 128, gridColumns: 4, gridGap: 20, radius: 4, imageRatio: 'square',
      cardVariant: 'nordic', pdpVariant: 'grid', pdpStyle: 'nordic', collectionVariant: 'topbar',
    },
    buttons: { shape: 'soft', style: 'solid', hover: 'darken', uppercase: false, tracking: 0.04, size: 'md', weight: 400 },
    header: { variant: 'menu', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: '', logoImage: '', logoSize: 24, borderBottom: false },
    footer: { variant: 'nordic', tagline: 'Less, but better. Jewelry for slow living.', showNewsletter: true, showSocial: true, showPayments: false },
    announcement: { ...ANNOUNCEMENT, enabled: false },
    mobile: { ...MOBILE, headerVariant: 'left', showAnnouncement: false },
    animation: { style: 'fade', speed: 400 },
  },
  sections: [
    section('hero', 'minimal', { height: 'large', slides: [slide(HERO_PRIMARY, IMG.noor2, { textColor: 'dark', overlay: 0, heading: 'Quiet pieces for everyday moments', eyebrow: 'Everyday gold' })] }),
    section('categories', 'grid', { eyebrow: '', heading: 'Categories', items: CATEGORY_TILES.slice(0, 4) }),
    section('product-grid', 'grid', grid('New in', 'new', { limit: 8 })),
    section('image-text', 'split', { ...STATEMENT, heading: 'Made to be worn, not kept', image: IMG.crescent2, imagePosition: 'left' }),
    section('product-grid', 'grid', grid('Most loved', 'bestsellers', { limit: 4 })),
    section('rich-text', 'simple', { eyebrow: '', heading: 'Thoughtfully made', body: 'Recycled sterling silver, thick 18k gold vermeil and packaging made from FSC-certified paper.', align: 'center', size: 'md' }),
    section('newsletter', 'inline', { ...NEWSLETTER, heading: 'Stay in touch' }),
  ],
};

const parisian: ThemeDefinition = {
  id: 'parisian',
  name: 'Parisian Chic',
  tagline: 'Effortless, romantic, très chic',
  description: 'Soft ivory and muted rose with Instrument Serif headlines and Italiana navigation. A split French-boutique header, arched cards and soft blur-in motion.',
  mood: ['Muted rose', 'Arches', 'Romantic'],
  settings: {
    colors: {
      background: '#FAF6F0', surface: '#F2E7E2', text: '#3D2F2C', muted: '#8F7C77', primary: '#8E5E5E', primaryText: '#FAF6F0',
      secondary: '#E9D6CF', accent: '#B88A84', border: '#E9DDD6', sale: '#A2524F', headerBg: '#FAF6F0', headerText: '#3D2F2C',
      footerBg: '#F2E7E2', footerText: '#3D2F2C', announcementBg: '#8E5E5E', announcementText: '#FAF6F0',
    },
    typography: {
      headingFont: 'instrument', bodyFont: 'manrope', navFont: 'italiana', accentFont: 'instrument', baseSize: 15, headingScale: 1.2,
      headingWeight: 400, bodyWeight: 400, headingTracking: -0.01, headingCase: 'none', navTracking: 0.14, navCase: 'uppercase', navSize: 14, lineHeight: 1.65,
    },
    layout: {
      containerWidth: 1300, sectionSpacing: 112, gridColumns: 3, gridGap: 28, radius: 0, imageRatio: 'portrait',
      cardVariant: 'arch', pdpVariant: 'carousel', pdpStyle: 'romantic', collectionVariant: 'banner',
    },
    buttons: { shape: 'pill', style: 'outline', hover: 'fill', uppercase: true, tracking: 0.12, size: 'md', weight: 500 },
    header: { variant: 'parisian', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: 'Bijoux · Lahore', logoImage: '', logoSize: 36, borderBottom: true },
    footer: { variant: 'parisian', tagline: 'Merci for wearing our pieces with love.', showNewsletter: true, showSocial: true, showPayments: false },
    announcement: { ...ANNOUNCEMENT, style: 'rotate' },
    mobile: { ...MOBILE },
    animation: { style: 'blur', speed: 900 },
  },
  sections: [
    section('hero', 'romantic', { height: 'full', slides: [slide(HERO_PEARL, IMG.celestine2, { align: 'center', overlay: 30, heading: 'Effortless, Always', eyebrow: 'La Collection Perle' })] }),
    section('featured-collections', 'arches', { eyebrow: 'Collections', heading: 'Choose Your Story', collections: ['pearl-edit', 'everyday-gold', 'bridal'] }),
    section('product-grid', 'carousel', grid('Les Favoris', 'bestsellers', { eyebrow: 'Best Sellers', limit: 9 })),
    section('image-text', 'overlap', { ...BRAND_STORY, image: IMG.aurelia2, image2: IMG.amara1, imagePosition: 'left' }),
    section('product-grid', 'grid', grid('Nouveautés', 'new', { eyebrow: 'New Arrivals', limit: 6 })),
    section('testimonials', 'slider', { eyebrow: 'Avec Amour', heading: 'Kind Words', items: TESTIMONIALS }),
    section('instagram', 'grid', { heading: 'Worn with EVERMOON', handle: 'EVERMOON', link: 'https://instagram.com/', images: INSTAGRAM_IMAGES }),
    section('newsletter', 'centered', { ...NEWSLETTER, heading: 'Les Nouvelles' }),
  ],
};

const goldenGlamour: ThemeDefinition = {
  id: 'golden-glamour',
  name: 'Golden Glamour',
  tagline: 'Champagne, gold foil & celebration',
  description: 'Champagne and gold palette with DM Serif Display headlines. A luxe header with mega menu, gold-accented product cards, promo banners and shimmering buttons.',
  mood: ['Champagne', 'Gold foil', 'Festive'],
  settings: {
    colors: {
      background: '#FFFBF3', surface: '#F7EDD9', text: '#2F2416', muted: '#8C7A5E', primary: '#A87C2A', primaryText: '#FFFFFF',
      secondary: '#EEDDB8', accent: '#C9A13B', border: '#EADBB9', sale: '#B0413E', headerBg: '#FFFBF3', headerText: '#2F2416',
      footerBg: '#2F2416', footerText: '#F7EDD9', announcementBg: '#A87C2A', announcementText: '#FFFFFF',
    },
    typography: {
      headingFont: 'dmserif', bodyFont: 'outfit', navFont: 'outfit', accentFont: 'dmserif', baseSize: 15, headingScale: 1.05,
      headingWeight: 400, bodyWeight: 400, headingTracking: -0.01, headingCase: 'none', navTracking: 0.1, navCase: 'uppercase', navSize: 12, lineHeight: 1.6,
    },
    layout: {
      containerWidth: 1360, sectionSpacing: 100, gridColumns: 4, gridGap: 24, radius: 6, imageRatio: 'portrait',
      cardVariant: 'luxe', pdpVariant: 'thumbs-left', pdpStyle: 'luxe', collectionVariant: 'banner',
    },
    buttons: { shape: 'rounded', style: 'solid', hover: 'shine', uppercase: true, tracking: 0.12, size: 'md', weight: 600 },
    header: { variant: 'luxe', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: '✦ Fine Jewelry ✦', logoImage: '', logoSize: 30, borderBottom: true },
    footer: { variant: 'glamour', tagline: 'Celebrate every moment in gold.', showNewsletter: true, showSocial: true, showPayments: true },
    announcement: { ...ANNOUNCEMENT, style: 'marquee', messages: [{ text: '✦ Festive Edit: up to 20% off selected pieces', link: '/collections/sale' }, ...ANNOUNCEMENT.messages] },
    mobile: { ...MOBILE },
    animation: { style: 'scale', speed: 700 },
  },
  sections: [
    section('hero', 'luxe', {
      height: 'large',
      autoplay: true,
      interval: 5,
      slides: [slide(HERO_PRIMARY, IMG.heroMain, { overlay: 30 }), slide(HERO_BRIDAL, IMG.amara2, { overlay: 35 }), slide(HERO_PEARL, IMG.soleil1, { overlay: 35 })],
    }),
    section('trust-badges', 'row', { items: TRUST_BADGES }),
    section('categories', 'tiles', { eyebrow: 'Shop by Category', heading: 'Treasures for Every Occasion', items: CATEGORY_TILES }),
    section('product-grid', 'grid', grid('Best Sellers', 'bestsellers', { eyebrow: '✦ Most Wanted ✦' })),
    section('image-banner', 'promo', { eyebrow: 'Festive Edit', heading: 'Up to 20% Off Selected Pieces', body: 'Limited-time pricing on fan favourites. While stocks last.', ctaLabel: 'Shop the Sale', ctaLink: '/collections/sale', image: IMG.rosalie, align: 'left', textColor: 'dark', overlay: 0, height: 'medium' }),
    section('product-grid', 'carousel', grid('New Arrivals', 'new', { eyebrow: '✦ Just Landed ✦', limit: 10 })),
    section('complete-the-look', 'hotspots', { ...COMPLETE_THE_LOOK }),
    section('testimonials', 'cards', { eyebrow: '★★★★★', heading: 'Rated Excellent by Our Clients', items: TESTIMONIALS }),
    section('newsletter', 'card', { ...NEWSLETTER, heading: 'Join & Enjoy 10% Off', buttonLabel: 'Unlock My 10%' }),
  ],
};

const contemporary: ThemeDefinition = {
  id: 'contemporary',
  name: 'Contemporary Boutique',
  tagline: 'Bold, sculptural, gallery-like',
  description: 'Warm grey with terracotta accents, Syne display type and a floating pill header. Mosaic hero, overlay product cards, bento sections and sliding motion.',
  mood: ['Sculptural', 'Terracotta', 'Bento'],
  settings: {
    colors: {
      background: '#F3F1EE', surface: '#E7E3DD', text: '#1C1B1A', muted: '#77726C', primary: '#1C1B1A', primaryText: '#F3F1EE',
      secondary: '#D8D2C8', accent: '#C46A4A', border: '#D9D4CC', sale: '#C46A4A', headerBg: '#FFFFFF', headerText: '#1C1B1A',
      footerBg: '#1C1B1A', footerText: '#F3F1EE', announcementBg: '#C46A4A', announcementText: '#FFFFFF',
    },
    typography: {
      headingFont: 'syne', bodyFont: 'spacegrotesk', navFont: 'spacegrotesk', accentFont: 'syne', baseSize: 15, headingScale: 1.1,
      headingWeight: 600, bodyWeight: 400, headingTracking: -0.03, headingCase: 'none', navTracking: 0, navCase: 'none', navSize: 14, lineHeight: 1.55,
    },
    layout: {
      containerWidth: 1440, sectionSpacing: 96, gridColumns: 4, gridGap: 16, radius: 20, imageRatio: 'portrait',
      cardVariant: 'overlay', pdpVariant: 'asymmetric', pdpStyle: 'bold', collectionVariant: 'topbar',
    },
    buttons: { shape: 'pill', style: 'solid', hover: 'lift', uppercase: false, tracking: 0, size: 'lg', weight: 600 },
    header: { variant: 'floating', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: '', logoImage: '', logoSize: 22, borderBottom: false },
    footer: { variant: 'bento', tagline: 'Jewelry as sculpture. Designed in Lahore.', showNewsletter: true, showSocial: true, showPayments: true },
    announcement: { ...ANNOUNCEMENT, style: 'marquee' },
    mobile: { ...MOBILE, headerVariant: 'left', containerPadding: 16 },
    animation: { style: 'slide', speed: 700 },
  },
  sections: [
    section('hero', 'mosaic', {
      height: 'large',
      slides: [slide(HERO_PRIMARY, IMG.isabella2, { image2: IMG.amara1, image3: IMG.lyra, textColor: 'dark', overlay: 0, heading: 'Jewelry Made for Your Moments' })],
    }),
    section('categories', 'pills', { eyebrow: '', heading: 'Shop by category', items: CATEGORY_TILES }),
    section('product-grid', 'offset', grid('Best sellers', 'bestsellers', { limit: 8 })),
    section('image-text', 'bento', { ...STATEMENT, image: IMG.isabella1, image2: IMG.ariaChain }),
    section('video', 'inset', { ...VIDEO, poster: IMG.lyra }),
    section('product-grid', 'grid', grid('New arrivals', 'new', { limit: 8 })),
    section('testimonials', 'marquee', { eyebrow: '', heading: 'Word on the street', items: TESTIMONIALS }),
    section('instagram', 'strip', { heading: 'EVERMOON', handle: 'EVERMOON', link: 'https://instagram.com/', images: INSTAGRAM_IMAGES }),
    section('newsletter', 'card', { ...NEWSLETTER, heading: 'Get on the list' }),
  ],
};

const glassmorphism: ThemeDefinition = {
  id: 'glassmorphism',
  name: 'Glassmorphism',
  tagline: 'Frosted pearl, soft gold light',
  description: 'Translucent cards and a frosted header over a warm pearl ground. Blur stays on the chrome so product photographs remain the focus. Text stays dark and primary buttons stay solid.',
  mood: ['Frosted', 'Pearl', 'Layered'],
  settings: {
    colors: {
      background: '#F4EFE8', surface: '#FBF8F4', text: '#241E1A', muted: '#5C544C', primary: '#2A2420', primaryText: '#F7F3EE',
      secondary: '#E7DFD4', accent: '#7A5A32', border: '#DDD3C7', sale: '#8E3F36', headerBg: '#F7F3EE', headerText: '#241E1A',
      footerBg: '#EFE8DF', footerText: '#241E1A', announcementBg: '#2A2420', announcementText: '#F7F3EE',
    },
    typography: {
      headingFont: 'cormorant', bodyFont: 'inter', navFont: 'inter', accentFont: 'cormorant', baseSize: 15, headingScale: 1.02,
      headingWeight: 500, bodyWeight: 400, headingTracking: -0.02, headingCase: 'none', navTracking: 0.08, navCase: 'uppercase', navSize: 12, lineHeight: 1.6,
    },
    layout: {
      containerWidth: 1320, sectionSpacing: 96, gridColumns: 4, gridGap: 20, radius: 18, imageRatio: 'portrait',
      cardVariant: 'rounded', pdpVariant: 'thumbs-left', pdpStyle: 'soft', collectionVariant: 'topbar',
    },
    buttons: { shape: 'soft', style: 'solid', hover: 'lift', uppercase: false, tracking: 0.04, size: 'md', weight: 560 },
    header: { variant: 'floating', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: '', logoImage: '', logoSize: 22, borderBottom: false },
    footer: { variant: 'soft', tagline: 'Frosted light, solid gold. Jewelry remains the focus.', showNewsletter: true, showSocial: true, showPayments: true },
    announcement: { ...ANNOUNCEMENT },
    mobile: { ...MOBILE, headerVariant: 'left', containerPadding: 16 },
    animation: { style: 'fade', speed: 500 },
  },
  sections: [],
};

const neumorphism: ThemeDefinition = {
  id: 'neumorphism',
  name: 'Neumorphism',
  tagline: 'Soft clay, quiet depth',
  description: 'A warm clay surface with balanced raised and inset shadows, rounded controls, and a pressed state. Mobile shadows stay small so the boutique remains readable and fast.',
  mood: ['Sculpted', 'Soft', 'Quiet'],
  settings: {
    colors: {
      background: '#E6DFD4', surface: '#E6DFD4', text: '#2C261F', muted: '#5C534A', primary: '#2C261F', primaryText: '#F6F1EA',
      secondary: '#DDD4C8', accent: '#7A5428', border: '#D5CBBF', sale: '#8E3F36', headerBg: '#E6DFD4', headerText: '#2C261F',
      footerBg: '#E6DFD4', footerText: '#2C261F', announcementBg: '#2C261F', announcementText: '#F6F1EA',
    },
    typography: {
      headingFont: 'outfit', bodyFont: 'outfit', navFont: 'outfit', accentFont: 'cormorant', baseSize: 15, headingScale: 1,
      headingWeight: 500, bodyWeight: 400, headingTracking: -0.02, headingCase: 'none', navTracking: 0.04, navCase: 'none', navSize: 14, lineHeight: 1.6,
    },
    layout: {
      containerWidth: 1280, sectionSpacing: 88, gridColumns: 4, gridGap: 22, radius: 22, imageRatio: 'portrait',
      cardVariant: 'nordic', pdpVariant: 'stacked', pdpStyle: 'nordic', collectionVariant: 'topbar',
    },
    buttons: { shape: 'rounded', style: 'solid', hover: 'darken', uppercase: false, tracking: 0.02, size: 'md', weight: 600 },
    header: { variant: 'centered', sticky: true, transparentOnHome: false, logoText: 'EVERMOON', logoTagline: '', logoImage: '', logoSize: 22, borderBottom: false },
    footer: { variant: 'nordic', tagline: 'Soft surfaces, clear pieces. Designed in Lahore.', showNewsletter: true, showSocial: true, showPayments: true },
    announcement: { ...ANNOUNCEMENT, style: 'static' },
    mobile: { ...MOBILE, containerPadding: 16 },
    animation: { style: 'fade', speed: 480 },
  },
  sections: [],
};

const LOGO = { logoText: 'EVERMOON', logoTagline: BRAND.tagline, logoImage: BRAND.logo, logoSize: 72 };
softLuxury.settings.header = { ...softLuxury.settings.header, ...LOGO };
modernMinimal.settings.header = { ...modernMinimal.settings.header, ...LOGO, logoSize: 64 };
roseBoutique.settings.header = { ...roseBoutique.settings.header, ...LOGO };
darkLuxury.settings.header = { ...darkLuxury.settings.header, ...LOGO };
editorial.settings.header = { ...editorial.settings.header, ...LOGO, logoSize: 68 };
oldMoney.settings.header = { ...oldMoney.settings.header, ...LOGO };
scandinavian.settings.header = { ...scandinavian.settings.header, ...LOGO, logoSize: 64 };
parisian.settings.header = { ...parisian.settings.header, ...LOGO };
goldenGlamour.settings.header = { ...goldenGlamour.settings.header, ...LOGO };
contemporary.settings.header = { ...contemporary.settings.header, ...LOGO, logoSize: 60 };
glassmorphism.settings.header = { ...glassmorphism.settings.header, ...LOGO, logoSize: 36 };
neumorphism.settings.header = { ...neumorphism.settings.header, ...LOGO, logoSize: 56 };

softLuxury.sections = buildHome({ hero: 'campaign', categories: 'tiles', featured: 'asymmetric', arrivals: 'carousel', bestsellers: 'grid', story: 'split', reviews: 'cards' });
modernMinimal.sections = buildHome({ hero: 'split', heroImage: LOOK.worn, categories: 'list', featured: 'grid', arrivals: 'grid', bestsellers: 'grid', story: 'split', reviews: 'cards', editorialImage: IMG.celestine1, introImage: IMG.noor1 });
roseBoutique.sections = buildHome({ hero: 'arch', heroImage: IMG.serenePearl, categories: 'circles', featured: 'grid', arrivals: 'carousel', bestsellers: 'carousel', story: 'split', reviews: 'cards', editorialImage: IMG.raniaBridal, promoImage: IMG.heirloomPearl });
darkLuxury.sections = buildHome({ hero: 'split', heroImage: LOOK.editorial, categories: 'tiles', featured: 'grid', arrivals: 'grid', bestsellers: 'carousel', story: 'centered', reviews: 'letter', editorialImage: IMG.aurora, introImage: IMG.zoyaChain });
editorial.sections = buildHome({ hero: 'editorial', heroImage: LOOK.worn, categories: 'framed', featured: 'asymmetric', arrivals: 'grid', bestsellers: 'grid', story: 'split', reviews: 'letter', editorialImage: LOOK.editorial });
oldMoney.sections = buildHome({ hero: 'classic', heroImage: LOOK.hero, categories: 'framed', featured: 'grid', arrivals: 'grid', bestsellers: 'grid', story: 'heritage', reviews: 'letter', editorialImage: IMG.elara1 });
scandinavian.sections = buildHome({ hero: 'minimal', heroImage: IMG.amara1, categories: 'grid', featured: 'grid', arrivals: 'grid', bestsellers: 'grid', story: 'split', reviews: 'cards', introImage: LOOK.story });
parisian.sections = buildHome({ hero: 'split', heroImage: IMG.celestine1, categories: 'circles', featured: 'carousel', arrivals: 'carousel', bestsellers: 'grid', story: 'split', reviews: 'slider', editorialImage: IMG.isabella1 });
goldenGlamour.sections = buildHome({ hero: 'split', heroImage: LOOK.hero, categories: 'tiles', featured: 'grid', arrivals: 'carousel', bestsellers: 'grid', story: 'split', reviews: 'cards', promoImage: IMG.soleil1, editorialImage: LOOK.editorial });
contemporary.sections = buildHome({ hero: 'mosaic', heroImage: LOOK.worn, categories: 'pills', featured: 'grid', arrivals: 'grid', bestsellers: 'carousel', story: 'split', reviews: 'cards', editorialImage: IMG.crescent2, introImage: IMG.noor1 });
glassmorphism.sections = buildHome({ hero: 'split', heroImage: LOOK.hero, categories: 'pills', featured: 'grid', arrivals: 'grid', bestsellers: 'grid', story: 'split', reviews: 'cards', editorialImage: IMG.celestine1, introImage: LOOK.story });
neumorphism.sections = buildHome({ hero: 'minimal', heroImage: IMG.amara1, categories: 'tiles', featured: 'grid', arrivals: 'grid', bestsellers: 'grid', story: 'split', reviews: 'cards', editorialImage: IMG.noor1, introImage: LOOK.story });

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'soft-luxury': softLuxury,
  'modern-minimal': modernMinimal,
  'rose-boutique': roseBoutique,
  'dark-luxury': darkLuxury,
  editorial,
  'old-money': oldMoney,
  scandinavian,
  parisian,
  'golden-glamour': goldenGlamour,
  contemporary,
  glassmorphism,
  neumorphism,
};

export const THEME_LIST: ThemeDefinition[] = Object.values(THEMES);
export const DEFAULT_THEME: ThemeId = 'soft-luxury';
