import { CampaignHome } from '@/components/store/campaign-home';
import { SectionRenderer } from '@/components/sections/renderer';
import { getActiveCampaign } from '@/lib/campaigns';
import { applyThemeImagery, themeLook } from '@/themes/language';
import { getThemeContext } from '@/lib/theme-server';
import { getSettings } from '@/lib/settings';
import { BRAND } from '@/lib/brand';
import { jsonLd, siteUrl } from '@/lib/utils';
import { THEMES } from '@/themes/presets';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { absolute: s.seo.title }, description: s.seo.description, alternates: { canonical: '/' } };
}

export default async function HomePage() {
  const [ctx, settings, campaign] = await Promise.all([getThemeContext(), getSettings(), getActiveCampaign()]);
  const org = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: settings.store.name,
    url: siteUrl(),
    logo: `${siteUrl()}${BRAND.logo}`,
    image: `${siteUrl()}${themeLook(ctx.themeId).hero}`,
    telephone: settings.store.phone,
    email: settings.store.email,
    address: { '@type': 'PostalAddress', streetAddress: '42-C Main Boulevard, Gulberg III', addressLocality: 'Lahore', postalCode: '54660', addressCountry: 'PK' },
    priceRange: 'Rs 6,800 – Rs 185,000',
    sameAs: Object.values(settings.social).filter(Boolean),
  };
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.store.name,
    url: siteUrl(),
    potentialAction: { '@type': 'SearchAction', target: `${siteUrl()}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
  };
  const sections = applyThemeImagery(ctx.themeId, ctx.isPreview ? ctx.config.sections : THEMES[ctx.themeId].sections);
  const hero = sections[0]?.type === 'hero' ? sections[0] : null;
  const rest = hero ? sections.slice(1) : sections;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} />
      {hero && <SectionRenderer sections={[hero]} config={ctx.config} />}
      {campaign && <CampaignHome campaign={campaign} card={ctx.config.settings.layout.cardVariant} />}
      <SectionRenderer sections={rest} config={ctx.config} />
    </>
  );
}
