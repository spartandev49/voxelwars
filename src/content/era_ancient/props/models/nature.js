// Nature props: trees, bushes, rocks, crops, reeds, cactus, bones, logs. Toy-box palette: saturated greens, chunky canopies, readable silhouettes.
// Each spec: { variants, pal (debris colours), build(variant, rng) -> Pen, damage?, rubble }, wrapped by makeBuilder into build(stage, variant, rng).

import { Pen, V, G, shade, h3, makeBuilder, chip, cracks, darken, prune } from './kit.js';

const TAU = Math.PI * 2;
const pick = (rng, a) => a[Math.floor(rng.next() * a.length)];

/** Leaf colour fn: 3 tone bands lit from above plus speckles and an optional accent (blossom / apple). */
function leaf(c, seed, acc, accCol) {
  return (x, y, z, nx, ny, nz) => {
    const n = h3(x, y, z, seed);
    const t = ny * 0.55 + nx * 0.12 - nz * 0.08 + (n - 0.5) * 0.5;
    if (acc && n > 0.955 && ny > -0.35) return V(accCol);
    return V(t > 0.42 ? c[2] : t > -0.05 ? c[1] : c[0]);
  };
}
const barkFn = (b, seed = 5) => (x, y, z) => { const n = h3(x, y >> 2, z, seed); return V(n < 0.3 ? b[0] : n > 0.78 ? b[2] : b[1]); };
/** Thin tapered trunk column. */
function trunk(p, y0, y1, cx, cz, rFn, offFn, col) {
  for (let y = y0; y <= y1; y++) { const o = offFn ? offFn(y) : [0, 0]; p.disc(cx + o[0], cz + o[1], y, 1, rFn(y), col); }
}
const SNOW = [0xf6f9fd, 0xe2ebf6];

// ------------------------------------------------------------------ trees
const OAK = [
  { c: [0x2f8a34, 0x4fae3a, 0x84d44e] },
  { c: [0x4c9a3c, 0x78c44a, 0xa6e060], acc: 0xffb7d5 },        // spring blossom
  { c: [0x1f7a3e, 0x2f9a4a, 0x5cc060], acc: 0xe84a3a },        // apples
  { c: [0xc4561c, 0xf0902a, 0xffcb4a], acc: 0xd93a2a },        // autumn
];
const tree_oak = {
  variants: 4, pal: [0x8b5a2b, 0x6b4426, 0x4fae3a, 0x84d44e, 0x2f8a34],
  build(v, rng) {
    const p = new Pen(47, 52, 47, 3), cx = p.cx, cz = p.cz, t = OAK[v];
    const lean = rng.range(-1.6, 1.6), lz = rng.range(-1.6, 1.6);
    const off = (y) => { const k = Math.max(0, y) / 30; return [lean * k * k, lz * k * k]; };
    trunk(p, -3, 30, cx, cz, (y) => 3.3 + 2.2 * Math.pow(Math.max(0, 1 - y / 7), 2), off, barkFn([0x6b4426, 0x8b5a2b, 0xa8703a]));
    // two branches reaching into the side blobs
    p.line(cx + off(20)[0], 20, cz + off(20)[1], cx - 10, 29, cz + 4, V(0x7a4f28), 4);
    p.line(cx + off(22)[0], 22, cz + off(22)[1], cx + 10, 30, cz - 3, V(0x7a4f28), 4);
    const lf = leaf(t.c, 11 + v, !!t.acc, t.acc || 0);
    p.blob(cx - 12, 27, cz + 5, 11, 9, 10, lf);
    p.blob(cx + 12, 28, cz - 4, 11, 9, 10, lf);
    p.blob(cx + 2, 28, cz - 12, 10, 8, 10, lf);
    p.blob(cx + rng.range(-2, 2), 34, cz + rng.range(-2, 2), 17, 13, 17, lf);
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 30, rmin: 2, rmax: 4.6, bias: 0.85 }); cracks(p, rng, { n: 3, len: 14 }); darken(p, rng, 0.12, 0.8); prune(p, 26); },
  rubble: { w: 22, d: 22, h: 7, kind: 'leaf', cols: [0x4fae3a, 0x84d44e, 0x2f8a34, 0x8b5a2b], n: 70 },
  afterRubble(p, rng) { p.disc(p.cx, p.cz, 0, 6, 3.6, V(0x8b5a2b)); p.disc(p.cx, p.cz, 6, 1, 3.2, V(0xd9a86a)); p.box(Math.round(p.cx) + 6, 0, Math.round(p.cz) - 2, 9, 3, 3, V(0x7a4f28)); },
};

