// Camp and harbour props: crates, barrels, tents, torches, banner poles, fire pits, campfires, goat pens, ships.
// Neutral colours only (no team tint): tents and banners are striped in toy-box colours so they never read as "belongs to A or B".

import { Pen, V, G, shade, h3, makeBuilder, chip, cracks, darken, prune } from './kit.js';

const TAU = Math.PI * 2;
const WOOD = [0x8a5e30, 0xa4753f, 0xb98b57];
const IRON = 0x4a4a54, IRON_HI = 0x7a7a88;

// ------------------------------------------------------------------ crate / barrel
const CRATE_WOOD = [[0x8a5e30, 0xa4753f, 0xb98b57], [0x7a4f28, 0x946236, 0xa8703a], [0x9a7040, 0xb98b57, 0xcfa468], [0x8a5e30, 0xa4753f, 0xb98b57]];
const crate = {
  variants: 4, pal: [0xa4753f, 0xb98b57, 0x8a5e30, 0x4a4a54],
  build(v, rng) {
    const p = new Pen(10, 10, 10, 1), w = CRATE_WOOD[v];
    p.fill(0, 0, 0, 10, 10, 10, (i, j, k) => {
      const ex = (i === 0 || i === 9) + (j === 0 || j === 9) + (k === 0 || k === 9);
      if (ex >= 2) return V(w[0]);                                             // frame
      if (k === 9 && Math.abs(i - j) <= 0 && i > 0 && i < 9) return V(w[0]);   // brace
      const n = h3(i, j, k, 3);
      return V(((j >> 1) + (n > 0.85 ? 1 : 0)) % 2 ? w[1] : w[2]);              // planks
    });
    if (v === 3) { p.box(2, 3, 9, 6, 1, 1, V(0xffc93c)); p.box(2, 6, 9, 6, 1, 1, V(0xffc93c)); p.box(4, 4, 9, 2, 2, 1, V(0xd9453a)); }
    if (v === 2) { p.box(1, 10, 1, 8, 1, 8, V(0xe8c04a)); p.box(2, 11, 2, 6, 1, 6, V(0xf2d268)); }       // grain spilling out of the top (extra height kept small)
    return p;
  },
  rubble: { w: 12, d: 12, h: 3, kind: 'planks', cols: [0xa4753f, 0xb98b57, 0x8a5e30], n: 18 },
};

const BARREL_COL = [[0x8a5e30, 0xa4753f], [0x7a4f28, 0x946236], [0xb0702a, 0xc98a3a], [0x5a3a20, 0x6b4426]];
const barrel = {
  variants: 4, pal: [0xa4753f, 0x8a5e30, 0x4a4a54, 0x7d1fa0],
  build(v) {
    const p = new Pen(9, 10, 9, 1), cx = p.cx, cz = p.cz, c = BARREL_COL[v];
    for (let y = 0; y < 10; y++) {
      const r = 3.4 + 1.1 * Math.sin(Math.PI * (y + 0.5) / 10);
      p.disc(cx, cz, y, 1, r, (x, yy, z) => {
        if (y === 1 || y === 8) return V(IRON);
        const a = Math.atan2(z - cz, x - cx), stave = Math.floor((a + Math.PI) / (TAU / 9)) & 1;
        return V(stave ? c[0] : c[1]);
      });
    }
    p.disc(cx, cz, 9, 1, 3.4, V(v === 1 ? 0x7d1fa0 : 0xc9a06a));      // lid (v1 wine-stained)
    p.set(cx, 9, cz, V(0x3a2a1a));                                      // bung
    return p;
  },
  rubble: { w: 12, d: 12, h: 3, kind: 'planks', cols: [0xa4753f, 0x8a5e30, 0x4a4a54], n: 16 },
};

