// Fast software preview (no WebGL): orthographic voxel splats of the BEASTS models at rest -> PNG. For quick shape/colour iteration;
// the real look is checked with tools/shot_beasts.mjs (VoxSkin). Usage:
//   node tests/beasts/preview.mjs <out.png> <id,id,...> [scale=5] [views=side,front34,rear34,top,front]
import fs from 'node:fs';
import zlib from 'node:zlib';
import { SHEET_MODELS } from '../../src/content/era_ancient/beasts/index.js';
import { rasterizeRest, modelBounds } from '../../src/content/era_ancient/beasts/common.js';

const [out = '/tmp/preview.png', ids = '', scaleArg = '5', viewArg = 'side,front34,rear34,top'] = process.argv.slice(2);
const SCALE = +scaleArg;
const VIEWS = {
  side: { yaw: Math.PI / 2, pitch: 0.0, label: 'side' },
  side34: { yaw: Math.PI / 2 - 0.5, pitch: 0.28, label: 'side 3/4' },
  front34: { yaw: 0.62, pitch: 0.28, label: '3/4 front' },
  rear34: { yaw: Math.PI + 0.62, pitch: 0.28, label: 'rear 3/4' },
  front: { yaw: 0, pitch: 0.0, label: 'front' },
  rear: { yaw: Math.PI, pitch: 0, label: 'rear' },
  top: { yaw: Math.PI / 2, pitch: 1.25, label: 'top' },
};
const TEAM = { A: [0x3a, 0x6f, 0xe8], B: [0xe0, 0x3a, 0x3a] };

function crcTable() { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; }
const CRC = crcTable();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const L = (() => { const v = [0.35, 0.85, 0.5]; const n = Math.hypot(...v); return v.map((x) => x / n); })();
function renderView(cells, S, view, team, W, H, buf, ox, oy, cx, cy, bg, ctr) {
  const cyaw = Math.cos(view.yaw), syaw = Math.sin(view.yaw), cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
  const zbuf = new Float32Array(W * H).fill(-1e9);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = ((oy + y) * buf.width + ox + x) * 3; buf.data[o] = bg[0]; buf.data[o + 1] = bg[1]; buf.data[o + 2] = bg[2]; }
  const occ = (a, b, c) => cells.has(a + ',' + b + ',' + c);
  for (const c of cells.values()) {
    // exposed-face normal
    let nx = 0, ny = 0, nz = 0;
    if (!occ(c.a + 1, c.b, c.c)) nx += 1; if (!occ(c.a - 1, c.b, c.c)) nx -= 1;
    if (!occ(c.a, c.b + 1, c.c)) ny += 1; if (!occ(c.a, c.b - 1, c.c)) ny -= 1;
    if (!occ(c.a, c.b, c.c + 1)) nz += 1; if (!occ(c.a, c.b, c.c - 1)) nz -= 1;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    // rotate point and normal by yaw (the model is turned by yaw about Y, camera looks along -Z) then pitch
    const px = (c.a + 0.5) * S - ctr[0], py = (c.b + 0.5) * S, pz = (c.c + 0.5) * S - ctr[2];
    const rot = (x, y, z) => { const x1 = x * cyaw + z * syaw, z1 = -x * syaw + z * cyaw; const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; return [x1, y2, z2]; };
    const [qx, qy, qz] = rot(px, py, pz);
    const nn = rot(nx, ny, nz);
    const lum = Math.max(0, nn[0] * L[0] * 0 + 0) + 0;
    // light in camera space (fixed): use world light on the unrotated normal so the sun stays put in model space
    const dl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const shade = 0.52 + 0.5 * dl;
    let r = (c.v >> 16) & 255, g = (c.v >> 8) & 255, bch = c.v & 255;
    if ((c.v >>> 24) & 2) { r = (r * team[0]) / 255; g = (g * team[1]) / 255; bch = (bch * team[2]) / 255; }
    if ((c.v >>> 24) & 4) { r = Math.min(255, r * 1.25); g = Math.min(255, g * 1.25); bch = Math.min(255, bch * 1.25); }
    else { r *= shade; g *= shade; bch *= shade; }
    const sx = Math.round(cx + qx / S * SCALE), sy = Math.round(cy - qy / S * SCALE);
    for (let dy = 0; dy < SCALE; dy++) for (let dx = 0; dx < SCALE; dx++) {
      const X = sx + dx - (SCALE >> 1), Y = sy + dy - (SCALE >> 1) - 1;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const zi = Y * W + X;
      if (qz < zbuf[zi]) continue;
      zbuf[zi] = qz;
      const edge = (dx === 0 || dy === 0) ? 0.88 : 1;
      const o = ((oy + Y) * buf.width + ox + X) * 3;
      buf.data[o] = Math.min(255, r * edge); buf.data[o + 1] = Math.min(255, g * edge); buf.data[o + 2] = Math.min(255, bch * edge);
    }
  }
}

const list = ids ? ids.split(',').map((id) => SHEET_MODELS.find((m) => m.id === id)).filter(Boolean) : SHEET_MODELS;
const views = viewArg.split(',').map((v) => VIEWS[v]).filter(Boolean);
const cells = [];
for (const e of list) {
  const m = e.make(); const { cells: c, S } = rasterizeRest(m); const b = modelBounds(m);
  cells.push({ e, m, c, S, b });
}
const maxExt = Math.max(...cells.map((x) => Math.max(x.b.size[0], x.b.size[1], x.b.size[2]) / x.S));
const CW = Math.ceil(maxExt * SCALE * 0.9) + 24, CH = Math.ceil(Math.max(...cells.map((x) => x.b.size[1] / x.S)) * SCALE * 1.25 + (views.some((v) => v.label === 'top') ? maxExt * SCALE * 0.5 : 0)) + 24;
const labelW = 130, rowTeams = ['A', 'B'];
const total = { width: labelW + CW * views.length * 1, height: CH * cells.length * 1 };
const buf = { width: total.width, height: total.height, data: Buffer.alloc(total.width * total.height * 3) };
const bg = [0xc9, 0xd6, 0xe0];
for (let i = 0; i < buf.data.length; i += 3) { buf.data[i] = 0x24; buf.data[i + 1] = 0x28; buf.data[i + 2] = 0x30; }
cells.forEach((it, r) => {
  const ctr = [(it.b.min[0] + it.b.max[0]) / 2, 0, (it.b.min[2] + it.b.max[2]) / 2];
  views.forEach((v, c) => {
    const team = v.label === 'rear 3/4' ? TEAM.B : TEAM.A;
    const isTop = v.label === 'top';
    const cy = isTop ? CH / 2 + 8 : CH - 16 - (v.pitch > 0.2 ? 6 : 0);
    renderView(it.c, it.S, v, team, CW, CH, buf, labelW + c * CW, r * CH, CW / 2, cy, bg, ctr);
  });
});
fs.writeFileSync(out, png(buf.width, buf.height, buf.data));
console.log(`wrote ${out} ${buf.width}x${buf.height}; models: ${cells.map((x) => `${x.e.id}(${x.m.parts.length}p, ${x.m.voxelCount()}v, ${x.b.size.map((s) => s.toFixed(1)).join('x')})`).join(' ')}`);
