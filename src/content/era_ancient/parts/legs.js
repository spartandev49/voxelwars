// Leg wear: 'legs' (greaves, trousers, wraps, boots ...) and 'skirts' (pteruges, cloth skirt). build(ctx) returns {legUL, legUR, legLL, legLR, body?}.
// Upper leg grid 4x5x4 (y4 = hip), lower leg 4x5x6: shin y2..4 (x0..3, z0..3), foot y0..1 with toes at z4..5.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, E, hash3, newGrid, metalAt, vgrad } from './_kit.js';

const L4 = () => ({ legUL: newGrid('legUL'), legUR: newGrid('legUR'), legLL: newGrid('legLL'), legLR: newGrid('legLR') });
const both = (o, a, b, fn) => { fn(o[a], 0); fn(o[b], 1); };
const lea = (x, y, z, base = 0x6a4224, f = 1) => V(shade(base, f * (0.84 + 0.3 * hash3(x, y, z, 71))));

export const PARTS = { legs: {}, skirts: {} };
const LG = PARTS.legs, SK = PARTS.skirts;
LG.bare = { name: 'Bare legs', build: () => null };

function greaves(name, metal) {
  return {
    name, meta: metal ? { metal } : {},
    build(ctx) {
      const o = L4(), m = ctx.m;
      both(o, 'legLL', 'legLR', (g) => {
        B(g, 0, 2, 0, 3, 4, 3, (x, y, z) => V(m[(z === 3 && (x === 1 || x === 2)) ? 4 : (z === 3 ? 3 : (x === 0 || x === 3 ? 1 : 2))]));
        B(g, 0, 4, 0, 3, 4, 3, V(m[3])); B(g, 1, 4, 3, 2, 4, 3, V(m[4]));            // knee cap
        B(g, 0, 2, 0, 3, 2, 3, V(m[1]));                                              // ankle edge
        B(g, 0, 1, 0, 3, 1, 3, V(shade(ctx.c.trim, 0.9)));                           // strap
      });
      return o;
    },
  };
}
LG.greaves = greaves('Greaves', null);
LG.greaves_bronze = greaves('Bronze greaves', 'bronze');

