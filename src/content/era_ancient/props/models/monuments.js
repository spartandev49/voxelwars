// Monuments and landmarks: pyramid, obelisk, sphinx, throne, lion and Zeus statues, cave mouth, cloud island.
// All indestructible except the lion statue (400 hp); every landmark faces +Z.

import { Pen, V, G, shade, mixRGB, h3, makeBuilder, chip, cracks, darken, prune } from './kit.js';

const TAU = Math.PI * 2;
const GOLD = [0xe8a820, 0xffc93c, 0xfff0a0];

/** Sandstone laid in courses (shared with the pyramid): horizontal joints every ch voxels, vertical every bw. */
function courses(tones, mortar, ch, bw, seed) {
  return (x, y, z) => {
    const row = Math.floor(y / ch), off = (row & 1) * (bw >> 1), u = x + z + off, blk = Math.floor(u / bw);
    if (y % ch === ch - 1 || ((u % bw + bw) % bw) === 0) return V(mortar);
    const n = h3(blk, row, 0, seed);
    return V(tones[n < 0.3 ? 0 : n < 0.72 ? 1 : 2]);
  };
}

// ------------------------------------------------------------------ pyramid
const PYR = [
  { t: [0xe6c27a, 0xd9b36a, 0xc9a45c], m: 0xa88848, top: 0xf2dc98 },
  { t: [0xf4e8c8, 0xe8d8b0, 0xd8c498], m: 0xb8a578, top: 0xfaf0d8 },
  { t: [0xdc9a6a, 0xcc8a5a, 0xb87a4c], m: 0x946038, top: 0xeab088 },
  { t: [0xd4a868, 0xc49858, 0xb08848], m: 0x866838, top: 0xe4c088 },
];
const pyramid = {
  variants: 4, indestructible: true, pal: [0xe6c27a, 0xd9b36a, 0xc9a45c, 0xffc93c],
  build(v) {
    const W = 141, p = new Pen(W, 120, W, 8), cx = p.cx, cz = p.cz, c0 = PYR[v], mas = courses(c0.t, c0.m, 5, 14, 81 + v);
    p.box(0, -8, 0, W, 8, W, V(shade(c0.t[2], 0.85)));
    for (let c = 0; c < 22; c++) {
      const half = 70 - c * 3, w = half * 2 + 1, y0 = c * 5, x0 = cx - half, z0 = cz - half;
      p.box(x0, y0, z0, w, 5, w, V(c0.t[c % 3]));                                         // solid core, constant colour (fast)
      for (let k = 0; k < w; k++) for (let i = 0; i < w; i++) {                                // painted outer shell, 3 voxels deep
        if (Math.min(i, k, w - 1 - i, w - 1 - k) >= 3) continue;
        for (let j = 0; j < 5; j++) {
          const yy = y0 + j, top = j === 4 && Math.min(i, k, w - 1 - i, w - 1 - k) < 3;
          p.set(x0 + i, yy, z0 + k, j === 4 && Math.min(i, k, w - 1 - i, w - 1 - k) >= 1 ? V(c0.top) : mas(x0 + i, yy, z0 + k));
        }
      }
    }
    // golden pyramidion
    for (let j = 0; j < 10; j++) { const half = Math.max(0, 6 - Math.round(j * 0.62)); p.box(cx - half, 110 + j, cz - half, half * 2 + 1, 1, half * 2 + 1, V(GOLD[j > 6 ? 2 : j > 2 ? 1 : 0])); }
    p.set(cx, 120, cz, V(GOLD[2]));
    // dark entrance with a lintel, framed by two pilasters
    p.carve(cx - 5, 0, cz + 52, 11, 14, 22);
    p.fill(cx - 5, 0, cz + 52, 11, 14, 1, V(0x120d0a)); p.fill(cx - 5, 0, cz + 53, 11, 1, 22, V(0x2a2018));
    p.box(cx - 7, 14, cz + 50, 15, 3, 3, V(c0.top)); p.box(cx - 7, 0, cz + 50, 2, 14, 3, V(c0.t[1])); p.box(cx + 6, 0, cz + 50, 2, 14, 3, V(c0.t[1]));
    for (let i = 0; i < 7; i++) p.box(cx - 3 + i, 17, cz + 51, 1, 1, 1, V(i % 2 ? 0x3aa8b8 : 0xffc93c));
    return p;
  },
};

