import type { Metadata } from 'next';
import { CatalogView, type SP } from '@/components/store/catalog-view';

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const q = (await searchParams).q;
  const term = Array.isArray(q) ? q[0] : q;
  return { title: term ? `Search: ${term}` : 'Search', robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? '';
  return <CatalogView base="/search" sp={sp} title={q ? `Results for “${q}”` : 'Search our jewelry'} eyebrow="Search" showCategoryFilter />;
}
