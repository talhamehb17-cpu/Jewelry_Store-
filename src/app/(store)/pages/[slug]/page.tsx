import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPage } from '@/lib/pages';
import { CmsArticle } from '@/components/store/cms-page';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPage(slug);
  if (!p) return { title: 'Not found' };
  return { title: p.seoTitle || p.title, description: p.seoDescription ?? undefined, alternates: { canonical: `/pages/${slug}` } };
}

export default async function CustomPage({ params }: P) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  if (page.template === 'policy') permanentRedirect(`/policies/${slug}`);
  return <CmsArticle page={page} />;
}
