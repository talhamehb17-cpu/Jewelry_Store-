import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { themeConfigs } from '@/db/schema';
import { requireAdminPage } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { THEMES } from '@/themes/presets';
import { isThemeId, resolveThemeConfig } from '@/themes/engine';
import { Customizer } from '@/components/admin/customizer';
import type { ThemeConfig } from '@/themes/types';

export const metadata = { title: 'Customize theme' };

export default async function CustomizeTheme({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage({ adminOnly: true });
  const { id } = await params;
  if (!isThemeId(id)) notFound();
  const db = await getDb();
  const [[row], settings] = await Promise.all([db.select().from(themeConfigs).where(eq(themeConfigs.themeId, id)).limit(1), getSettings()]);
  const cfg = resolveThemeConfig(id, (row?.draft ?? row?.published ?? null) as Partial<ThemeConfig> | null);
  return <Customizer themeId={id} name={THEMES[id].name} initial={cfg.settings} hasDraft={!!row?.draft} isActive={settings.theme.active === id} />;
}
