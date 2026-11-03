import { eq, sql } from 'drizzle-orm';
import type { DB } from './index';
import { pages, settings, themeConfigs } from './schema';
import { BRAND } from '@/lib/brand';

const VERSION = '3';

const ABOUT = `## Born in Lahore, made to be worn

EVERMOON is a Lahore studio for pretty little things — jewellery you reach for on an ordinary Tuesday, not only on the night you dress up.

We design in Lahore and finish each piece by hand in 18k gold vermeil, sterling silver, freshwater pearls and certified lab-grown diamonds. The house mark is a small floral moon: a reminder to wear your little wonder.

## Our promise

- **Considered materials** — hypoallergenic, nickel-free metals made for sensitive skin.
- **Hand finishing** — every chain is inspected, every stone set and polished by our artisans.
- **Thoughtful service** — sizing help on WhatsApp, Cash on Delivery, EasyPaisa, JazzCash or bank transfer, and easy 7-day returns.
- **Gift-ready, always** — each order arrives in our signature box with a handwritten note.

## Appointments

Sizing, bridal consultations and engraving are arranged through the [contact page](/contact). A street address is shown only after it is added in admin.`;

function rebrand(text: string) {
  return text
    .replaceAll('Maison Aurelle', 'EVERMOON')
    .replaceAll('Evermoon Jewels', 'EVERMOON')
    .replaceAll('Evermoon', 'EVERMOON')
    .replaceAll('@maisonaurelle', 'EVERMOON')
    .replaceAll('Private appointments available at our Gulberg atelier', 'Client care replies from the contact page')
    .replaceAll('The Gulberg atelier', 'The studio')
    .replaceAll('Designed in Gulberg', 'Designed in Lahore')
    .replaceAll('visit our Gulberg atelier in Lahore', 'contact client care')
    .replaceAll('The Maison', 'The House')
    .replaceAll('MAISON AURELLE', 'EVERMOON')
    .replace(/\bAurelle\b/g, 'EVERMOON')
    .replace(/\bAURELLE\b/g, 'EVERMOON');
}

function rebrandValue(value: unknown): unknown {
  if (typeof value === 'string') return rebrand(value);
  if (Array.isArray(value)) return value.map(rebrandValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = rebrandValue(v);
    return out;
  }
  return value;
}

/** Additive brand pass. Does not delete products, orders, customers, or payment accounts. */
export async function applyBrandHome(db: DB, log: (m: string) => void = () => {}) {
  const [marker] = await db.select().from(settings).where(eq(settings.key, 'brand_home_version'));
  const already = marker?.value === VERSION || (typeof marker?.value === 'string' && marker.value === VERSION);

  const [storeRow] = await db.select().from(settings).where(eq(settings.key, 'store'));
  if (storeRow?.value && typeof storeRow.value === 'object') {
    const store = { ...(storeRow.value as Record<string, unknown>) };
    store.name = BRAND.name;
    store.tagline = BRAND.tagline;
    await db.update(settings).set({ value: store, updatedAt: new Date() }).where(eq(settings.key, 'store'));
  }
  const [seoRow] = await db.select().from(settings).where(eq(settings.key, 'seo'));
  if (seoRow?.value && typeof seoRow.value === 'object') {
    const seo = rebrandValue(seoRow.value) as Record<string, unknown>;
    seo.title = `${BRAND.name} — ${BRAND.tagline}`;
    seo.description = 'Handpicked jewellery designed in Lahore — 18k gold vermeil, freshwater pearls and lab-grown diamonds. Cash on Delivery, EasyPaisa, JazzCash and bank transfer, with free shipping over Rs 10,000.';
    await db.update(settings).set({ value: seo, updatedAt: new Date() }).where(eq(settings.key, 'seo'));
  }
  for (const key of ['payments', 'navigation', 'search'] as const) {
    const [row] = await db.select().from(settings).where(eq(settings.key, key));
    if (!row) continue;
    const next = rebrandValue(row.value);
    await db.update(settings).set({ value: next as never, updatedAt: new Date() }).where(eq(settings.key, key));
  }

  const retired = [
    ['/images/brand/campaign.webp', '/images/lookbook/hero.webp'],
    ['/images/brand/jewelry.webp', '/images/lookbook/hero.webp'],
    ['/images/brand/rings.webp', '/images/products/elara-solitaire-ring-1.webp'],
    ['/images/brand/tray.webp', '/images/products/celeste-pearl-earrings-1.webp'],
    ['/images/brand/bracelet.webp', '/images/products/luna-tennis-bracelet-1.webp'],
    ['/images/brand/leaves.webp', '/images/lookbook/story.webp'],
  ] as const;
  for (const [from, to] of retired) {
    await db.execute(sql`update theme_configs set published = replace(published::text, ${from}, ${to})::jsonb where published::text like ${'%' + from + '%'}`);
    await db.execute(sql`update theme_configs set draft = replace(draft::text, ${from}, ${to})::jsonb where draft is not null and draft::text like ${'%' + from + '%'}`);
  }

  await db.execute(sql`update products set care = replace(care, 'Aurelle', 'EVERMOON') where care like '%Aurelle%'`);
  await db.execute(sql`update products set description = replace(description, 'Maison Aurelle', 'EVERMOON') where description like '%Maison Aurelle%'`);
  await db.execute(sql`update products set description = replace(description, 'Evermoon Jewels', 'EVERMOON') where description like '%Evermoon Jewels%'`);
  await db.execute(sql`update products set description = replace(description, 'Aurelle', 'EVERMOON') where description like '%Aurelle%'`);

  const pageRows = await db.select().from(pages);
  for (const page of pageRows) {
    const content = page.slug === 'about' ? ABOUT : rebrand(page.content || '');
    const title = page.slug === 'about' ? 'Our Story' : rebrand(page.title);
    await db
      .update(pages)
      .set({
        title,
        content,
        seoTitle: page.seoTitle ? rebrand(page.seoTitle) : page.seoTitle,
        seoDescription: page.slug === 'about'
          ? 'EVERMOON is a Lahore studio for pretty jewellery — gold vermeil, pearls and lab-grown diamonds, made to be worn.'
          : page.seoDescription ? rebrand(page.seoDescription) : page.seoDescription,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, page.id));
  }

  const themes = await db.select().from(themeConfigs);
  for (const theme of themes) {
    if (theme.published) {
      await db.update(themeConfigs).set({ published: rebrandValue(theme.published) as never, updatedAt: new Date() }).where(eq(themeConfigs.themeId, theme.themeId));
    }
    if (theme.draft) {
      await db.update(themeConfigs).set({ draft: rebrandValue(theme.draft) as never, updatedAt: new Date() }).where(eq(themeConfigs.themeId, theme.themeId));
    }
  }
  await db.execute(sql`update theme_configs set published = jsonb_set(coalesce(published, '{}'::jsonb), '{settings,header,logoText}', '"EVERMOON"'::jsonb, true) where published is not null`);
  if (!already) {
    await db
      .insert(settings)
      .values({ key: 'brand_home_version', value: VERSION })
      .onConflictDoUpdate({ target: settings.key, set: { value: VERSION, updatedAt: new Date() } });
    log(`brand home v${VERSION} marked — layouts were not replaced`);
  } else {
    log('brand home already current — copy refreshed, theme layouts left in place');
  }
}
