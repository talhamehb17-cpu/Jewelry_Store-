'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { themeConfigs } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import { getSettings, saveSetting } from '@/lib/settings';
import { defaultThemeConfig, isThemeId, resolveThemeConfig, sanitizeSections, sanitizeSettings } from '@/themes/engine';
import type { SectionInstance, ThemeConfig, ThemeSettings } from '@/themes/types';

type R = { ok: boolean; message: string };

async function currentWorkingCopy(themeId: string): Promise<{ config: ThemeConfig; hasRow: boolean }> {
  if (!isThemeId(themeId)) throw new Error('Unknown theme');
  const db = await getDb();
  const [row] = await db.select().from(themeConfigs).where(eq(themeConfigs.themeId, themeId)).limit(1);
  const stored = (row?.draft ?? row?.published ?? null) as Partial<ThemeConfig> | null;
  return { config: resolveThemeConfig(themeId, stored), hasRow: !!row };
}

async function writeDraft(themeId: string, config: ThemeConfig) {
  const db = await getDb();
  await db
    .insert(themeConfigs)
    .values({ themeId, draft: config, updatedAt: new Date() })
    .onConflictDoUpdate({ target: themeConfigs.themeId, set: { draft: config, updatedAt: new Date() } });
}

/** Saves a draft (unpublished) version of a theme. Pass settings and/or sections. */
export async function saveThemeDraft(themeId: string, patch: { settings?: ThemeSettings; sections?: SectionInstance[] }): Promise<R> {
  await assertAdmin({ adminOnly: true });
  if (!isThemeId(themeId)) return { ok: false, message: 'Unknown theme.' };
  const { config } = await currentWorkingCopy(themeId);
  const next: ThemeConfig = {
    settings: patch.settings ? sanitizeSettings(patch.settings, themeId) : config.settings,
    sections: patch.sections ? sanitizeSections(patch.sections, themeId) : config.sections,
  };
  if (JSON.stringify(next).length > 200_000) return { ok: false, message: 'Theme configuration is too large.' };
  await writeDraft(themeId, next);
  return { ok: true, message: 'Draft saved.' };
}

export async function publishTheme(themeId: string): Promise<R> {
  await assertAdmin({ adminOnly: true });
  if (!isThemeId(themeId)) return { ok: false, message: 'Unknown theme.' };
  const { config } = await currentWorkingCopy(themeId);
  const db = await getDb();
  await db
    .insert(themeConfigs)
    .values({ themeId, published: config, draft: null, publishedAt: new Date(), updatedAt: new Date() })
    .onConflictDoUpdate({ target: themeConfigs.themeId, set: { published: config, draft: null, publishedAt: new Date(), updatedAt: new Date() } });
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Changes published.' };
}

export async function discardThemeDraft(themeId: string): Promise<R> {
  await assertAdmin({ adminOnly: true });
  if (!isThemeId(themeId)) return { ok: false, message: 'Unknown theme.' };
  const db = await getDb();
  await db.update(themeConfigs).set({ draft: null, updatedAt: new Date() }).where(eq(themeConfigs.themeId, themeId));
  return { ok: true, message: 'Draft discarded.' };
}

/** Restores the theme's original design into the draft (publish to apply). */
export async function resetThemeDefaults(themeId: string, part: 'settings' | 'sections' | 'all'): Promise<R> {
  await assertAdmin({ adminOnly: true });
  if (!isThemeId(themeId)) return { ok: false, message: 'Unknown theme.' };
  const { config } = await currentWorkingCopy(themeId);
  const defaults = defaultThemeConfig(themeId);
  await writeDraft(themeId, { settings: part === 'sections' ? config.settings : defaults.settings, sections: part === 'settings' ? config.sections : defaults.sections });
  return { ok: true, message: 'Defaults restored to the draft. Publish to make them live.' };
}

export async function activateTheme(themeId: string): Promise<R> {
  await assertAdmin({ adminOnly: true });
  if (!isThemeId(themeId)) return { ok: false, message: 'Unknown theme.' };
  const s = await getSettings();
  await saveSetting('theme', { ...s.theme, active: themeId });
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Store default updated. Customers who chose their own look are not affected.' };
}

export async function setVisitorSwitcher(on: boolean): Promise<R> {
  await assertAdmin({ adminOnly: true });
  const s = await getSettings();
  await saveSetting('theme', { ...s.theme, visitorSwitcher: on });
  revalidatePath('/', 'layout');
  return { ok: true, message: on ? 'Customers can choose a personal look. It does not change the store default.' : 'Storefront theme button hidden. Saved personal looks still apply.' };
}
