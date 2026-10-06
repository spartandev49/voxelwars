// Back items (category 'backs'): grid 12x14x8, content extends toward -Z (z index 7 touches the body back, z 0 is farthest), y 0..13 = body y 0..13
// (top of the grid is world y 24). x index 6 is the spine; the character's right shoulder is at low x.
import { registerParts, UNLOCKS } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, E, hash3, newGrid, sprite } from './_kit.js';

export const PARTS = { backs: {} };
const K = PARTS.backs;
K.none = { name: 'Nothing', build: () => null };

const lea = (x, y, z, base = 0x6a4224, f = 1) => V(shade(base, f * (0.84 + 0.3 * hash3(x, y, z, 91))));

K.quiver = {
  name: 'Quiver',
  build(ctx) {
    const g = newGrid('back');
    g.line(9, 1, 5, 4, 10, 5, lea(0, 0, 0), 4);                                  // slanted leather tube
    const cells = [];
    // paint the tube with strap bands and a metal tip
    for (let y = 0; y < 14; y++) for (let z = 0; z < 8; z++) for (let x = 0; x < 12; x++) { const v = g.get(x, y, z); if (v) g.set(x, y, z, lea(x, y, z, (y + x) % 5 === 0 ? 0x3a2418 : 0x7a4a26, 1)); }
    B(g, 8, 0, 4, 10, 1, 6, V(ctx.m[2]));
    // arrows: shafts with tinted fletching poking out of the mouth
    for (const [x, y, z, h] of [[3, 11, 5, 2], [4, 11, 6, 2], [2, 10, 5, 3]]) { B(g, x, y, z, x, y + h, z, V(0xc9a66b)); P(g, x, y + h, z, ctx.t(1)); P(g, x, y + h - 1, z, ctx.t(0.9)); P(g, x - 1, y + h - 1, z, ctx.t(0.85)); }
    return g;
  },
};
K.banner_pole = {
  name: 'Short banner',
  build(ctx) {
    const g = newGrid('back');
    B(g, 5, 0, 6, 5, 13, 6, (x, y) => V(shade(0x8a5a2e, 0.9 + 0.2 * hash3(x, y, 6, 1))));
    B(g, 5, 13, 6, 5, 13, 6, V(ctx.m[3]));
    B(g, 5, 12, 6, 11, 12, 6, V(ctx.m[2]));                                        // crossbar
    B(g, 6, 7, 6, 10, 11, 6, (x, y, z) => (x === 10 || y === 7 ? V(ctx.c.secondary) : ctx.t(0.92 + 0.14 * hash3(x, y, z, 2))));   // tinted flag
    B(g, 7, 8, 7, 9, 10, 7, (x, y, z) => ctx.t(0.95));
    sprite(g, ['.#.', '###', '.#.'], 7, 10, 6, { '#': V(ctx.c.secondary) });
    return g;
  },
};
K.backpack = {
  name: 'Backpack and bedroll',
  build(ctx) {
    const g = newGrid('back');
    B(g, 3, 1, 3, 8, 9, 7, (x, y, z) => lea(x, y, z, 0x7a5a38, 0.9 + 0.02 * y));
    B(g, 4, 3, 2, 7, 7, 2, (x, y, z) => lea(x, y, z, 0x6a4a2a, 0.9));                       // pocket
    B(g, 3, 5, 3, 8, 5, 7, V(ctx.c.trim));
    B(g, 2, 10, 3, 9, 11, 6, (x, y, z) => ctx.t((y === 10 ? 0.88 : 1.0) * (0.92 + 0.12 * hash3(x, y, z, 3))));      // bedroll
    B(g, 4, 10, 3, 4, 11, 6, V(ctx.c.trim)); B(g, 7, 10, 3, 7, 11, 6, V(ctx.c.trim));
    return g;
  },
};
K.bow_case = {
  name: 'Bow case (gorytos)',
  build(ctx) {
    const g = newGrid('back');
    g.line(9, 1, 5, 4, 9, 5, V(0x6a4224), 3);
    for (let y = 0; y < 14; y++) for (let z = 0; z < 8; z++) for (let x = 0; x < 12; x++) { const v = g.get(x, y, z); if (v) g.set(x, y, z, (x + y) % 4 === 0 ? ctx.t(0.9) : lea(x, y, z, 0x7a4a26)); }
    // bow tips and an arrow fan above the case
    g.line(3, 9, 5, 2, 13, 5, V(0x5a3a1c), 1); g.line(4, 9, 6, 6, 13, 6, V(0x5a3a1c), 1);
    for (const [x, y] of [[4, 10], [5, 10], [3, 10]]) { B(g, x, y, 4, x, y + 3, 4, V(0xc9a66b)); P(g, x, y + 3, 4, ctx.t(1)); }
    return g;
  },
};
K.javelin_bundle = {
  name: 'Javelin bundle',
  build(ctx) {
    const g = newGrid('back');
    for (let i = 0; i < 4; i++) { const x0 = 3 + i * 2, z = 4 + (i % 2); g.line(x0 + 1, 0, z + 1, x0 + 3 - (i > 1 ? 1 : 0), 12, z, V(0xb08850), 1); P(g, x0 + 3 - (i > 1 ? 1 : 0), 13, z, V(ctx.m[4])); P(g, x0 + 2 - (i > 1 ? 1 : 0), 12, z, V(ctx.m[3])); }
    B(g, 3, 4, 3, 10, 5, 7, V(ctx.c.trim)); B(g, 3, 8, 3, 10, 8, 7, ctx.t(0.9));
    return g;
  },
};
K.sun_disc = {
  name: 'Sun disc',
  build(ctx) {
    const g = newGrid('back');
    E(g, 5.5, 7.5, 6, 5.9, 5.9, 1, (x, y, z, d) => G(d > 0.78 ? 0xffb830 : (d > 0.35 ? 0xffd860 : 0xfff2a8)));
    B(g, 5, 0, 6, 6, 2, 6, G(0xffc040));
    for (const [x, y] of [[5, 13], [6, 13], [0, 7], [11, 7], [1, 11], [10, 11], [1, 3], [10, 3]]) P(g, x, y, 6, G(0xffd860));      // rays
    return g;
  },
};
K.wings = {
  name: 'Feathered wings', unlock: UNLOCKS.wings,
  build(ctx) {
    const g = newGrid('back');
    const feather = (x, y, z, tip) => (tip ? ctx.t(1.0) : V(shade(0xf4f1e6, 0.86 + 0.16 * hash3(x, y, z, 6))));
    // a leaf-shaped wing on each side of the spine, ribbed with feather rows; outer tips carry the team colour
    for (const s of [0, 1]) {
      const sx = (x) => (s ? 11 - x : x);
      for (let y = 3; y <= 13; y++) {
        const reach = Math.min(5, Math.round(5.4 * (1 - Math.abs(y - 9) / 6.2)));         // widest at y=9
        for (let i = 0; i <= reach; i++) {
          const x = 5 - i, tip = i >= reach - 1 && reach >= 2;
          const col = (i + y) % 3 === 0 ? V(shade(0xd8d0bc, 0.95)) : feather(x, y, 6, tip);
          P(g, sx(x), y, 6, col);
          if (y <= 9 && i <= reach - 1) P(g, sx(x), y, 5, feather(x, y, 5, false));
        }
      }
      for (let i = 0; i <= 5; i++) P(g, sx(5 - i), 13 - (i > 3 ? 0 : 0), 7, V(0xcfc6ae));   // leading edge against the shoulder blade
    }
    return g;
  },
};

registerParts(PARTS);
