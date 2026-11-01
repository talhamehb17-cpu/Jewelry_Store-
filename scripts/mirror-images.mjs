/**
 * Copies Unsplash catalog photos into public/images/catalog so the storefront
 * does not depend on a third-party hotlink at request time. Failures are skipped;
 * the image component falls back to a same-origin proxy, then a local placeholder.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = fs.readFileSync(path.join(root, 'src/lib/images.ts'), 'utf8');
const ids = [...new Set([...src.matchAll(/photo-([A-Za-z0-9_-]+)/g)].map((m) => m[1]))];
const dir = path.join(root, 'public/images/catalog');
fs.mkdirSync(dir, { recursive: true });

let saved = 0;
let skipped = 0;
for (const id of ids) {
  const file = path.join(dir, `photo-${id}.webp`);
  if (fs.existsSync(file) && fs.statSync(file).size > 800) {
    skipped++;
    continue;
  }
  const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&h=1750&q=75`;
  try {
    const res = await fetch(url, { headers: { Accept: 'image/webp,image/jpeg,image/*' }, redirect: 'follow' });
    if (!res.ok) {
      console.warn(`[images] skip photo-${id} (${res.status})`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800) {
      console.warn(`[images] skip photo-${id} (empty response)`);
      continue;
    }
    fs.writeFileSync(file, buf);
    saved++;
  } catch (err) {
    console.warn(`[images] skip photo-${id} (${err instanceof Error ? err.message : 'network'})`);
  }
}
console.log(`[images] catalog mirror: ${saved} saved, ${skipped} already present, ${ids.length} known`);