const OLIVE = [
  [0x6f9a5a, 0x8fb871, 0xb4d492], [0x4f9a45, 0x6dbb55, 0x92d870], [0x8a9a4a, 0xa8b85a, 0xc8d878], [0x6f9a8a, 0x8fb8a4, 0xb4d4c2],
];
const tree_olive = {
  variants: 4, pal: [0x7d6650, 0x5e4a3a, 0x8fb871, 0xb4d492, 0x3b2f5e],
  build(v, rng) {
    const p = new Pen(45, 44, 45, 3), cx = p.cx, cz = p.cz;
    const ph = rng.range(0, TAU), dir = rng.range(0, TAU);
    const bark = barkFn([0x5e4a3a, 0x7d6650, 0x9a8268], 9);
    const wob = (y) => Math.min(1, Math.max(0, y) / 8), tx = (y) => cx + Math.sin(y * 0.28 + ph) * 1.8 * wob(y), tz = (y) => cz + Math.cos(y * 0.22 + ph) * 1.4 * wob(y);
    for (let y = -3; y <= 10; y++) p.disc(tx(y), tz(y), y, 1, y < 3 ? 4.0 : 3.8 - (y - 3) * 0.06, bark);
    const sx0 = tx(10), sz0 = tz(10);
    const limb = (ang, reach, rise, th0, th1, wob) => {
      let px = sx0, py = 10, pz = sz0;
      for (let s = 1; s <= 8; s++) {
        const t = s / 8, r = reach * t, nx = sx0 + Math.cos(ang) * r + Math.sin(t * 6 + wob) * 2, ny = 10 + rise * Math.pow(t, 0.8), nz = sz0 + Math.sin(ang) * r + Math.cos(t * 5 + wob) * 2;
        p.line(px, py, pz, nx, ny, nz, V(s % 3 ? 0x7d6650 : 0x5e4a3a), Math.max(2, Math.round(th0 + (th1 - th0) * t)));
        px = nx; py = ny; pz = nz;
      }
      return [px, py, pz];
    };
    const a = limb(dir, 12, 14, 4, 2, ph), b = limb(dir + 2.7, 11, 12, 4, 2, ph + 1.3), c = limb(dir + 4.6, 7, 17, 3, 2, ph + 2);
    const lf = leaf(OLIVE[v], 31 + v, false, 0);
    const blobs = [[a[0], a[1] + 4, a[2], 12, 6.5, 11], [b[0], b[1] + 4, b[2], 12, 6, 11], [c[0], c[1] + 3, c[2], 9, 5, 9], [cx, 30, cz, 10, 6, 9.5]];
    for (const o of blobs) p.blob(o[0], o[1], o[2], o[3], o[4], o[5], lf);
    // olives hang under the canopy
    const nOl = v === 3 ? 26 : 12;
    for (let i = 0; i < nOl; i++) {
      const o = blobs[i % blobs.length], ang = rng.next() * TAU, rr = 0.55 + rng.next() * 0.35;
      const x = o[0] + Math.cos(ang) * o[3] * rr, z = o[2] + Math.sin(ang) * o[5] * rr, y = o[1] - o[4] * Math.sqrt(Math.max(0, 1 - rr * rr)) - 0.5;
      p.box(Math.round(x), Math.round(y) - 1, Math.round(z), 2, 2, 2, V(i % 3 ? 0x3b2f5e : 0x6a8a3a));
    }
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 26, rmin: 2, rmax: 4.2, bias: 0.8 }); cracks(p, rng, { n: 3, len: 14 }); darken(p, rng, 0.12, 0.8); prune(p, 26); },
  rubble: { w: 20, d: 20, h: 6, kind: 'leaf', cols: [0x8fb871, 0xb4d492, 0x6f9a5a, 0x7d6650], n: 60 },
  afterRubble(p) { p.disc(p.cx, p.cz, 0, 5, 3.4, V(0x7d6650)); p.disc(p.cx, p.cz, 5, 1, 3, V(0xc9a878)); },
};

