// Torso garments: 'tunics' (cloth layer over the skin) and 'armors' (worn over the tunic).
// build(ctx) returns {body, armUL, armUR, armLL, armLR, legUL, legUR, legLL, legLR} (any subset). Body grid x0..9 (left +X), y0..8, z0..4 (front z=4).
// Cloth is team tinted via ctx.t(f); faction colours (primary/secondary/trim) stay un-tinted on borders.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, Ps, E, hash3, newGrid, metalAt, sprite, lighten, darken, vgrad } from './_kit.js';

const G9 = () => ({ body: newGrid('body'), armUL: newGrid('armUL'), armUR: newGrid('armUR'), armLL: newGrid('armLL'), armLR: newGrid('armLR'), legUL: newGrid('legUL'), legUR: newGrid('legUR'), legLL: newGrid('legLL'), legLR: newGrid('legLR') });
const both = (o, a, b, fn) => { fn(o[a]); fn(o[b]); };
const noise = (x, y, z, s = 1, a = 0.14) => 1 + (hash3(x, y, z, s) - 0.5) * 2 * a;
const NECK = (g) => { /* skin shows through at the collar: nothing to draw, cut after painting */ };

export const PARTS = { tunics: {}, armors: {} };
const TU = PARTS.tunics, AR = PARTS.armors;
TU.none = { name: 'Bare chest', build: () => null };
AR.none = { name: 'No armour', build: () => null };

/** fills a body block with tinted cloth, leaving the neckline open */
function clothBody(ctx, g, y0, y1, fx) {
  B(g, 0, y0, 0, 9, y1, 4, (x, y, z) => ctx.t(noise(x, y, z, 1, 0.1) * (y === y0 ? 0.88 : 1) * (fx ? fx(x, y, z) : 1)));
}
const neckOpen = (g) => { X(g, 3, 8, 3, 6, 8, 4); X(g, 4, 7, 4, 5, 7, 4); };

