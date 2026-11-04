import { safeBlobError, storeBlob } from './blob-media';

export const IMAGE_MAX = 2 * 1024 * 1024;
const TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif'] as const;

export function imageTypeMatches(buf: Uint8Array, type: string) {
  if (buf.length < 12) return false;
  if (type === 'image/webp') return buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
  if (type === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === 'image/png') return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (type === 'image/gif') return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
  if (type === 'image/avif') return buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;
  return false;
}

export async function readImageFile(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!TYPES.includes(file.type as (typeof TYPES)[number])) return { error: 'Use a JPEG, PNG, WebP, GIF or AVIF image.' } as const;
  if (file.size > IMAGE_MAX) return { error: 'Each image must be 2 MB or smaller.' } as const;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageTypeMatches(bytes, file.type)) return { error: 'That file does not match its image type.' } as const;
  return { bytes, contentType: file.type, filename: file.name || 'image' } as const;
}

/** Stores a validated image in Blob. Never writes the bytes into PostgreSQL. */
export async function savePublicImage(file: FormDataEntryValue | null, folder: 'avatars' | 'reviews'): Promise<{ url: string | null } | { error: string }> {
  const read = await readImageFile(file);
  if (!read) return { url: null };
  if ('error' in read) return { error: read.error ?? 'Could not read that image.' };
  try {
    const saved = await storeBlob({ bytes: read.bytes, contentType: read.contentType, folder, filename: read.filename });
    if (!saved.url) return { error: 'The picture was uploaded, but no public address came back.' };
    return { url: saved.url };
  } catch (error) {
    return { error: safeBlobError(error) };
  }
}
