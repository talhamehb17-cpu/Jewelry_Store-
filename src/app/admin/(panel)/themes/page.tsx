import { getDb } from '@/db';
import { themeConfigs } from '@/db/schema';
import { requireAdminPage } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { THEME_LIST } from '@/themes/presets';
import { resolveThemeConfig } from '@/themes/engine';
import { PageHeader } from '@/components/admin/ui';
import { ThemeGallery } from '@/components/admin/theme-gallery';
import type { ThemeConfig } from '@/themes/types';

export const metadata = { title: 'Themes' };

export default async function ThemesAdmin() {
  await requireAdminPage({ adminOnly: true });
  const db = await getDb();
  const [rows, settings] = await Promise.all([db.select().from(themeConfigs), getSettings()]);
  const themes = THEME_LIST.map((t) => {
    const row = rows.find((r) => r.themeId === t.id);
    const cfg = resolveThemeConfig(t.id, (row?.published ?? null) as Partial<ThemeConfig> | null);
    return { id: t.id, name: t.name, tagline: t.tagline, description: t.description, mood: t.mood, settings: cfg.settings, hasDraft: !!row?.draft, customized: !!row?.published, publishedAt: row?.publishedAt?.toISOString() ?? null };
  });
  return (
    <>
      <PageHeader title="Themes" description="Twelve complete storefront designs. Switching themes never touches your products, orders or customers." />
      <ThemeGallery themes={themes} active={settings.theme.active} visitorSwitcher={settings.theme.visitorSwitcher} />
    </>
  );
}
