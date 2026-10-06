// Main-hand ranged weapons (category 'mains'): bows, sling, throwing axe. Bows are drawn in the YZ plane at x=4: grip at the hand (z=4),
// limbs curve BACK toward the archer (-Z), the string is the straight line between the tips. back = lower limb length, len = upper limb length.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, E, hash3, newGrid, gripWrap, metalAt } from './_kit.js';
import { wood, edgeCol } from './weapons_melee.js';

const R_UPRIGHT = 0.3;
export const PARTS = { mains: {} };
const M = PARTS.mains;

/** limb offset tables: z offset (negative = toward the archer) by distance from the grip */
const CURVE_SIMPLE = (L) => (d) => -Math.round(3.2 * Math.pow(d / L, 2));
const CURVE_RECURVE = (L) => (d) => { const t = d / L; return -Math.round(3.4 * Math.pow(Math.min(t / 0.78, 1), 2) + (t > 0.78 ? -4 * (t - 0.78) / 0.22 : 0)); };

function bow(name, o) {
  return {
    name, meta: { style: 'shoot', len: o.len, back: o.back, rest: [R_UPRIGHT, 0, 0], twoHanded: true, grip: [4, 10, 4], minLen: 8, kind: 'ranged', noClamp: true },
    build(ctx) {
      const g = newGrid('weapon'), U = ctx.len, Lw = ctx.back, curve = o.curve;
      const limb = (sign, L) => {
        let prevZ = 4;
        for (let d = 1; d <= L; d++) {
          const y = 10 + sign * d, z = 4 + curve(L)(d), tip = d > L - 3, horn = o.horn && d > L * 0.55;
          const c = tip ? ctx.t(0.9 + 0.12 * (d % 2)) : (horn ? V(shade(0xc8a870, 0.9 + 0.2 * hash3(4, y, 4, 2))) : wood(y, 2, o.base || 0x7a4a24));
          const z0 = Math.min(prevZ, z), z1 = Math.max(prevZ, z);
          for (let zz = z0; zz <= z1; zz++) B(g, d < L * 0.62 ? 3 : 4, y, zz, 4, y, zz, c);
          if (d < L * 0.45) B(g, 3, y, z + 1, 4, y, z + 1, c);          // thicker near the handle
          prevZ = z;
        }
        return [10 + sign * L, 4 + curve(L)(L)];
      };
      const up = limb(1, U), lo = limb(-1, Lw);
      gripWrap(g, ctx, 8, 11);
      B(g, 3, 9, 4, 5, 12, 5, (x, y, z) => V(shade(0x6a4426, 0.9 + 0.1 * (y % 2))));            // leather handle
      g.line(4, lo[0], lo[1], 4, up[0], up[1], V(0xc9c1a6), 1);                                   // string
      return g;
    },
  };
}
M.bow = bow('Bow', { len: 15, back: 10, curve: CURVE_SIMPLE });
M.longbow = bow('Tall bow', { len: 24, back: 10, curve: CURVE_SIMPLE, base: 0x5a3a1c });
M.composite_bow = bow('Composite bow', { len: 14, back: 10, curve: CURVE_RECURVE, horn: true, base: 0x6a3a1c });

M.sling = {
  name: 'Sling', meta: { style: 'throw', len: 12, back: 4, rest: [R_UPRIGHT, 0, 0], grip: [4, 10, 4], minLen: 6, kind: 'ranged', noClamp: true },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    B(g, 4, 6, 4, 4, 11, 4, V(shade(ctx.c.trim, 0.9)));
    gripWrap(g, ctx, 8, 11);
    for (let y = 12; y <= yt - 3; y++) { P(g, 3, y, 4, V(0xd8c8a0)); P(g, 5, y, 4, V(0xd8c8a0)); }
    B(g, 3, yt - 3, 3, 5, yt - 1, 5, V(shade(ctx.c.trim, 1.1)));
    B(g, 4, yt - 2, 4, 4, yt - 1, 4, V(0x8a8a90)); P(g, 4, yt, 4, ctx.t(1));
    return g;
  },
};
M.francisca = {
  name: 'Francisca (throwing axe)', meta: { style: 'throw', len: 12, back: 5, rest: [2.44, 0, 0], grip: [4, 10, 4], minLen: 8, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    for (let y = 5; y <= yt - 1; y++) B(g, 4, y, 4, 4, y, 4, wood(y, 5, 0x8a5a2e));
    gripWrap(g, ctx, 8, 11);
    // curved head: bit sweeps forward and down
    const rows = [[yt, 7], [yt - 1, 8], [yt - 2, 8], [yt - 3, 8], [yt - 4, 7], [yt - 5, 6]];
    for (const [y, zf] of rows) for (let z = 4; z <= zf; z++) B(g, 3, y, z, 4, y, z, edgeCol(ctx, z === zf ? 'edge' : (z === 4 ? 'rib' : 'mid')));
    B(g, 4, yt - 2, 2, 4, yt - 2, 3, edgeCol(ctx, 'mid'));
    return g;
  },
};

registerParts(PARTS);
