// Architecture props: marble columns, ruins, stone walls, towers, gates, the temple. Stone is laid in courses with mortar lines;
// marble gets fluting and blue veins; everything has a buried foundation skirt so it never floats on terraced ground.
// Long things run along local X (walls, gates), fronts face +Z.

import { Pen, V, G, shade, mixRGB, h3, makeBuilder, chip, cracks, darken, prune, rubblePile } from './kit.js';

const TAU = Math.PI * 2;

/** Stone laid in courses: horizontal mortar every `ch` voxels, vertical joints every `bw` (offset per course), 3 block tones. */
function masonry(tones, mortar, ch = 4, bw = 8, seed = 1) {
  return (x, y, z) => {
    const row = Math.floor(y / ch), off = (row & 1) * (bw >> 1), u = x + z + off, blk = Math.floor(u / bw);
    if (y % ch === ch - 1 || ((u % bw + bw) % bw) === 0) return V(mortar);
    const n = h3(blk, row, 0, seed);
    return V(tones[n < 0.33 ? 0 : n < 0.7 ? 1 : 2]);
  };
}
/** Replace the colour of every voxel with air above it (walkways, ledges) using fn(x,y,z,old). */
function capTop(pen, fn, minY = 0) {
  for (let y = pen.sy - 1; y >= pen.ground + minY; y--) for (let z = 0; z < pen.sz; z++) for (let x = 0; x < pen.sx; x++) {
    const i = pen.idx(x, y, z), v = pen.d[i];
    if (v && !((v >>> 24) & 4) && !pen.get(x, y - pen.ground + 1, z)) pen.d[i] = fn(x, y - pen.ground, z, v) >>> 0;
  }
}
/** Marble: three tones (white, cool white, blue shadow) with soft veins. */
function marble(tones, vein, seed = 1) {
  return (x, y, z) => {
    const n = h3(x >> 1, y >> 1, z >> 1, seed), vn = h3(x, y >> 2, z, seed + 7);
    if (vn > 0.955) return V(vein);
    return V(n < 0.45 ? tones[0] : n < 0.8 ? tones[1] : tones[2]);
  };
}
const MARBLES = [
  { t: [0xf4f6fb, 0xe6ecf6, 0xd0dcf0], vein: 0xb4c4e0, trim: 0xffc93c },
  { t: [0xf7f4ec, 0xeae6d8, 0xd8d2c0], vein: 0xc8bfa4, trim: 0xffc93c },
  { t: [0xf2e6d4, 0xe6d6bc, 0xd6c2a4], vein: 0xc4a888, trim: 0xd9453a },
  { t: [0xe0eaff, 0xcddcfa, 0xb4c6ee], vein: 0x8fa8d8, trim: 0xffc93c },
];

/** Fluted marble column with plinth, entasis, echinus + abacus capital. Returns the y of the top. */
function column(p, cx, cz, y0, shaftTop, o = {}) {
  const m = o.m || MARBLES[0], mf = marble(m.t, m.vein, o.seed || 3), r = o.r || 4, plinth = o.plinth !== false;
  let y = y0;
  if (plinth) {
    p.box(cx - 6, y, cz - 6, 13, 3, 13, mf); p.box(cx - 5, y + 3, cz - 5, 11, 1, 11, mf); y += 4;
    p.box(cx - 6, y0 + 2, cz - 6, 13, 1, 13, V(shade(m.t[1], 0.9)));
  }
  const len = shaftTop - y;
  for (let j = 0; j < len; j++) {
    const ry = r + 0.35 - 0.55 * (j / Math.max(1, len));
    for (let z = Math.floor(cz - r - 2); z <= Math.ceil(cz + r + 2); z++) for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz), th = Math.atan2(dz, dx), flute = Math.cos(12 * th) > 0.5 ? 0.9 : 0;
      if (d > ry - flute) continue;
      p.set(x, y + j, z, flute === 0 && d > ry - 1.2 && Math.cos(12 * th) > 0.15 ? V(shade(m.t[0], 0.96)) : mf(x, y + j, z));
    }
  }
  y = shaftTop;
  for (let j = 0; j < 3; j++) p.disc(cx, cz, y + j, 1, r + 0.4 + 1.4 * Math.pow(j / 2, 0.8), (xx, yy, zz) => V(m.trim && j === 0 && o.gold ? m.trim : m.t[0]));
  p.box(cx - 5, y + 3, cz - 5, 11, 2, 11, mf);
  if (o.gold) p.box(cx - 5, y + 3, cz - 5, 11, 1, 11, V(m.trim));
  for (const sg of [-1, 1]) p.box(cx + sg * 5 - (sg > 0 ? 0 : 1), y, cz - 1, 2, 3, 3, V(m.t[1]));         // volutes
  return y + 5;
}

