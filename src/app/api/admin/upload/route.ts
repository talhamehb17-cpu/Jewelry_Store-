import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { media } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import { blobConfigured, isBlobUrl, removeBlob, safeBlobError, storeBlob } from '@/lib/blob-media';

export const dynamic = 'force-dynamic';

const ALLOWED = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif', 'video/mp4', 'video/webm'];
const MAX = 4 * 1024 * 1024;

function matchesType(buf: Uint8Array, type: string) {
  if (buf.length < 12) return false;
  if (type === 'image/webp') return buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
  if (type === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (type === 'image/png') return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (type === 'image/gif') return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
  if (type === 'image/avif' || type === 'video/mp4') return buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
  if (type === 'video/webm') return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  return false;
}

async function authorised() {
  try {
    await assertAdmin();
    return null;
  } catch {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }
}

/** Admin upload. Production files go to Vercel Blob. The token is never returned. */
export async function POST(req: Request) {
  const denied = await authorised();
  if (denied) return denied;
  if (process.env.VERCEL && !blobConfigured()) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not set on the server. The file was not saved.' }, { status: 503 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: `Unsupported file type ${file.type || ''}. Use WebP, JPEG, PNG, AVIF, GIF or MP4.` }, { status: 415 });
  if (file.size <= 0 || file.size > MAX) return NextResponse.json({ error: 'File must be between 1 byte and 4 MB.' }, { status: 413 });
  const buf = new Uint8Array(await file.arrayBuffer());
  if (!matchesType(buf, file.type)) return NextResponse.json({ error: 'The file contents do not match its type. Upload was rejected.' }, { status: 415 });
  const folder = String(form?.get('folder') || 'media');
  if (blobConfigured()) {
    try {
      const saved = await storeBlob({ bytes: buf, contentType: file.type, folder, filename: file.name });
      return NextResponse.json({ url: saved.url, storage: 'blob' });
    } catch (error) {
      return NextResponse.json({ error: safeBlobError(error) }, { status: 502 });
    }
  }
  const width = Number(form?.get('width')) || null;
  const height = Number(form?.get('height')) || null;
  const db = await getDb();
  const [row] = await db
    .insert(media)
    .values({ filename: file.name.slice(0, 200) || 'upload', mime: file.type, size: file.size, width, height, data: buf })
    .returning({ id: media.id });
  return NextResponse.json({ url: `/api/media/${row!.id}`, storage: 'database' });
}

export async function DELETE(req: Request) {
  const denied = await authorised();
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { url?: string } | null;
  const url = body?.url || '';
  if (!isBlobUrl(url)) return NextResponse.json({ error: 'Only Blob files can be deleted here.' }, { status: 400 });
  if (!blobConfigured()) return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not set on the server.' }, { status: 503 });
  try {
    await removeBlob(url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: safeBlobError(error) }, { status: 502 });
  }
}
