import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { pages } from '@/db/schema';
import { PageEditor } from '@/components/admin/page-editor';

export const metadata = { title: 'Edit page' };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'new') return <PageEditor initial={{ title: '', slug: '', content: '## A new chapter\n\nWrite your page content here using simple formatting.', template: 'default', status: 'draft', seoTitle: '', seoDescription: '' }} system={false} />;
  const db = await getDb();
  const [p] = await db.select().from(pages).where(eq(pages.id, Number(id))).limit(1);
  if (!p) notFound();
  return (
    <PageEditor
      initial={{ id: p.id, title: p.title, slug: p.slug, content: p.content, template: p.template as 'default', status: p.status as 'draft', seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '' }}
      system={p.system}
    />
  );
}