// ------------------------------------------------------------------ tent
const TENT = [[0xd9453a, 0xf2efe6], [0x3b6cf0, 0xf2efe6], [0xf0c030, 0x7a4fb0], [0x4fb050, 0xf4ecd0]];
const tent = {
  variants: 4, pal: [0xd9453a, 0xf2efe6, 0x3b6cf0, 0x8a5e30, 0x2a1f1a],
  build(v, rng) {
    const p = new Pen(27, 32, 29, 1), cx = p.cx, T = TENT[v], D = 27;
    const zStart = 1;
    for (let y = 0; y < 26; y++) {
      const hw = y < 5 ? 12 : 12 * (1 - (y - 5) / 21);
      for (let k = 0; k < D; k++) for (let i = Math.round(cx - hw); i <= Math.round(cx + hw); i++) {
        const stripe = Math.floor((k + (y < 5 ? 0 : 1)) / 4) & 1;
        const edge = Math.abs(i - cx) >= hw - 1 || k === 0 || k === D - 1;
        if (!edge && y > 1 && Math.abs(i - cx) < hw - 2 && k > 1 && k < D - 2 && y < 24) continue;   // hollow shell keeps the voxel count sane
        let col = stripe ? T[0] : T[1];
        if (y < 5) col = stripe ? shade(T[0], 0.8) : shade(T[1], 0.9);                                  // valance
        if (y === 5 && !stripe) col = shade(T[1], 0.8);
        p.set(i, y, zStart + k, V(col));
      }
    }
    // entrance on +Z gable: dark doorway with a tied flap
    const zf = zStart + D - 1;
    p.carve(Math.round(cx) - 4, 0, zf - 3, 9, 13, 4);
    p.fill(Math.round(cx) - 4, 0, zf - 4, 9, 12, 1, V(0x2a1f1a));
    for (let y = 0; y < 13; y++) { const w = Math.round(4 - y * 0.2); p.set(Math.round(cx) - 5 + (y > 8 ? 1 : 0), y, zf, V(T[y & 1 ? 0 : 1])); p.set(Math.round(cx) + 5 - (y > 8 ? 1 : 0), y, zf, V(T[y & 1 ? 0 : 1])); }
    // ridge pole and pennant
    p.box(Math.round(cx), 24, zStart - 1, 1, 2, D + 2, V(0x6b4426));
    p.box(Math.round(cx), 25, zf + 1, 1, 7, 1, V(0x6b4426));
    for (let i = 0; i < 6; i++) p.box(Math.round(cx) + 1 + i, 31 - Math.floor(i / 2), zf + 1, 1, 3 - Math.floor(i / 2), 1, V(T[0]));
    // guy-rope pegs
    for (const sx of [-1, 1]) for (const z of [zStart + 1, zStart + D - 2]) p.box(Math.round(cx) + sx * 14, 0, z, 1, 2, 1, V(0x6b4426));
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 16, rmin: 2, rmax: 4.5, bias: 0.8 }); cracks(p, rng, { n: 2, len: 12 }); darken(p, rng, 0.18, 0.78); prune(p, 26); },
  rubble: { w: 24, d: 26, h: 4, kind: 'chunks', cols: [0xd9453a, 0xf2efe6, 0x8a5e30], n: 40 },
  afterRubble(p, rng, v) { p.box(Math.round(p.cx), 0, 3, 1, 12, 1, V(0x6b4426)); p.box(Math.round(p.cx) + 1, 8, 3, 5, 3, 1, V(TENT[v][0])); },
};

// ------------------------------------------------------------------ torch / banner / fires
const torch = {
  variants: 4, pal: [0x6b4426, 0x4a4a54, 0xffb02a, 0xffc93c],
  build(v) {
    const p = new Pen(7, 26, 7, 1), cx = Math.round(p.cx);
    const pole = [0x6b4426, 0xc8843a, 0xf1f4fa, 0x3a3a44][v], band = [0x4a4a54, 0xffc93c, 0xffc93c, 0xd9453a][v];
    p.box(cx - 1, -1, cx - 1, 3, 20, 3, V(pole)); p.box(cx - 1, 6, cx - 1, 3, 1, 3, V(band)); p.box(cx - 1, 2, cx - 1, 3, 1, 3, V(band));
    p.box(cx - 2, 18, cx - 2, 5, 1, 5, V(IRON)); p.box(cx - 2, 19, cx - 2, 5, 2, 5, V(IRON_HI)); p.carve(cx - 1, 20, cx - 1, 3, 1, 3);
    p.box(cx - 1, 20, cx - 1, 3, 2, 3, G(0xff8a1a)); p.box(cx - 1, 22, cx - 1, 3, 2, 3, G(0xffb02a)); p.box(cx, 24, cx, 1, 2, 1, G(0xffe27a));
    if (v === 3) { p.box(cx + 2, 11, cx, 1, 5, 1, V(0xd9453a)); p.box(cx + 2, 9, cx, 1, 2, 1, V(0xd9453a)); }
    p.emit(cx, 25, cx, 'fire');
    return p;
  },
  rubble: { w: 8, d: 8, h: 2, kind: 'planks', cols: [0x6b4426, 0x4a4a54], n: 8 },
};

