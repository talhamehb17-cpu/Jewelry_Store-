import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogView, type SP } from '@/components/store/catalog-view';
import { getCollectionBySlug } from '@/lib/catalog';
import { absoluteUrl, jsonLd } from '@/lib/utils';

type P = { params: Promise<{ slug: string }>; searchParams: Promise<SP> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c || c.status !== 'active') return { title: 'Collection not found' };
  return {
    title: c.seoTitle || c.name,
    description: c.seoDescription || c.description || `Shop the ${c.name} collection at Maison Aurelle.`,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title: c.name, description: c.description ?? undefined, images: c.image ? [{ url: c.image.startsWith('http') ? c.image : absoluteUrl(c.image) }] : undefined },
  };
}

export default async function CollectionPage({ params, searchParams }: P) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await getCollectionBySlug(slug);
  if (!c || c.status !== 'active') notFound();
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Collections', item: absoluteUrl('/collections') },
      { '@type': 'ListItem', position: 3, name: c.name, item: absoluteUrl(`/collections/${c.slug}`) },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }} />
      <CatalogView base={`/collections/${c.slug}`} sp={sp} title={c.name} description={c.description} eyebrow="Collection" image={c.image} collection={c} />
    </>
  );
}
