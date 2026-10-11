// 生成 PWA 图标（PNG）：零依赖，手写 PNG 编码器 + 像素绘图。
// 图案：calm-600 底色 + 白色"摊开的书"（含中缝与行线）。

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(dirname(fileURLToPath(import.meta.url))), 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// PNG 编码

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// 绘图

const BG = [75, 96, 72]; // calm-600
const FG = [250, 248, 245]; // journal-50

function makeIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  };
  const fillRoundedRect = (x0, y0, x1, y1, radius, color) => {
    const r2 = radius * radius;
    for (let y = Math.floor(y0); y < y1; y += 1) {
      for (let x = Math.floor(x0); x < x1; x += 1) {
        const dx = x < x0 + radius ? x0 + radius - x : x > x1 - radius ? x - (x1 - radius) : 0;
        const dy = y < y0 + radius ? y0 + radius - y : y > y1 - radius ? y - (y1 - radius) : 0;
        if (dx * dx + dy * dy <= r2) set(x, y, color);
      }
    }
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) set(x, y, BG);
  }

  const s = size;
  const bx0 = 0.2 * s;
  const by0 = 0.28 * s;
  const bx1 = 0.8 * s;
  const by1 = 0.72 * s;
  const br = 0.06 * s;
  fillRoundedRect(bx0, by0, bx1, by1, br, FG);

  // 中缝
  for (let y = Math.floor(by0 + br * 0.5); y < by1 - br * 0.5; y += 1) {
    for (let x = Math.floor(0.488 * s); x < 0.512 * s; x += 1) set(x, y, BG);
  }
  // 每页三条行线
  for (const cy of [0.42, 0.52, 0.62]) {
    const lineH = Math.max(1, Math.round(0.018 * s));
    for (let y = Math.floor(cy * s); y < cy * s + lineH; y += 1) {
      for (let x = Math.floor(0.26 * s); x < 0.46 * s; x += 1) set(x, y, BG);
      for (let x = Math.floor(0.54 * s); x < 0.74 * s; x += 1) set(x, y, BG);
    }
  }
  return encodePng(size, size, px);
}

writeFileSync(join(outDir, 'icon-192.png'), makeIcon(192));
writeFileSync(join(outDir, 'icon-512.png'), makeIcon(512));
writeFileSync(join(outDir, 'apple-touch-icon.png'), makeIcon(180));
console.log('icons written:', outDir);
