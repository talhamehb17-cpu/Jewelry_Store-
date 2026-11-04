import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { approveReviewCheck, finishReviewCheck, prepareReviewCheck, rejectReviewCheck, reviewCheckAuthorised } from '@/lib/review-display-check';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fresh(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!(await reviewCheckAuthorised(url.searchParams.get('token')))) return fresh({ error: 'unauthorized' }, 401);
  const step = url.searchParams.get('step') || 'prepare';
  try {
    if (step === 'prepare') return fresh(await prepareReviewCheck());
    if (step === 'approve') {
      const result = await approveReviewCheck();
      revalidatePath(`/products/${result.slug}`);
      revalidatePath('/products/[slug]', 'page');
      revalidatePath('/', 'layout');
      return fresh(result);
    }
    if (step === 'reject') {
      const result = await rejectReviewCheck();
      revalidatePath(`/products/${result.slug}`);
      revalidatePath('/', 'layout');
      return fresh(result);
    }
    if (step === 'finish') return fresh(await finishReviewCheck());
    return fresh({ error: 'unknown step' }, 400);
  } catch (error) {
    return fresh({ error: error instanceof Error ? error.message : 'The review check failed.' }, 500);
  }
}
