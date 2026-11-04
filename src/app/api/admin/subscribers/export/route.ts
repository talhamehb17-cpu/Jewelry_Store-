import { desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { newsletterSubscribers } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await assertAdmin();
  } catch {
    return new Response('Not authorised', { status: 401 });
  }
  const db = await getDb();
  const rows = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt));
  const esc = (s: string) => (/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""');
  const csv = '\uFEFFemail,source,status,subscribed_at,unsubscribed_at\n' + rows.map((r) => `"${esc(r.email)}","${esc(r.source)}","${esc(r.status)}",${r.createdAt.toISOString()},${r.unsubscribedAt?.toISOString() ?? ''}`).join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="evermoon-subscribers.csv"', 'Cache-Control': 'no-store' } });
}