// ------------------------------------------------------------------ obelisk
const OBE = [
  { t: [0xe0c080, 0xd4b070, 0xc8a460], g: 0x6a4a2a, cap: 0xffc93c },
  { t: [0xb55a45, 0xa04e3c, 0x8a4232], g: 0xffd88a, cap: 0xffc93c },
  { t: [0x3a3a42, 0x2e2e36, 0x26262e], g: 0xffc93c, cap: 0xffc93c },
  { t: [0xf0e8d0, 0xe0d6bc, 0xd0c4a8], g: 0x3a8fb7, cap: 0xffc93c },
];
const obelisk = {
  variants: 4, indestructible: true, pal: [0xe0c080, 0xd4b070, 0x6a4a2a, 0xffc93c],
  build(v) {
    const p = new Pen(15, 76, 15, 3), cx = Math.round(p.cx), cz = Math.round(p.cz), o = OBE[v];
    const tone = (x, y, z) => V(o.t[(h3(x >> 1, y >> 2, z >> 1, 91 + v) * 3) | 0]);
    p.box(0, -3, 0, 15, 3, 15, V(0x7a756a));
    p.box(0, 0, 0, 15, 3, 15, V(shade(o.t[2], 0.9))); p.box(1, 3, 1, 13, 2, 13, tone);
    p.box(2, 5, 2, 11, 5, 11, tone);
    for (let y = 10; y < 66; y++) { const half = Math.round(4.5 - (y - 10) * 0.0145); p.fill(cx - half, y, cz - half, half * 2 + 1, 1, half * 2 + 1, tone); }
    for (let j = 0; j < 8; j++) { const half = Math.max(0, 3 - Math.floor(j * 0.45)); p.box(cx - half, 66 + j, cz - half, half * 2 + 1, 1, half * 2 + 1, V(GOLD[j > 5 ? 2 : j > 2 ? 1 : 0])); }
    // hieroglyph dots and dashes down all four faces
    for (let y = 13; y < 64; y++) {
      if (y % 6 > 3) continue;
      const half = Math.round(4.5 - (y - 10) * 0.0145);
      for (let u = -2; u <= 2; u++) {
        if (h3(u, y >> 1, 3, 7 + v) < 0.45) continue;
        const col = V(h3(u, y, 1, 3) > 0.7 ? 0x3aa8b8 : o.g);
        p.set(cx + u, y, cz + half, col); p.set(cx + u, y, cz - half, col); p.set(cx + half, y, cz + u, col); p.set(cx - half, y, cz + u, col);
      }
    }
    return p;
  },
};

