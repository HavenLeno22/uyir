// Renders the app icon (same geometry as public/icon.svg) to PNG without any dependencies:
// shapes tested per sample, 4×4 supersampling, zlib for the PNG.
// Run: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const WATER = hex('#0b6fa4');
const WHITE = hex('#ffffff');

// The drop: a circle (centre 256,300, radius 128) joined to an apex at (256,92) by its tangents.
const APEX_Y = 92;
const TAN_Y = 221.2;
const SLOPE = 0.781; // half-width gained per pixel below the apex
function inDrop(x, y) {
  if (Math.hypot(x - 256, y - 300) <= 128) return true;
  return y >= APEX_Y && y <= TAN_Y && Math.abs(x - 256) <= (y - APEX_Y) * SLOPE;
}
const PULSE = [
  [150, 316],
  [214, 316],
  [238, 262],
  [274, 370],
  [300, 330],
  [362, 330],
];
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function onPulse(x, y) {
  let d = Infinity;
  for (let i = 1; i < PULSE.length; i++) d = Math.min(d, segDist(x, y, ...PULSE[i - 1], ...PULSE[i]));
  return d <= 12;
}
function roundedRect(px, py, r) {
  const cx = Math.max(r, Math.min(px, 512 - r));
  const cy = Math.max(r, Math.min(py, 512 - r));
  return Math.hypot(px - cx, py - cy) <= r && px >= 0 && px <= 512 && py >= 0 && py <= 512;
}

/** Colour at a point in the 512 design space, or null for transparent. */
function shade(px, py, maskable) {
  if (!maskable && !roundedRect(px, py, 112)) return null;
  // Maskable icons fill the square; the art is scaled into the 80% safe zone.
  const k = maskable ? 0.8 : 1;
  const x = 256 + (px - 256) / k;
  const y = 256 + (py - 256) / k;
  if (onPulse(x, y) && inDrop(x, y)) return WATER;
  if (inDrop(x, y)) return WHITE;
  return WATER;
}

function render(size, maskable) {
  const ss = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = shade(((x + (sx + 0.5) / ss) / size) * 512, ((y + (sy + 0.5) / ss) / size) * 512, maskable);
          if (!c) continue;
          r += c[0];
          g += c[1];
          b += c[2];
          a++;
        }
      }
      const i = (y * size + x) * 4;
      if (a > 0) {
        px[i] = Math.round(r / a);
        px[i + 1] = Math.round(g / a);
        px[i + 2] = Math.round(b / a);
      }
      px[i + 3] = Math.round((a / (ss * ss)) * 255);
    }
  }
  return encodePng(size, size, px);
}

// ---- Minimal PNG encoder (RGBA, 8-bit) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
writeFileSync(join(out, 'icon-192.png'), render(192, true));
writeFileSync(join(out, 'icon-512.png'), render(512, true));
writeFileSync(join(out, 'icon-64.png'), render(64, false));
console.log('Wrote icon-192.png, icon-512.png, icon-64.png');
