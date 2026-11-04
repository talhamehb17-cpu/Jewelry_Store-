import { del, get, put } from '@vercel/blob';

const TOKEN_KEY = 'BLOB_READ_WRITE_TOKEN';
const STORE_KEY = 'BLOB_STORE_ID';

export function blobConfigured() {
  return !!(process.env[TOKEN_KEY] || process.env[STORE_KEY]);
}

export function blobAuthMode(): 'token' | 'oidc' | 'none' {
  if (process.env[TOKEN_KEY]) return 'token';
  if (process.env[STORE_KEY]) return 'oidc';
  return 'none';
}

export function isBlobUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

function authOptions() {
  const token = process.env[TOKEN_KEY];
  return token ? { token } : {};
}

export function safeBlobError(error: unknown) {
  const raw = error instanceof Error ? error.message : 'Blob storage failed';
  return raw.replace(/vercel_blob_[A-Za-z0-9_]+/g, '[token]').replace(/store_[A-Za-z0-9]+/g, '[store]').slice(0, 300);
}

async function putEither(pathname: string, bytes: Uint8Array, contentType: string) {
  const body = Buffer.from(bytes);
  const base = { contentType, addRandomSuffix: true as const, ...authOptions() };
  try {
    return await put(pathname, body, { ...base, access: 'public' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!/private|access/i.test(message)) throw error;
    return put(pathname, body, { ...base, access: 'private' });
  }
}

/** Stores an uploaded file in Vercel Blob. Credentials stay on the server. */
export async function storeBlob(input: { bytes: Uint8Array; contentType: string; folder: string; filename: string }) {
  if (!blobConfigured()) throw new Error('Blob storage is not connected. Set BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN on the server.');
  const folder = input.folder.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'media';
  const ext = input.contentType === 'image/png' ? 'png' : input.contentType === 'image/jpeg' ? 'jpg' : input.contentType === 'image/gif' ? 'gif' : input.contentType === 'image/avif' ? 'avif' : input.contentType === 'video/mp4' ? 'mp4' : input.contentType === 'video/webm' ? 'webm' : 'webp';
  const stamp = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const blob = await putEither(`evermoon/${folder}/${stamp}.${ext}`, input.bytes, input.contentType);
  return { url: blob.url, pathname: blob.pathname };
}

export async function storeProofBlob(bytes: Uint8Array, mime: string) {
  if (!blobConfigured()) return null;
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'application/pdf' ? 'pdf' : 'jpg';
  const blob = await putEither(`evermoon/payment-proofs/${crypto.randomUUID()}.${ext}`, bytes, mime);
  return blob.url;
}

export async function removeBlob(url: string) {
  if (!isBlobUrl(url)) throw new Error('That file is not in Blob storage.');
  await del(url, authOptions());
}

export async function readBlob(url: string) {
  const access = url.includes('.private.blob.') ? 'private' : 'public';
  try {
    return await get(url, { access, ...authOptions() });
  } catch (error) {
    if (access === 'public') return get(url, { access: 'private', ...authOptions() });
    throw error;
  }
}
