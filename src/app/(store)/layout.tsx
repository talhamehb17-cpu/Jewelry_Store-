import { CampaignBanner } from '@/components/store/campaign-banner';
import { getActiveCampaign } from '@/lib/campaigns';
import { StoreProvider } from '@/components/store/providers';
import { Header } from '@/components/store/header';
import { Footer } from '@/components/store/footer';
import { AnnouncementBar } from '@/components/store/announcement';
import { CartDrawer } from '@/components/store/cart-drawer';
import { SearchOverlay } from '@/components/store/search-overlay';
import { QuickView } from '@/components/store/quick-view';
import { LivePreviewBridge, PreviewBanner, RevealObserver, ThemeSwitcher, ThemeSync, Toaster } from '@/components/store/chrome';
import { getThemeContext } from '@/lib/theme-server';
import { getSettings, type NavItem } from '@/lib/settings';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { getCollections } from '@/lib/catalog';
import { themeCssVars, themeStyleTag, themeName } from '@/themes/engine';
import { THEME_LIST } from '@/themes/presets';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [ctx, settings, user, collections, campaign] = await Promise.all([getThemeContext(), getSettings(), getCurrentUser(), getCollections(), getActiveCampaign()]);
  const s = ctx.config.settings;
  const mega = collections
    .filter((c) => c.featured)
    .slice(0, 3)
    .map((c) => ({ title: c.name, image: c.image, href: `/collections/${c.slug}` }));
  const chips = THEME_LIST.map((t) => {
    const vars = themeCssVars(t.settings);
    return { id: t.id, name: t.name, tagline: t.tagline, swatch: [t.settings.colors.background, t.settings.colors.surface, t.settings.colors.primary, t.settings.colors.accent], desktop: vars.desktop, mobile: vars.mobile };
  });

  return (
    <StoreProvider loggedIn={!!user}>
      <style dangerouslySetInnerHTML={{ __html: themeStyleTag(s) }} />
      <div data-theme={ctx.themeId} data-anim={s.animation.style} data-btn-style={s.buttons.style} data-btn-hover={s.buttons.hover} className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-bg focus:px-4 focus:py-2">Skip to content</a>
        {ctx.isPreview && <PreviewBanner themeName={themeName(ctx.themeId)} mode={ctx.mode} />}
        {campaign && <CampaignBanner campaign={{ name: campaign.name, percent: campaign.percent, endsAt: campaign.endsAt.toISOString(), href: campaign.ctaHref || '/shop' }} />}
        <AnnouncementBar data={s.announcement} hideOnMobile={!s.mobile.showAnnouncement} />
        <Header
          header={s.header}
          mobileVariant={s.mobile.headerVariant}
          nav={settings.navigation.main as NavItem[]}
          user={user ? { firstName: user.firstName || 'there', isStaff: isStaff(user) } : null}
          mega={mega}
          phone={settings.store.phone}
        />
        <main id="main" className="flex-1">{children}</main>
        <Footer footer={s.footer} header={s.header} settings={settings} />
        <CartDrawer />
        <SearchOverlay popular={settings.search.popular} />
        <QuickView />
        <Toaster />
        <RevealObserver />
        <LivePreviewBridge />
        <ThemeSync loggedIn={!!user} />
        {ctx.visitorSwitcher && <ThemeSwitcher themes={chips} current={ctx.themeId} activeId={ctx.activeThemeId} />}
      </div>
    </StoreProvider>
  );
}