const BANNER = [[0xd9453a, 0xffc93c], [0x3b6cf0, 0xffc93c], [0xf2efe6, 0x3b6cf0], [0x7a4fb0, 0xffc93c]];
const banner_post = {
  variants: 4, pal: [0x6b4426, 0xffc93c, 0xd9453a, 0x3b6cf0],
  build(v) {
    const p = new Pen(15, 54, 5, 1), cx = Math.round(p.cx), cz = Math.round(p.cz), c = BANNER[v];
    p.box(cx - 2, 0, cz - 2, 5, 2, 5, V(0x7a756a));                                          // stone footing (half extent 0.25)
    p.box(cx - 1, 2, cz - 1, 3, 47, 3, V(0x6b4426));
    p.box(cx - 6, 44, cz, 13, 2, 2, V(0x6b4426)); p.blob(cx, 51, cz, 2, 2, 2, V(0xffc93c));   // crossbar and finial
    p.box(cx - 6, 43, cz, 1, 2, 1, V(0xffc93c)); p.box(cx + 6, 43, cz, 1, 2, 1, V(0xffc93c));
    for (let y = 0; y < 26; y++) for (let x = -4; x <= 4; x++) {
      if (y > 19 && Math.abs(x) < (y - 19) * 0.9) continue;                                  // swallow tail
      const emblem = (Math.abs(x) <= 1 && y >= 11 && y <= 18) || (Math.abs(x) <= 3 && (y === 14 || y === 15) && y >= 11);
      const bandc = y < 2 || y === 24;
      p.set(cx + x, 43 - y, cz + 1 + 1, V(emblem ? c[1] : bandc ? c[1] : c[0]));
    }
    return p;
  },
  rubble: { w: 9, d: 9, h: 2, kind: 'planks', cols: [0x6b4426, c0(BANNER)], n: 8 },
};
function c0(b) { return b[0][0]; }

