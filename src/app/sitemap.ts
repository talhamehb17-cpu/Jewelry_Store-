import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { collections, pages, products } from '@/db/schema';
import { siteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const db = await getDb();
  const [prods, cols, pgs] = await Promise.all([
    db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.status, 'active')),
    db.select({ slug: collections.slug }).from(collections).where(eq(collections.status, 'active')),
    db.select({ slug: pages.slug, template: pages.template, updatedAt: pages.updatedAt }).from(pages).where(eq(pages.status, 'published')),
  ]);
  const now = new Date();
  const statics = ['', '/shop', '/collections'].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: 'daily' as const, priority: p === '' ? 1 : 0.8 }));
  const pageUrl = (slug: string, template: string) => (slug === 'about' ? '/about' : slug === 'contact' ? '/contact' : slug === 'faq' ? '/faq' : template === 'policy' ? `/policies/${slug}` : `/pages/${slug}`);
  return [
    ...statics,
    ...cols.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...prods.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...pgs.map((p) => ({ url: `${base}${pageUrl(p.slug, p.template)}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.4 })),
  ];
}