const CYP = [[0x2d6f3a, 0x3d8f45, 0x58a850], [0x3e6f35, 0x5a8f3f, 0x7ab04c], [0x1f6a55, 0x2f8a6a, 0x4faa80], [0x35603a, 0x4a7f48, 0x66a05a]];
const tree_cypress = {
  variants: 4, pal: [0x2d6f3a, 0x3d8f45, 0x58a850, 0x6b4426],
  build(v, rng) {
    const p = new Pen(25, 68, 25, 2), cx = p.cx, cz = p.cz, c = CYP[v];
    p.disc(cx, cz, -2, 11, 3.5, V(0x6b4426));
    const ph = rng.range(0, 100);
    for (let y = 4; y <= 66; y++) {
      const u = (y - 4) / 62, r0 = 9.2 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.8) + (y > 62 ? 0.5 : 0);
      if (r0 < 0.4) continue;
      for (let z = Math.floor(cz - r0 - 2); z <= Math.ceil(cz + r0 + 2); z++) for (let x = Math.floor(cx - r0 - 2); x <= Math.ceil(cx + r0 + 2); x++) {
        const n = h3(x, y >> 1, z, 3 + ph), d2 = (x - cx) * (x - cx) + (z - cz) * (z - cz), rr = r0 * (0.84 + 0.3 * n);
        if (d2 > rr * rr) continue;
        const tone = h3(x, y >> 1, z, 7);
        p.set(x, y, z, V(tone < 0.3 ? c[0] : tone > 0.8 ? c[2] : c[1]));
      }
    }
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 24, rmin: 2, rmax: 4, bias: 0.8 }); cracks(p, rng, { n: 2, len: 12 }); darken(p, rng, 0.14, 0.8); prune(p, 26); },
  rubble: { w: 14, d: 14, h: 6, kind: 'leaf', cols: [0x2d6f3a, 0x3d8f45, 0x58a850], n: 50 },
  afterRubble(p) { p.disc(p.cx, p.cz, 0, 4, 2.6, V(0x6b4426)); },
};

const PINE = [[0x1f6a3a, 0x2f8a50, 0x48a864], [0x24704a, 0x358f5e, 0x4faa72], [0x1c5a56, 0x2a7a70, 0x409a8a], [0x2a6a2a, 0x3a8a3a, 0x58aa4a]];
const tree_pine = {
  variants: 4, pal: [0x1f6a3a, 0x2f8a50, 0x48a864, 0x6b4426, 0xf6f9fd],
  build(v, rng) {
    const p = new Pen(35, 68, 35, 2), cx = p.cx, cz = p.cz, c = PINE[v];
    trunk(p, -2, 60, cx, cz, (y) => Math.max(1.8, 4.2 - y * 0.12), null, barkFn([0x5a3a20, 0x7a4f28, 0x8f6236], 21));
    const tiers = [[9, 14, 16], [20, 13, 13.5], [31, 12, 11], [41, 11, 8.5], [50, 10, 6], [58, 9, 3.6]];
    const ph = rng.range(0, TAU);
    tiers.forEach((tr, ti) => {
      const [y0, h, R] = tr;
      for (let j = 0; j < h; j++) {
        const rr = R * (1 - (j / h) * 0.93);
        for (let z = Math.floor(cz - rr - 2); z <= Math.ceil(cz + rr + 2); z++) for (let x = Math.floor(cx - rr - 2); x <= Math.ceil(cx + rr + 2); x++) {
          const dx = x - cx, dz = z - cz, th = Math.atan2(dz, dx), lim = rr * (1 + 0.1 * Math.sin(5 * th + ph + ti));
          if (dx * dx + dz * dz > lim * lim) continue;
          const t = j / h, n = h3(x, y0 + j, z, 13);
          const col = t < 0.2 ? c[0] : n > 0.8 ? c[2] : n < 0.25 ? c[0] : c[1];
          p.set(x, y0 + j, z, V(col));
        }
      }
    });
    if (v === 1 || v === 3) {       // snow on every upward-facing leaf voxel (v3 only patchy)
      for (let y = 8; y < 67; y++) for (let z = 0; z < 35; z++) for (let x = 0; x < 35; x++) {
        const cur = p.get(x, y, z), up = p.get(x, y + 1, z);
        if (cur && !up && (cur & 0xffffff) !== 0x5a3a20 && (v === 1 || h3(x, y >> 2, z, 17) > 0.4)) p.set(x, y, z, V(SNOW[(x + z + y) & 1]));
      }
    }
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 28, rmin: 2, rmax: 4.2, bias: 0.8 }); cracks(p, rng, { n: 2, len: 12 }); darken(p, rng, 0.14, 0.8); prune(p, 26); },
  rubble: { w: 18, d: 18, h: 6, kind: 'leaf', cols: [0x1f6a3a, 0x2f8a50, 0x48a864, 0x7a4f28], n: 56 },
  afterRubble(p) { p.disc(p.cx, p.cz, 0, 4, 3, V(0x7a4f28)); },
};

