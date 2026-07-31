import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const svg = readFileSync(resolve('assets/icons/favicon.svg'), 'utf-8');

const sizes = [
  { name: 'favicon-32.png', size: 32 },
  { name: 'assets/icons/icon-192.png', size: 192 },
  { name: 'assets/icons/icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.ico', size: 32 },
];

for (const { name, size } of sizes) {
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();
  writeFileSync(resolve(name), buf);
  console.log(`Generated ${name} (${size}x${size})`);
}
