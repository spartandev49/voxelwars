// Tiny PNG writer + battlefield plotter (debug aid for AI work: look at the shape of a battle).
import zlib from 'node:zlib';
import fs from 'node:fs';

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
export function writePNG(path, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/** Top-down plot of a World: terrain shading, props, units (blue/red), dead (grey), projectiles. px = pixels per world unit. */
export function plotWorld(world, path, px = 8) {
  const a = world.arena, W = a.worldSize(), n = Math.round(W * px);
  const buf = Buffer.alloc(n * n * 3);
  const set = (x, y, r, g, b) => { if (x < 0 || y < 0 || x >= n || y >= n) return; const i = (y * n + x) * 3; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const wx = x / px - W / 2, wz = y / px - W / 2, h = a.cellHeight(wx, wz), m = a.materialAt(wx, wz);
    const c = m.top[0]; const k = 0.55 + Math.min(0.45, h / 40);
    let r = ((c >> 16) & 255) * k, g = ((c >> 8) & 255) * k, b = (c & 255) * k;
    if (a.water > 0 && a.getH(a.cx(wx), a.cz(wz)) < a.water) { r = a.lava ? 200 : 60; g = a.lava ? 70 : 100; b = a.lava ? 20 : 170; }
    set(x, y, r, g, b);
  }
  const disc = (wx, wz, rad, r, g, b) => { const cx = Math.round((wx + W / 2) * px), cy = Math.round((wz + W / 2) * px), rr = Math.max(1, Math.round(rad * px)); for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (dx * dx + dy * dy <= rr * rr) set(cx + dx, cy + dy, r, g, b); };
  for (const p of world.props) if (!p.dead && p.radius > 0) disc(p.x, p.z, p.radius, 70, 70, 70);
  for (const u of world.dying) disc(u.x, u.z, u.radius * 0.6, 150, 150, 150);
  for (const u of world.units) {
    const col = u.team === 0 ? [40, 90, 255] : [255, 50, 50];
    if (u.state === 7) { col[0] = 255; col[1] = 255; col[2] = 0; }
    disc(u.x, u.z, u.radius * 0.9, col[0], col[1], col[2]);
    // heading tick
    for (let t = 0; t < 4; t++) set(Math.round((u.x + W / 2 + Math.sin(u.heading) * (u.radius + t * 0.15)) * px), Math.round((u.z + W / 2 + Math.cos(u.heading) * (u.radius + t * 0.15)) * px), 255, 255, 255);
  }
  for (const p of world.proj.list) if (p.active) disc(p.x, p.z, 0.15, 255, 255, 255);
  writePNG(path, n, n, buf);
}
