// Converts raw generated PNGs (in .raw-images/, not committed) into optimized WebP assets in public/images.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const RAW = '.raw-images';
const map = {
  'test-aurelia-1.png': 'products/aurelia-gold-necklace-1.webp',
  'test-aurelia-2.png': 'products/aurelia-gold-necklace-2.webp',
  'amara-pendant-1.png': 'products/amara-pendant-1.webp',
  'amara-pendant-2.png': 'products/amara-pendant-2.webp',
  'celestine-pearl-necklace-1.png': 'products/celestine-pearl-necklace-1.webp',
  'celestine-pearl-necklace-2.png': 'products/celestine-pearl-necklace-2.webp',
  'luna-crescent-necklace-1.png': 'products/luna-crescent-necklace-1.webp',
  'luna-crescent-necklace-2.png': 'products/luna-crescent-necklace-2.webp',
  'soleil-medallion-necklace-1.png': 'products/soleil-medallion-necklace-1.webp',
  'hero-main.png': 'hero/hero-main.webp',
};
for (const [src, dest] of Object.entries(map)) {
  const from = path.join(RAW, src);
  if (!fs.existsSync(from)) { console.warn('missing', from); continue; }
  const to = path.join('public/images', dest);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const info = await sharp(from).webp({ quality: 80, effort: 6 }).toFile(to);
  console.log(dest, info.width + 'x' + info.height, Math.round(info.size / 1024) + 'KB');
}
// Small social share image (1200x630) from the hero
await sharp(path.join(RAW, 'hero-main.png')).resize(1200, 630, { fit: 'cover', position: 'right' }).jpeg({ quality: 82 }).toFile('public/images/og-default.jpg');
console.log('og-default.jpg done');
