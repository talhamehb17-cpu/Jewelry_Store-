import { del, put } from '@vercel/blob';

const TOKEN_KEY = 'BLOB_READ_WRITE_TOKEN';

export function blobConfigured() {
  return !!process.env[TOKEN_KEY];
}

export function isBlobUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === 'public.blob.vercel-storage.com' || host.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

function token() {
  const value = process.env[TOKEN_KEY];
  if (!value) throw new Error('BLOB_READ_WRITE_TOKEN is not set on the server.');
  return value;
}

export function safeBlobError(error: unknown) {
  const raw = error instanceof Error ? error.message : 'Blob storage failed';
  return raw.replace(/vercel_blob_[A-Za-z0-9_]+/g, '[token]').slice(0, 300);
}

/** Stores an uploaded file in Vercel Blob. The token stays on the server. */
export async function storeBlob(input: { bytes: Uint8Array; contentType: string; folder: string; filename: string }) {
  const folder = input.folder.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'media';
  const ext = input.contentType === 'image/png' ? 'png' : input.contentType === 'image/jpeg' ? 'jpg' : input.contentType === 'image/gif' ? 'gif' : input.contentType === 'image/avif' ? 'avif' : input.contentType === 'video/mp4' ? 'mp4' : input.contentType === 'video/webm' ? 'webm' : 'webp';
  const stamp = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const pathname = `evermoon/${folder}/${stamp}.${ext}`;
  const blob = await put(pathname, Buffer.from(input.bytes), {
    access: 'public',
    contentType: input.contentType,
    token: token(),
    addRandomSuffix: false,
  });
  return { url: blob.url, pathname: blob.pathname };
}

export async function removeBlob(url: string) {
  if (!isBlobUrl(url)) throw new Error('That file is not in Blob storage.');
  await del(url, { token: token() });
}