// ------------------------------------------------------------------ sphinx
const sphinx_statue = {
  variants: 4, indestructible: true, pal: [0xe3c27a, 0xd4a85c, 0xc4944a, 0xffc93c, 0x3b6cf0],
  build(v, rng) {
    const p = new Pen(33, 62, 71, 4), cx = Math.round(p.cx);
    const tones = [[0xc4944a, 0xd4a85c, 0xe3c27a], [0xd8c8a0, 0xe6d8b4, 0xf2e8cc], [0xc07a54, 0xd0906a, 0xe0a882], [0xa8a8b0, 0xbcbcc4, 0xd0d0d8]][v];
    const body = (x, y, z, nx, ny) => { const n = h3(x, y >> 1, z >> 1, 71); const t = ny * 0.5 + (n - 0.5) * 0.5; return V(t > 0.3 ? tones[2] : t > -0.25 ? tones[1] : tones[0]); };
    const stripe = (y) => V((y >> 1) & 1 ? 0x3b6cf0 : 0xffc93c);
    p.box(0, -4, 2, 33, 4, 67, V(0x8a7a5a)); p.box(0, 0, 2, 33, 3, 67, V(shade(tones[1], 0.92)));
    p.blob(cx, 11, 20, 10, 8, 17, body); p.blob(cx, 12, 34, 9, 9, 14, body);                 // back and chest
    for (const sg of [-1, 1]) p.blob(cx + sg * 7, 9, 13, 5, 6, 7, body);                       // haunches
    p.blob(cx, 20, 39, 8, 12, 7, body);                                                       // raised chest
    for (const sg of [-1, 1]) {                                                               // forelegs and paws
      p.box(cx + sg * 6 - 3, 3, 40, 6, 8, 25, body);
      for (let t = 0; t < 4; t++) p.box(cx + sg * 6 - 3 + t * 1 + (sg > 0 ? 0 : 0), 3, 62, 1, 3, 3, V(shade(tones[1], 0.7)));
      p.box(cx + sg * 6 - 3, 3, 60, 6, 4, 1, V(shade(tones[1], 0.8)));
    }
    p.line(cx - 9, 6, 6, cx - 13, 15, 12, body, 3);                                           // tail curling up the flank
    // head: nemes headdress, face, beard, uraeus
    p.box(cx - 8, 30, 40, 17, 16, 10, (x, y) => stripe(y));
    p.box(cx - 5, 30, 44, 11, 15, 8, V(tones[2]));                                           // face block
    for (const sg of [-1, 1]) p.box(cx + sg * 8 - (sg > 0 ? 0 : 1), 24, 43, 2, 22, 7, (x, y) => stripe(y));   // side lappets down to the shoulders
    p.box(cx - 7, 46, 41, 15, 5, 9, V(0xffc93c)); p.box(cx - 6, 51, 42, 13, 1, 7, V(0xe8a820));
    p.box(cx - 1, 49, 50, 3, 4, 2, V(0xffc93c)); p.box(cx, 52, 50, 1, 2, 2, V(0xd9453a));        // cobra
    p.box(cx - 4, 38, 52, 3, 2, 1, V(0x222222)); p.box(cx + 2, 38, 52, 3, 2, 1, V(0x222222));    // eyes
    p.box(cx - 5, 40, 52, 4, 1, 1, V(0x3a3a44)); p.box(cx + 2, 40, 52, 4, 1, 1, V(0x3a3a44));    // brows
    p.box(cx - 1, 33, 52, 3, 6, 2, V(tones[2])); p.box(cx - 3, 31, 52, 7, 1, 1, V(shade(tones[0], 0.7)));  // nose, mouth
    p.box(cx - 1, 22, 49, 3, 9, 4, (x, y) => stripe(y + 1));                                   // ceremonial beard
    return p;
  },
};

// ------------------------------------------------------------------ throne
const throne = {
  variants: 4, indestructible: true, pal: [0xe8a820, 0xffc93c, 0xfff0a0, 0xc72b4b, 0xf3f1ea],
  build(v) {
    const p = new Pen(21, 36, 21, 2), cx = Math.round(p.cx);
    const gold = (x, y, z) => V(GOLD[Math.floor(h3(x, y >> 1, z, 5) * 3)]);
    const cush = [0xc72b4b, 0x3b6cf0, 0x7a4fb0, 0x2f9a5a][v];
    p.box(0, -2, 0, 21, 2, 21, V(0x8a857b));
    p.fill(0, 0, 0, 21, 2, 21, (i, j, k, x, y, z) => V(h3(x, y, z, 4) > 0.5 ? 0xf3f1ea : 0xe4e8f0));
    p.fill(1, 2, 1, 19, 2, 19, (i, j, k, x, y, z) => V(j === 1 ? 0xffffff : 0xe4e8f0));
    p.box(8, 4, 8, 5, 1, 12, V(cush));                                                         // carpet down the steps
    for (let i = 0; i < 12; i++) p.box(8, 4, 8 + i, 1, 1, 1, V(i % 2 ? 0xffc93c : cush));
    p.box(5, 4, 4, 11, 8, 10, gold);                                                           // seat block
    p.box(6, 12, 5, 9, 2, 8, V(cush));                                                         // cushion
    p.box(5, 4, 3, 11, 26, 3, gold);                                                           // high back
    p.blob(cx, 30, 4, 6.5, 4.2, 1.6, gold);
    p.blob(cx, 25, 6.5, 3, 3, 1, V(GOLD[2])); p.blob(cx, 25, 7, 1.4, 1.4, 1, V(0xe8a820));
    for (const sg of [-1, 1]) {
      p.box(cx + sg * 6.5 - 1, 8, 5, 3, 7, 10, gold);                                          // armrests
      p.blob(cx + sg * 6.5, 14, 14.5, 2.2, 2.2, 2.2, V(GOLD[2]));                              // lion-head knobs
      p.blob(cx + sg * 6.5, 14, 15.5, 1.1, 1.1, 1.1, V(0xe8a820));
      p.blob(cx + sg * 5.5, 33, 4, 1.8, 1.8, 1.8, V(GOLD[2]));
    }
    const gem = [[cx, 18, 6, 0xff3a5a], [cx - 4, 22, 6, 0x3ad8d0], [cx + 4, 22, 6, 0x3ad8d0], [cx, 28, 6, 0xff3a5a]];
    for (const [x, y, z, c] of gem) p.box(x, y, z, 2, 2, 1, G(c));
    return p;
  },
};

