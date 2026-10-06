// Hair styles (category 'hair'): build(ctx) returns {head, crest?, body?}. Hair sits in the 1-voxel shell around the skull cube (x2..7,y0..5,z2..7);
// helms that declare meta.hair = 'none' skip this layer entirely.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, Ps, E, hash3, newGrid, headSpace, lighten } from './_kit.js';

const hv = (ctx, x, y, z, f = 1, s = 1) => V(shade(ctx.c.hair, f * (0.92 + 0.34 * hash3(x, y, z, s))));
export const PARTS = { hair: {} };
const H = PARTS.hair;
H.bald = { name: 'Bald', build: () => null };

/** short cap of hair: top y6 (+y7 bump), sides, back and a hairline across the forehead */
function shell(ctx, hs, o = {}) {
  const c = (x, y, z, f = 1) => hv(ctx, x, y, z, f * (y >= 6 ? 1.08 : 0.94), 2);
  B(hs, 2, 6, 2, 7, 6, 7, c);                                      // top
  if (o.bump !== false) B(hs, 3, 7, 3, 6, 7, 6, (x, y, z) => c(x, y, z, 1.1));
  B(hs, 1, o.sideLow ?? 3, 2, 1, 5, 7, c); B(hs, 8, o.sideLow ?? 3, 2, 8, 5, 7, c);   // sideburn area behind the ear
  B(hs, 2, o.backLow ?? 2, 1, 7, 5, 1, c);                         // back
  B(hs, 1, 6, 2, 1, 6, 7, c); B(hs, 8, 6, 2, 8, 6, 7, c);
  B(hs, 2, 6, 1, 7, 6, 1, c);
  B(hs, 2, 5, 7, 7, 5, 7, (x, y, z) => c(x, y, z, 0.9));          // hairline
  B(hs, 2, 4, 2, 2, 5, 6, c); B(hs, 7, 4, 2, 7, 5, 6, c);
}
H.buzz = {
  name: 'Buzz cut',
  build(ctx) {
    const head = newGrid('head'), m = (x, y, z) => V(mixRGB(shade(ctx.c.skin, 0.9), ctx.c.hair, 0.7 + 0.2 * hash3(x, y, z, 5)));
    B(head, 2, 5, 2, 7, 5, 7, m); B(head, 2, 3, 2, 7, 5, 2, m); B(head, 2, 4, 2, 2, 5, 7, m); B(head, 7, 4, 2, 7, 5, 7, m);
    return { head };
  },
};
H.short = { name: 'Short hair', build(ctx) { const { head, crest, hs } = headSpace(); shell(ctx, hs); return { head, crest }; } };
H.fringe = {
  name: 'Fringe',
  build(ctx) { const { head, crest, hs } = headSpace(); shell(ctx, hs); B(hs, 2, 4, 8, 7, 5, 8, (x, y, z) => hv(ctx, x, y, z, 0.96, 3)); Ps(hs, 2, 4, 7, hv(ctx, 2, 4, 7)); return { head, crest }; },
};
H.long = {
  name: 'Long hair',
  build(ctx) {
    const { head, crest, hs } = headSpace(); shell(ctx, hs, { backLow: 0, sideLow: 0 });
    const c = (x, y, z) => hv(ctx, x, y, z, 0.94, 6);
    B(hs, 1, 0, 2, 1, 5, 7, c); B(hs, 8, 0, 2, 8, 5, 7, c);           // curtains
    B(hs, 1, 0, 1, 8, 5, 1, c); B(hs, 2, 0, 0, 7, 3, 0, c);           // behind the neck
    const body = newGrid('body');
    for (let y = 8; y >= 3; y--) for (let x = 2; x <= 7; x++) if (y > 4 || hash3(x, y, 0, 9) > 0.35) P(body, x, y, 0, hv(ctx, x, y, 0, 0.9 + 0.04 * (y - 5), 7));
    return { head, crest, body };
  },
};
H.ponytail = {
  name: 'Ponytail',
  build(ctx) {
    const { head, crest, hs } = headSpace(); shell(ctx, hs);
    B(hs, 4, 3, 0, 5, 6, 0, (x, y, z) => hv(ctx, x, y, z, 1, 8));
    B(hs, 4, 5, 0, 5, 5, 0, V(ctx.c.secondary));                       // tie
    const body = newGrid('body');
    for (let y = 8; y >= 4; y--) B(body, 4, y, 0, 5, y, 0, (x, yy, z) => hv(ctx, x, yy, z, 0.9 + 0.05 * (y - 4), 9));
    return { head, crest, body };
  },
};
H.braids = {
  name: 'Braids',
  build(ctx) {
    const { head, crest, hs } = headSpace(); shell(ctx, hs);
    B(hs, 2, 0, 0, 7, 3, 0, (x, y, z) => hv(ctx, x, y, z, 0.9, 5));
    const body = newGrid('body');
    for (const x of [2, 7]) { for (let y = 8; y >= 3; y--) P(body, x, y, 0, hv(ctx, x, y, 0, y % 2 ? 0.8 : 1.12, 4)); P(body, x, 2, 0, V(ctx.c.secondary)); P(body, x, 1, 0, hv(ctx, x, 1, 0, 1.1, 5)); }
    return { head, crest, body };
  },
};
H.mohawk = {
  name: 'Mohawk',
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const prof = [0, 2, 3, 4, 5, 5, 4, 3, 2, 0];
    for (let z = 1; z <= 8; z++) for (let y = 6; y < 6 + prof[z]; y++) Bs(hs, 4, y, z, 4, y, z, hv(ctx, 4, y, z, 0.9 + 0.1 * (y - 6), 3));
    B(hs, 4, 5, 7, 5, 5, 7, hv(ctx, 4, 5, 7));
    return { head, crest };
  },
};
H.wild = {
  name: 'Wild hair',
  build(ctx) {
    const { head, crest, hs } = headSpace(); shell(ctx, hs, { bump: false });
    for (let z = 0; z <= 9; z++) for (let x = 0; x <= 9; x++) {
      const d = Math.hypot(x - 4.5, z - 4.5); if (d > 5.1 || d < 1.5) continue;
      const hgt = Math.floor(hash3(x, 0, z, 21) * 4);
      for (let y = 6; y <= 6 + hgt; y++) P(hs, x, y, z, hv(ctx, x, y, z, 0.85 + 0.1 * (y - 6), 22));
    }
    for (const z of [2, 4, 6]) { P(hs, 0, 4, z, hv(ctx, 0, 4, z)); P(hs, 9, 4, z, hv(ctx, 9, 4, z)); P(hs, 0, 3, z + 1, hv(ctx, 0, 3, z)); P(hs, 9, 3, z + 1, hv(ctx, 9, 3, z)); }
    B(hs, 2, 0, 0, 7, 4, 1, (x, y, z) => (hash3(x, y, z, 7) > 0.35 ? hv(ctx, x, y, z, 0.9, 7) : 0));
    return { head, crest };
  },
};
H.receding = {
  name: 'Receding hair',
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const c = (x, y, z) => hv(ctx, x, y, z, 0.9, 4);
    B(hs, 1, 2, 2, 1, 5, 7, c); B(hs, 8, 2, 2, 8, 5, 7, c); B(hs, 2, 3, 1, 7, 5, 1, c); B(hs, 1, 5, 2, 1, 6, 6, c); B(hs, 8, 5, 2, 8, 6, 6, c);
    B(hs, 2, 6, 1, 7, 6, 2, c); B(hs, 2, 4, 2, 2, 5, 6, c); B(hs, 7, 4, 2, 7, 5, 6, c);
    return { head, crest };
  },
};
H.topknot = {
  name: 'Topknot',
  build(ctx) {
    const { head, crest, hs } = headSpace(); shell(ctx, hs, { bump: false });
    E(hs, 4.5, 8, 4.5, 1.7, 1.7, 1.7, (x, y, z) => hv(ctx, x, y, z, 1.05, 11));
    B(hs, 4, 7, 4, 5, 7, 5, V(ctx.c.secondary));
    return { head, crest };
  },
};
H.curly = {
  name: 'Curly hair',
  build(ctx) {
    const { head, crest, hs } = headSpace();
    E(hs, 4.5, 5.2, 4.5, 4.6, 3.9, 4.6, (x, y, z, d) => {
      if (x >= 2 && x <= 7 && y <= 5 && z >= 2 && z <= 7) return 0;
      if (z >= 8 && y <= 4) return 0;
      return V(shade(ctx.c.hair, (0.7 + 0.5 * hash3(x, y, z, 31)) * (0.9 + 0.2 * d)));
    });
    B(hs, 2, 5, 7, 7, 5, 8, (x, y, z) => hv(ctx, x, y, z, 0.95, 32));
    return { head, crest };
  },
};
H.wig_bob = {
  name: 'Bob wig',
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const c = (x, y, z) => V(shade(ctx.c.hair, 0.55 + 0.35 * hash3(x, y, z, 41) + (y > 5 ? 0.1 : 0)));
    B(hs, 2, 6, 2, 7, 6, 7, c); B(hs, 3, 7, 3, 6, 7, 6, c);
    B(hs, 1, 0, 1, 8, 5, 1, c); B(hs, 1, 0, 2, 1, 6, 7, c); B(hs, 8, 0, 2, 8, 6, 7, c);
    B(hs, 2, 5, 7, 7, 6, 8, (x, y, z) => c(x, y, z)); B(hs, 2, 6, 7, 7, 6, 7, c);
    B(hs, 2, 0, 0, 7, 4, 0, c); B(hs, 0, 0, 3, 0, 3, 6, c); B(hs, 9, 0, 3, 9, 3, 6, c);
    B(hs, 1, 5, 2, 8, 5, 8, (x, y, z) => (((x === 1 || x === 8 || z === 2 || z === 8) && hs.get(x, y, z)) ? ctx.t(1.0) : 0));       // tinted band
    B(hs, 1, 4, 2, 8, 4, 8, (x, y, z) => (((x === 1 || x === 8 || z === 2) && hs.get(x, y, z)) ? V(ctx.m[2]) : 0));                  // gold edge
    return { head, crest };
  },
};

registerParts(PARTS);
