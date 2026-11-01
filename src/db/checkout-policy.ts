import { eq, sql } from 'drizzle-orm';
import type { DB } from './index';
import { pages, settings } from './schema';
import { SEED_PAGES } from './seed-data';

const FLAG = 'payments_v2';

/**
 * Enables Cash on Delivery, keeps EasyPaisa, JazzCash and bank transfer,
 * and turns card checkout off. Runs once so a later admin change is kept.
 * Does not delete products, orders, customers, or payment account numbers.
 */
export async function applyCheckoutMethods(db: DB, log: (m: string) => void = () => {}) {
  const [flag] = await db.select().from(settings).where(eq(settings.key, FLAG));
  if (flag) return;

  const [pay] = await db.select().from(settings).where(eq(settings.key, 'payments'));
  if (pay?.value && typeof pay.value === 'object') {
    const p = structuredClone(pay.value) as {
      cod?: { enabled?: boolean; fee?: number; maxOrder?: number; instructions?: string };
      bank?: { enabled?: boolean };
      easypaisa?: { enabled?: boolean };
      jazzcash?: { enabled?: boolean };
      card?: { enabled?: boolean };
    };
    p.cod = {
      fee: p.cod?.fee ?? 0,
      maxOrder: p.cod?.maxOrder ?? 20_000_000,
      ...p.cod,
      enabled: true,
      instructions: 'Pay the courier in cash when your order arrives. We may call to confirm the address before dispatch.',
    };
    if (p.bank) p.bank.enabled = true;
    if (p.easypaisa) p.easypaisa.enabled = true;
    if (p.jazzcash) p.jazzcash.enabled = true;
    p.card = { enabled: false };
    await db.update(settings).set({ value: p, updatedAt: new Date() }).where(eq(settings.key, 'payments'));
  }

  for (const slug of ['faq', 'privacy-policy'] as const) {
    const page = SEED_PAGES.find((item) => item.slug === slug);
    if (!page) continue;
    await db.update(pages).set({ content: page.content, seoDescription: page.seoDescription, updatedAt: new Date() }).where(eq(pages.slug, slug));
  }

  const [seo] = await db.select().from(settings).where(eq(settings.key, 'seo'));
  if (seo?.value && typeof seo.value === 'object') {
    const next = {
      ...(seo.value as Record<string, string>),
      description:
        'Timeless fine jewelry designed in Lahore — 18k gold vermeil, freshwater pearls and lab-grown diamonds. Cash on Delivery, EasyPaisa, JazzCash and bank transfer, with free shipping over Rs 10,000.',
    };
    await db.update(settings).set({ value: next, updatedAt: new Date() }).where(eq(settings.key, 'seo'));
  }

  await db.execute(sql`
    update theme_configs
    set
      published = replace(published::text, 'EasyPaisa, JazzCash and bank transfer', 'Cash on Delivery, EasyPaisa, JazzCash and bank transfer')::jsonb,
      draft = case
        when draft is null then null
        else replace(draft::text, 'EasyPaisa, JazzCash and bank transfer', 'Cash on Delivery, EasyPaisa, JazzCash and bank transfer')::jsonb
      end
    where (published::text like '%EasyPaisa, JazzCash and bank transfer%' and published::text not like '%Cash on Delivery, EasyPaisa%')
       or (draft::text like '%EasyPaisa, JazzCash and bank transfer%' and draft::text not like '%Cash on Delivery, EasyPaisa%')
  `);

  await db.insert(settings).values({ key: FLAG, value: true, updatedAt: new Date() }).onConflictDoNothing();
  log('checkout methods: COD, EasyPaisa, JazzCash and bank transfer on; card checkout off');
}
