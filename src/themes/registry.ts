import type { SectionType, SectionSettings } from './types';
import { CATEGORY_TILES, FAQ_ITEMS, HERO_PRIMARY, INSTAGRAM_IMAGES, NEWSLETTER, TESTIMONIALS, TRUST_BADGES, VIDEO } from './content';
import { IMG } from '@/lib/images';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'image'
  | 'url'
  | 'select'
  | 'toggle'
  | 'number'
  | 'range'
  | 'collection'
  | 'collections'
  | 'category'
  | 'products'
  | 'product'
  | 'images'
  | 'list';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  fields?: Field[]; // for list
  itemLabel?: string; // for list
  showIf?: { key: string; equals: string[] };
}

export interface SectionDef {
  label: string;
  description: string;
  variants: { id: string; label: string }[];
  fields: Field[];
  defaults: () => SectionSettings;
}

const align = { key: 'align', label: 'Text alignment', type: 'select' as const, options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }] };
const textColor = { key: 'textColor', label: 'Text colour', type: 'select' as const, options: [{ value: 'light', label: 'Light (on dark image)' }, { value: 'dark', label: 'Dark (on light image)' }] };
const overlay = { key: 'overlay', label: 'Overlay darkness', type: 'range' as const, min: 0, max: 80, step: 5 };
const height = { key: 'height', label: 'Height', type: 'select' as const, options: [{ value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }, { value: 'full', label: 'Full screen' }] };
const eyebrow: Field = { key: 'eyebrow', label: 'Eyebrow (small label)', type: 'text' };
const heading: Field = { key: 'heading', label: 'Heading', type: 'text' };
const cta: Field[] = [
  { key: 'ctaLabel', label: 'Button label', type: 'text' },
  { key: 'ctaLink', label: 'Button link', type: 'url' },
];