LG.trousers = {
  name: 'Trousers',
  build(ctx) {
    const o = L4(), c = (x, y, z, f = 1) => ctx.t(f * (0.88 + 0.2 * hash3(x, y, z, 72)));
    both(o, 'legUL', 'legUR', (g) => B(g, 0, 0, 0, 3, 4, 3, (x, y, z) => c(x, y, z, 0.98)));
    both(o, 'legLL', 'legLR', (g) => { B(g, 0, 2, 0, 3, 4, 3, (x, y, z) => c(x, y, z, 0.93)); B(g, 0, 2, 0, 3, 2, 3, V(shade(ctx.c.secondary, 0.9))); B(g, 0, 1, 0, 3, 1, 3, V(shade(ctx.c.trim, 0.8))); });
    return o;
  },
};
LG.wraps = {
  name: 'Leg wraps',
  build(ctx) {
    const o = L4();
    both(o, 'legLL', 'legLR', (g, s) => {
      for (let y = 1; y <= 4; y++) B(g, 0, y, 0, 3, y, 3, (x, yy, z) => (((x + z + y + s) % 3 === 0) ? V(shade(ctx.c.trim, 0.8)) : (((yy + s) % 2) ? ctx.t(0.9) : V(shade(0xd8ccae, 0.92)))));
      B(g, 0, 4, 0, 3, 4, 3, ctx.t(1.0));
    });
    return o;
  },
};
LG.shorts = {
  name: 'Shorts',
  build(ctx) {
    const o = L4();
    both(o, 'legUL', 'legUR', (g) => { B(g, 0, 2, 0, 3, 4, 3, (x, y, z) => ctx.t(0.9 + 0.18 * hash3(x, y, z, 73))); B(g, 0, 2, 0, 3, 2, 3, V(shade(ctx.c.secondary, 0.9))); });
    return o;
  },
};
LG.sandals = {
  name: 'Sandals',
  build(ctx) {
    const o = L4();
    both(o, 'legLL', 'legLR', (g) => {
      B(g, 0, 0, 0, 3, 0, 5, V(shade(0x4a3020, 0.9)));                                                   // sole
      B(g, 0, 1, 4, 3, 1, 5, (x, y, z) => (x % 2 ? V(shade(0x6a4224, 1.0)) : 0));                         // toe straps
      for (const y of [2, 3]) B(g, 0, y, 0, 3, y, 3, (x, yy, z) => ((x === 0 || x === 3 || z === 0 || z === 3) && (x + z + y) % 2 === 0 ? V(shade(0x6a4224, 1.05)) : 0));
    });
    return o;
  },
};
LG.caligae = {
  name: 'Caligae (hobnailed sandals)',
  build(ctx) {
    const o = L4();
    both(o, 'legLL', 'legLR', (g) => {
      B(g, 0, 0, 0, 3, 0, 5, (x, y, z) => ((x + z) % 2 ? V(0x3a2418) : V(0x6a6a72)));                      // hobnailed sole
      B(g, 0, 1, 0, 3, 1, 5, (x, y, z) => ((z >= 4 || x === 0 || x === 3) ? lea(x, y, z, 0x6a4224) : V(shade(ctx.c.skin, 0.9))));
      for (const y of [2, 3, 4]) B(g, 0, y, 0, 3, y, 3, (x, yy, z) => ((x === 0 || x === 3) || ((x + z + y) % 2 === 0 && z === 3) ? lea(x, yy, z, 0x6a4224, 1.0) : 0));
    });
    return o;
  },
};
LG.boots = {
  name: 'Leather boots',
  build(ctx) {
    const o = L4();
    both(o, 'legLL', 'legLR', (g) => {
      B(g, 0, 0, 0, 3, 3, 3, (x, y, z) => lea(x, y, z, 0x4a3020, vgrad(y, 0, 3, 0.85, 1.05)));
      B(g, 0, 0, 4, 3, 1, 5, (x, y, z) => lea(x, y, z, 0x4a3020, 0.95));
      B(g, 0, 0, 0, 3, 0, 5, V(0x1e1410));
      B(g, 0, 4, 0, 3, 4, 3, (x, y, z) => lea(x, y, z, 0x5a3c26, 1.1));
    });
    return o;
  },
};

SK.none = { name: 'None', build: () => null };
SK.pteruges = {
  name: 'Pteruges (leather strips)',
  build(ctx) {
    const o = L4(), body = newGrid('body');
    both(o, 'legUL', 'legUR', (g) => B(g, 0, 1, 0, 3, 4, 3, (x, y, z) => (((x === 0 || x === 3 || z === 0 || z === 3) && (x + z) % 2 === 0 && y < 4) ? V(shade(ctx.c.trim, 0.45)) : ctx.t((0.86 + 0.18 * hash3(x, y, z, 75)) * (y === 1 ? 0.9 : 1)))));
    both(o, 'legUL', 'legUR', (g) => B(g, 0, 1, 0, 3, 1, 3, (x, y, z) => ((x + z) % 2 ? lea(x, y, z, 0x7a4a26, 0.9) : 0)));
    B(body, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? lea(x, y, z, 0x7a4a26, 0.95) : 0));
    return Object.assign(o, { body });
  },
};
SK.cloth_skirt = {
  name: 'Cloth skirt',
  build(ctx) {
    const o = L4();
    both(o, 'legUL', 'legUR', (g) => { B(g, 0, 1, 0, 3, 4, 3, (x, y, z) => ctx.t(0.88 + 0.2 * hash3(x, y, z, 74))); B(g, 0, 1, 0, 3, 1, 3, V(shade(ctx.c.primary, 0.9))); });
    return o;
  },
};

registerParts(PARTS);
