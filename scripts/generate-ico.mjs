import sharp from 'sharp';
import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

const svg = readFileSync(resolve('assets/icons/favicon.svg'), 'utf-8');

// Generate 32x32 PNG
const png = await sharp(Buffer.from(svg))
  .resize(32, 32)
  .png()
  .toBuffer();

// Build ICO container
// ICO header: reserved(2) + type(2) + count(2)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);     // reserved
header.writeUInt16LE(1, 2);     // type = 1 (ICO)
header.writeUInt16LE(1, 4);     // count = 1

// ICO entry: w(1) + h(1) + colors(1) + reserved(1) + planes(2) + bpp(2) + size(4) + offset(4)
const offset = 6 + 16; // header + 1 entry
const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);        // width
entry.writeUInt8(32, 1);        // height
entry.writeUInt8(0, 2);         // colors
entry.writeUInt8(0, 3);         // reserved
entry.writeUInt16LE(1, 4);      // color planes
entry.writeUInt16LE(32, 6);     // bits per pixel
entry.writeUInt32LE(png.length, 8);  // size
entry.writeUInt32LE(offset, 12);     // offset

const ico = Buffer.concat([header, entry, png]);
writeFileSync(resolve('favicon.ico'), ico);
console.log('Generated favicon.ico (proper ICO format)');
