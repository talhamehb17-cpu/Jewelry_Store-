import { SectionRenderer } from '@/components/sections/renderer';
import { getThemeContext } from '@/lib/theme-server';
import { getSettings } from '@/lib/settings';
import { jsonLd, siteUrl } from '@/lib/utils';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { absolute: s.seo.title }, description: s.seo.description, alternates: { canonical: '/' } };
}

export default async function HomePage() {
  const [ctx, settings] = await Promise.all([getThemeContext(), getSettings()]);
  const org = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: settings.store.name,
    url: siteUrl(),
    logo: `${siteUrl()}/icon.svg`,
    image: `${siteUrl()}/images/og-default.jpg`,
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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} />
      <SectionRenderer sections={ctx.config.sections} config={ctx.config} />
    </>
  );
}
