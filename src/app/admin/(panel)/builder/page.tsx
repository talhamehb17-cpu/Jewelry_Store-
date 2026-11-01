import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { categories, collections, products, themeConfigs } from '@/db/schema';
import { requireAdminPage } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { THEME_LIST } from '@/themes/presets';
import { isThemeId, resolveThemeConfig } from '@/themes/engine';
import { Builder } from '@/components/admin/builder';
import type { ThemeConfig } from '@/themes/types';

export const metadata = { title: 'Homepage builder' };

export default async function BuilderPage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  await requireAdminPage({ adminOnly: true });
  const sp = await searchParams;
  const settings = await getSettings();
  const themeId = isThemeId(sp.theme) ? sp.theme : isThemeId(settings.theme.active) ? settings.theme.active : 'soft-luxury';
  const db = await getDb();
  const [[row], cols, cats, prods] = await Promise.all([
    db.select().from(themeConfigs).where(eq(themeConfigs.themeId, themeId)).limit(1),
    db.select({ slug: collections.slug, name: collections.name }).from(collections).orderBy(asc(collections.position)),
    db.select({ slug: categories.slug, name: categories.name }).from(categories).orderBy(asc(categories.position)),
    db.select({ slug: products.slug, name: products.name }).from(products).where(eq(products.status, 'active')).orderBy(asc(products.name)),
  ]);
  const cfg = resolveThemeConfig(themeId, (row?.draft ?? row?.published ?? null) as Partial<ThemeConfig> | null);
  return (
    <Builder
      key={themeId}
      themeId={themeId}
      themes={THEME_LIST.map((t) => ({ id: t.id, name: t.name }))}
      activeTheme={settings.theme.active}
      initial={cfg}
      hasDraft={!!row?.draft}
      data={{ collections: cols, categories: cats, products: prods }}
    />
  );
}
