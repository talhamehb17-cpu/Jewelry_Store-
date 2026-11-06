/** Premium gift packaging. Prices are paisa. The client never supplies the charge. */

export type GiftImage = { id: string; url: string; alt: string };

export type GiftPackagingSettings = {
  enabled: boolean;
  price: number;
  images: GiftImage[];
  initialized: boolean;
  audit: { by: string; at: string } | null;
};

export const GIFT_SEED_SLUGS = [
  'celeste-pearl-earrings',
  'celestine-pearl-necklace',
  'serene-pearl-set',
  'heirloom-pearl-gift-set',
  'amara-pendant',
  'isabella-gold-hoops',
  'luna-tennis-bracelet',
  'margaux-pearl-drops',
] as const;

export const DEFAULT_GIFT_IMAGES: GiftImage[] = [
  { id: 'box', url: '/images/packaging/gift-box.webp', alt: 'Cream jewelry box with a champagne ribbon' },
  { id: 'pouch', url: '/images/packaging/gift-pouch.webp', alt: 'Suede jewelry pouch with a gold-tone cord' },
];

export const DEFAULT_GIFT_PRICE = 25_000;

export function normalizeGift(input: unknown): GiftPackagingSettings {
  const raw = input && typeof input === 'object' ? (input as Partial<GiftPackagingSettings>) : {};
  const price = Number(raw.price);
  const images = Array.isArray(raw.images)
    ? raw.images
        .filter((img): img is GiftImage => !!img && typeof img.url === 'string' && safeImageUrl(img.url))
        .slice(0, 6)
        .map((img, i) => ({
          id: typeof img.id === 'string' && /^[a-z0-9-]{1,40}$/i.test(img.id) ? img.id : `img-${i + 1}`,
          url: img.url.slice(0, 1000),
          alt: typeof img.alt === 'string' && img.alt.trim() ? img.alt.trim().slice(0, 160) : 'Premium gift packaging',
        }))
    : DEFAULT_GIFT_IMAGES;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    price: Number.isFinite(price) && price >= 0 && price <= 5_000_000 ? Math.round(price) : DEFAULT_GIFT_PRICE,
    images,
    initialized: raw.initialized === true,
    audit: raw.audit && typeof raw.audit.at === 'string' ? { by: String(raw.audit.by || 'admin').slice(0, 120), at: String(raw.audit.at).slice(0, 40) } : null,
  };
}

export function safeImageUrl(url: string) {
  return url.startsWith('/') || url.startsWith('https://');
}

export function giftImage(settings: GiftPackagingSettings, id?: string | null) {
  if (!settings.images.length) return null;
  return settings.images.find((img) => img.id === id) ?? settings.images[0]!;
}

/** One charge per unit. Quantity changes replace the line total; they do not stack a second fee. */
export function giftLineCharge(opts: { enabled: boolean; eligible: boolean; selected: boolean; unitPrice: number; quantity: number }) {
  if (!opts.enabled || !opts.eligible || !opts.selected) return { unit: 0, total: 0 };
  const unit = Math.max(0, Math.round(opts.unitPrice));
  const quantity = Math.max(0, Math.floor(opts.quantity));
  return { unit, total: unit * quantity };
}