const tree_dead = {
  variants: 4, pal: [0x7a6b5a, 0x5e5144, 0x948270, 0x2c2624],
  build(v, rng) {
    const p = new Pen(37, 46, 37, 2), cx = p.cx, cz = p.cz;
    const cols = v === 3 ? [0x1e1a18, 0x2c2624, 0x3a322e] : v === 2 ? [0x6a5f4e, 0x857860, 0x9a8c72] : [0x5e5144, 0x7a6b5a, 0x948270];
    const col = barkFn(cols, 33);
    const lean = rng.range(-3, 3), lz = rng.range(-3, 3);
    const off = (y) => { const k = Math.max(0, y) / 24; return [lean * k, lz * k + Math.sin(y * 0.3) * 0.8]; };
    trunk(p, -2, 24, cx, cz, (y) => y < 3 ? 3.5 : Math.max(1.6, 3.2 - y * 0.065), off, col);
    const tips = [];
    const branch = (x, y, z, ax, ay, az, len, th, depth) => {
      let px = x, py = y, pz = z;
      for (let s = 0; s < len; s += 3) {
        const jx = rng.range(-0.35, 0.35), jz = rng.range(-0.35, 0.35);
        const nx = px + (ax + jx) * 3, ny = py + (ay + (s > len * 0.5 ? 0.1 : 0)) * 3, nz = pz + (az + jz) * 3;
        p.line(px, py, pz, nx, ny, nz, col(Math.round(nx), Math.round(ny), Math.round(nz)), th);
        px = nx; py = ny; pz = nz;
        if (depth > 0 && s > 0 && rng.next() < 0.55) { const a = rng.range(0, TAU); branch(px, py, pz, Math.cos(a) * 0.8, rng.range(0.25, 0.85), Math.sin(a) * 0.8, len * 0.55, Math.max(1, th - 1), depth - 1); }
      }
      if (depth === 0 || len < 8) tips.push([px, py, pz]);
      else tips.push([px, py, pz]);
    };
    const top = off(24);
    branch(cx + top[0], 22, cz + top[1], 0.1, 1, 0.05, 20, 3, 2);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + rng.range(-0.4, 0.4), y = 12 + i * 3; const o = off(y); branch(cx + o[0], y, cz + o[1], Math.cos(a) * 0.9, rng.range(0.25, 0.6), Math.sin(a) * 0.9, rng.int(14, 20), 2, 2); }
    if (v === 1) {   // raven on the highest tip
      let best = tips[0]; for (const t of tips) if (t[1] > best[1]) best = t;
      const bx = Math.round(best[0]), by = Math.round(best[1]) + 2, bz = Math.round(best[2]);
      p.blob(bx, by + 1, bz, 2.4, 1.9, 3.2, V(0x24242c)); p.blob(bx, by + 3, bz + 2, 1.6, 1.6, 1.6, V(0x24242c)); p.set(bx, by + 3, bz + 4, V(0xffb030)); p.set(bx - 1, by + 4, bz + 3, V(0xffffff)); p.set(bx + 1, by + 4, bz + 3, V(0xffffff));
      p.box(bx - 1, by - 1, bz - 4, 3, 1, 3, V(0x1c1c22));
    }
    if (v === 2) {   // hanging vines
      for (let i = 0; i < 9; i++) { const t = tips[i % tips.length]; const x = Math.round(t[0] + rng.range(-3, 3)), z = Math.round(t[2] + rng.range(-3, 3)), y = Math.round(t[1] - 1), L = rng.int(7, 14); for (let k = 0; k < L; k++) p.set(x, y - k, z, V(k % 4 === 3 ? 0x6ab04a : 0x4f9a3a)); }
    }
    if (v === 3) {   // burnt: embers still glow
      const s = []; for (let y = 2; y < 30; y++) for (let z = 0; z < 37; z++) for (let x = 0; x < 37; x++) if (p.get(x, y, z)) s.push([x, y, z]);
      for (let i = 0; i < 12 && s.length; i++) { const q = s[Math.floor(rng.next() * s.length)]; p.set(q[0], q[1], q[2], G(i % 3 ? 0xff6a1a : 0xffc23a)); }
    }
    return p;
  },
  rubble: { w: 16, d: 16, h: 5, kind: 'planks', cols: [0x7a6b5a, 0x5e5144, 0x948270], n: 40 },
  afterRubble(p) { p.disc(p.cx, p.cz, 0, 5, 2.8, V(0x7a6b5a)); },
};

