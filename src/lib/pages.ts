import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { pages } from '@/db/schema';
import { getCurrentUser, isStaff } from './auth';

export const getPage = cache(async (slug: string) => {
  const db = await getDb();
  const [p] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!p) return null;
  if (p.status !== 'published' && !isStaff(await getCurrentUser())) return null;
  return p;
});
