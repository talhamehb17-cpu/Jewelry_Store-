import { CampaignHome } from '@/components/store/campaign-home';
import { LocationsSection } from '@/components/store/locations-section';
import { homeLocations, publicContact } from '@/lib/locations';
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
  const [ctx, settings, campaign, locations] = await Promise.all([getThemeContext(), getSettings(), getActiveCampaign(), homeLocations()]);
  const contact = publicContact(settings.store);
  const org = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: BRAND.name,
    url: siteUrl(),
    logo: `${siteUrl()}${BRAND.logo}`,
    image: `${siteUrl()}${themeLook(ctx.themeId).hero}`,
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.address ? { address: { '@type': 'PostalAddress', streetAddress: contact.address, addressCountry: 'PK' } } : {}),
    priceRange: 'Rs 6,800 – Rs 185,000',
    sameAs: Object.values(settings.social).filter((href) => {
      if (!href) return false;
      try { return new URL(href).pathname.replace(/\/+$/, '').length > 1; } catch { return false; }
    }),
  };
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND.name,
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
      <LocationsSection locations={locations} />
    </>
  );
}
