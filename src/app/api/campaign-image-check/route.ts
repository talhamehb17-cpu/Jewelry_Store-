import { createHash, timingSafeEqual } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { campaigns, settings } from '@/db/schema';
import { getActiveCampaign } from '@/lib/campaigns';
import { removeBlob, storeBlob } from '@/lib/blob-media';

export const dynamic = 'force-dynamic';

const KEY = 'campaign_image_check';

function crc32(buf: Buffer) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** A tiny valid PNG whose pixels include a unique stamp. Never a borrowed campaign photo. */
function stampPng(stamp: string) {
  const size = 16;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const hash = createHash('sha256').update(stamp).digest();
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 3;
      raw[i] = hash[(x + y) % hash.length]!;
      raw[i + 1] = hash[(x * 3 + y) % hash.length]!;
      raw[i + 2] = hash[(x * 7 + y * 5) % hash.length]!;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function allowed(req: Request) {
  const expected = process.env.CAMPAIGN_IMAGE_CHECK || '';
  const got = new URL(req.url).searchParams.get('token') || '';
  if (!expected || expected.length < 24 || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

function tail(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return { host: u.hostname, file: u.pathname.split('/').pop() || '' };
  } catch {
    return { host: 'local', file: url.slice(0, 40) };
  }
}

export async function GET(req: Request) {
  if (!allowed(req)) return new Response('Not found', { status: 404 });
  const op = new URL(req.url).searchParams.get('op') || 'probe';
  const db = await getDb();
  if (op === 'probe') {
    const campaign = await getActiveCampaign();
    return NextResponse.json({ ok: true, id: campaign?.id ?? null, name: campaign?.name ?? null, image: tail(campaign?.image) });
  }
  if (op === 'swap') {
    const [existing] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
    if (existing) return NextResponse.json({ ok: false, error: 'restore-first' }, { status: 409 });
    const campaign = await getActiveCampaign();
    if (!campaign?.image) return NextResponse.json({ ok: false, error: 'no-image' }, { status: 409 });
    const stamp = `evermoon-campaign-check-${Date.now()}`;
    const saved = await storeBlob({ bytes: new Uint8Array(stampPng(stamp)), contentType: 'image/png', folder: 'campaigns', filename: 'check.png' });
    if (!saved.url.includes('.public.blob.')) {
      await removeBlob(saved.url).catch(() => undefined);
      return NextResponse.json({ ok: false, error: 'not-public' }, { status: 502 });
    }
    await db.insert(settings).values({ key: KEY, value: { campaignId: campaign.id, previous: campaign.image, next: saved.url }, updatedAt: new Date() });
    await db.update(campaigns).set({ image: saved.url, updatedAt: new Date() }).where(eq(campaigns.id, campaign.id));
    return NextResponse.json({ ok: true, id: campaign.id, name: campaign.name, previous: tail(campaign.image), next: tail(saved.url) });
  }
  if (op === 'restore') {
    const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
    const value = row?.value as { campaignId?: number; previous?: string; next?: string } | undefined;
    if (!value?.campaignId || !value.previous) return NextResponse.json({ ok: false, error: 'nothing-to-restore' }, { status: 409 });
    await db.update(campaigns).set({ image: value.previous, updatedAt: new Date() }).where(eq(campaigns.id, value.campaignId));
    if (value.next) await removeBlob(value.next).catch(() => undefined);
    await db.delete(settings).where(eq(settings.key, KEY));
    const campaign = await getActiveCampaign();
    return NextResponse.json({ ok: true, id: value.campaignId, image: tail(campaign?.image) });
  }
  return new Response('Not found', { status: 404 });
}
