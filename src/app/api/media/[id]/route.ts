import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { media } from '@/db/schema';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return new Response('Not found', { status: 404 });
  const db = await getDb();
  const [m] = await db.select().from(media).where(eq(media.id, n)).limit(1);
  if (!m) return new Response('Not found', { status: 404 });
  const bytes = m.data instanceof Uint8Array ? m.data : new Uint8Array(m.data as ArrayBuffer);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': m.mime,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `inline; filename="${m.filename.replace(/[^\w.-]/g, '_')}"`,
    },
  });
}