TU.tunic = {
  name: 'Tunic',
  build(ctx) {
    const o = G9(), g = o.body;
    clothBody(ctx, g, 0, 8);
    neckOpen(g);
    B(g, 0, 2, 0, 9, 2, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.trim, 0.9)) : 0));              // belt
    B(g, 4, 2, 4, 5, 2, 4, V(ctx.c.secondary));                                                                                        // buckle
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.secondary, 0.85 + 0.15 * (x % 2))) : 0));   // hem trim
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 0, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 2, 0.1))));
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 3, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 2, 0.1))); B(a, 0, 3, 0, 2, 3, 2, V(shade(ctx.c.secondary, 0.85))); });
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 3, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 3, 0.1) * 0.95)));
    return o;
  },
};
TU.tunic_leather = {
  name: 'Leather tunic',
  build(ctx) {
    const o = G9(), g = o.body, lea = (x, y, z, f = 1) => V(shade(0x8a5a30, f * noise(x, y, z, 2, 0.12)));
    B(g, 0, 0, 0, 9, 8, 4, (x, y, z) => lea(x, y, z, vgrad(y, 0, 8, 0.9, 1.05)));
    neckOpen(g);
    B(g, 0, 2, 0, 9, 2, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.trim, 0.8)) : 0));
    B(g, 4, 2, 4, 5, 2, 4, V(ctx.m[3]));
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? ctx.t(0.95) : 0));       // tinted hem edge
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 4, 0, 3, 4, 3, (x, y, z) => lea(x, y, z, 0.95)));
    return o;
  },
};
TU.chiton = {
  name: 'Chiton',
  build(ctx) {
    const o = G9(), g = o.body;
    clothBody(ctx, g, 0, 8, (x, y, z) => ((z === 4 && (x === 2 || x === 5 || x === 7)) || (z === 0 && x % 3 === 1) ? 0.88 : 1));
    neckOpen(g);
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.trim, 0.95)) : 0));     // girdle
    B(g, 0, 4, 0, 9, 4, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? ctx.t(1.1) : 0));                // blouse overfold
    // Greek-key hem on body and thigh
    const key = (x, y, z) => ((x + z) % 2 ? V(shade(ctx.c.primary, 0.9)) : V(shade(ctx.c.secondary, 0.95)));
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? key(x, y, z) : 0));
    both(o, 'legUL', 'legUR', (l) => { B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 3, 0.1) * (y === 0 ? 0.9 : 1))); B(l, 0, 0, 0, 3, 0, 3, (x, y, z) => ((x + z) % 2 ? V(shade(ctx.c.secondary, 0.9)) : V(shade(ctx.c.primary, 0.9)))); });
    both(o, 'armUL', 'armUR', (a) => { B(a, 0, 3, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 2, 0.1))); B(a, 0, 3, 0, 2, 3, 2, V(shade(ctx.c.secondary, 0.85))); });
    return o;
  },
};
TU.linen_kilt = {
  name: 'Linen kilt',
  build(ctx) {
    const o = G9(), g = o.body;
    B(g, 0, 0, 0, 9, 3, 4, (x, y, z) => ctx.t(noise(x, y, z, 4, 0.08) * ((z === 4 && x % 2 === 0) || (z === 0 && x % 2) ? 0.9 : 1)));
    B(g, 0, 4, 0, 9, 4, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.secondary, 0.95)) : 0));    // gold belt
    B(g, 3, 1, 4, 6, 3, 4, (x, y, z) => ctx.t(1.12 - 0.04 * (x % 2)));                                                             // apron panel
    B(g, 4, 3, 4, 5, 3, 4, V(ctx.c.primary));
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.08) * (y === 0 ? 0.9 : 1))));
    return o;
  },
};
TU.toga = {
  name: 'Toga',
  build(ctx) {
    const o = G9(), g = o.body;
    const cover = [[0, 9], [0, 9], [0, 9], [0, 9], [1, 9], [3, 9], [4, 9], [5, 9], [5, 9]];     // x range covered per y 0..8
    for (let y = 0; y <= 8; y++) { const [a, b] = cover[y]; B(g, a, y, 0, b, y, 4, (x, yy, z) => (x <= a + 1 && y >= 4 ? V(ctx.c.primary) : ctx.t(noise(x, yy, z, 6, 0.1) * (yy % 3 === 0 ? 0.93 : 1)))); }
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? ctx.t(0.85) : 0));
    both(o, 'armUL', 'armUR', () => {});
    B(o.armUL, 0, 1, 0, 2, 4, 2, ctx.t(1.05)); B(o.armUL, 0, 1, 0, 2, 1, 2, V(ctx.c.primary));
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 1, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 7, 0.1) * (y === 1 ? 0.88 : 1))));
    both(o, 'legLL', 'legLR', (l) => B(l, 0, 4, 0, 3, 4, 3, ctx.t(0.9)));
    return o;
  },
};
TU.robe = {
  name: 'Long robe',
  build(ctx) {
    const o = G9(), g = o.body;
    clothBody(ctx, g, 0, 8, (x, y, z) => ((z === 4 && (x === 3 || x === 6)) ? 0.9 : 1));
    neckOpen(g);
    B(g, 3, 8, 3, 6, 8, 4, 0);
    Ps(g, 3, 7, 4, V(ctx.c.secondary)); Ps(g, 4, 6, 4, V(ctx.c.secondary)); Ps(g, 4, 8, 3, V(ctx.c.secondary));                // collar trim
    B(g, 0, 2, 0, 9, 2, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.primary, 0.9)) : 0));   // sash
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 0, 0, 2, 4, 2, ctx.t(0.95)));
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 2, 0, 2, 4, 2, ctx.t(0.9)); B(a, 0, 2, 0, 2, 2, 2, V(ctx.c.secondary)); });
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 8, 0.1))));
    both(o, 'legLL', 'legLR', (l) => { B(l, 0, 2, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 9, 0.1) * 0.95)); B(l, 0, 2, 0, 3, 2, 3, V(ctx.c.secondary)); });
    return o;
  },
};
TU.bandages = {
  name: 'Mummy wraps',
  build(ctx) {
    const o = G9();
    const wrap = (x, y, z, s = 0) => {
      const band = (y + (x >> 1) + s) % 4, dirt = hash3(x, y, z, 12);
      if (band === 0) return ctx.t(0.92 + 0.12 * dirt);
      return V(shade(0xe6dcc0, band === 2 ? 0.74 : (0.9 + 0.14 * dirt)));
    };
    B(o.body, 0, 0, 0, 9, 8, 4, (x, y, z) => wrap(x, y, z));
    B(o.armUL, 0, 0, 0, 2, 4, 2, (x, y, z) => wrap(x, y, z, 1)); B(o.armUR, 0, 0, 0, 2, 4, 2, (x, y, z) => wrap(x, y, z, 2));
    B(o.armLL, 0, 0, 0, 2, 4, 2, (x, y, z) => wrap(x, y + 1, z, 3)); B(o.armLR, 0, 0, 0, 2, 4, 2, (x, y, z) => wrap(x, y + 2, z, 4));
    B(o.legUL, 0, 0, 0, 3, 4, 3, (x, y, z) => wrap(x, y, z, 5)); B(o.legUR, 0, 0, 0, 3, 4, 3, (x, y, z) => wrap(x, y, z, 6));
    B(o.legLL, 0, 2, 0, 3, 4, 3, (x, y, z) => wrap(x, y + 3, z, 7)); B(o.legLR, 0, 2, 0, 3, 4, 3, (x, y, z) => wrap(x, y + 1, z, 8));
    B(o.legLL, 0, 0, 0, 3, 1, 5, (x, y, z) => wrap(x, y, z, 2)); B(o.legLR, 0, 0, 0, 3, 1, 5, (x, y, z) => wrap(x, y, z, 5));
    // loose strands hanging off the chest and arms
    for (const [x, y] of [[2, 4], [7, 3], [5, 5]]) { P(o.body, x, y, 4, V(0xcfc4a0)); }
    return o;
  },
};
TU.bare_warpaint = {
  name: 'Bare chest, war paint',
  build(ctx) {
    const o = G9(), g = o.body;
    const paint = ctx.t(1.0);
    // front: two spirals on the pecs, a zig-zag across the stomach
    sprite(g, ['.####.', '#....#', '#.##.#', '#.#..#', '#.####', '.#....'], 0, 7, 4, { '#': paint });
    sprite(g, ['.####.', '#....#', '#.##.#', '#..#.#', '####.#', '....#.'], 4, 7, 4, { '#': paint });
    sprite(g, ['#...#...#.', '.#.#.#.#.#', '..#...#...'], 0, 2, 4, { '#': paint });
    // back: tall stripes; sides: bands
    for (let x = 0; x <= 9; x++) B(g, x, 1, 0, x, 8, 0, (xx, y) => ((x % 3 === 0 || (x + y) % 4 === 0) ? paint : 0));
    B(g, 0, 1, 1, 0, 8, 3, (x, y) => (y % 2 ? paint : 0)); B(g, 9, 1, 1, 9, 8, 3, (x, y) => (y % 2 ? paint : 0));
    B(g, 0, 8, 0, 9, 8, 4, (x, y, z) => (((x + z) % 2 === 0 && !(x >= 3 && x <= 6 && z >= 1)) ? paint : 0));
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 0, 0, 2, 4, 2, (x, y) => (y % 2 === 0 ? paint : 0)));
    both(o, 'armLL', 'armLR', (a) => B(a, 0, 2, 0, 2, 4, 2, (x, y) => (y % 2 === 0 ? paint : 0)));
    return o;
  },
};

