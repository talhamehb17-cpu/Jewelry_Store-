import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { products, reviews } from '@/db/schema';
import { Card, Empty, PageHeader, Pill, qs } from '@/components/admin/ui';
import { ActionButton } from '@/components/admin/action-button';
import { Stars } from '@/components/ui/bits';
import { moderateReview } from '@/app/actions/admin/commerce';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Reviews' };

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const rows = await db
    .select({ r: reviews, product: products.name, slug: products.slug })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(sp.status ? eq(reviews.status, sp.status) : undefined)
    .orderBy(desc(reviews.createdAt))
    .limit(100);
  return (
    <>
      <PageHeader title="Reviews" description="Moderate customer reviews. Verified buyers are published automatically (configurable in Settings)." />
      <div className="mb-4 flex gap-2">
        {[['', 'All'], ['pending', 'Pending'], ['published', 'Published'], ['hidden', 'Hidden']].map(([k, l]) => (
          <Link key={k} href={qs('/admin/reviews', { status: k || undefined })} className={cn('rounded-full border px-3 py-1 text-[0.78rem]', (sp.status ?? '') === k ? 'border-ink bg-ink text-white' : 'border-line bg-white')}>{l}</Link>
        ))}
      </div>
      <Card pad={false}>
        {rows.length === 0 ? <Empty title="No reviews here" /> : (
          <ul className="divide-y divide-line">
            {rows.map(({ r, product, slug }) => (
              <li key={r.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} size={13} />
                    <Pill tone={r.status === 'published' ? 'green' : r.status === 'pending' ? 'amber' : 'stone'}>{r.status}</Pill>
                    {r.verified && <Pill tone="gold">verified buyer</Pill>}
                    <span className="text-[0.75rem] text-muted">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                  <p className="mt-1 text-[0.86rem] text-[#4a443e]">{r.body}</p>
                  <p className="mt-2 flex items-center gap-2 text-[0.75rem] text-muted">
                    {r.avatar && <span className="relative h-8 w-8 overflow-hidden rounded-full bg-secondary"><img src={r.avatar} alt="" className="h-full w-full object-cover" /></span>}
                    {r.name}{r.email ? ` · ${r.email}` : ''}
                    {!r.verified && r.email?.endsWith('@studio.maisonaurelle.pk') && ' · studio testimonial'}
                    {' · on '}<a href={`/products/${slug}#reviews`} target="_blank" rel="noreferrer" className="underline">{product}</a>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status !== 'published' && <ActionButton action={moderateReview.bind(null, r.id, 'published')} showResult={false}>Publish</ActionButton>}
                  {r.status !== 'hidden' && <ActionButton action={moderateReview.bind(null, r.id, 'hidden')} showResult={false}>Hide</ActionButton>}
                  <ActionButton action={moderateReview.bind(null, r.id, 'delete')} confirmText="Delete this review permanently?" showResult={false} className="!text-rose-700">Delete</ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