// ------------------------------------------------------------------ columns
const column_marble = {
  variants: 4, pal: [0xf4f6fb, 0xe6ecf6, 0xd0dcf0, 0xb4c4e0, 0xffc93c],
  build(v) {
    const p = new Pen(13, 62, 13, 3);
    column(p, p.cx, p.cz, 0, 53, { m: MARBLES[v], gold: v === 1 || v === 3, seed: 3 + v });
    return p;
  },
  damage(p, rng, v) {
    // a clean diagonal break across the upper shaft plus the usual chips
    const cx = p.cx, cz = p.cz, hb = 36 + rng.int(-4, 6), a = rng.range(0, TAU), dx = Math.cos(a), dz = Math.sin(a);
    for (let y = hb; y < 62; y++) for (let z = 0; z < 13; z++) for (let x = 0; x < 13; x++) if (((x - cx) * dx + (z - cz) * dz) * 1.2 + (y - hb) > 7) p.set(x, y, z, 0);
    chip(p, rng, { bites: 12, rmin: 1.2, rmax: 2.6, bias: 0.8 }); cracks(p, rng, { n: 4, len: 22 }); darken(p, rng, 0.15, 0.82); prune(p, 6);
  },
  rubble: (v) => ({ w: 14, d: 14, h: 6, kind: 'chunks', cols: MARBLES[v].t, n: 30 }),
  afterRubble(p, rng, v) {
    const m = MARBLES[v], mf = marble(m.t, m.vein, 4);
    p.box(Math.round(p.cx) - 6, 0, Math.round(p.cz) - 6, 13, 3, 13, mf);
    p.tube('x', 6, Math.round(p.cz) + 1, Math.round(p.cx) - 4, 9, 3, mf);
  },
};

const column_broken = {
  variants: 4, pal: [0xe6ecf6, 0xd0dcf0, 0xf4f6fb, 0xb4c4e0],
  build(v, rng) {
    const p = new Pen(15, 28, 15, 3), m = MARBLES[v], mf = marble(m.t, m.vein, 11 + v), cz = p.cz, sx = 4.5;
    p.box(1, 0, 1, 13, 3, 13, mf); p.box(2, 3, 2, 11, 1, 11, mf);
    const top = 17 + rng.int(0, 4), a = rng.range(0, TAU);
    for (let j = 4; j < top + 6; j++) for (let z = 0; z < 15; z++) for (let x = 0; x < 15; x++) {   // jagged-topped stump
      const dx = x - sx, dz = z - cz, d = Math.hypot(dx, dz), th = Math.atan2(dz, dx), flute = Math.cos(12 * th) > 0.5 ? 0.9 : 0;
      if (d > 3.9 - flute) continue;
      if (j > top + Math.round((dx * Math.cos(a) + dz * Math.sin(a)) * 0.9 + (h3(x, 0, z, 5) - 0.5) * 3)) continue;
      p.set(x, j, z, mf(x, j, z));
    }
    p.tube('z', 10, 6.4, 2, 10, 3.2, mf);                           // a fallen drum rests on the plinth
    p.tube('z', 10, 6.4, 1, 1, 2.4, V(shade(m.t[2], 0.85))); p.tube('z', 10, 6.4, 12, 1, 2.4, V(shade(m.t[2], 0.85)));
    return p;
  },
  rubble: (v) => ({ w: 13, d: 12, h: 5, kind: 'chunks', cols: MARBLES[v].t, n: 26 }),
};

