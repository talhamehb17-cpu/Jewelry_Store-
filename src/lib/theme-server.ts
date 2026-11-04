import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { themeConfigs } from '@/db/schema';
import { getSettings } from './settings';
import { getCurrentUser, isStaff } from './auth';
import { isThemeId, resolveThemeConfig, defaultThemeConfig } from '@/themes/engine';
import { DEFAULT_THEME } from '@/themes/presets';
import type { ThemeConfig, ThemeId } from '@/themes/types';

export const PREVIEW_COOKIE = 'aurelle_preview';
export const VISITOR_THEME_COOKIE = 'aurelle_theme';

export type ThemeContext = {
  themeId: ThemeId;
  activeThemeId: ThemeId;
  config: ThemeConfig;
  mode: 'published' | 'draft';
  isPreview: boolean;
  isVisitorPick: boolean;
  visitorSwitcher: boolean;
};

export async function loadThemeRow(themeId: ThemeId) {
  const db = await getDb();
  const [row] = await db.select().from(themeConfigs).where(eq(themeConfigs.themeId, themeId)).limit(1);
  return row ?? null;
}

export async function getThemeConfig(themeId: ThemeId, mode: 'published' | 'draft'): Promise<ThemeConfig> {
  const row = await loadThemeRow(themeId);
  if (!row) return defaultThemeConfig(themeId);
  const stored = (mode === 'draft' ? row.draft ?? row.published : row.published) as Partial<ThemeConfig> | null;
  return resolveThemeConfig(themeId, stored);
}

/** Resolves which theme (and which version of it) to render for the current request. */
export const getThemeContext = cache(async (): Promise<ThemeContext> => {
  const settings = await getSettings();
  const activeThemeId: ThemeId = isThemeId(settings.theme.active) ? settings.theme.active : DEFAULT_THEME;
  const jar = await cookies();
  let themeId = activeThemeId;
  let mode: 'published' | 'draft' = 'published';
  let isPreview = false;
  let isVisitorPick = false;

  const preview = jar.get(PREVIEW_COOKIE)?.value;
  if (preview) {
    const [pid, pmode] = preview.split(':');
    if (isThemeId(pid) && isStaff(await getCurrentUser())) {
      themeId = pid;
      mode = pmode === 'draft' ? 'draft' : 'published';
      isPreview = true;
    }
  }
  if (!isPreview) {
    const requested = (await headers()).get('x-evermoon-theme');
    if (isThemeId(requested)) {
      themeId = requested;
      isVisitorPick = requested !== activeThemeId;
    }
  }
  if (!isPreview && themeId === activeThemeId) {
    const user = await getCurrentUser();
    const accountPick = user?.themePreference;
    const cookiePick = jar.get(VISITOR_THEME_COOKIE)?.value;
    // Logged-in preference lives on the account. Guests use this browser only.
    // Neither path writes the admin global theme.
    const pick = user ? (isThemeId(accountPick) ? accountPick : null) : isThemeId(cookiePick) ? cookiePick : null;
    if (pick) {
      themeId = pick;
      isVisitorPick = pick !== activeThemeId;
    }
  }
  const config = await getThemeConfig(themeId, mode);
  return { themeId, activeThemeId, config, mode, isPreview, isVisitorPick, visitorSwitcher: !!settings.theme.visitorSwitcher };
});
