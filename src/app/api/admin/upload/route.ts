import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { media } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif', 'video/mp4', 'video/webm'];
const MAX = 4 * 1024 * 1024; // Vercel functions accept bodies up to 4.5 MB

/** Admin media upload. Files are stored in Postgres and served from /api/media/[id]. */
export async function POST(req: Request) {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: `Unsupported file type ${file.type || ''}. Use WebP, JPEG, PNG, AVIF, GIF or MP4.` }, { status: 415 });
  if (file.size > MAX) return NextResponse.json({ error: 'File is larger than 4 MB. Please compress it or use a video URL.' }, { status: 413 });
  const buf = new Uint8Array(await file.arrayBuffer());
  const width = Number(form?.get('width')) || null;
  const height = Number(form?.get('height')) || null;
  const db = await getDb();
  const [row] = await db
    .insert(media)
    .values({ filename: file.name.slice(0, 200) || 'upload', mime: file.type, size: file.size, width, height, data: buf })
    .returning({ id: media.id });
  return NextResponse.json({ url: `/api/media/${row!.id}`, id: row!.id });
}