// ------------------------------------------------------------------ walls
const WALL_PAL = [
  { t: [0xcfcabd, 0xbab5a8, 0xa49f93], m: 0x7f7a6f, top: 0xdedacd },
  { t: [0xe6d4a8, 0xd6c28f, 0xc4ae7a], m: 0x9a8a66, top: 0xf0e4c0 },
  { t: [0xbfbfb2, 0xa8aa9a, 0x92968a], m: 0x6f7468, top: 0xcdd0c2 },
  { t: [0xf2eee2, 0xe4decd, 0xd2cbb6], m: 0xb8ac90, top: 0xfaf6ea },
];
const wall_stone = {
  variants: 4, pal: [0xcfcabd, 0xbab5a8, 0xa49f93, 0x7f7a6f],
  build(v, rng) {
    const p = new Pen(20, 46, 12, 4), w = WALL_PAL[v];
    p.box(0, -4, 0, 20, 4, 12, V(0x8a857b));                                                  // buried footing
    p.box(0, 0, 0, 20, 3, 12, V(shade(w.t[2], 0.9)));                                         // plinth course
    p.fill(1, 3, 1, 18, 33, 10, masonry(w.t, w.m, 4, 8, 5 + v));
    p.fill(0, 3, 0, 20, 33, 1, masonry(w.t, w.m, 4, 8, 6 + v)); p.fill(0, 3, 11, 20, 33, 1, masonry(w.t, w.m, 4, 8, 7 + v));
    p.fill(0, 3, 0, 1, 33, 12, masonry(w.t, w.m, 4, 6, 8 + v)); p.fill(19, 3, 0, 1, 33, 12, masonry(w.t, w.m, 4, 6, 9 + v));
    p.fill(0, 36, 0, 20, 2, 12, V(shade(w.t[1], 1.06)));                                       // string course / walkway
    // battlements on both faces, merlon 4 wide, 2 gap
    for (let x = 0; x < 20; x++) {
      if (x % 6 < 4) { p.box(x, 38, 0, 1, 5, 2, V(shade(w.t[x % 2 ? 1 : 0], 1.04))); p.box(x, 38, 10, 1, 5, 2, V(shade(w.t[x % 2 ? 1 : 0], 1.04))); }
    }
    capTop(p, (x, y, z, old) => (y >= 38 && y <= 43) || y === 37 ? V(w.top) : V(shade(w.t[1], 1.1)), 37);
    return p;
  },
  damage(p, rng) {
    chip(p, rng, { bites: 22, rmin: 1.6, rmax: 4, bias: 0.75 }); cracks(p, rng, { n: 5, len: 26 }); darken(p, rng, 0.16, 0.8); prune(p, 6);
  },
  rubble: (v) => ({ w: 19, d: 11, h: 7, kind: 'chunks', cols: WALL_PAL[v].t.concat([WALL_PAL[v].m]), n: 50 }),
};

const ruin_wall = {
  variants: 4, pal: [0xd8c9a8, 0xc8b894, 0xb8a884, 0x5f9a4a],
  build(v, rng) {
    const p = new Pen(21, 34, 9, 3), w = [WALL_PAL[1], WALL_PAL[0], WALL_PAL[3], WALL_PAL[2]][v];
    const ph = rng.range(0, TAU), win = rng.int(6, 11);
    const hf = (x) => { let h = 17 + 8 * Math.sin(x * 0.33 + ph) + 5 * Math.sin(x * 0.9 + ph * 2) + (h3(x, 0, 0, 3) - 0.5) * 5; if (Math.abs(x - win - 2.5) < 4) h = Math.max(h, 24); return Math.max(8, Math.min(31, Math.round(h / 2) * 2)); };
    p.box(0, -3, 0, 21, 3, 9, V(0x8a857b));
    for (let x = 0; x < 21; x++) {
      const h = hf(x);
      for (let z = 1; z < 8; z++) for (let y = 0; y < h; y++) p.set(x, y, z, masonry(w.t, w.m, 4, 7, 21 + v)(x, y, z));
      if (x % 3 !== 1) for (let y = 0; y < Math.min(h, 6); y++) p.set(x, y, 0, V(w.t[1]));
    }
    p.carve(win, 12, 0, 6, 8, 9); p.carve(win + 1, 20, 0, 4, 2, 9);                                      // window with a rounded head
    capTop(p, (x, y, z, old) => V(h3(x, y, z, 2) > (v === 3 ? 0.35 : 0.62) ? 0x5f9a4a : w.top), 6);
    for (let i = 0; i < 4; i++) { const x = rng.int(1, 18), z = rng.int(0, 1) ? 0 : 8; p.box(x, 0, z, 3, 2, 2, V(w.t[i % 3])); }   // fallen blocks
    return p;
  },
  rubble: (v) => ({ w: 18, d: 8, h: 4, kind: 'chunks', cols: [0xd8c9a8, 0xc8b894, 0xb8a884], n: 36 }),
};

