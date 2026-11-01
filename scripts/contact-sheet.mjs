// Dev helper: tile raw images into one JPEG for quick visual review.
import sharp from 'sharp';
import fs from 'node:fs';
const [,, out, ...files] = process.argv;
const T = 300, cols = 4;
const rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(files.map(async (f, i) => {
  const buf = await sharp(f).resize(T, T, { fit: 'cover' }).toBuffer();
  const label = Buffer.from(`<svg width="${T}" height="22"><rect width="100%" height="100%" fill="black" opacity="0.6"/><text x="6" y="16" font-size="13" fill="white" font-family="sans-serif">${f.split('/').pop()}</text></svg>`);
  const withLabel = await sharp(buf).composite([{ input: label, top: T - 22, left: 0 }]).toBuffer();
  return { input: withLabel, top: Math.floor(i / cols) * T, left: (i % cols) * T };
}));
await sharp({ create: { width: cols * T, height: rows * T, channels: 3, background: '#ffffff' } }).composite(tiles).jpeg({ quality: 80 }).toFile(out);
console.log('wrote', out);
