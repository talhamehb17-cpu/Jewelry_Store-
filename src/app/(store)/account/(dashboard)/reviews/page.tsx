import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { products, reviews } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { Stars } from '@/components/ui/bits';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Your reviews', robots: { index: false } };

const LABEL = { pending: 'Waiting for approval', published: 'Published', hidden: 'Not published' } as Record<string, string>;

export default async function AccountReviews() {
  const user = await requireUser('/account/reviews');
  const db = await getDb();
  const rows = await db
    .select({ review: reviews, product: products.name, slug: products.slug })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.userId, user.id))
    .orderBy(desc(reviews.createdAt));
  return (
    <div>
      <h2 className="t-3">Your reviews</h2>
      <p className="mt-2 text-[0.9rem] text-muted">Only a delivered purchase can be reviewed. A review appears on the product page after the atelier approves it.</p>
      {rows.length === 0 ? (
        <p className="mt-8 rounded-theme border border-line px-6 py-10 text-[0.92rem] text-muted">You have not submitted a review yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line">
          {rows.map(({ review, product, slug }) => (
            <li key={review.id} className="grid gap-4 py-6 sm:grid-cols-[auto_1fr]">
              <span className="relative h-12 w-12 overflow-hidden rounded-full bg-surface">
                {review.avatar ? <img src={review.avatar} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[0.8rem]">{review.name.slice(0, 1)}</span>}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Stars value={review.rating} size={13} />
                  <span className="text-[0.75rem] text-muted">{LABEL[review.status] || review.status}</span>
                  <span className="text-[0.75rem] text-muted">{formatDate(review.createdAt)}</span>
                </div>
                {review.title && <p className="mt-2 font-medium">{review.title}</p>}
                <p className="mt-1 text-[0.9rem] text-muted">{review.body}</p>
                <p className="mt-2 text-[0.82rem]"><Link href={`/products/${slug}#reviews`} className="underline underline-offset-4">{product}</Link></p>
                {review.photo && <img src={review.photo} alt="" className="mt-3 h-24 w-20 rounded-theme-sm object-cover" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
