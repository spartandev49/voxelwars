// Shoulder items (category 'shoulders'): pauldrons, lion mantle, scarf. build(ctx) returns {body, armUL?, armUR?}.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, Ps, E, hash3, newGrid, metalAt } from './_kit.js';

export const PARTS = { shoulders: {} };
const S = PARTS.shoulders;
S.none = { name: 'None', build: () => null };

S.pauldrons = {
  name: 'Pauldrons',
  build(ctx) {
    const body = newGrid('body'), L = newGrid('armUL'), R = newGrid('armUR'), m = ctx.m;
    const plate = (x, y, z) => V(m[(x + y + z) % 5 === 0 ? 4 : (y >= 7 ? 3 : 2)]);
    Bs(body, 0, 7, 0, 2, 8, 4, plate);
    Bs(body, 0, 6, 1, 0, 6, 3, V(m[1]));
    for (const a of [L, R]) { B(a, 0, 4, 0, 2, 4, 2, plate); B(a, 0, 3, 0, 2, 3, 2, V(m[1])); B(a, 0, 2, 0, 2, 2, 2, (x, y, z) => ((x + z) % 2 ? V(m[2]) : V(m[3]))); }
    Ps(body, 1, 8, 4, V(m[4])); Ps(body, 1, 8, 0, V(m[4]));                                   // rivets
    return { body, armUL: L, armUR: R };
  },
};
S.lion_mantle = {
  name: 'Lion-skin mantle',
  build(ctx) {
    const body = newGrid('body'), L = newGrid('armUL'), R = newGrid('armUR');
    const pelt = (x, y, z, f = 1) => V(shade(0xb88a3c, f * (0.78 + 0.44 * hash3(x, y, z, 51))));
    const mane = (x, y, z) => V(shade(0x6a3f1c, 0.7 + 0.55 * hash3(x, y, z, 52)));
    B(body, 0, 6, 0, 9, 8, 4, (x, y, z) => ((y === 6 && hash3(x, y, z, 53) > 0.5) ? 0 : pelt(x, y, z, 0.9 + 0.06 * (y - 6))));
    X(body, 3, 8, 3, 6, 8, 4);
    B(body, 2, 5, 4, 7, 7, 4, mane);                                         // mane ruff on the chest
    // lion face on the breast
    B(body, 3, 3, 4, 6, 6, 4, (x, y, z) => pelt(x, y, z, 1.1));
    P(body, 3, 5, 4, V(0x15151a)); P(body, 6, 5, 4, V(0x15151a)); B(body, 4, 4, 4, 5, 4, 4, V(0x4a2a1a)); B(body, 4, 3, 4, 5, 3, 4, V(0xe8d8b0));
    for (const a of [L, R]) B(a, 0, 3, 0, 2, 4, 2, (x, y, z) => pelt(x, y, z, 1.0));
    B(body, 4, 1, 0, 5, 5, 0, mane);                                          // tail hanging behind
    return { body, armUL: L, armUR: R };
  },
};
S.scarf = {
  name: 'Team scarf',
  build(ctx) {
    const body = newGrid('body'), c = (x, y, z, f = 1) => ctx.t(f * (0.9 + 0.16 * hash3(x, y, z, 61)));
    const stripe = (x, y, z) => (y % 3 === 0 ? V(shade(ctx.c.secondary, 0.95)) : c(x, y, z, 1.25));
    // collar ring around the neck (y7..8), open at the top centre where the head sits
    B(body, 1, 7, 0, 8, 7, 4, (x, y, z) => ((x >= 2 && x <= 7 && z >= 1 && z <= 3) ? 0 : c(x, y, z, 1.25)));
    B(body, 1, 8, 0, 8, 8, 4, (x, y, z) => ((x >= 2 && x <= 7 && z >= 1 && z <= 3) ? 0 : c(x, y, z, 1.3)));
    X(body, 3, 8, 3, 6, 8, 4);
    // two tails hanging down the front, one down the back, gold-striped ends
    B(body, 2, 2, 4, 3, 7, 4, stripe); B(body, 6, 3, 4, 6, 6, 4, stripe);
    B(body, 6, 1, 0, 8, 6, 0, stripe);
    return { body };
  },
};
S.armbands = {
  name: 'Armbands',
  build(ctx) {
    const o = { armUL: newGrid('armUL'), armUR: newGrid('armUR'), armLL: newGrid('armLL'), armLR: newGrid('armLR') };
    for (const id of ['armUL', 'armUR']) { B(o[id], 0, 2, 0, 2, 3, 2, ctx.t(1.0)); B(o[id], 0, 1, 0, 2, 1, 2, V(ctx.m[2])); }
    for (const id of ['armLL', 'armLR']) { B(o[id], 0, 2, 0, 2, 4, 2, (x, y, z) => ctx.t(0.9 + 0.12 * (y % 2))); B(o[id], 0, 2, 0, 2, 2, 2, V(ctx.m[2])); }
    return o;
  },
};
S.broad_collar = {
  name: 'Broad collar (usekh)',
  build(ctx) {
    const body = newGrid('body');
    const ring = (x, y, z) => {
      const r = Math.round(Math.hypot(x - 4.5, (y - 9) * 1.1, z === 4 ? 0 : 0));
      return r;
    };
    // concentric bead rows around the neck on the chest, shoulders and back
    const col = (r, x, y, z) => (r % 3 === 0 ? V(shade(ctx.m[2], 0.9 + 0.2 * hash3(x, y, z, 2))) : (r % 3 === 1 ? ctx.t(0.95) : V(shade(0x2d4fb0, 0.9 + 0.2 * hash3(x, y, z, 3)))));
    for (const z of [0, 4]) for (let y = 4; y <= 8; y++) for (let x = 0; x <= 9; x++) { const r = Math.round(Math.hypot(x - 4.5, (y - 8.6) * 0.85)); if (r >= 2 && r <= 6 - (z === 0 ? 1 : 0) && y >= 3) P(body, x, y, z, col(r, x, y, z)); }
    for (let z = 1; z <= 3; z++) for (let x = 0; x <= 9; x++) { const r = Math.round(Math.abs(x - 4.5)); if (r >= 2) P(body, x, 8, z, col(r, x, 8, z)); }
    X(body, 3, 8, 3, 6, 8, 4);
    return { body };
  },
};

registerParts(PARTS);