// ------------------------------------------------------------------ tower
const TOWER_PAL = [
  { t: [0xcfcabd, 0xbab5a8, 0xa49f93], m: 0x7f7a6f, roof: [0xd9603a, 0xc8502e, 0xe0734a] },
  { t: [0xe6d4a8, 0xd6c28f, 0xc4ae7a], m: 0x9a8a66, roof: [0xd9453a, 0xb8352a, 0xe85a4a] },
  { t: [0xf2eee2, 0xe4decd, 0xd2cbb6], m: 0xb8ac90, roof: [0x3b6cf0, 0x2f58c8, 0x5a8af8] },
  { t: [0xbfbfb2, 0xa8aa9a, 0x92968a], m: 0x6f7468, roof: [0x7a4fb0, 0x633f94, 0x9468c8] },
];
const tower = {
  variants: 4, pal: [0xcfcabd, 0xbab5a8, 0xa49f93, 0xd9603a, 0x6b4426],
  build(v, rng) {
    const p = new Pen(35, 100, 35, 5), cx = p.cx, cz = p.cz, w = TOWER_PAL[v];
    const mas = masonry(w.t, w.m, 4, 8, 31 + v);
    p.box(cx - 16, -5, cz - 16, 33, 5, 33, V(0x8a857b));
    p.box(cx - 16, 0, cz - 16, 33, 4, 33, V(shade(w.t[2], 0.88)));                                  // plinth
    for (let y = 4; y < 62; y++) {
      const hw = Math.round(14 - (y - 4) * 0.035);
      p.fill(cx - hw, y, cz - hw, hw * 2 + 1, 1, hw * 2 + 1, (i, j, k, x, yy, z) => mas(x - cx + 40, yy, z - cz + 40));
    }
    // arrow slits and a few windows, 4 faces
    for (const y of [20, 38, 52]) for (const sg of [-1, 1]) {
      const hw = Math.round(14 - (y - 4) * 0.035);
      p.carve(cx - 1, y, cz + sg * hw - (sg > 0 ? 1 : 0), 2, 7, 2); p.carve(cx + sg * hw - (sg > 0 ? 1 : 0), y, cz - 1, 2, 7, 2);
      p.fill(cx - 1, y, cz + sg * (hw - 2), 2, 7, 1, V(0x1a1410));
    }
    // arched door on +Z
    const hwb = 14;
    p.carve(cx - 4, 4, cz + hwb - 2, 9, 12, 4); p.carve(cx - 3, 16, cz + hwb - 2, 7, 1, 4); p.carve(cx - 2, 17, cz + hwb - 2, 5, 1, 4);
    p.fill(cx - 4, 4, cz + hwb - 3, 9, 12, 1, V(0x6b4426)); p.fill(cx - 4, 4, cz + hwb - 3, 9, 1, 1, V(0x4a4a54));
    p.box(cx, 4, cz + hwb - 3, 1, 12, 1, V(0x1a1410)); p.box(cx + 2, 9, cz + hwb - 3, 1, 1, 1, V(0xffc93c));
    // corbelled balcony
    for (let y = 62; y < 66; y++) { const hw = y < 64 ? 15 : 17; p.fill(cx - hw, y, cz - hw, hw * 2 + 1, 1, hw * 2 + 1, (i, j, k, x, yy, z) => V(yy < 64 ? shade(w.t[2], 0.85) : w.t[0])); }
    // parapet merlons
    for (let i = -17; i <= 17; i++) {
      if (((i + 17) % 6) < 4) for (const [x, z] of [[cx + i, cz - 17], [cx + i, cz + 17], [cx - 17, cz + i], [cx + 17, cz + i]]) p.box(x, 66, z, 1, 5, 1, V(w.t[(i + 17) & 1 ? 1 : 0]));
      for (const [x, z] of [[cx + i, cz - 16], [cx + i, cz + 16], [cx - 16, cz + i], [cx + 16, cz + i]]) p.box(x, 66, z, 1, 1, 1, V(w.t[0]));
    }
    capTop(p, (x, y, z, old) => (y >= 66 && y < 72 ? V(shade(w.t[0], 1.05)) : old), 64);
    // turret + roof
    p.fill(cx - 7, 66, cz - 7, 15, 10, 15, masonry(w.t, w.m, 4, 7, 41 + v)); p.carve(cx - 2, 70, cz + 7, 5, 4, 1); p.fill(cx - 2, 70, cz + 6, 5, 4, 1, V(0x1a1410));
    for (let j = 0; j < 15; j++) {
      const hw = Math.round(10 - j * 0.68);
      p.fill(cx - hw, 76 + j, cz - hw, hw * 2 + 1, 1, hw * 2 + 1, (i, jj, k, x, yy, z) => V(w.roof[(Math.floor((x + z) / 3) + j) % 3]));
    }
    p.box(cx, 91, cz, 1, 8, 1, V(0x6b4426));
    for (let i = 0; i < 6; i++) p.box(cx + 1 + i, 97 - (i >> 1), cz, 1, 2, 1, V(0xd9453a));
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 44, rmin: 1.8, rmax: 4.4, bias: 0.8 }); cracks(p, rng, { n: 6, len: 34 }); darken(p, rng, 0.16, 0.8); prune(p, 6); },
  rubble: (v) => ({ w: 32, d: 32, h: 15, kind: 'chunks', cols: TOWER_PAL[v].t.concat([TOWER_PAL[v].roof[0], 0x6b4426]), n: 120 }),
};

