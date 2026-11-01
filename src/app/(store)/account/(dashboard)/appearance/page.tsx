import { AppearancePicker } from '@/components/store/appearance-picker';
import { requireUser } from '@/lib/auth';
import { getThemeContext } from '@/lib/theme-server';
import { THEME_LIST } from '@/themes/presets';

export const metadata = { title: 'Appearance' };

export default async function AppearancePage() {
  await requireUser('/account/appearance');
  const ctx = await getThemeContext();
  const themes = THEME_LIST.map((t) => ({
    id: t.id,
    name: t.name,
    tagline: t.tagline,
    swatch: [t.settings.colors.background, t.settings.colors.primary, t.settings.colors.accent],
  }));
  return (
    <section>
      <h2 className="t-3">Appearance</h2>
      <div className="mt-6">
        <AppearancePicker themes={themes} current={ctx.themeId} storeDefault={ctx.activeThemeId} />
      </div>
    </section>
  );
}