const fire_pit = {
  variants: 4, indestructible: true, pal: [0x8d8d92, 0x6e6e74, 0x2a2624, 0xff8a1a],
  build(v) {
    const p = new Pen(17, 8, 17, 0), cx = p.cx, cz = p.cz, st = [[0x84848a, 0x9a9aa0, 0x6e6e74], [0xc9b078, 0xdcc48a, 0xa8925e], [0x84848a, 0x9a9aa0, 0x6e6e74], [0x4a4e5a, 0x5e6270, 0x383c48]][v];
    for (let z = 0; z < 17; z++) for (let x = 0; x < 17; x++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d <= 8 && d > 5.4) p.box(x, 0, z, 1, h3(x, 0, z, 2) > 0.5 ? 4 : 3, 1, V(st[(x + z) % 3]));
      else if (d <= 5.4) p.set(x, 0, z, V(h3(x, 1, z, 4) > 0.8 ? 0x4a3f38 : 0x2a2624));
    }
    const fl = v === 3 ? [0x6ab0ff, 0x9ad0ff, 0xe0f4ff] : [0xff6a1a, 0xffb02a, 0xffe27a];
    p.box(cx - 1, 1, cz - 1, 3, 2, 3, G(fl[0])); p.box(cx, 3, cz, 1, 2, 1, G(fl[1])); p.set(cx, 5, cz, G(fl[2]));
    for (let i = 0; i < 5; i++) p.set(Math.round(cx + Math.cos(i * 1.3) * 3.5), 1, Math.round(cz + Math.sin(i * 1.3) * 3.5), G(fl[0]));
    if (v === 2) { p.box(cx - 4, 1, cz - 2, 8, 2, 2, V(0x6b4426)); p.box(cx - 2, 1, cz + 2, 2, 2, 6, V(0x7a4f28)); }
    p.emit(cx, 4, cz, v === 3 ? 'ember' : 'fire');
    return p;
  },
};
const campfire = {
  variants: 4, indestructible: true, pal: [0x6b4426, 0x84848a, 0x2a2624, 0xff8a1a],
  build(v) {
    const p = new Pen(15, 8, 15, 0), cx = Math.round(p.cx), cz = Math.round(p.cz);
    for (let z = 0; z < 15; z++) for (let x = 0; x < 15; x++) { const d = Math.hypot(x - 7, z - 7); if (d <= 7 && d > 5.4) p.box(x, 0, z, 1, 2 + (h3(x, 0, z, 6) > 0.5 ? 1 : 0), 1, V(((x + z) & 1) ? 0x84848a : 0x9a9aa0)); }
    p.disc(7, 7, 0, 1, 4.5, V(0x2a2624));
    if (v !== 3) {                                       // teepee of logs
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; p.line(cx + Math.cos(a) * 4, 1, cz + Math.sin(a) * 4, cx + Math.cos(a) * 0.6, 5, cz + Math.sin(a) * 0.6, V(i & 1 ? 0x6b4426 : 0x7a4f28), 2); }
    } else for (let i = 0; i < 3; i++) p.box(cx - 3 + i, 1, cz - 3 + i * 3, 6, 2, 2, V(0x3a2a1a));
    const f = [[0xff6a1a, 0xffb02a, 0xffe27a], [0xff7a2a, 0xffc23a, 0xfff0a0], [0xff5a1a, 0xff9a2a, 0xffd24a], [0xff4a1a, 0xff6a1a, 0xff8a2a]][v];
    p.box(cx - 1, 1, cz - 1, 3, 2, 3, G(f[0])); p.box(cx - 1, 3, cz, 3, 2, 1, G(f[1])); if (v !== 3) p.box(cx, 5, cz, 1, 1, 1, G(f[2]));
    if (v === 2) { p.box(cx - 6, 1, cz + 4, 2, 2, 3, V(0x8a5e30)); }
    p.emit(cx, 4, cz, v === 3 ? 'ember' : 'fire');
    return p;
  },
};

// ------------------------------------------------------------------ goat pen
const GOATS = [[0xf2efe6, 0xd8d2c0], [0x8a6a4a, 0x6a4a30], [0x2a2a30, 0x1a1a20], [0xe8d8b8, 0xb8a888]];
const goat_pen = {
  variants: 4, pal: [0x8a5e30, 0xa4753f, 0xe8c04a, 0xf2efe6],
  build(v, rng) {
    const p = new Pen(29, 14, 29, 0), c0x = 2, c1x = 26;
    const post = V(0x6b4426), rail = V(0xa4753f);
    const posts = [];
    for (let i = 2; i <= 26; i += 6) { posts.push([i, 2], [i, 26], [2, i], [26, i]); }
    for (const [x, z] of posts) p.box(x, 0, z, 2, 12, 2, post);
    for (const y of [4, 9]) {
      p.box(2, y, 2, 25, 1, 1, rail); p.box(2, y, 26, 25, 1, 1, rail); p.box(2, y, 2, 1, 1, 25, rail); p.box(26, y, 2, 1, 1, 25, rail);
    }
    p.carve(9, 0, 26, 9, 12, 2); p.box(9, 0, 26, 1, 12, 2, post); p.box(17, 0, 26, 1, 12, 2, post);       // gate gap on the +Z side
    // straw floor patches and a hay pile
    for (let i = 0; i < 40; i++) { const x = 4 + rng.int(0, 20), z = 4 + rng.int(0, 20); p.set(x, 0, z, V(h3(x, 0, z, 9) > 0.5 ? 0xe8c04a : 0xd9a93a)); }
    p.blob(8, 2, 8, 4.5, 3, 4, (x, y, z) => V(h3(x, y, z, 2) > 0.5 ? 0xf2d268 : 0xe8c04a));
    p.box(17, 0, 6, 8, 3, 3, V(0x8a5e30)); p.box(18, 3, 6, 6, 1, 3, V(0x6a9a3a));                          // trough with greens
    const goat = (x, z, face, c, small) => {
      const s = small ? 0.75 : 1, L = Math.round(7 * s), H = Math.round(4 * s);
      const along = face % 2 === 0;       // 0,2: facing +/-z   1,3: +/-x
      const sx = along ? 4 : L, sz = along ? L : 4, fx = face === 1 ? 1 : face === 3 ? -1 : 0, fz = face === 0 ? 1 : face === 2 ? -1 : 0;
      p.box(x, 3, z, sx, H, sz, V(c[0])); p.box(x + (sx > 3 ? 1 : 0), 3, z + (sz > 3 ? 1 : 0), Math.max(1, sx - 2), 1, Math.max(1, sz - 2), V(c[1]));
      for (const [lx, lz] of [[0, 0], [sx - 1, 0], [0, sz - 1], [sx - 1, sz - 1]]) p.box(x + lx, 0, z + lz, 1, 3, 1, V(c[1]));
      const hx = x + (fx > 0 ? sx : fx < 0 ? -2 : 1), hz = z + (fz > 0 ? sz : fz < 0 ? -2 : 1);
      p.box(hx, 5, hz, 2, 3, 2, V(c[0])); p.set(hx, 8, hz, V(0xe8e0c0)); p.set(hx + 1, 8, hz + 1, V(0xe8e0c0)); p.set(hx + (fx ? 0 : 1), 4, hz + (fz ? 0 : 1), V(0xe8e0c0));
    };
    const layouts = [[[8, 16, 0, 0, false], [16, 14, 1, 0, false]], [[10, 14, 2, 1, false], [16, 18, 0, 1, true]], [[12, 12, 1, 2, false]], [[8, 12, 3, 3, true], [14, 16, 0, 3, true], [18, 11, 2, 3, true]]][v];
    for (const [x, z, f, ci, sm] of layouts) goat(x, z, f, GOATS[ci], sm);
    return p;
  },
  rubble: { w: 22, d: 22, h: 3, kind: 'planks', cols: [0x8a5e30, 0xa4753f, 0xe8c04a], n: 30 },
};