const PALM_G = [[0x2f8a3e, 0x3fae4b, 0x62c85a], [0x5a9a3a, 0x7ab84a, 0xa0d460], [0x2a8a4a, 0x3caa5c, 0x5cca78], [0x2a7a3a, 0x3a9a48, 0x58b85a]];
const tree_palm = {
  variants: 4, pal: [0xb98b57, 0xa57a48, 0x3fae4b, 0x62c85a, 0x6b4423],
  build(v, rng) {
    const p = new Pen(53, 66, 53, 2), cx = p.cx, cz = p.cz, g = PALM_G[v];
    const lean = rng.range(5, 9), ang = rng.range(0, TAU), H = 54;
    const lx = Math.cos(ang) * lean, lz = Math.sin(ang) * lean;
    const at = (y) => { const t = Math.max(0, y) / H; return [cx + lx * t * t, cz + lz * t * t]; };
    for (let y = -2; y <= H; y++) {
      const o = at(y), r = y < 3 ? 3.5 : 2.6 - (y / H) * 0.4;
      p.disc(o[0], o[1], y, 1, r, V(y % 4 === 0 ? 0x8a6234 : y % 4 === 1 ? 0xa57a48 : 0xb98b57));
    }
    const top = at(H);
    const frond = (a, len, droop) => {
      let prev = [top[0], H + 2, top[1]];
      const px = -Math.sin(a), pz = Math.cos(a);
      for (let s = 1; s <= len; s++) {
        const t = s / len, r = s * 1.15;
        const x = top[0] + Math.cos(a) * r, z = top[1] + Math.sin(a) * r, y = H + 2 + Math.sin(t * Math.PI * 0.7) * 5 - t * t * droop;
        p.line(prev[0], prev[1], prev[2], x, y, z, V(0x5a8a3a), 1);
        const ll = Math.round(3.4 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08))) + (t < 0.85 ? 1 : 0);
        for (let k = 1; k <= ll; k++) for (const sg of [-1, 1]) p.set(x + px * k * sg, y - k * 0.5, z + pz * k * sg, V(h3(Math.round(x), Math.round(y), k + (sg > 0 ? 9 : 0), 3) > 0.55 ? g[2] : g[1]));
        p.set(x, y + 1, z, V(g[0]));
        prev = [x, y, z];
      }
    };
    const nF = v === 3 ? 10 : 8;
    for (let i = 0; i < nF; i++) frond((i / nF) * TAU + rng.range(-0.2, 0.2), rng.int(19, 23), rng.range(11, 17));
    frond(ang + 0.2, 8, 2); frond(ang + 3.6, 8, 2);
    const nut = v === 1 ? 0xe8902a : 0x6b4423;
    for (let i = 0; i < (v === 1 ? 9 : 4); i++) { const a = rng.range(0, TAU); p.blob(top[0] + Math.cos(a) * 2.4, H - 1 - (i % 2), top[1] + Math.sin(a) * 2.4, 1.6, 1.6, 1.6, V(nut)); }
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 24, rmin: 2, rmax: 4, bias: 0.9 }); cracks(p, rng, { n: 2, len: 14 }); darken(p, rng, 0.12, 0.8); prune(p, 26); },
  rubble: { w: 18, d: 18, h: 5, kind: 'mixed', cols: [0x3fae4b, 0x62c85a, 0xb98b57, 0xa57a48], n: 60 },
  afterRubble(p) { p.disc(p.cx, p.cz, 0, 4, 2.6, V(0xa57a48)); },
};

// ------------------------------------------------------------------ small vegetation and rocks
const BUSH = [[0x2f8a34, 0x4fae3a, 0x7bd04a], [0x3a8a4a, 0x58b05c, 0x84d884], [0x6a8a2a, 0x8aaa3a, 0xb0ca58], [0x2a7a50, 0x40a068, 0x68c890]];
const BLOOM = [0xe84a3a, 0xff7eb6, 0xffd23a, 0xf4f6ff];
const bush = {
  variants: 4, pal: [0x2f8a34, 0x4fae3a, 0x7bd04a, 0xff7eb6],
  build(v, rng) {
    const p = new Pen(25, 14, 25, 1), cx = p.cx, cz = p.cz;
    const lf = leaf(BUSH[v], 41 + v, false, 0);
    p.blob(cx, 5, cz, 9, 6.5, 8.5, lf); p.blob(cx - 6, 4, cz + 2, 6, 5, 6, lf); p.blob(cx + 6, 4, cz - 2, 6.5, 5, 6, lf);
    for (let i = 0; i < 16; i++) {      // berries / flowers
      const a = rng.range(0, TAU), rr = rng.range(0.3, 0.92), x = Math.round(cx + Math.cos(a) * rr * 9), z = Math.round(cz + Math.sin(a) * rr * 8);
      for (let y = 12; y >= 0; y--) { if (p.get(x, y, z)) { p.set(x, y, z, V(BLOOM[(v + i) % 4 === 3 ? 3 : v])); break; } }
    }
    return p;
  },
  rubble: { w: 16, d: 16, h: 3, kind: 'leaf', cols: [0x2f8a34, 0x4fae3a, 0x7bd04a], n: 22 },
};