// ------------------------------------------------------------------------------------------------ armours
function metalBody(ctx, g, y0, fn) {
  B(g, 0, y0, 0, 9, 8, 4, (x, y, z) => fn(x, y, z));
}
AR.thorax_bronze = {
  name: 'Muscle cuirass', meta: { metal: 'bronze' },
  build(ctx) {
    const o = G9(), g = o.body, m = ctx.m;
    const col = (f) => V(mixRGB(m[1], m[4], Math.min(1, Math.max(0, f))));
    metalBody(ctx, g, 1, (x, y, z) => col(0.42 + 0.06 * (y - 4) * 0.4 + 0.08 * (hash3(x, y, z, 2) - 0.5)));
    // sculpted front: pecs, ridge lines, abs
    for (const [x0, x1] of [[1, 3], [6, 8]]) { B(g, x0, 5, 4, x1, 6, 4, col(0.97)); B(g, x0, 5, 4, x1, 5, 4, col(0.7)); B(g, x0, 7, 4, x1, 7, 4, col(0.3)); }
    B(g, 4, 3, 4, 5, 8, 4, col(0.2));
    for (const [x0, x1] of [[2, 3], [6, 7]]) { B(g, x0, 3, 4, x1, 4, 4, col(0.7)); B(g, x0, 1, 4, x1, 2, 4, col(0.62)); }
    B(g, 0, 3, 4, 9, 3, 4, (x) => (x === 4 || x === 5 ? 0 : col(0.28)));
    B(g, 0, 1, 4, 9, 1, 4, (x) => col(x === 4 || x === 5 ? 0.3 : 0.5));
    // spine and shoulder blades on the back
    B(g, 4, 1, 0, 5, 8, 0, col(0.22)); B(g, 1, 5, 0, 3, 7, 0, col(0.7)); B(g, 6, 5, 0, 8, 7, 0, col(0.7));
    B(g, 0, 8, 0, 9, 8, 4, col(0.78)); X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 1, 0, 9, 1, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? col(0.9) : 0));                      // flared lower rim
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 4, 0, 2, 4, 2, col(0.62)));
    return o;
  },
};
AR.lorica_segmentata = {
  name: 'Lorica segmentata',
  build(ctx) {
    const o = G9(), g = o.body, m = ctx.m;
    const plate = (x, y, z) => ((y % 2 === 1) ? V(m[1]) : V(mixRGB(m[2], m[4], 0.35 + 0.35 * (y / 8) + 0.1 * (hash3(x, y, z, 3) - 0.5))));
    B(g, 0, 1, 0, 9, 8, 4, plate);
    X(g, 3, 8, 3, 6, 8, 4);
    // buckles and the centre strap line
    B(g, 4, 1, 4, 5, 7, 4, (x, y) => (y % 2 === 1 ? V(ctx.c.trim) : V(shade(ctx.c.trim, 1.3))));
    for (const y of [2, 4, 6]) { P(g, 2, y, 4, V(ctx.m[4])); P(g, 7, y, 4, V(ctx.m[4])); }
    B(g, 0, 8, 0, 9, 8, 4, V(m[3])); X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 1, 0, 9, 1, 4, V(m[1]));
    // overlapping shoulder guards
    both(o, 'armUL', 'armUR', (a) => { B(a, 0, 4, 0, 2, 4, 2, V(m[3])); B(a, 0, 3, 0, 2, 3, 2, V(m[1])); });
    return o;
  },
};
AR.scale_mail = {
  name: 'Scale armour',
  build(ctx) {
    const o = G9(), g = o.body, m = ctx.m;
    const scale = (x, y, z) => {
      const off = y % 2, k = ((x + off) >> 1) % 2, edge = y % 2 === 0;
      return V(mixRGB(m[edge ? 1 : 2], m[k ? 4 : 3], 0.5 + 0.2 * (hash3(x, y, z, 4) - 0.5)));
    };
    B(g, 0, 0, 0, 9, 8, 4, scale);
    X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 8, 0, 9, 8, 4, V(m[3])); X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(ctx.c.trim) : 0));
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 3, 0, 2, 4, 2, scale));
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 3, 0, 3, 4, 3, scale));
    return o;
  },
};
AR.chainmail = {
  name: 'Chainmail',
  build(ctx) {
    const o = G9(), g = o.body, m = ctx.m;
    const ring = (x, y, z) => V(mixRGB(m[1], m[3], 0.15 + 0.7 * hash3(x, y, z, 5)));
    B(g, 0, 0, 0, 9, 8, 4, ring);
    X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 0, 0, 9, 0, 4, V(m[0]));
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(ctx.c.trim) : 0));
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 3, 0, 2, 4, 2, ring));
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 4, 0, 3, 4, 3, ring));
    return o;
  },
};
AR.leather = {
  name: 'Leather armour',
  build(ctx) {
    const o = G9(), g = o.body, lea = (x, y, z, f = 1) => V(shade(0x7a4a26, f * noise(x, y, z, 6, 0.12)));
    B(g, 0, 1, 0, 9, 8, 4, (x, y, z) => lea(x, y, z, vgrad(y, 1, 8, 0.88, 1.08)));
    X(g, 3, 8, 3, 6, 8, 4);
    B(g, 4, 1, 4, 5, 7, 4, V(shade(0x4a2a14, 1))); B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.trim, 0.85)) : 0));
    for (const [x, y] of [[2, 6], [7, 6], [2, 5], [7, 5], [1, 2], [8, 2]]) P(g, x, y, 4, V(ctx.m[3]));                             // studs
    B(g, 0, 1, 0, 9, 1, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? lea(x, y, z, 0.78) : 0));
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 4, 0, 2, 4, 2, (x, y, z) => lea(x, y, z, 1.0)));
    return o;
  },
};
AR.linothorax = {
  name: 'Linen cuirass',
  build(ctx) {
    const o = G9(), g = o.body;
    B(g, 0, 1, 0, 9, 8, 4, (x, y, z) => ctx.t(noise(x, y, z, 7, 0.08) * (y % 3 === 1 ? 0.92 : 1.02)));
    X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 8, 0, 9, 8, 4, V(shade(ctx.c.secondary, 0.95))); X(g, 3, 8, 3, 6, 8, 4);                                           // scapular edge
    B(g, 0, 5, 0, 9, 5, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.trim, 1.0)) : 0));
    B(g, 4, 1, 4, 5, 4, 4, V(shade(ctx.c.secondary, 0.9)));
    // pteruges: hanging strips at the hip with gaps
    B(g, 0, 0, 0, 9, 1, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? (x % 2 ? V(shade(ctx.c.trim, 0.55)) : ctx.t(0.9)) : 0));
    both(o, 'armUL', 'armUR', (a) => { B(a, 0, 3, 0, 2, 4, 2, (x, y, z) => ((x + y) % 2 ? V(shade(ctx.c.secondary, 0.9)) : ctx.t(0.9))); });
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 3, 0, 3, 4, 3, (x, y, z) => ((x === 0 || x === 3 || z === 0 || z === 3) ? (x % 2 ? V(shade(ctx.c.trim, 0.6)) : ctx.t(0.9)) : 0)));
    return o;
  },
};
AR.fur_pelt = {
  name: 'Fur pelt',
  build(ctx) {
    const o = G9(), g = o.body, fur = (x, y, z, f = 1) => V(shade(0x6a5238, f * (0.72 + 0.5 * hash3(x, y, z, 8))));
    B(g, 0, 2, 0, 9, 8, 4, (x, y, z) => ((y < 4 && hash3(x, y, z, 3) > 0.55 + 0.1 * (y - 2)) ? 0 : fur(x, y, z, vgrad(y, 2, 8, 0.85, 1.12))));
    X(g, 3, 8, 3, 6, 8, 4); X(g, 4, 7, 4, 5, 7, 4);
    B(g, 0, 8, 0, 9, 8, 4, (x, y, z) => fur(x, y, z, 1.2)); X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.trim, 0.8)) : 0));
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 3, 0, 2, 4, 2, (x, y, z) => fur(x, y, z, 1.1)));
    return o;
  },
};
AR.wicker_coat = {
  name: 'Quilted coat',
  build(ctx) {
    const o = G9(), g = o.body;
    const weave = (x, y, z) => (((x + y) % 4 === 0) ? ctx.t(0.95) : (((x + y) % 2) ? V(shade(0xc8a860, 0.9)) : V(shade(0xdcc078, 1.0))));
    B(g, 0, 0, 0, 9, 8, 4, weave); X(g, 3, 8, 3, 6, 8, 4);
    B(g, 4, 0, 4, 5, 8, 4, V(ctx.c.secondary)); X(g, 4, 8, 4, 5, 8, 4);
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? ctx.t(0.9) : 0));
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 1, 0, 2, 4, 2, weave));
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 2, 0, 3, 4, 3, weave));
    return o;
  },
};
AR.sash_team = {
  name: 'Team sash',
  build(ctx) {
    const o = G9(), g = o.body;
    // diagonal from the right shoulder (x low) to the left hip: light team colour with gold edges
    for (let y = 0; y <= 8; y++) {
      const x0 = Math.round(1 + (8 - y) * 0.95);
      for (let x = x0; x <= Math.min(9, x0 + 2); x++) { const edge = x === x0 || x === x0 + 2; P(g, x, y, 4, edge ? V(shade(ctx.c.secondary, 0.95)) : ctx.t(1.28)); P(g, x, y, 0, edge ? V(shade(ctx.c.secondary, 0.8)) : ctx.t(1.2)); }
    }
    B(g, 0, 7, 0, 3, 8, 4, (x, y, z) => ctx.t(1.25));                                                                           // over the shoulder
    X(g, 3, 8, 3, 6, 8, 4);
    return o;
  },
};
AR.sash_leopard = {
  name: 'Leopard-skin sash',
  build(ctx) {
    const o = G9(), g = o.body;
    const pelt = (x, y, z) => (hash3(x, y, z, 14) > 0.7 ? V(0x2a1a10) : V(shade(0xc89a48, 0.9 + 0.2 * hash3(x, y, z, 2))));
    for (let y = 0; y <= 8; y++) { const x0 = Math.round(1 + (8 - y) * 0.95); for (let x = x0; x <= x0 + 3; x++) { if (x > 9) continue; const edge = x === x0 || x === x0 + 3; P(g, x, y, 4, edge ? ctx.t(0.95) : pelt(x, y, 4)); P(g, x, y, 0, edge ? ctx.t(0.9) : pelt(x, y, 0)); } }
    B(g, 0, 7, 0, 4, 8, 4, (x, y, z) => ((y === 7 && x < 4) ? ctx.t(0.95) : pelt(x, y, z))); X(g, 3, 8, 3, 6, 8, 4);
    return o;
  },
};

registerParts(PARTS);
