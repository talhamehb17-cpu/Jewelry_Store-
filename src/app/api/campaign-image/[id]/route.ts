import { getActiveCampaign } from '@/lib/campaigns';
import { isBlobUrl, readBlob } from '@/lib/blob-media';

export const dynamic = 'force-dynamic';

/** Serves the active campaign's own image when the stored Blob URL is private. */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 });
  const campaign = await getActiveCampaign();
  const src = campaign?.id === id ? campaign.image?.trim() : '';
  if (!campaign || !src || /^(blob:|data:)/i.test(src)) return new Response('Not found', { status: 404 });
  if (!src.includes('.private.blob.')) return Response.redirect(src, 307);
  if (!isBlobUrl(src)) return new Response('Not found', { status: 404 });
  const blob = await readBlob(src);
  if (!blob?.stream) return new Response('Not found', { status: 404 });
  const bytes = new Uint8Array(await new Response(blob.stream).arrayBuffer());
  const type = blob.blob.contentType || 'image/jpeg';
  return new Response(bytes, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