const ROCK = [[0x75757c, 0x8d8d92, 0xaaaab0], [0x7a6a58, 0x9a8570, 0xb8a28a], [0x6f7a68, 0x8d9a82, 0xaab69c], [0xb0985c, 0xcfb98a, 0xe8d6a8]];
const rockColor = (c, seed) => (x, y, z, nx, ny) => { const n = h3(x, y, z, seed); const t = ny * 0.6 + (n - 0.5) * 0.45; return V(t > 0.28 ? c[2] : t > -0.3 ? c[1] : c[0]); };
const rock_small = {
  variants: 4, indestructible: true, pal: [0x75757c, 0x8d8d92, 0xaaaab0, 0x9a8570],
  build(v, rng) {
    const p = new Pen(13, 12, 13, 1), cx = p.cx, cz = p.cz;
    const f = rockColor(ROCK[v], 51 + v);
    p.blob(cx, 3.6, cz, 5.4, 4.6, 5, f); p.blob(cx + rng.range(-2, 3), 2.5, cz + rng.range(-3, 0), 3.4, 3, 3.4, f); p.blob(cx - 3, 2, cz + 3, 3, 2.4, 3, f);
    if (v === 2) for (let z = 0; z < 13; z++) for (let x = 0; x < 13; x++) for (let y = 9; y >= 0; y--) if (p.get(x, y, z)) { if (h3(x, 0, z, 4) > 0.45) p.set(x, y, z, V(0x5f9a4a)); break; }
    return p;
  },
};
const rock_big = {
  variants: 4, indestructible: true, pal: [0x75757c, 0x8d8d92, 0xaaaab0, 0x5f9a4a],
  build(v, rng) {
    const p = new Pen(25, 29, 25, 3), cx = p.cx, cz = p.cz;
    const cols = v === 3 ? [0x4a4a54, 0x62626e, 0x7a7a88] : ROCK[v];
    const f = rockColor(cols, 61 + v);
    p.blob(cx, 12, cz, 11, 12.5, 10.5, f); p.blob(cx - 5, 7, cz + 5, 7, 7.5, 7, f); p.blob(cx + 6, 6, cz - 4, 6.5, 6.5, 6, f);
    p.blob(cx + 2, 20, cz + 1, 6.5, 6, 6, f);
    for (let i = 0; i < 3; i++) {    // dark strata cracks
      let x = cx + rng.range(-8, 8), y = rng.range(8, 20), z = cz + 9;
      for (let s = 0; s < 14; s++) { const xx = Math.round(x), yy = Math.round(y), zz = Math.round(z); for (let d = 0; d < 6; d++) { if (p.get(xx, yy, zz - d)) { p.set(xx, yy, zz - d, V(shade(cols[0], 0.7))); break; } } x += rng.range(-1, 1); y += rng.range(-1.4, 0.4); }
    }
    if (v === 2 || v === 1) for (let z = 0; z < 25; z++) for (let x = 0; x < 25; x++) for (let y = 28; y >= 0; y--) if (p.get(x, y, z)) { if (y > 12 && h3(x, 0, z, 6) > (v === 2 ? 0.35 : 0.7)) p.set(x, y, z, V(h3(x, 1, z, 6) > 0.5 ? 0x5f9a4a : 0x78b24a)); break; }
    return p;
  },
};

const wheat = {
  variants: 4, pal: [0xe8c04a, 0xf2d268, 0xc8a83a, 0x8aa83a],
  build(v, rng) {
    const p = new Pen(17, 12, 17, 0);
    const col = [[0xc8a83a, 0xe8c04a, 0xf2d268], [0x6a9a3a, 0x8ac04a, 0xa8d85a], [0xb8a470, 0xdcc88a, 0xeadca8], [0xc8a83a, 0xe8c04a, 0xf2d268]][v];
    for (let i = 0; i < 44; i++) {
      const x = rng.int(1, 15), z = rng.int(1, 15), hh = rng.int(7, 10), lean = rng.next() < 0.5 ? 1 : 0, ld = rng.next() < 0.5 ? 1 : -1, lx = rng.next() < 0.5;
      for (let y = 0; y < hh; y++) { const off = y > hh * 0.6 ? lean * ld : 0; p.set(lx ? x + off : x, y, lx ? z : z + off, V(y < 2 ? 0x7a9a3a : col[0])); }
      const ex = lx ? x + lean * ld : x, ez = lx ? z : z + lean * ld;
      p.box(ex, hh, ez, 1, 2, 1, V(v === 3 && i % 6 === 0 ? 0xe84a3a : col[1 + (i & 1)]));
    }
    return p;
  },
  rubble: { w: 14, d: 14, h: 2, kind: 'planks', cols: [0xc8a83a, 0xe8c04a], n: 18 },
};

