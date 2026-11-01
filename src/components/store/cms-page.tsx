import Link from 'next/link';
import { renderMarkdown } from '@/lib/markdown';
import { formatDate } from '@/lib/utils';
import type { Page } from '@/db/schema';

export function CmsArticle({ page, eyebrow }: { page: Page; eyebrow?: string }) {
  return (
    <article className="container-x pb-[var(--section-y)] pt-12 md:pt-16">
      <header className="mx-auto max-w-3xl text-center">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="t-1 mt-3">{page.title}</h1>
        {page.template === 'policy' && <p className="mt-4 text-[0.8rem] text-muted">Last updated {formatDate(page.updatedAt)}</p>}
        {page.status !== 'published' && <p className="mt-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-[0.75rem] text-amber-900">Draft — only visible to staff</p>}
      </header>
      <div className="prose-aurelle mx-auto mt-12 max-w-2xl" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
      {page.template === 'policy' && (
        <p className="mx-auto mt-14 max-w-2xl border-t border-line pt-6 text-[0.88rem] text-muted">Questions about this policy? <Link href="/contact" className="underline underline-offset-4">Contact our client care team</Link>.</p>
      )}
    </article>
  );
}
