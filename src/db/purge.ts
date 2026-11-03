import { and, eq, ilike, sql } from 'drizzle-orm';
import type { DB } from './index';
import { pages, settings } from './schema';
import { SEED_PAGES } from './seed-data';

/**
 * Removes demo catalog and transactional rows once.
 * Schema, migrations, the administrator account, pages, and merchandising
 * shells (categories and collections) are kept so navigation and auth still work.
 */
export async function purgeDemoIfNeeded(db: DB, log: (m: string) => void = () => {}) {
  const [flag] = await db.select().from(settings).where(eq(settings.key, 'demo_purged'));
  if (flag) {
    log('demo data already removed');
    return { purged: false };
  }

  const statements = [
    sql`delete from payment_proofs`,
    sql`delete from order_events`,
    sql`delete from order_items`,
    sql`delete from orders`,
    sql`delete from inventory_movements`,
    sql`delete from reviews`,
    sql`delete from wishlist_items`,
    sql`delete from collection_products`,
    sql`delete from product_images`,
    sql`delete from product_variants`,
    sql`delete from products`,
    sql`delete from discounts`,
    sql`delete from contact_messages`,
    sql`delete from newsletter_subscribers where email like '%@example.com'`,
    sql`delete from addresses where user_id in (select id from users where role <> 'admin')`,
    sql`delete from users where role <> 'admin'`,
  ];
  for (const statement of statements) await db.execute(statement);

  await db.insert(settings).values({ key: 'demo_purged', value: true, updatedAt: new Date() }).onConflictDoNothing();
  log('demo products, orders, customers, reviews and discounts removed');
  return { purged: true };
}

/** Disables COD once, and splits the combined wallet into EasyPaisa and JazzCash. Does not run again. */
export async function applyStorePolicy(db: DB, log: (m: string) => void = () => {}) {
  const [flag] = await db.select().from(settings).where(eq(settings.key, 'policy_v1'));
  if (flag) return;
  const [pay] = await db.select().from(settings).where(eq(settings.key, 'payments'));
  if (pay && pay.value && typeof pay.value === 'object') {
    const p = structuredClone(pay.value) as {
      cod?: { enabled?: boolean };
      wallet?: { accountTitle?: string; easypaisa?: string; jazzcash?: string; instructions?: string };
      easypaisa?: { enabled: boolean; accountName: string; accountNumber: string; instructions: string };
      jazzcash?: { enabled: boolean; accountName: string; accountNumber: string; instructions: string };
    };
    p.cod = { ...(p.cod ?? {}), enabled: false };
    const title = p.wallet?.accountTitle || 'Evermoon Jewels';
    const proof = 'Send the exact order total, then upload a screenshot or PDF of the receipt. The order stays under review until the payment is verified.';
    if (!p.easypaisa) {
      p.easypaisa = { enabled: true, accountName: title, accountNumber: p.wallet?.easypaisa || '', instructions: proof };
    }
    if (!p.jazzcash) {
      p.jazzcash = { enabled: true, accountName: title, accountNumber: p.wallet?.jazzcash || '', instructions: proof };
    }
    await db.update(settings).set({ value: p, updatedAt: new Date() }).where(eq(settings.key, 'payments'));
  }
  const [seo] = await db.select().from(settings).where(eq(settings.key, 'seo'));
  if (seo?.value && typeof seo.value === 'object' && JSON.stringify(seo.value).toLowerCase().includes('cash on delivery')) {
    const next = { ...(seo.value as Record<string, string>), description: 'Timeless fine jewelry designed in Lahore — 18k gold vermeil, freshwater pearls and lab-grown diamonds. EasyPaisa, JazzCash and bank transfer, with free shipping over Rs 10,000.' };
    await db.update(settings).set({ value: next, updatedAt: new Date() }).where(eq(settings.key, 'seo'));
  }
  await db.execute(sql`
    update theme_configs
    set
      published = replace(replace(published::text, 'Cash on Delivery available nationwide', 'EasyPaisa, JazzCash and bank transfer'), 'Cash on Delivery nationwide', 'EasyPaisa, JazzCash and bank transfer')::jsonb,
      draft = case when draft is null then null else replace(replace(draft::text, 'Cash on Delivery available nationwide', 'EasyPaisa, JazzCash and bank transfer'), 'Cash on Delivery nationwide', 'EasyPaisa, JazzCash and bank transfer')::jsonb end
    where published::text ilike '%cash on delivery%' or draft::text ilike '%cash on delivery%'
  `);
  for (const page of SEED_PAGES) {
    if (!/easypaisa|jazzcash/i.test(page.content)) continue;
    await db.update(pages).set({ content: page.content, seoDescription: 'seoDescription' in page ? page.seoDescription : null, updatedAt: new Date() }).where(and(eq(pages.slug, page.slug), ilike(pages.content, '%cash on delivery%')));
  }
  await db.insert(settings).values({ key: 'policy_v1', value: true, updatedAt: new Date() }).onConflictDoNothing();
  log('cash on delivery disabled; EasyPaisa and JazzCash are separate methods');
}