const reeds = {
  variants: 4, pal: [0x5f9a3f, 0x78b24a, 0x4a8236, 0x6e4a2a],
  build(v, rng) {
    const p = new Pen(15, 18, 15, 0);
    const col = [[0x4a8236, 0x5f9a3f, 0x78b24a], [0x7a9a3a, 0x9ab84a, 0xbad060], [0x4a8236, 0x5f9a3f, 0x78b24a], [0x9a8a52, 0xb8a468, 0xd0c080]][v];
    for (let i = 0; i < 26; i++) {
      const x = rng.int(1, 13), z = rng.int(1, 13), hh = rng.int(10, 16), lean = rng.int(-1, 1), lx = rng.next() < 0.5;
      for (let y = 0; y < hh; y++) { const off = y > hh * 0.55 ? lean : 0; p.set(lx ? x + off : x, y, lx ? z : z + off, V(col[(y + i) % 3])); }
      if ((v === 2 && i % 2 === 0) || (v !== 2 && i % 5 === 0)) { const ex = lx ? x + lean : x, ez = lx ? z : z + lean; p.box(ex, hh - 3, ez, 1, 4, 1, V(0x6e4a2a)); p.set(ex, hh + 1, ez, V(0x4a3220)); }
    }
    return p;
  },
  rubble: { w: 12, d: 12, h: 2, kind: 'planks', cols: [0x5f9a3f, 0x78b24a], n: 14 },
};

const cactus = {
  variants: 4, pal: [0x3f9650, 0x4fa85a, 0x2f7a42, 0xff7eb6],
  build(v, rng) {
    const p = new Pen(21, 22, 21, 1), cx = p.cx, cz = p.cz;
    const c = [0x2f7a42, 0x3f9650, 0x58b868], bloom = [0xff7eb6, 0xffd23a, 0xff5a6e, 0xf4f6ff][v];
    const skin = (x, y, z) => { const a = Math.atan2(z - cz, x - cx), ridge = Math.abs(Math.sin(a * 4)) > 0.82; const n = h3(x, y, z, 3); return V(ridge ? c[0] : n > 0.9 ? 0xe8f0b0 : c[1 + ((x + z) & 1)]); };
    p.disc(cx, cz, -1, 19, 3, skin); p.blob(cx, 18, cz, 3, 2.4, 3, skin);
    const arm = (dir, y0, out, up) => {
      for (let i = 0; i < out; i++) p.disc(cx + dir * (3 + i), cz, y0, 3, 1.5, skin);
      for (let j = 0; j < up; j++) p.disc(cx + dir * (3 + out - 1), cz, y0 + j, 1, 1.6, skin);
      p.blob(cx + dir * (3 + out - 1), y0 + up, cz, 1.6, 1.4, 1.6, skin);
    };
    if (v !== 3) { arm(-1, 9 + (v & 1), 5, 7); arm(1, 12, 5, 4 + (v >> 1)); } else arm(1, 10, 6, 6);
    if (v !== 2) { p.set(cx, 21, cz, V(bloom)); p.set(cx + 1, 21, cz, V(bloom)); p.set(cx, 21, cz + 1, V(bloom)); p.set(cx, 22, cz, V(shade(bloom, 1.1))); }
    return p;
  },
  rubble: { w: 14, d: 14, h: 3, kind: 'chunks', cols: [0x3f9650, 0x4fa85a, 0x2f7a42], n: 18 },
};

const BONE = [0xf0e8d0, 0xd8cfb4, 0xb8ae94];
const bones = {
  variants: 4, indestructible: true, pal: [0xf0e8d0, 0xd8cfb4, 0xb8ae94],
  build(v, rng) {
    const p = new Pen(23, 8, 17, 0), cz = p.cz;
    const bone = (x, y, z) => V(BONE[(x + y * 2 + z) % 3 === 0 ? 1 : 0]);
    if (v !== 3) {
      for (let x = 2; x < 16; x++) p.set(x, 0, cz, bone(x, 0, 0));          // spine
      for (let i = 0; i < 5; i++) { const x = 4 + i * 2.6; for (const sg of [-1, 1]) for (let k = 1; k <= 5; k++) { const y = Math.round(Math.sin((k / 5) * Math.PI * 0.8) * 4); p.set(x, y, cz + sg * k, bone(Math.round(x), y, k)); } }
    }
    if (v === 0 || v === 1 || v === 3) { p.box(16, 0, cz - 4, 4, 3, 4, V(BONE[0])); p.box(17, 1, cz - 4, 1, 1, 1, V(0x2a2420)); p.box(19, 1, cz - 4, 1, 1, 1, V(0x2a2420)); p.box(20, 0, cz - 3, 2, 1, 2, V(BONE[1])); }
    for (let x = 3; x < 12; x++) p.set(x, 0, cz + 6 + (x > 9 ? 1 : 0), bone(x, 0, 6));    // femur
    p.box(2, 0, cz + 6, 2, 2, 2, V(BONE[0])); p.box(11, 0, cz + 6, 2, 2, 2, V(BONE[0]));
    if (v === 2) { for (let i = 0; i < 6; i++) p.box(rng.int(2, 18), 0, rng.int(2, 14), 2, 1, 1, V(BONE[i % 3])); }
    if (v === 1) { p.box(15, 3, cz - 4, 1, 3, 1, V(BONE[0])); p.box(19, 3, cz - 4, 1, 3, 1, V(BONE[0])); p.box(14, 5, cz - 4, 1, 1, 1, V(BONE[1])); p.box(20, 5, cz - 4, 1, 1, 1, V(BONE[1])); p.box(13, 0, cz - 2, 2, 1, 5, V(BONE[1])); }   // horned skull and a shoulder blade
    return p;
  },
};