// ------------------------------------------------------------------ lion statue (400 hp)
const LIONS = [
  { t: [0xa8a090, 0xc4baa6, 0xded6c2], mane: [0x8a8070, 0xa09684], eye: 0x3a3a44, plinth: 0xcfc6b4 },
  { t: [0xe8a820, 0xffc93c, 0xfff0a0], mane: [0xc88a10, 0xe8a820], eye: 0x7a1a1a, plinth: 0xf3f1ea },
  { t: [0xdce4f2, 0xeef2fa, 0xffffff], mane: [0xc4d0e8, 0xdce4f2], eye: 0x3b6cf0, plinth: 0xf3f1ea },
  { t: [0x3a8a70, 0x4faa8a, 0x6ac8a4], mane: [0x2a6a58, 0x3a8a70], eye: 0xffc93c, plinth: 0x8a857b },
];
const statue_lion = {
  variants: 4, pal: [0xc4baa6, 0xa8a090, 0xded6c2, 0xcfc6b4],
  build(v) {
    const p = new Pen(21, 36, 21, 3), cx = Math.round(p.cx), cz = Math.round(p.cz), L = LIONS[v];
    const body = (x, y, z, nx, ny) => { const n = h3(x, y >> 1, z >> 1, 55); const t = ny * 0.5 + (n - 0.5) * 0.4; return V(t > 0.25 ? L.t[2] : t > -0.3 ? L.t[1] : L.t[0]); };
    const mane = (x, y, z, nx, ny) => V(h3(x, y, z, 6) > 0.55 ? L.mane[0] : L.mane[1]);
    p.box(0, -3, 0, 21, 3, 21, V(0x7a756a));
    p.fill(1, 0, 1, 19, 5, 19, (i, j, k, x, y, z) => (j === 4 || i === 0 || k === 0 || i === 18 || k === 18 ? V(shade(L.plinth, 0.9)) : V(L.plinth)));
    p.blob(cx, 10, cz - 3, 6.5, 5.5, 5.5, body);                                              // haunches
    p.blob(cx, 17, cz, 5, 9, 5, body);                                                         // chest
    for (const sg of [-1, 1]) { p.box(cx + sg * 3 - 1, 5, cz + 2, 3, 9, 3, body); p.box(cx + sg * 3 - 1, 5, cz + 5, 3, 2, 2, body); }
    p.blob(cx, 25, cz + 1, 7.4, 7, 6.4, mane);                                                 // mane
    p.box(cx - 3, 22, cz + 4, 7, 6, 4, V(L.t[2])); p.box(cx - 2, 22, cz + 8, 5, 4, 1, V(L.t[2])); p.box(cx - 1, 25, cz + 8, 3, 1, 1, V(0x2a2a30));
    p.box(cx - 3, 27, cz + 8, 2, 1, 1, V(L.eye)); p.box(cx + 2, 27, cz + 8, 2, 1, 1, V(L.eye));
    for (const sg of [-1, 1]) p.blob(cx + sg * 5, 31, cz, 1.8, 1.8, 1.4, body);              // ears
    p.line(cx + 5, 6, cz - 6, cx + 8, 13, cz - 8, body, 3); p.blob(cx + 8, 15, cz - 8, 2, 2.4, 2, mane);   // tail with a tuft
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 16, rmin: 1.4, rmax: 3, bias: 0.8 }); cracks(p, rng, { n: 4, len: 22 }); darken(p, rng, 0.16, 0.8); prune(p, 26); },
  rubble: (v) => ({ w: 18, d: 18, h: 5, kind: 'chunks', cols: [LIONS[v].t[0], LIONS[v].t[1], LIONS[v].plinth], n: 40 }),
};