// ------------------------------------------------------------------ ship
const SAIL = [[0xd9453a, 0xf2efe6], [0x3b6cf0, 0xf2efe6], [0x7a4fb0, 0xffc93c], [0x4fb050, 0xf4ecd0]];
const ship = {
  variants: 4, pal: [0x8a5e30, 0xa4753f, 0xb98b57, 0xd9453a, 0xf2efe6],
  build(v, rng) {
    const p = new Pen(41, 48, 69, 8), cx = p.cx, S = SAIL[v], L = 64, z0 = 2;
    const hullW = (z) => {                                       // half width at stern..bow
      const u = (z - z0) / L;
      if (u < 0 || u > 1) return 0;
      const bow = u > 0.5 ? Math.pow(1 - ((u - 0.5) / 0.5), 0.75) : 1, stern = u < 0.18 ? 0.55 + 0.45 * Math.sqrt(u / 0.18) : 1;
      return 11 * bow * stern;
    };
    for (let z = z0; z <= z0 + L; z++) {
      const w = hullW(z); if (w < 0.5) continue;
      for (let y = -8; y <= 10; y++) {
        const wy = w * (y < 0 ? 0.35 + 0.65 * Math.sqrt(1 + y / 8.5) : y > 6 ? 1.0 + (y - 6) * 0.03 : 1.0);
        for (let x = Math.floor(cx - wy); x <= Math.ceil(cx + wy); x++) {
          const ax = Math.abs(x - cx);
          if (ax > wy) continue;
          const shell = ax > wy - 1.6 || y < -6;
          if (y >= 6 && !(shell || z < z0 + 2)) continue;                                  // open deck behind the bulwark
          if (y > 3 && y < 6 && !shell) { p.set(x, y, z, V(0xb98b57)); continue; }            // deck planks
          if (y <= 3 && !shell && y > -6) { p.set(x, y, z, V(0x6a4a2a)); continue; }          // hold (dark)
          const strake = (y + 8) >> 1;
          let col = strake % 2 ? 0x8a5e30 : 0xa4753f;
          if (y === 10 || y === 9) col = v === 1 ? 0x3b6cf0 : v === 2 ? 0x7a4fb0 : 0xd9453a;       // painted gunwale stripe
          if (y === 5) col = 0xc99a64;
          p.set(x, y, z, V(col));
        }
      }
    }
    // curved stern post and prow
    for (let i = 0; i < 12; i++) { p.box(Math.round(cx) - 1, 4 + i, z0 + 3 - Math.round(i * 0.18), 3, 1, 2, V(i & 1 ? 0x8a5e30 : 0xa4753f)); }
    p.blob(cx, 24, z0 + 2, 2.4, 2.4, 2.4, V(0xffc93c));
    for (let i = 0; i < 10; i++) { p.box(Math.round(cx) - 1, 6 + i, z0 + L - Math.round(i * 0.9) + 2, 3, 1, 2, V(i & 1 ? 0x8a5e30 : 0xa4753f)); }
    p.blob(cx, 17, z0 + L + 2, 2.8, 2.4, 3.2, V(0xffc93c)); p.box(Math.round(cx), 15, z0 + L + 4, 1, 1, 3, V(0xd9453a));        // horse-head ram
    p.set(Math.round(cx) - 2, 18, z0 + L + 3, V(0x222222)); p.set(Math.round(cx) + 1, 18, z0 + L + 3, V(0x222222));
    // shields along both sides
    for (let i = 0; i < 9; i++) for (const sg of [-1, 1]) {
      const z = z0 + 9 + i * 5, w = hullW(z); if (w < 6) continue;
      p.blob(cx + sg * (w + 0.6), 7.5, z, 0.9, 2.4, 2.4, V(i % 2 ? 0xd9453a : 0xffc93c));
    }
    // oars
    for (let i = 0; i < 6; i++) for (const sg of [-1, 1]) {
      const z = z0 + 12 + i * 7, w = hullW(z); if (w < 6) continue;
      p.line(cx + sg * (w - 1), 8, z, cx + sg * (w + 9), 1, z - 2, V(0x6b4426), 1);
      p.box(Math.round(cx + sg * (w + 9)) - 1, -1, z - 3, 2, 3, 3, V(0xa4753f));
    }
    // mast, yard, sail, flag
    const mz = z0 + 34;
    p.box(Math.round(cx) - 1, 4, mz - 1, 3, 38, 3, V(0x6b4426));
    p.box(Math.round(cx) - 14, 36, mz, 29, 2, 2, V(0x6b4426));
    for (let y = 0; y < 22; y++) for (let x = -12; x <= 12; x++) {
      const bulge = Math.round(Math.sin(((x + 12) / 24) * Math.PI) * 3 * (0.5 + y / 44)), stripe = Math.floor((x + 12) / 5) & 1;
      p.set(Math.round(cx) + x, 35 - y, mz + 2 + bulge, V(stripe ? S[0] : S[1]));
    }
    p.box(Math.round(cx), 42, mz, 1, 3, 1, V(0x6b4426));
    for (let i = 0; i < 7; i++) p.box(Math.round(cx) + 1 + i, 44 - (i >> 1), mz, 1, 2 - (i >> 2), 1, V(0xffc93c));
    p.box(Math.round(cx) - 3, 6, z0 + L - 6, 7, 1, 1, V(0x6b4426));                                   // bow rail
    p.box(Math.round(cx) - 4, 4, z0 + 5, 9, 5, 7, V(0xa4753f)); p.box(Math.round(cx) - 4, 9, z0 + 5, 9, 1, 7, V(0xd9453a));       // stern cabin
    p.box(Math.round(cx) - 1, 5, z0 + 11, 3, 4, 1, V(0x2a1f1a));
    return p;
  },
  damage(p, rng) { chip(p, rng, { bites: 22, rmin: 2, rmax: 4.5, bias: 0.6, keepBase: 1 }); cracks(p, rng, { n: 3, len: 16 }); darken(p, rng, 0.2, 0.75); prune(p, 26); },
  rubble: { w: 48, d: 58, h: 3, kind: 'planks', cols: [0x8a5e30, 0xa4753f, 0xb98b57, 0xd9453a], n: 70, ground: 3 },
};

export const MODELS = { crate, barrel, tent, torch, banner_post, fire_pit, campfire, goat_pen, ship };
export const BUILDERS = Object.fromEntries(Object.entries(MODELS).map(([k, s]) => [k, makeBuilder(k, s)]));