const SKULL_EYE = 0x2a2420;
const skull_pile = {
  variants: 4, indestructible: true, pal: [0xf0e8d0, 0xd8cfb4, 0xb8ae94, 0x2a2420],
  build(v, rng) {
    const p = new Pen(19, 11, 19, 0);
    const skull = (x, y, z, face, glow) => {
      p.box(x, y, z, 4, 4, 4, V(BONE[(x + z) % 3 === 0 ? 1 : 0]));
      p.box(x + 1, y, z + (face > 0 ? 3 : 0), 2, 1, 1, V(BONE[2]));                      // jaw ridge
      const fz = face > 0 ? z + 3 : z;
      p.set(x, y + 2, fz, V(SKULL_EYE)); p.set(x + 3, y + 2, fz, V(SKULL_EYE));
      if (glow) { p.set(x, y + 2, fz, G(0xff4020)); p.set(x + 3, y + 2, fz, G(0xff4020)); }
    };
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) skull(1 + i * 4 + (j & 1), 0, 1 + j * 4, rng.next() < 0.5 ? 1 : -1, false);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) skull(3 + i * 4, 3, 3 + j * 4, rng.next() < 0.5 ? 1 : -1, false);
    skull(7, 6, 7, 1, v === 1 || v === 3); skull(11, 6, 9, -1, false);
    return p;
  },
};

const log = {
  variants: 4, pal: [0x8b5a2b, 0x6b4426, 0xa8703a, 0xd9a86a],
  build(v, rng) {
    const p = new Pen(15, 12, 11, 0), cy = 4.5, cz = p.cz;
    const bark = barkFn([0x5a3a20, 0x7a4f28, 0x946236], 71 + v);
    const col = (x, y, z) => (x < 1 || x > 12) ? V((Math.hypot(y - cy, z - cz) | 0) % 2 ? 0xc99a64 : 0xd9a86a) : bark(x, y, z);
    p.tube('x', cy, cz, 1, 13, 4.5, col);
    p.set(1, Math.round(cy), Math.round(cz), V(0x8b5a2b));
    p.blob(6, 9, cz, 1.6, 1.2, 1.4, bark);                      // knot stub
    if (v === 1) { for (let i = 0; i < 3; i++) { const x = 4 + i * 3, y = 9; p.box(x, y, cz + (i % 2), 1, 2, 1, V(0xf4f0e0)); p.box(x - 1, y + 2, cz + (i % 2) - 1, 3, 1, 3, V(0xe84a3a)); p.set(x, y + 3, cz + (i % 2), V(0xf4f0e0)); } }
    if (v === 2) for (let x = 2; x < 13; x++) for (let z = 0; z < 11; z++) for (let y = 11; y >= 0; y--) if (p.get(x, y, z)) { if (h3(x, 0, z, 8) > 0.55) p.set(x, y, z, V(0x5f9a4a)); break; }
    if (v === 3) { p.box(7, 7, cz - 1, 1, 7, 1, V(0x8b5a2b)); p.box(6, 12, cz - 1, 3, 2, 1, V(0xcfd3d8)); p.box(8, 12, cz - 1, 1, 2, 1, V(0x9a9ea6)); }
    return p;
  },
  rubble: { w: 14, d: 10, h: 3, kind: 'planks', cols: [0x7a4f28, 0xa8703a, 0xd9a86a], n: 20 },
};

export const MODELS = {
  tree_oak, tree_olive, tree_cypress, tree_pine, tree_dead, palm: tree_palm, bush, rock_small, rock_big, wheat, reeds, cactus, bones, skull_pile, log,
};
export const BUILDERS = Object.fromEntries(Object.entries(MODELS).map(([k, s]) => [k, makeBuilder(k, s)]));