// ------------------------------------------------------------------ statue of Zeus
const statue_zeus = {
  variants: 1, indestructible: true, pal: [0xf4f6fb, 0xe6ecf6, 0x3b6cf0, 0xffc93c, 0xfff27a],
  build(v, rng) {
    const p = new Pen(41, 126, 41, 4), cx = Math.round(p.cx), cz = Math.round(p.cz);
    const mr = (x, y, z) => { const n = h3(x >> 1, y >> 1, z >> 1, 17), vn = h3(x, y >> 2, z, 18); return V(vn > 0.96 ? 0xb4c4e0 : n < 0.45 ? 0xf4f6fb : n < 0.8 ? 0xe6ecf6 : 0xd0dcf0); };
    const blue = (x, y, z) => V(h3(x, y >> 1, z, 3) > 0.7 ? 0x4a7af8 : 0x3b6cf0), gold = V(0xffc93c);
    p.box(0, -4, 0, 41, 4, 41, V(0x8a857b));
    p.box(0, 0, 0, 41, 4, 41, mr); p.box(2, 4, 2, 37, 4, 37, mr); p.box(5, 8, 5, 31, 14, 31, mr); p.box(4, 22, 4, 33, 2, 33, mr);
    p.box(5, 21, 5, 31, 1, 31, gold);
    p.box(12, 11, 36, 17, 8, 1, blue);                                                         // lapis panel with a golden bolt on the plinth
    p.line(21, 18, 37, 18, 14, 37, gold, 2); p.line(18, 14, 37, 23, 14, 37, gold, 2); p.line(23, 14, 37, 20, 11, 37, gold, 2);
    // robe skirt, folds
    for (let y = 24; y < 50; y++) { const w = Math.round(22 - (y - 24) * 0.2), d = Math.round(14 - (y - 24) * 0.08); p.fill(cx - (w >> 1), y, cz - (d >> 1), w, 1, d, (i, j, k, x) => V(((x + (y >> 3)) % 4 === 0) ? 0xd0dcf0 : (h3(x, y, 0, 2) > 0.9 ? 0xe6ecf6 : 0xf4f6fb))); }
    p.box(cx - 10, 47, cz - 7, 21, 3, 15, blue); p.box(cx - 10, 49, cz - 7, 21, 1, 15, gold);   // sash
    // torso with shoulders
    for (let y = 50; y < 72; y++) { const w = Math.round(20 + (y - 50) * 0.22), d = 12; p.fill(cx - (w >> 1), y, cz - 6, w, 1, d, mr); }
    p.box(cx + 4, 44, cz - 9, 9, 33, 4, blue); p.box(cx + 4, 44, cz - 9, 1, 33, 4, gold); p.box(cx + 4, 66, cz - 7, 9, 6, 13, blue);       // cloak over the left shoulder
    p.box(cx - 5, 56, cz + 6, 11, 12, 1, V(0xe6ecf6)); p.box(cx - 1, 56, cz + 6, 3, 14, 1, V(0xffc93c));
    // head, hair, beard, laurels
    p.box(cx - 5, 72, cz - 5, 11, 12, 11, mr); p.box(cx - 6, 79, cz - 6, 13, 7, 12, V(0xf4f6fb)); p.box(cx - 5, 85, cz - 5, 11, 2, 11, V(0xe6ecf6));
    p.box(cx - 6, 80, cz - 6, 13, 1, 12, gold); for (let i = 0; i < 6; i++) p.set(cx - 5 + i * 2, 81, cz + 6, V(0xffe27a));
    p.box(cx - 3, 78, cz + 6, 2, 1, 1, V(0x3a3a44)); p.box(cx + 2, 78, cz + 6, 2, 1, 1, V(0x3a3a44)); p.box(cx - 4, 79, cz + 6, 3, 1, 1, V(0xd0dcf0)); p.box(cx + 2, 79, cz + 6, 3, 1, 1, V(0xd0dcf0));
    p.box(cx - 1, 73, cz + 6, 3, 5, 2, mr);
    for (let y = 56; y < 74; y++) { const w = Math.max(3, Math.round(9 - (y < 64 ? (64 - y) * 0.4 : 0))); p.fill(cx - (w >> 1), y, cz + 5, w, 1, 4, V(h3(cx, y, 2, 9) > 0.8 ? 0xd0dcf0 : 0xf4f6fb)); }
    // right arm (raised, holds the thunderbolt) and left arm with sceptre
    p.line(cx - 12, 66, cz, cx - 16, 84, cz + 2, mr, 5); p.blob(cx - 16, 87, cz + 2, 3.2, 3.2, 3.2, mr);
    p.line(cx + 12, 66, cz, cx + 16, 62, cz + 8, mr, 5); p.blob(cx + 16, 61, cz + 9, 3, 3, 3, mr);
    p.box(cx + 15, 24, cz + 8, 3, 70, 3, gold); p.blob(cx + 16, 96, cz + 9, 3.2, 3.2, 3.2, V(0xfff0a0)); p.blob(cx + 16, 99, cz + 9, 1.6, 2.4, 1.6, V(0x3ad8d0));
    const bolt = [[cx - 16, 89, cz + 2], [cx - 12, 98, cz + 2], [cx - 19, 103, cz + 2], [cx - 14, 112, cz + 2], [cx - 18, 118, cz + 2]];
    for (let i = 0; i < bolt.length - 1; i++) { p.line(bolt[i][0], bolt[i][1], bolt[i][2], bolt[i + 1][0], bolt[i + 1][1], bolt[i + 1][2], G(0xffe848), 4); }
    for (let i = 0; i < bolt.length - 1; i++) { p.line(bolt[i][0], bolt[i][1], bolt[i][2], bolt[i + 1][0], bolt[i + 1][1], bolt[i + 1][2], G(0xffffff), 2); }
    p.line(cx - 12, 98, cz + 2, cx - 6, 102, cz + 2, G(0xffe848), 2); p.line(cx - 19, 103, cz + 2, cx - 24, 106, cz + 2, G(0xffe848), 2);   // forks
    p.emit(cx - 18, 118, cz + 2, 'ember');
    return p;
  },
};