// ------------------------------------------------------------------ gates
const arch_gate = {
  variants: 4, pal: [0xd8c9a8, 0xc8b894, 0xe8dcc0, 0xffc93c],
  build(v, rng) {
    const p = new Pen(100, 70, 16, 4), w = [WALL_PAL[1], WALL_PAL[0], WALL_PAL[3], WALL_PAL[2]][v];
    const mas = masonry(w.t, w.m, 4, 8, 51 + v);
    p.box(0, -4, 0, 100, 4, 16, V(0x8a857b));
    p.fill(2, 0, 2, 96, 58, 12, mas);
    p.fill(0, 0, 0, 100, 4, 16, V(shade(w.t[2], 0.9)));
    // opening: rectangle to y 22 + semicircle radius 30
    const ox = 49.5;
    p.carve(20, 0, 0, 60, 22, 16);
    for (let y = 22; y < 54; y++) { const half = Math.sqrt(Math.max(0, 30 * 30 - (y - 22) * (y - 22))); const x0 = Math.ceil(ox - half), x1 = Math.floor(ox + half - 0.001); if (x1 >= x0) p.carve(x0, y, 0, x1 - x0 + 1, 1, 16); }
    // voussoir ring around the arch in alternating colours + keystone
    for (let y = 22; y < 62; y++) for (let x = 0; x < 100; x++) for (let z of [1, 2, 13, 14]) {
      const d = Math.hypot(x - ox, y - 22);
      if (d > 30 && d < 36.5 && p.get(x, y, z)) { const a = Math.atan2(y - 22, x - ox), seg = Math.floor(a / 0.19); p.set(x, y, z, V(seg & 1 ? 0xf0e4c0 : 0xb89a68)); }
    }
    p.box(46, 55, 0, 7, 8, 3, V(0xffc93c)); p.box(46, 55, 13, 7, 8, 3, V(0xffc93c));
    p.fill(0, 58, 0, 100, 4, 16, (i, j, k, x, y, z) => V(j === 0 ? shade(w.t[2], 0.82) : w.t[0]));          // cornice (overhangs 2 each side)
    for (let x = 0; x < 100; x++) if (x % 8 < 5) p.box(x, 62, 0, 1, 6, 3, V(w.t[x & 1 ? 1 : 0])), p.box(x, 62, 13, 1, 6, 3, V(w.t[x & 1 ? 1 : 0]));
    capTop(p, (x, y, z, old) => (y >= 62 ? V(w.top) : old), 60);
    // pier pilasters and gold plaques
    for (const px of [8, 85]) { p.box(px, 12, 14, 8, 30, 2, V(w.t[0])); p.box(px - 1, 8, 14, 10, 4, 2, V(w.t[2])); p.box(px - 1, 42, 14, 10, 3, 2, V(w.t[2])); p.box(px + 2, 24, 16, 4, 6, 1, V(0xffc93c)); }
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 30, rmin: 1.6, rmax: 4.2, bias: 0.8 }); cracks(p, rng, { n: 5, len: 28 }); darken(p, rng, 0.16, 0.8); prune(p, 6); },
  rubble: (v) => ({ w: 60, d: 14, h: 10, kind: 'chunks', cols: [0xd8c9a8, 0xc8b894, 0xe8dcc0, 0xb89a68], n: 120 }),
};

