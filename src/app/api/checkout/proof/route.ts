import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { paymentProofs } from '@/db/schema';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { storeProofBlob } from '@/lib/blob-media';

export const runtime = 'nodejs';

const MAX = 4 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function sniff(buf: Buffer) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.length >= 5 && buf.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Upload rejected.' }, { status: 403 });
  if (!rateLimit(`proof:${await clientIp()}`, 8, 10 * 60_000)) return NextResponse.json({ error: 'Too many uploads. Please wait a few minutes.' }, { status: 429 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a payment receipt to upload.' }, { status: 400 });
  if (file.size <= 0 || file.size > MAX) return NextResponse.json({ error: 'The receipt must be under 4 MB.' }, { status: 400 });
  if (file.type && !TYPES.has(file.type)) return NextResponse.json({ error: 'Upload a JPG, PNG, WEBP or PDF receipt.' }, { status: 400 });

  const data = Buffer.from(await file.arrayBuffer());
  const mime = sniff(data);
  if (!mime) return NextResponse.json({ error: 'That file is not a valid JPG, PNG, WEBP or PDF.' }, { status: 400 });

  const token = crypto.randomBytes(24).toString('base64url');
  const filename = file.name.replace(/[^\w.\- ]+/g, '').slice(0, 120) || 'receipt';
  let url: string | null = null;
  try {
    url = await storeProofBlob(data, mime);
  } catch {
    url = null;
  }
  const db = await getDb();
  await db.insert(paymentProofs).values({ token, filename, mime, size: data.length, data, url });
  return NextResponse.json({ token });
}