// ------------------------------------------------------------------ cave mouth
const ROCK = [0x75707a, 0x8a848c, 0xa09aa4];
const cave_mouth = {
  variants: 4, indestructible: true, pal: [0x75707a, 0x8a848c, 0xa09aa4, 0x5f9a4a],
  build(v, rng) {
    const p = new Pen(45, 66, 37, 4), cx = Math.round(p.cx), cz = Math.round(p.cz);
    const rock = (x, y, z, nx, ny) => { const n = h3(x >> 1, y >> 1, z >> 1, 33), t = ny * 0.55 + (n - 0.5) * 0.55; return V(t > 0.3 ? ROCK[2] : t > -0.25 ? ROCK[1] : ROCK[0]); };
    p.box(0, -4, 0, 45, 4, 37, V(0x5a565e));
    p.blob(cx, 22, 14, 21, 27, 14, rock); p.blob(cx - 14, 13, 15, 12, 15, 12, rock); p.blob(cx + 15, 11, 15, 11, 13, 11, rock); p.blob(cx + 3, 36, 10, 11, 22, 9, rock);
    p.blob(cx - 8, 6, 28, 6, 6, 5, rock); p.blob(cx + 10, 5, 29, 5, 5, 4, rock);
    // carve the cave: rectangle + round head, 20 deep
    const inCave = (x, y, z) => z > 8 && ((y < 14 && Math.abs(x - cx) <= 8) || (y >= 14 && Math.hypot(x - cx, y - 14) <= 8.5));
    for (let z = 8; z < 37; z++) for (let y = 0; y < 30; y++) for (let x = 0; x < 45; x++) if (inCave(x, y, z)) p.set(x, y, z, 0);
    // dark interior: any rock voxel touching the cavity gets darker with depth
    for (let z = 0; z < 37; z++) for (let y = 0; y < 30; y++) for (let x = 0; x < 45; x++) {
      if (!p.get(x, y, z) || (z >= 33)) continue;
      let touch = false; for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1]]) if (inCave(x + a, y + b, z + c) && !p.get(x + a, y + b, z + c)) { touch = true; break; }
      if (touch && z < 29) p.set(x, y, z, V(z < 14 ? 0x120e0c : 0x2a2420));
    }
    for (let i = 0; i < 5; i++) { const x = cx - 6 + i * 3, len = 3 + (i % 2) * 3; p.box(x, 22 - len, 27, 2, len, 2, V(ROCK[2 - (i & 1)])); }          // stalactite teeth
    if (v === 0) { p.blob(cx, 9, 10, 4, 4, 1, G(0xffe848)); p.blob(cx, 9, 11, 1.8, 2.6, 1, V(0x1a1410)); p.blob(cx, 9, 10, 4.6, 4.6, 0.6, V(0x2a2420)); p.blob(cx, 9, 10.4, 3.8, 3.8, 0.7, G(0xffe848)); p.blob(cx, 9, 11.2, 1.6, 2.4, 0.5, V(0x1a1410)); }
    if (v === 1) { p.box(cx - 1, 0, 14, 3, 2, 3, G(0xff6a1a)); p.box(cx, 2, 15, 1, 3, 1, G(0xffb02a)); p.emit(cx, 3, 15, 'fire'); for (let i = 0; i < 4; i++) p.box(cx - 4 + i * 2, 0, 12 + (i % 2) * 5, 2, 1, 2, V(0x4a3a2a)); }
    if (v === 2) { for (let i = 0; i < 6; i++) p.box(cx - 6 + i * 2, 0, 24 + (i % 3), 3, 1, 1, V(i % 2 ? 0xf0e8d0 : 0xd8cfb4)); p.box(cx + 2, 0, 22, 4, 3, 4, V(0xf0e8d0)); p.box(cx + 2, 1, 26, 1, 1, 1, V(0x2a2420)); p.box(cx + 5, 1, 26, 1, 1, 1, V(0x2a2420)); }
    if (v === 3) { p.box(cx - 13, 0, 28, 2, 18, 2, V(0x6b4426)); p.box(cx - 15, 18, 27, 6, 5, 4, V(0xf0e8d0)); p.box(cx - 14, 20, 31, 1, 1, 1, V(0x2a2420)); p.box(cx - 11, 20, 31, 1, 1, 1, V(0x2a2420)); }
    // moss on the ledges
    for (let y = 64; y > 6; y--) for (let z = 0; z < 37; z++) for (let x = 0; x < 45; x++) { if (p.get(x, y, z) && !p.get(x, y + 1, z)) { if (h3(x, 0, z, 12) > (v === 3 ? 0.35 : 0.55) && y > 12) p.set(x, y, z, V(h3(x, 1, z, 4) > 0.5 ? 0x5f9a4a : 0x78b24a)); } }
    return p;
  },
};