const DOOR = [[0x8a5a2b, 0x9a6a38, 0x7a4f28], [0x6b4426, 0x7a4f28, 0x5a3a20], [0x3b6cf0, 0x4a7af8, 0x2f58c8], [0x5a4030, 0x6a4c38, 0x4a3224]];
const gate_door = {
  variants: 4, pal: [0x9a6a38, 0x7a4f28, 0x4a4a54, 0xffc93c],
  build(v, rng) {
    const p = new Pen(44, 48, 6, 2), c = DOOR[v], right = (v & 1) === 0;
    p.box(0, -2, 0, 44, 2, 6, V(0x8a857b));
    for (let x = 0; x < 44; x++) for (let y = 0; y < 46; y++) {
      if (y > 40 && (x < 4 - (y - 40) || x > 39 + (y - 40))) continue;                                // chamfered top corners
      const plank = Math.floor(x / 4) & 1;
      for (let z = 0; z < 5; z++) p.set(x, y, z + 1, V(plank ? c[0] : c[1]));
      if (h3(x, y, 0, 3) > 0.9) p.set(x, y, 6, V(c[2]));
    }
    p.box(0, 0, 0, 3, 45, 7, V(c[2])); p.box(41, 0, 0, 3, 45, 7, V(c[2]));                           // frame stiles
    for (const y of [5, 21, 37]) { p.box(0, y, 0, 44, 4, 7, V(IRON)); for (let x = 3; x < 42; x += 6) p.set(x, y + 2, 7, V(0xc8c8d0)); }  // iron straps with rivets
    for (let i = 0; i < 16; i++) p.set(8 + i, 8 + Math.round(i * 0.9), 7, V(c[2]));                  // diagonal brace hint
    const hx = right ? 38 : 5;
    p.blob(hx, 24, 7, 3, 3, 1.4, V(0xffc93c)); p.blob(hx, 24, 7, 1.2, 1.2, 1.6, V(0x6b4426));
    return p;
  },
  damage(p, rng) {
    // burned through: missing planks and scorch marks
    for (let i = 0; i < 5; i++) { const x = rng.int(3, 38), y = rng.int(8, 36); p.box(x, y, 0, rng.int(3, 6), rng.int(5, 10), 7, 0); }
    chip(p, rng, { bites: 14, rmin: 1.5, rmax: 3.2, bias: 0.5 }); darken(p, rng, 0.35, 0.55); cracks(p, rng, { n: 4, len: 18, dark: 0.35 }); prune(p, 26);
  },
  rubble: (v) => ({ w: 40, d: 8, h: 5, kind: 'planks', cols: DOOR[v].concat([0x4a4a54]), n: 60 }),
};
const IRON = 0x3a3a44;

