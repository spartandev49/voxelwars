// Silly main-hand weapons (unlock key 'silly_weapons'): same grid and conventions as weapons_melee.js.
import { registerParts, UNLOCKS } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, E, hash3, newGrid, gripWrap, sprite } from './_kit.js';
import { wood } from './weapons_melee.js';

const U = UNLOCKS.silly_weapons;
const R_UP = 0.3, R_CARRY = 2.44;
export const PARTS = { mains: {} };
const M = PARTS.mains;

M.fish = {
  name: 'Large fish', unlock: U, meta: { style: 'bash', len: 15, back: 4, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 12, kind: 'silly' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    B(g, 4, 6, 4, 4, 11, 4, V(0x4a7a9a));                                    // tail stalk (held)
    gripWrap(g, ctx, 8, 10);
    const sc = (x, y, z) => V(mixRGB(0x5a86b8, 0xb8d0e4, 0.35 + 0.4 * hash3(x, y, z, 3)));
    E(g, 4, 17, 4, 1.6, 5.6, 2.4, (x, y, z, d) => (z < 3 && y < 16 ? V(0xe8f0f4) : sc(x, y, z)));
    B(g, 3, 12, 2, 5, 12, 6, V(0x3a6a8a)); B(g, 4, 11, 1, 4, 11, 7, V(0x3a6a8a)); B(g, 4, 13, 1, 4, 13, 7, V(0x3a6a8a));      // tail fin
    B(g, 4, 18, 6, 4, 20, 6, V(0x3a6a8a));                                   // dorsal fin
    P(g, 3, 21, 5, V(0xf4f4ee)); P(g, 5, 21, 5, V(0xf4f4ee)); P(g, 3, 21, 6, V(0x15151a)); P(g, 5, 21, 6, V(0x15151a));    // eyes
    B(g, 3, 20, 4, 5, 20, 5, V(0xb83a3a));                                   // gill
    return g;
  },
};
M.rubber_chicken = {
  name: 'Rubber chicken', unlock: U, meta: { style: 'bash', len: 14, back: 4, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 11, kind: 'silly' },
  build(ctx) {
    const g = newGrid('weapon');
    B(g, 3, 6, 4, 3, 11, 4, V(0xf09a28)); B(g, 5, 6, 4, 5, 11, 4, V(0xf09a28));                // legs
    gripWrap(g, ctx, 8, 10);
    B(g, 2, 5, 3, 6, 5, 5, V(0xf0a830));                                                         // feet
    E(g, 4, 15, 4, 2.6, 3.2, 3, (x, y, z) => V(shade(0xf8d838, 0.9 + 0.2 * hash3(x, y, z, 2))));
    B(g, 3, 19, 4, 5, 21, 6, V(0xf8d838)); B(g, 3, 22, 4, 5, 22, 5, V(0xd8281c)); P(g, 4, 23, 4, V(0xd8281c));
    B(g, 4, 20, 7, 4, 20, 8, V(0xf08a1c)); B(g, 4, 19, 7, 4, 19, 7, V(0xf08a1c));              // beak
    P(g, 3, 21, 6, V(0x15151a)); P(g, 5, 21, 6, V(0x15151a));
    B(g, 1, 14, 3, 1, 16, 5, V(0xe8c428)); B(g, 7, 14, 3, 7, 16, 5, V(0xe8c428));              // wings
    return g;
  },
};
M.baguette = {
  name: 'Baguette', unlock: U, meta: { style: 'bash', len: 16, back: 5, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 10, kind: 'silly' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    for (let y = 5; y <= yt; y++) {
      const taper = y < 7 || y > yt - 1;
      const crust = (x, z) => V(shade(0xc88a3c, 0.8 + 0.3 * hash3(x, y, z, 9) + (((y + (x >= 4 ? 1 : 0)) % 4 < 2) ? 0.1 : -0.04)));
      if (taper) B(g, 4, y, 4, 4, y, 4, crust(4, 4)); else B(g, 3, y, 3, 4, y, 4, (x, yy, z) => crust(x, z));
    }
    B(g, 3, 7, 3, 4, 10, 4, V(0xf0ead0));                                                        // paper wrapper
    return g;
  },
};
M.frying_pan = {
  name: 'Frying pan', unlock: U, meta: { style: 'bash', len: 15, back: 5, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 12, kind: 'silly' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    for (let y = 5; y <= 14; y++) B(g, 4, y, 4, 4, y, 4, V(shade(0x2a2a30, 0.9 + 0.3 * hash3(4, y, 4, 1))));
    gripWrap(g, ctx, 8, 11);
    B(g, 4, 5, 4, 4, 6, 4, V(0x6a4a2a));
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
      const d = Math.hypot(x - 4, y - 4); if (d > 4.3) continue;
      const yy = 15 + y; if (yy > yt + 1) continue;
      g.set(x, yy, 4, V(shade(0x3a3a42, 0.85 + 0.3 * hash3(x, yy, 4, 3) + (d < 2 ? 0.1 : 0))));
      if (d > 3.2) g.set(x, yy, 5, V(0x5a5a64));
    }
    return g;
  },
};
M.scroll_of_doom = {
  name: 'Scroll of Doom', unlock: U, meta: { style: 'cast', len: 12, back: 4, rest: [R_UP, 0, 0], grip: [4, 10, 4], minLen: 9, kind: 'silly' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    E(g, 4, 12.5, 4, 2.6, 7.4, 2.6, (x, y, z, d) => (d > 0.9 && (y < 7 || y > 17) ? V(0xf2e6c0) : V(shade(0xe8d8a8, 0.88 + 0.16 * hash3(x, y, z, 5)))));
    B(g, 2, 6, 4, 6, 6, 4, V(0xb89858)); B(g, 2, 19, 4, 6, 19, 4, V(0xb89858));                  // roller caps
    B(g, 2, 11, 2, 6, 12, 6, (x, y, z) => ((x === 2 || x === 6 || z === 2 || z === 6) ? ctx.t(1) : 0));   // ribbon
    P(g, 4, 12, 7, V(0x8a1a1a)); P(g, 3, 12, 7, V(0x8a1a1a)); P(g, 5, 12, 7, V(0x8a1a1a)); P(g, 4, 11, 7, V(0x8a1a1a)); P(g, 4, 13, 7, V(0x8a1a1a));   // wax seal
    for (const [x, y] of [[3, 15], [5, 16], [4, 9], [3, 8], [5, 14]]) P(g, x, y, 6, G(0xb060ff));
    for (const [x, y] of [[2, 16], [2, 9]]) P(g, x, y, 5, G(0xb060ff));
    B(g, 4, 7, 4, 4, 9, 4, V(ctx.c.trim));
    return g;
  },
};
M.olive_branch = {
  name: 'Olive branch', unlock: U, meta: { style: 'cast', ready: 76, len: 20, back: 6, rest: [R_UP, 0, 0], grip: [4, 10, 4], minLen: 12, kind: 'silly' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    for (let y = 4; y <= yt; y++) B(g, 4, y, 4 + (y > 15 ? Math.round(0.7 * Math.sin(y * 0.8)) : 0), 4, y, 4 + (y > 15 ? Math.round(0.7 * Math.sin(y * 0.8)) : 0), wood(y, 4, 0x8a7a58));
    gripWrap(g, ctx, 8, 11);
    const leaf = (x, y, z) => V(mixRGB(0x6a8a48, 0x8aa860, hash3(x, y, z, 2)));
    for (let y = 14; y <= yt; y += 2) {
      const s = ((y >> 1) % 2) ? 1 : -1;
      B(g, 4 + s, y, 4, 4 + 2 * s, y, 4, leaf(4 + s, y, 4)); P(g, 4 + 3 * s, y + 1, 4, leaf(4 + 3 * s, y + 1, 4)); P(g, 4 + s, y, 5, leaf(4, y, 5));
      if (y % 4 === 0) P(g, 4 + s, y - 1, 4, V(0x4a2a5a));
    }
    P(g, 4, yt + 1, 4, leaf(4, yt + 1, 4)); P(g, 5, yt, 4, leaf(5, yt, 4));
    return g;
  },
};
M.foam_finger = {
  name: 'Foam finger', unlock: U, meta: { style: 'bash', ready: 84, len: 18, back: 3, rest: [R_UP, 0, 0], grip: [4, 10, 4], minLen: 14, kind: 'silly' },
  build(ctx) {
    const g = newGrid('weapon');
    const foam = (x, y, z, f = 1) => ctx.t(f * (0.92 + 0.14 * hash3(x, y, z, 2)));
    B(g, 2, 7, 3, 6, 11, 5, (x, y, z) => foam(x, y, z, 0.8));                                    // cuff
    B(g, 1, 12, 2, 7, 19, 6, (x, y, z) => ((x === 1 || x === 7) && (y === 12 || y === 19) ? 0 : foam(x, y, z, 1.0)));      // palm
    B(g, 2, 20, 3, 4, 28, 5, (x, y, z) => ((y === 28 && x !== 3) ? 0 : foam(x, y, z, 1.06)));  // index finger
    B(g, 5, 20, 2, 7, 21, 6, (x, y, z) => foam(x, y, z, 0.92));                                  // folded fingers
    B(g, 0, 14, 3, 0, 16, 5, foam(0, 15, 4, 0.95));                                              // thumb
    sprite(g, ['#', '#', '#', '#'], 4, 17, 6, { '#': V(0xf8f4e8) });                             // the "1" on the palm
    P(g, 3, 17, 6, V(0xf8f4e8));
    return g;
  },
};

registerParts(PARTS);