export const SECTION_REGISTRY: Record<SectionType, SectionDef> = {
  hero: {
    label: 'Hero Slider',
    description: 'Full-impact opening with slides, image or video backgrounds and calls to action.',
    variants: [
      { id: 'fullbleed', label: 'Full-bleed' },
      { id: 'split', label: 'Split screen' },
      { id: 'arch', label: 'Arch frame' },
      { id: 'cinematic', label: 'Cinematic' },
      { id: 'editorial', label: 'Editorial collage' },
      { id: 'classic', label: 'Classic framed' },
      { id: 'minimal', label: 'Minimal' },
      { id: 'romantic', label: 'Romantic centred' },
      { id: 'luxe', label: 'Luxe slider' },
      { id: 'mosaic', label: 'Mosaic' },
    ],
    fields: [
      height,
      { key: 'autoplay', label: 'Autoplay slides', type: 'toggle' },
      { key: 'interval', label: 'Seconds per slide', type: 'number', min: 3, max: 15 },
      {
        key: 'slides',
        label: 'Slides',
        type: 'list',
        itemLabel: 'Slide',
        fields: [
          { key: 'image', label: 'Desktop image', type: 'image' },
          { key: 'mobileImage', label: 'Mobile image (optional)', type: 'image' },
          { key: 'video', label: 'Background video URL (optional, .mp4)', type: 'url' },
          { key: 'image2', label: 'Secondary image (collage layouts)', type: 'image' },
          { key: 'image3', label: 'Third image (collage layouts)', type: 'image' },
          eyebrow,
          heading,
          { key: 'subheading', label: 'Subheading', type: 'textarea' },
          { key: 'primaryLabel', label: 'Primary button', type: 'text' },
          { key: 'primaryLink', label: 'Primary link', type: 'url' },
          { key: 'secondaryLabel', label: 'Secondary button', type: 'text' },
          { key: 'secondaryLink', label: 'Secondary link', type: 'url' },
          align,
          textColor,
          overlay,
        ],
      },
    ],
    defaults: () => ({ height: 'large', autoplay: true, interval: 6, slides: [{ ...HERO_PRIMARY, image: IMG.heroMain, mobileImage: '', video: '', align: 'left', textColor: 'light', overlay: 25 }] }),
  },
  categories: {
    label: 'Featured Categories',
    description: 'Visual category navigation.',
    variants: [
      { id: 'tiles', label: 'Portrait tiles' },
      { id: 'circles', label: 'Circles' },
      { id: 'list', label: 'Hover list' },
      { id: 'framed', label: 'Framed' },
      { id: 'grid', label: 'Square grid' },
      { id: 'pills', label: 'Pills' },
    ],
    fields: [eyebrow, heading, { key: 'items', label: 'Categories', type: 'list', itemLabel: 'Category', fields: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'image', label: 'Image', type: 'image' }, { key: 'link', label: 'Link', type: 'url' }] }],
    defaults: () => ({ eyebrow: 'Shop by Category', heading: 'Find Your Signature', items: CATEGORY_TILES.slice(0, 5) }),
  },
  'featured-collections': {
    label: 'Featured Collection',
    description: 'Highlight hand-picked collections.',
    variants: [
      { id: 'tiles', label: 'Large tiles' },
      { id: 'arches', label: 'Arches' },
      { id: 'numbered', label: 'Numbered list' },
    ],
    fields: [eyebrow, heading, { key: 'collections', label: 'Collections', type: 'collections' }],
    defaults: () => ({ eyebrow: 'Collections', heading: 'Curated for You', collections: ['new-arrivals', 'pearl-edit', 'bridal'] }),
  },
  'product-grid': {
    label: 'Product Grid',
    description: 'Best sellers, new arrivals, a collection or hand-picked products.',
    variants: [
      { id: 'grid', label: 'Grid' },
      { id: 'carousel', label: 'Carousel' },
      { id: 'asymmetric', label: 'Editorial asymmetric' },
      { id: 'offset', label: 'Staggered offset' },
    ],
    fields: [
      eyebrow,
      heading,
      { key: 'subheading', label: 'Subheading', type: 'textarea' },
      {
        key: 'source',
        label: 'Products to show',
        type: 'select',
        options: [
          { value: 'bestsellers', label: 'Best sellers' },
          { value: 'new', label: 'New arrivals' },
          { value: 'sale', label: 'On sale' },
          { value: 'featured', label: 'Featured products' },
          { value: 'collection', label: 'From a collection' },
          { value: 'category', label: 'From a category' },
          { value: 'manual', label: 'Hand-picked' },
        ],
      },
      { key: 'collection', label: 'Collection', type: 'collection', showIf: { key: 'source', equals: ['collection'] } },
      { key: 'category', label: 'Category', type: 'category', showIf: { key: 'source', equals: ['category'] } },
      { key: 'products', label: 'Products', type: 'products', showIf: { key: 'source', equals: ['manual'] } },
      { key: 'limit', label: 'Number of products', type: 'number', min: 2, max: 16 },
      { key: 'viewAllLabel', label: '“View all” label', type: 'text' },
      { key: 'viewAllLink', label: '“View all” link', type: 'url' },
    ],
    defaults: () => ({ eyebrow: 'Most Loved', heading: 'Best Sellers', subheading: '', source: 'bestsellers', collection: '', category: '', products: [], limit: 8, viewAllLabel: 'View all', viewAllLink: '/collections/best-sellers' }),
  },
  'brand-story': {
    label: 'Brand Story',
    description: 'Tell your story with imagery and a signature.',
    variants: [
      { id: 'split', label: 'Split' },
      { id: 'centered', label: 'Centred' },
      { id: 'heritage', label: 'Heritage' },
    ],
    fields: [eyebrow, heading, { key: 'body', label: 'Text', type: 'textarea' }, { key: 'image', label: 'Image', type: 'image' }, { key: 'image2', label: 'Secondary image', type: 'image' }, { key: 'signature', label: 'Signature line', type: 'text' }, ...cta],
    defaults: () => ({ eyebrow: 'Our Philosophy', heading: 'Made to Be Remembered', body: 'Our jewelry is crafted to celebrate beauty, confidence, and life’s most meaningful moments.', image: IMG.aurelia2, image2: '', signature: 'EVERMOON', ctaLabel: 'Our Story', ctaLink: '/about' }),
  },
  'image-banner': {
    label: 'Image Banner',
    description: 'A wide promotional or editorial banner.',
    variants: [
      { id: 'fullwidth', label: 'Full width' },
      { id: 'framed', label: 'Framed inset' },
      { id: 'promo', label: 'Promo split' },
    ],
    fields: [{ key: 'image', label: 'Image', type: 'image' }, { key: 'mobileImage', label: 'Mobile image', type: 'image' }, eyebrow, heading, { key: 'body', label: 'Text', type: 'textarea' }, ...cta, align, textColor, overlay, height],
    defaults: () => ({ image: IMG.celestine1, mobileImage: '', eyebrow: 'Complimentary', heading: 'Gifts She’ll Treasure', body: 'Every order arrives in our signature box.', ctaLabel: 'Shop Gifts', ctaLink: '/collections/gifts', align: 'center', textColor: 'light', overlay: 35, height: 'medium' }),
  },
  'image-text': {
    label: 'Image with Text',
    description: 'Side-by-side image and copy.',
    variants: [
      { id: 'split', label: 'Split' },
      { id: 'overlap', label: 'Overlapping images' },
      { id: 'magazine', label: 'Magazine' },
      { id: 'bento', label: 'Bento' },
    ],
    fields: [
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'image2', label: 'Secondary image', type: 'image' },
      { key: 'imagePosition', label: 'Image position', type: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
      eyebrow,
      heading,
      { key: 'body', label: 'Text', type: 'textarea' },
      { key: 'quote', label: 'Pull quote (magazine)', type: 'text' },
      ...cta,
    ],
    defaults: () => ({ image: IMG.crescent1, image2: '', imagePosition: 'left', eyebrow: 'Designed in Lahore', heading: 'Worn everywhere', body: 'Each piece is designed in our Lahore studio and finished by hand.', quote: '', ctaLabel: 'Learn more', ctaLink: '/about' }),
  },
  'complete-the-look': {
    label: 'Complete the Look',
    description: 'A shoppable styled image with product hotspots.',
    variants: [{ id: 'hotspots', label: 'Image with hotspots' }],
    fields: [
      eyebrow,
      heading,
      { key: 'body', label: 'Text', type: 'textarea' },
      { key: 'image', label: 'Look image', type: 'image' },
      { key: 'products', label: 'Products in the look', type: 'products' },
      { key: 'hotspots', label: 'Hotspots', type: 'list', itemLabel: 'Hotspot', fields: [{ key: 'product', label: 'Product', type: 'product' }, { key: 'x', label: 'Horizontal position (%)', type: 'range', min: 0, max: 100 }, { key: 'y', label: 'Vertical position (%)', type: 'range', min: 0, max: 100 }] },
    ],
    defaults: () => ({ eyebrow: 'Styled by EVERMOON', heading: 'Complete the Look', body: '', image: IMG.aurelia2, products: ['aurelia-gold-necklace', 'celeste-pearl-earrings'], hotspots: [] }),
  },
  testimonials: {
    label: 'Testimonials',
    description: 'Client reviews and kind words.',
    variants: [
      { id: 'slider', label: 'Centred slider' },
      { id: 'cards', label: 'Cards' },
      { id: 'letter', label: 'Letter' },
      { id: 'marquee', label: 'Marquee' },
    ],
    fields: [eyebrow, heading, { key: 'items', label: 'Testimonials', type: 'list', itemLabel: 'Testimonial', fields: [{ key: 'quote', label: 'Quote', type: 'textarea' }, { key: 'name', label: 'Name', type: 'text' }, { key: 'location', label: 'City', type: 'text' }, { key: 'rating', label: 'Rating', type: 'number', min: 1, max: 5 }, { key: 'product', label: 'Product purchased', type: 'text' }] }],
    defaults: () => ({ eyebrow: 'Kind Words', heading: 'Loved by Our Clients', items: TESTIMONIALS }),
  },
  instagram: {
    label: 'Instagram Gallery',
    description: 'Social proof gallery linking to Instagram.',
    variants: [
      { id: 'grid', label: 'Grid' },
      { id: 'mosaic', label: 'Mosaic' },
      { id: 'strip', label: 'Scrolling strip' },
    ],
    fields: [heading, { key: 'handle', label: 'Handle', type: 'text' }, { key: 'link', label: 'Profile link', type: 'url' }, { key: 'images', label: 'Images', type: 'images' }],
    defaults: () => ({ heading: 'Worn with EVERMOON', handle: 'EVERMOON', link: 'https://instagram.com/', images: INSTAGRAM_IMAGES }),
  },
  newsletter: {
    label: 'Newsletter',
    description: 'Email sign-up with incentive.',
    variants: [
      { id: 'centered', label: 'Centred' },
      { id: 'inline', label: 'Inline' },
      { id: 'card', label: 'Card' },
      { id: 'split', label: 'Split with image' },
    ],
    fields: [eyebrow, heading, { key: 'body', label: 'Text', type: 'textarea' }, { key: 'buttonLabel', label: 'Button label', type: 'text' }, { key: 'image', label: 'Image (split layout)', type: 'image' }, { key: 'disclaimer', label: 'Small print', type: 'text' }],
    defaults: () => ({ ...NEWSLETTER, image: IMG.crescent2 }),
  },
  'rich-text': {
    label: 'Custom Text',
    description: 'A statement, announcement or paragraph.',
    variants: [
      { id: 'statement', label: 'Statement' },
      { id: 'simple', label: 'Simple' },
    ],
    fields: [eyebrow, heading, { key: 'body', label: 'Text', type: 'textarea' }, ...cta, align, { key: 'size', label: 'Size', type: 'select', options: [{ value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }, { value: 'xl', label: 'Extra large' }] }],
    defaults: () => ({ eyebrow: '', heading: 'Designed in Lahore. Worn everywhere.', body: '', ctaLabel: '', ctaLink: '', align: 'center', size: 'lg' }),
  },
  video: {
    label: 'Video Section',
    description: 'Autoplaying ambient video with copy.',
    variants: [
      { id: 'fullwidth', label: 'Full width' },
      { id: 'inset', label: 'Inset' },
    ],
    fields: [{ key: 'videoUrl', label: 'Video URL (.mp4)', type: 'url' }, { key: 'poster', label: 'Poster image', type: 'image' }, eyebrow, heading, { key: 'body', label: 'Text', type: 'textarea' }, ...cta],
    defaults: () => ({ ...VIDEO }),
  },
  faq: {
    label: 'FAQ',
    description: 'Frequently asked questions accordion.',
    variants: [
      { id: 'accordion', label: 'Accordion' },
      { id: 'two-column', label: 'Two columns' },
    ],
    fields: [eyebrow, heading, { key: 'items', label: 'Questions', type: 'list', itemLabel: 'Question', fields: [{ key: 'q', label: 'Question', type: 'text' }, { key: 'a', label: 'Answer', type: 'textarea' }] }],
    defaults: () => ({ eyebrow: 'Help', heading: 'Frequently Asked Questions', items: FAQ_ITEMS }),
  },
  'trust-badges': {
    label: 'Trust Badges',
    description: 'Shipping, packaging and returns reassurance.',
    variants: [{ id: 'row', label: 'Row' }],
    fields: [
      {
        key: 'items',
        label: 'Badges',
        type: 'list',
        itemLabel: 'Badge',
        fields: [
          { key: 'icon', label: 'Icon', type: 'select', options: ['truck', 'gift', 'shield', 'refresh', 'gem', 'sparkles', 'lock', 'phone'].map((v) => ({ value: v, label: v })) },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'text' },
        ],
      },
    ],
    defaults: () => ({ items: TRUST_BADGES }),
  },
};