// ------------------------------------------------------------------ cloud island
const CLOUD = [
  { top: [0xffffff, 0xf6fafe, 0xe8f0fb], mid: 0xe2ecf8, under: [0xb4c6e0, 0xa4b8d6] },
  { top: [0xffffff, 0xffeee8, 0xffdcd0], mid: 0xf8d4cc, under: [0xd8a8b8, 0xc498b0] },
  { top: [0xd4dae6, 0xc4ccdc, 0xb4bed2], mid: 0xa8b2c8, under: [0x7a869e, 0x6a768e] },
  { top: [0xffffff, 0xfff6d8, 0xffe9a8], mid: 0xf8e6b8, under: [0xd8c898, 0xc8b888] },
];
const cloud_island = {
  variants: 4, indestructible: true, pal: [0xffffff, 0xf6fafe, 0xe2ecf8, 0xb4c6e0],
  build(v, rng) {
    const p = new Pen(65, 28, 49, 0), cx = p.cx, cz = p.cz, c = CLOUD[v];
    const puff = (x, y, z, nx, ny) => { const n = h3(x, y, z, 77); return V(ny > 0.35 ? c.top[n > 0.6 ? 0 : 1] : ny > -0.2 ? (n > 0.5 ? c.top[1] : c.mid) : c.under[n > 0.5 ? 0 : 1]); };
    p.blob(cx, 10, cz, 29, 6, 20, puff);
    for (const [x, y, z, rx, ry, rz] of [[cx - 15, 13, cz + 3, 12, 7, 10], [cx + 10, 14, cz - 4, 14, 8, 11], [cx, 12, cz + 9, 10, 5, 8], [cx - 4, 15, cz - 8, 9, 6, 7], [cx + 22, 12, cz + 4, 8, 4, 7]]) p.blob(x, y, z, rx, ry, rz, puff);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rng.range(-0.2, 0.2), r = rng.range(0.55, 0.85); p.blob(cx + Math.cos(a) * 27 * r, 5 + rng.range(0, 2), cz + Math.sin(a) * 18 * r, rng.range(4, 6.5), rng.range(3, 5), rng.range(4, 6), puff); }
    if (v === 1) for (const dx of [-8, 8]) { for (let y = 15; y < 24; y++) p.box(cx + dx - 1, y, cz - 1, 3, 1, 3, V(y > 22 ? 0xf3f1ea : 0xe6ecf6)); }
    return p;
  },
};

export const MODELS = { pyramid, obelisk, sphinx_statue, throne, statue_lion, statue_zeus, cave_mouth, cloud_island };
export const BUILDERS = Object.fromEntries(Object.entries(MODELS).map(([k, s]) => [k, makeBuilder(k, s)]));
