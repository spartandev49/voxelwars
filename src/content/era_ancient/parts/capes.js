// Capes (category 'capes'): build(ctx) returns {cape, cape2?}. cape grid 10x14x2 hangs from y=13 (pivot y14) at the back of the shoulders,
// cape2 (10x10x2, child) continues below. The ground is 4 voxels below the cape bottom, so cape2 is limited to its top 3 rows (grid y 7..9).
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, hash3, newGrid } from './_kit.js';

export const PARTS = { capes: {} };
const C = PARTS.capes;
C.none = { name: 'No cape', build: () => null };

const cloth = (ctx, x, y, z, f = 1) => ctx.t(f * (0.86 + 0.2 * hash3(x, y, z, 81)) * (x % 3 === 0 ? 0.92 : 1.0));
function capeGrid(ctx, rows, o = {}) {
  const g = newGrid('cape');
  const y0 = 14 - rows;
  B(g, 0, y0, 0, 9, 13, 1, (x, y, z) => {
    if (o.ragged && y < y0 + 5 && hash3(x, y, z, 82) < (y0 + 5 - y) * 0.16) return 0;
    return cloth(ctx, x, y, z, o.dark ? 0.8 : 1);
  });
  B(g, 0, 13, 0, 9, 13, 1, (x, y, z) => V(shade(ctx.c.secondary, 0.9 + 0.1 * (x % 2))));            // collar band
  P(g, 4, 13, 1, V(ctx.m[3])); P(g, 5, 13, 1, V(ctx.m[3]));                                         // clasp
  if (!o.ragged && !o.noHem) B(g, 0, y0, 0, 9, y0, 1, (x, y, z) => ((x + z) % 2 ? V(shade(ctx.c.primary, 0.95)) : V(shade(ctx.c.secondary, 0.9))));   // hem trim
  return g;
}
C.short = { name: 'Short cape', build: (ctx) => ({ cape: capeGrid(ctx, 8) }) };
C.long = {
  name: 'Long cape',
  build(ctx) {
    const cape = capeGrid(ctx, 14, { noHem: true }), c2 = newGrid('cape2');
    B(c2, 0, 7, 0, 9, 9, 1, (x, y, z) => cloth(ctx, x, y + 14, z, 0.97));
    B(c2, 0, 7, 0, 9, 7, 1, (x, y, z) => ((x + z) % 2 ? V(shade(ctx.c.primary, 0.95)) : V(shade(ctx.c.secondary, 0.9))));
    return { cape, cape2: c2 };
  },
};
C.tattered = {
  name: 'Tattered cape',
  build(ctx) {
    const cape = capeGrid(ctx, 14, { ragged: true, dark: true }), c2 = newGrid('cape2');
    B(c2, 0, 7, 0, 9, 9, 1, (x, y, z) => (hash3(x, y, z, 83) < 0.28 + 0.06 * (y - 7) ? 0 : ctx.t(0.75 + 0.2 * hash3(x, y, z, 84))));
    return { cape, cape2: c2 };
  },
};
C.fur = {
  name: 'Bearskin cloak',
  build(ctx) {
    const cape = newGrid('cape'), fur = (x, y, z, f = 1) => V(shade(0x7a5a3c, f * (0.7 + 0.55 * hash3(x, y, z, 85))));
    B(cape, 0, 3, 0, 9, 13, 1, (x, y, z) => ((y < 7 && hash3(x, y, z, 86) < (7 - y) * 0.12) ? 0 : fur(x, y, z, 0.95 + 0.04 * (y - 3))));
    B(cape, 0, 12, 0, 9, 13, 1, (x, y, z) => fur(x, y, z, 1.2));
    B(cape, 0, 6, 0, 9, 6, 1, (x, y, z) => ((x % 3 === 0) ? ctx.t(0.95) : 0));                               // tinted tie band
    return { cape };
  },
};

registerParts(PARTS);