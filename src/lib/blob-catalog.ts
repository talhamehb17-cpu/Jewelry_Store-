import { eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DB } from '@/db';
import { campaigns, categories, collections, productImages, settings, storeLocations } from '@/db/schema';
import { blobConfigured, removeBlob, safeBlobError, storeBlob } from './blob-media';

async function localBytes(url: string) {
  if (!url.startsWith('/images/')) return null;
  const file = path.join(process.cwd(), 'public', url);
  if (!file.startsWith(path.join(process.cwd(), 'public'))) return null;
  const bytes = new Uint8Array(await readFile(file));
  const ext = path.extname(file).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
  return { bytes, contentType };
}

/** Copies local catalog files into Blob and stores the new URLs. Leaves historical order images unchanged. */
export async function copyCatalogToBlob(db: DB, log: (m: string) => void) {
  if (!blobConfigured()) {
    log('blob catalog skipped — store is not connected');
    return;
  }
  const [done] = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, 'blob_catalog_v1')).limit(1);
  if (done) return;
  const cache = new Map<string, string>();
  const copy = async (url: string | null) => {
    if (!url || !url.startsWith('/images/')) return url;
    const cached = cache.get(url);
    if (cached) return cached;
    const file = await localBytes(url);
    if (!file) return url;
    const saved = await storeBlob({ bytes: file.bytes, contentType: file.contentType, folder: 'catalog', filename: path.basename(url) });
    if (saved.url.includes('.private.blob.')) {
      await removeBlob(saved.url).catch(() => undefined);
      log('blob catalog kept local — the connected store is private');
      await db.insert(settings).values({ key: 'blob_catalog_v1', value: { at: new Date().toISOString(), skipped: 'private' } }).onConflictDoNothing();
      throw new Error('blob-private');
    }
    cache.set(url, saved.url);
    return saved.url;
  };
  const images = await db.select({ id: productImages.id, url: productImages.url }).from(productImages);
  const cats = await db.select({ id: categories.id, image: categories.image }).from(categories);
  const cols = await db.select({ id: collections.id, image: collections.image }).from(collections);
  const camps = await db.select({ id: campaigns.id, image: campaigns.image }).from(campaigns);
  const places = await db.select({ id: storeLocations.id, image: storeLocations.image }).from(storeLocations);
  try {
  for (const row of images) {
    const next = await copy(row.url);
    if (next && next !== row.url) await db.update(productImages).set({ url: next }).where(eq(productImages.id, row.id));
  }
  for (const row of cats) {
    const next = await copy(row.image);
    if (next && next !== row.image) await db.update(categories).set({ image: next }).where(eq(categories.id, row.id));
  }
  for (const row of cols) {
    const next = await copy(row.image);
    if (next && next !== row.image) await db.update(collections).set({ image: next }).where(eq(collections.id, row.id));
  }
  for (const row of camps) {
    const next = await copy(row.image);
    if (next && next !== row.image) await db.update(campaigns).set({ image: next }).where(eq(campaigns.id, row.id));
  }
  for (const row of places) {
    const next = await copy(row.image);
    if (next && next !== row.image) await db.update(storeLocations).set({ image: next }).where(eq(storeLocations.id, row.id));
  }
  await db.insert(settings).values({ key: 'blob_catalog_v1', value: { at: new Date().toISOString(), files: cache.size } }).onConflictDoNothing();
  log(`blob catalog copied ${cache.size} files`);
  } catch (error) {
    if (error instanceof Error && error.message === 'blob-private') return;
    throw error;
  }
}

export async function probeBlob(log: (m: string) => void) {
  if (!blobConfigured()) {
    log('blob probe skipped — store is not connected');
    return;
  }
  try {
    const saved = await storeBlob({ bytes: new Uint8Array([69, 86, 69, 82]), contentType: 'image/png', folder: 'health', filename: 'ping.png' });
    await removeBlob(saved.url);
    const host = new URL(saved.url).hostname;
    log(`blob probe ok host=${host}`);
  } catch (error) {
    log(`blob probe failed ${safeBlobError(error)}`);
  }
}