// ------------------------------------------------------------------ temple
const temple = {
  variants: 4, indestructible: true, pal: [0xf4f6fb, 0xe6ecf6, 0xd0dcf0, 0x3b6cf0, 0xd9603a, 0xffc93c],
  build(v, rng) {
    const m = MARBLES[v], mf = marble(m.t, m.vein, 61 + v), p = new Pen(125, 88, 95, 6), cx = p.cx, cz = p.cz;
    const roof = [[0xd9603a, 0xc8502e, 0xe0734a], [0xd9453a, 0xb8352a, 0xe85a4a], [0x3b8fd0, 0x2f78b0, 0x5aa8e8], [0xc8a040, 0xb08a30, 0xe0bc58]][v];
    p.box(0, -6, 0, 125, 6, 95, V(0x8a857b));
    for (let s = 0; s < 3; s++) p.fill(s * 3, s * 3, s * 3, 125 - s * 6, 3, 95 - s * 6, (i, j, k, x, y, z) => (j === 2 ? V(shade(m.t[0], 1.02)) : mf(x, y, z)));
    // peristyle: 8 x 6 columns around the cella
    const xs = [], zs = [];
    for (let i = 0; i < 8; i++) xs.push(Math.round(cx - 47.25 + i * 13.5));
    for (let j = 0; j < 6; j++) zs.push(Math.round(cz - 36 + j * 14.4));
    const spots = [];
    for (const x of xs) { spots.push([x, zs[0]], [x, zs[5]]); }
    for (let j = 1; j < 5; j++) { spots.push([xs[0], zs[j]], [xs[7], zs[j]]); }
    // cella first (so columns overlap it cleanly)
    p.fill(cx - 34, 9, cz - 26, 69, 49, 53, (i, j, k, x, y, z) => (j < 2 ? V(shade(m.t[2], 0.92)) : mf(x, y, z)));
    p.carve(cx - 8, 9, cz + 22, 17, 35, 5);
    p.fill(cx - 8, 9, cz + 21, 17, 35, 1, V(0x1a1410));
    for (const sx of [-1, 1]) { p.fill(sx > 0 ? cx + 1 : cx - 8, 9, cz + 24, 8, 32, 2, (i, j, k) => V(((i >> 2) + (j >> 3)) & 1 ? 0xffc93c : 0xe8a820)); p.blob(cx + sx * 3, 24, cz + 26.5, 1.4, 1.4, 1, V(0xfff0a0)); }
    p.fill(cx - 10, 44, cz + 21, 21, 3, 7, V(m.trim)); p.fill(cx - 9, 47, cz + 21, 19, 2, 6, mf);                               // lintel + cornice over the door
    for (const [x, z] of spots) column(p, x, z, 9, 53, { m, plinth: false, r: 4.2, seed: 70 + v, gold: false });
    // architrave, frieze (blue metopes + white triglyphs), cornice
    p.fill(cx - 52, 58, cz - 41, 105, 5, 83, (i, j, k, x, y, z) => (j === 0 ? V(shade(m.t[1], 0.9)) : mf(x, y, z)));
    p.fill(cx - 52, 63, cz - 41, 105, 5, 83, (i, j, k, x, y, z) => {
      const edge = i < 2 || i > 102 || k < 2 || k > 80;
      if (!edge) return mf(x, y, z);
      const u = i < 2 || i > 102 ? k : i, seg = Math.floor(u / 6) & 1;
      return V(seg ? m.t[0] : (j === 2 && (u % 6) === 3 ? 0xffc93c : 0x3b6cf0));
    });
    p.fill(cx - 54, 68, cz - 43, 109, 3, 87, (i, j, k, x, y, z) => (j === 0 ? V(m.trim) : mf(x, y, z)));
    // gable roof (prism along z) with terracotta tiles; pediment faces front and back
    for (let j = 0; j < 14; j++) {
      const hw = Math.round(54 * (1 - j / 14));
      for (let k = 0; k < 87; k++) for (let i = -hw; i <= hw; i++) {
        const x = cx + i, z = cz - 43 + k, y = 71 + j, face = k < 2 || k > 84, slope = Math.abs(i) > hw - 2;
        let col;
        if (face) col = Math.abs(i) > hw - 3 ? m.t[0] : (j > 9 && Math.abs(i) < 3 ? 0xffc93c : 0x3b6cf0);
        else col = j === 13 ? 0xffc93c : slope ? roof[(Math.floor(z / 3)) % 3] : roof[1];
        p.set(x, y, z, V(col));
      }
    }
    for (const sz of [-1, 1]) {                                                      // golden sun and figures in the tympanum
      const zz = sz > 0 ? cz + 43 : cz - 43;
      p.blob(cx, 76, zz + (sz > 0 ? -1 : 1), 5, 5, 1.2, V(0xffc93c)); p.blob(cx, 76, zz + (sz > 0 ? -1 : 1), 2.4, 2.4, 1.6, V(0xfff0a0));
      for (const fx of [-24, -14, 14, 24]) p.box(cx + fx, 71, zz + (sz > 0 ? -2 : 1), 3, 5 + (Math.abs(fx) < 20 ? 2 : 0), 1, V(0xf4f6fb));
    }
    for (const [x, z] of [[cx, cz + 43], [cx, cz - 43], [cx - 53, cz + 43], [cx + 53, cz + 43], [cx - 53, cz - 43], [cx + 53, cz - 43]]) p.blob(x, 85, z, 2, 2.4, 2, V(0xffc93c));
    return p;
  },
};

export const MODELS = { column_marble, column_broken, ruin_wall, wall_stone, tower, arch_gate, gate_door, temple };
export const BUILDERS = Object.fromEntries(Object.entries(MODELS).map(([k, s]) => [k, makeBuilder(k, s)]));
