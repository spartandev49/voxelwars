// UNITS-B Persian parts: Immortal fez + scale coat + gerron (wicker shield), Sparabara pavise + one-handed bow, Xerxes' royal tiara / curled beard / robe,
// the cataphract's conical helm + scale hauberk + pennon lance, the camel rider's turban + back-slung scimitar, patterned trousers.
// Same conventions as the core modules (docs/units_lib.md): builders return grids on the canonical hum1 sizes, never write out of bounds,
// draw helms in head space, and tint cloth with ctx.t() (light bases); faction colours (primary purple, secondary gold) and metals stay neutral.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, Xs, P, Ps, E, hash3, newGrid, headSpace, cutFaceCube, metalAt, vgrad, sprite } from './_kit.js';
import { lathe } from './helms.js';
import { wood, edgeCol } from './weapons_melee.js';
import { fringeV, cl } from './_units_b_kit.js';

export const PARTS = { helms: {}, faces: {}, tunics: {}, armors: {}, legs: {}, backs: {}, mains: {}, offs: {} };
const H = PARTS.helms, F = PARTS.faces, TU = PARTS.tunics, AR = PARTS.armors, LG = PARTS.legs, BK = PARTS.backs, M = PARTS.mains, O = PARTS.offs;
const R_UP = 0.3;
const G9 = () => ({ body: newGrid('body'), armUL: newGrid('armUL'), armUR: newGrid('armUR'), armLL: newGrid('armLL'), armLR: newGrid('armLR'), legUL: newGrid('legUL'), legUR: newGrid('legUR'), legLL: newGrid('legLL'), legLR: newGrid('legLR') });
const both = (o, a, b, fn) => { fn(o[a], 0); fn(o[b], 1); };
const noise = (x, y, z, s = 1, a = 0.14) => 1 + (hash3(x, y, z, s) - 0.5) * 2 * a;
const mail = (ctx, x, y, z) => V(mixRGB(ctx.m[1], ctx.m[3], 0.2 + 0.6 * hash3(x, y, z, 5)));

// ---------------------------------------------------------------------------------------------------------------- helms
// Immortal: the tall felt cap (tiara orthe) with a gold brow band, a purple ring, a hanging tassel and a neck veil.
H.persian_fez = {
  name: 'Persian tall cap', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const felt = (x, y, z) => ctx.t(0.84 + 0.2 * hash3(x, y, z, 9) + (y >= 9 ? 0.08 : 0) - ((x + z) % 4 === 0 ? 0.05 : 0));
    lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.5, 3.5], [3.5, 3.5], [3.5, 3.5], [3.5, 3.5], [3.5, 3.5], [3.1, 3.1]], { color: felt, n: 2.3 });
    cutFaceCube(hs);
    for (let z = 0; z <= 9; z++) for (let x = 0; x <= 9; x++) {
      if (hs.get(x, 4, z)) hs.set(x, 4, z, V(shade(ctx.c.secondary, 0.95)));                   // gold brow band
      if (hs.get(x, 8, z)) hs.set(x, 8, z, V(shade(ctx.c.primary, 0.95)));                    // purple ring
      if (hs.get(x, 10, z) && (x + z) % 2 === 0) hs.set(x, 10, z, V(shade(ctx.c.secondary, 0.9)));
      if (hs.get(x, 11, z)) hs.set(x, 11, z, ctx.t(0.7 + 0.1 * hash3(x, 11, z, 2)));        // darker flat top
    }
    B(hs, 2, 0, 0, 7, 3, 1, felt); Bs(hs, 1, 1, 2, 1, 3, 6, felt);                           // neck veil and ear flaps
    B(hs, 2, 0, 0, 7, 0, 1, (x, y, z) => ctx.t(0.62));
    P(hs, 8, 11, 5, V(ctx.c.secondary)); P(hs, 9, 10, 5, V(ctx.c.primary)); P(hs, 9, 9, 5, V(ctx.c.primary)); P(hs, 9, 8, 5, V(ctx.c.secondary));   // tassel
    return { head, crest };
  },
};

// Xerxes: the king's upright tiara. Tinted band, ivory crown striped in faction purple, gold crenellations, a ruby, ribbons and ringlets.
H.royal_tiara = {
  name: 'Royal tiara', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const ivory = (x, y, z) => ((x + z * 2) % 4 === 0 ? V(shade(ctx.c.primary, 0.9 + 0.15 * hash3(x, y, z, 3))) : V(shade(0xf2efe6, 0.9 + 0.12 * hash3(x, y, z, 4))));
    // a flaring cidaris: narrow above the band, wider at the crenellated top
    const rows = [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.1, 3.1], [3.1, 3.1], [3.2, 3.2], [3.4, 3.4], [3.6, 3.6], [3.8, 3.8], [3.9, 3.9]];
    lathe(hs, rows, { color: (x, y, z) => (y <= 5 ? ctx.t(0.92 + 0.14 * hash3(x, y, z, 6)) : ivory(x, y, z)), n: 2.2 });
    cutFaceCube(hs);
    for (let z = 0; z <= 9; z++) for (let x = 0; x <= 9; x++) {
      if (hs.get(x, 4, z)) hs.set(x, 4, z, V(shade(ctx.m[2], 1.0)));                          // gold edge under the band
      if (hs.get(x, 6, z)) hs.set(x, 6, z, V(shade(ctx.m[3], 1.0)));                          // gold edge above the band
      if (hs.get(x, 10, z)) hs.set(x, 10, z, V(shade(ctx.m[2], 0.95)));                       // gold ring
      if (hs.get(x, 12, z) && (x + z) % 2) hs.set(x, 12, z, 0);                               // crenellated top
      else if (hs.get(x, 12, z)) hs.set(x, 12, z, V(shade(ctx.m[3], 1.05)));
    }
    B(hs, 4, 4, 9, 5, 5, 9, V(ctx.m[2])); B(hs, 4, 5, 9, 5, 5, 9, V(0xc8283c)); P(hs, 4, 5, 9, V(0xff6a78));   // ruby in a gold setting on the brow
    B(hs, 4, 0, 0, 5, 4, 0, (x, y, z) => ctx.t(0.9 + 0.1 * (y % 2))); B(hs, 3, 3, 0, 3, 4, 0, ctx.t(0.85)); B(hs, 6, 3, 0, 6, 4, 0, ctx.t(0.85));   // ribbons
    // hair: dark ringlets at the sides and nape
    const curl = (x, y, z) => V(shade(ctx.c.hair, ((((x + (y & 1)) >> 1) + y) % 2 ? 1.3 : 0.8) * (0.9 + 0.2 * hash3(x, y, z, 7))));
    Bs(hs, 1, 0, 2, 1, 4, 7, curl); B(hs, 2, 0, 1, 7, 3, 1, curl); Bs(hs, 0, 1, 3, 0, 3, 6, curl);
    return { head, crest };
  },
};

// Cataphract: iron cone with a gold spike and a small tinted plume, a hanging mail aventail and a veil over the nose and mouth.
H.cataphract_helm = {
  name: 'Cataphract helm (mail veil)', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const iron = (x, y, z, ax, az) => metalAt(ctx, 0.26 + 0.07 * (y - 4) + (x > 4.5 ? 0.05 : 0) + (((x + z) % 3 === 0 && y > 5) ? 0.08 : 0));
    lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.5, 3.5], [3.0, 3.0], [2.5, 2.5], [2.0, 2.0], [1.5, 1.5], [1.0, 1.0]], { color: iron, n: 2.4 });
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9]], { color: (x, y, z) => mail(ctx, x, y, z), n: 3 });   // aventail ring y0..3
    cutFaceCube(hs);
    X(hs, 2, 3, 8, 7, 5, 8);
    for (let z = 0; z <= 9; z++) for (let x = 0; x <= 9; x++) if (hs.get(x, 4, z)) hs.set(x, 4, z, V(shade(ctx.c.secondary, 0.95)));
    B(hs, 4, 2, 8, 5, 5, 8, (x, y) => metalAt(ctx, 0.5 + 0.05 * y)); B(hs, 4, 4, 9, 5, 5, 9, metalAt(ctx, 0.6));   // nasal bar
    Bs(hs, 2, 0, 8, 3, 2, 8, (x, y, z) => mail(ctx, x, y, z)); B(hs, 3, 0, 9, 6, 2, 9, (x, y, z) => mail(ctx, x, y, z));   // the veil over mouth and nose
    B(hs, 4, 12, 4, 5, 12, 5, V(ctx.m[3]));
    B(hs, 4, 12, 4, 5, 13, 4, ctx.t(1.0)); B(hs, 4, 12, 3, 5, 13, 3, ctx.t(0.85));          // small tinted plume
    X(hs, 3, 4, 9, 6, 5, 9);
    return { head, crest };
  },
};

// Camel rider: layered turban with a drooping tail and a gold brooch.
H.turban = {
  name: 'Turban', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const wrap = (x, y, z) => ctx.t(((x + y * 2 + z) % 4 < 2 ? 1.22 : 0.68) * (0.94 + 0.12 * hash3(x, y, z, 11)));
    lathe(hs, [null, null, null, null, [4.2, 4.2], [4.4, 4.4], [4.5, 4.5], [4.3, 4.3], [3.9, 3.9], [3.2, 3.2], [2.2, 2.2], [1.2, 1.2]], { color: wrap, n: 2.2 });
    cutFaceCube(hs);
    for (let z = 0; z <= 9; z++) for (let x = 0; x <= 9; x++) if (hs.get(x, 5, z) && (x + z) % 3 === 0) hs.set(x, 5, z, V(shade(ctx.c.secondary, 0.9)));
    B(hs, 4, 5, 9, 5, 6, 9, V(ctx.m[3])); P(hs, 4, 6, 9, V(0xc8283c));                      // brooch
    // tail of the cloth hanging down the back
    for (let y = 4; y >= 0; y--) B(hs, 3, y, 0, 6, y, 0, wrap);
    Bs(hs, 3, 0, 0, 3, 0, 0, ctx.t(0.7));
    return { head, crest };
  },
};

// ---------------------------------------------------------------------------------------------------------------- faces
// Xerxes' curled beard: a short moustache and ringlets that hang onto the chest, gold ring at the end.
F.beard_ringlets = {
  name: 'Ringlet beard',
  build(ctx) {
    const head = newGrid('head'), body = newGrid('body');
    const hv = (x, y, z, k = 0) => V(shade(ctx.c.hair, (((((x + (y & 1)) >> 1) + y) % 2) ? 1.3 : 0.78) * (0.9 + 0.2 * hash3(x, y, z, 3 + k))));
    B(head, 2, 0, 8, 7, 2, 8, (x, y, z) => ((y === 1 && x >= 4 && x <= 5) ? 0 : hv(x, y, z)));       // cheeks and chin shell
    Bs(head, 1, 0, 4, 1, 2, 7, (x, y, z) => hv(x, y, z, 2));
    B(head, 3, 0, 9, 6, 1, 9, (x, y, z) => hv(x, y, z, 1));
    B(head, 2, 2, 8, 7, 2, 9, (x, y, z) => hv(x, y, z, 4));                                      // moustache
    Bs(head, 2, 2, 9, 2, 2, 9, (x, y, z) => hv(x + 1, y, z, 6));
    const rows = [[1, 8], [2, 8], [2, 7], [3, 7], [3, 6], [3, 6], [4, 5], [4, 5]];   // chest ringlets, widest at the neck
    for (let i = 0; i < 6; i++) { const y = 8 - i, [a, b] = rows[i]; if (y >= 2) B(body, a, y, 4, b, y, 4, (x, yy, z) => hv(x, yy, z, 5)); }
    B(body, 4, 2, 4, 5, 2, 4, V(ctx.m[3])); B(body, 4, 3, 4, 5, 3, 4, (x, y, z) => hv(x, y, z, 6));
    B(body, 3, 8, 3, 6, 8, 4, 0);
    return { head, body };
  },
};

// ---------------------------------------------------------------------------------------------------------------- torso
// Immortal: silver scale over a long coat. Sleeves and the knee-length skirt are team cloth, with a purple/gold fringe and a purple sash.
AR.immortal_scale = {
  name: 'Immortal scale coat', meta: { metal: 'steel' },
  build(ctx) {
    const o = G9(), g = o.body, m = ctx.m;
    const scale = (x, y, z) => { const off = y % 2, k = ((x + off) >> 1) % 2; return V(mixRGB(m[y % 2 === 0 ? 1 : 2], m[k ? 4 : 3], 0.5 + 0.2 * (hash3(x, y, z, 4) - 0.5))); };
    B(g, 0, 3, 0, 9, 8, 4, scale); B(g, 3, 8, 3, 6, 8, 4, 0); X(g, 4, 7, 4, 5, 7, 4);
    B(g, 0, 8, 0, 9, 8, 4, V(m[3])); X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 2, 0, 9, 2, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.primary, 0.95)) : ctx.t(0.9)));    // sash
    B(g, 4, 2, 4, 5, 2, 4, V(ctx.m[3]));
    B(g, 0, 0, 0, 9, 1, 4, (x, y, z) => (y === 0 ? ((x === 0 || x === 9 || z === 0 || z === 4) ? fringeV(ctx, x + z) : ctx.t(0.9)) : ctx.t(noise(x, y, z, 2, 0.1))));   // hip skirt
    both(o, 'armUL', 'armUR', (a) => { B(a, 0, 3, 0, 2, 4, 2, scale); B(a, 0, 0, 0, 2, 2, 2, (x, y, z) => ctx.t(noise(x, y, z, 3, 0.1))); });
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 3, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 4, 0.1))); B(a, 0, 2, 0, 2, 2, 2, V(shade(ctx.c.secondary, 0.95))); });
    both(o, 'legUL', 'legUR', (l) => { B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.1) * (y === 0 ? 0.92 : 1))); B(l, 0, 0, 0, 3, 0, 3, (x, y, z) => ((x === 0 || x === 3 || z === 0 || z === 3) ? fringeV(ctx, x + z + y) : 0)); });
    return o;
  },
};

// Cataphract hauberk: scale from collar to thigh, vambraces and a tinted surcoat sash and hip skirt.
AR.scale_hauberk = {
  name: 'Scale hauberk', meta: { metal: 'steel' },
  build(ctx) {
    const o = G9(), g = o.body, m = ctx.m;
    const scale = (x, y, z) => { const off = y % 2, k = ((x + off) >> 1) % 2; return V(mixRGB(m[y % 2 === 0 ? 1 : 2], m[k ? 4 : 3], 0.5 + 0.2 * (hash3(x, y, z, 4) - 0.5))); };
    B(g, 0, 0, 0, 9, 8, 4, scale); B(g, 3, 8, 3, 6, 8, 4, 0);
    B(g, 0, 8, 0, 9, 8, 4, V(m[3])); X(g, 3, 8, 3, 6, 8, 4);
    // tinted tabard over the scale: a front panel (gold edges) and a back panel, flared hip skirt below
    B(g, 2, 1, 4, 7, 7, 4, (x, y, z) => ((x === 2 || x === 7 || y === 7) ? V(shade(ctx.c.secondary, 0.9)) : ctx.t(1.1 + 0.1 * hash3(x, y, z, 3))));
    B(g, 2, 1, 0, 7, 7, 0, (x, y, z) => ((x === 2 || x === 7) ? V(shade(ctx.c.secondary, 0.8)) : ctx.t(1.0 + 0.1 * hash3(x, y, z, 4))));
    B(g, 4, 2, 4, 5, 6, 4, (x, y, z) => ((y % 2) ? V(shade(ctx.c.primary, 0.9)) : ctx.t(1.15)));
    B(g, 0, 0, 0, 9, 1, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4 || y === 1) ? ctx.t(0.95 + 0.1 * (x % 2)) : 0));
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? fringeV(ctx, x + z) : 0));
    both(o, 'armUL', 'armUR', (a) => { B(a, 0, 3, 0, 2, 4, 2, scale); B(a, 0, 0, 0, 2, 2, 2, (x, y, z) => ctx.t(0.95 + 0.1 * hash3(x, y, z, 5))); });
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 3, 0, 2, 4, 2, V(m[2])); B(a, 0, 3, 0, 2, 3, 2, V(m[1])); });
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 1, 0, 3, 4, 3, scale));
    both(o, 'legLL', 'legLR', (l) => { B(l, 0, 2, 0, 3, 4, 3, (x, y, z) => V(m[(z === 3 && (x === 1 || x === 2)) ? 4 : (x === 0 || x === 3 ? 1 : 2)])); B(l, 0, 4, 0, 3, 4, 3, V(m[3])); B(l, 0, 0, 0, 3, 1, 5, V(shade(ctx.c.trim, 0.9))); });
    return o;
  },
};

// Xerxes' robe: full-length team cloth, a purple front panel, gold collar, hem and cuffs, embroidered gold diamonds across the chest.
TU.royal_robe = {
  name: 'Royal robe',
  build(ctx) {
    const o = G9(), g = o.body;
    B(g, 0, 0, 0, 9, 8, 4, (x, y, z) => ctx.t(noise(x, y, z, 2, 0.1) * (y === 0 ? 0.88 : 1) * ((z === 4 && (x === 3 || x === 6)) ? 0.92 : 1)));
    X(g, 3, 8, 3, 6, 8, 4); X(g, 4, 7, 4, 5, 7, 4);
    B(g, 4, 0, 4, 5, 6, 4, (x, y, z) => V(shade(ctx.c.primary, 0.85 + 0.15 * ((y + x) % 2))));                           // purple front panel
    for (const y of [2, 4, 6]) { P(g, 4, y, 4, V(ctx.m[3])); P(g, 5, y + 0, 4, V(ctx.m[2])); }
    Bs(g, 1, 6, 4, 2, 6, 4, V(ctx.m[2])); Ps(g, 2, 7, 4, V(ctx.m[3])); Ps(g, 1, 5, 4, V(ctx.m[2]));
    Ps(g, 3, 7, 4, V(ctx.m[3])); Ps(g, 3, 8, 3, V(ctx.m[3]));                                                         // collar gold
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.primary, 0.9)) : 0));    // purple sash
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.m[2], 0.9 + 0.1 * (x % 2))) : 0));
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 0, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 3, 0.1))));
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 2, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 4, 0.1) * 0.95)); B(a, 0, 2, 0, 2, 2, 2, V(ctx.m[3])); });
    both(o, 'legUL', 'legUR', (l) => { B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.1))); });
    both(o, 'legLL', 'legLR', (l) => { B(l, 0, 2, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 6, 0.1) * 0.95)); B(l, 0, 2, 0, 3, 2, 3, (x, y, z) => V(shade(ctx.m[2], 0.9 + 0.1 * ((x + z) % 2)))); });
    return o;
  },
};

// ---------------------------------------------------------------------------------------------------------------- legs
// Persian trousers (anaxyrides): cream cloth with a blue/purple lozenge print (neutral, the faction read) and soft felt boots.
LG.persian_trousers = {
  name: 'Patterned trousers',
  build(ctx) {
    const o = { legUL: newGrid('legUL'), legUR: newGrid('legUR'), legLL: newGrid('legLL'), legLR: newGrid('legLR') };
    const pat = (x, y, z, s) => {
      const u = (x + z * 2 + s) % 4, w = (y + (x >> 1)) % 4, d = Math.abs(u - 1.5) + Math.abs(w - 1.5);
      if (d <= 1) return V(shade(ctx.c.trim, 1.0 + 0.1 * hash3(x, y, z, 3)));
      if (d <= 2 && (x + y + z) % 3 === 0) return V(shade(ctx.c.primary, 0.9));
      return V(shade(0xf0ece4, 0.9 + 0.1 * hash3(x, y, z, 4)));
    };
    both(o, 'legUL', 'legUR', (g, s) => B(g, 0, 0, 0, 3, 4, 3, (x, y, z) => pat(x, y, z, s)));
    both(o, 'legLL', 'legLR', (g, s) => {
      B(g, 0, 2, 0, 3, 4, 3, (x, y, z) => pat(x, y + 2, z, s));
      B(g, 0, 2, 0, 3, 2, 3, V(shade(ctx.c.secondary, 0.9)));                                                      // gold ankle band
      B(g, 0, 0, 0, 3, 1, 5, (x, y, z) => V(shade(0x7a5a38, 0.85 + 0.2 * hash3(x, y, z, 6) + (y === 1 ? 0.1 : 0))));  // felt boot
    });
    return o;
  },
};

// ---------------------------------------------------------------------------------------------------------------- back
// A scimitar slung diagonally across the back: dark scabbard with gold bands, the hilt over the left shoulder.
BK.scimitar_back = {
  name: 'Scimitar on the back',
  build(ctx) {
    const g = newGrid('back');
    const lea = (x, y, z, f = 1) => V(shade(0x4a2a18, f * (0.84 + 0.3 * hash3(x, y, z, 12))));
    // scabbard runs from the left shoulder (high x, y 12) down to the right hip (low x, y 1), curving outward
    for (let i = 0; i <= 12; i++) {
      const x = cl(Math.round(9 - i * 0.62), 12), y = cl(12 - i, 14), z = 6 - (i > 2 && i < 10 ? 1 : 0);
      B(g, x, y, z, Math.min(11, x + 1), y, z, (xx, yy, zz) => ((i === 4 || i === 8) ? V(ctx.m[3]) : lea(xx, yy, zz)));
    }
    B(g, 8, 12, 6, 10, 13, 6, V(shade(0xa8743e, 0.9))); B(g, 10, 13, 6, 10, 13, 6, V(ctx.m[3])); P(g, 11, 13, 6, V(ctx.m[4]));       // hilt and pommel
    B(g, 7, 11, 6, 10, 11, 6, V(ctx.m[2]));                                                                                         // guard
    P(g, 2, 0, 6, V(ctx.m[3])); P(g, 3, 1, 6, V(ctx.m[3])); P(g, 1, 0, 6, V(ctx.m[4]));
    return g;
  },
};

// ---------------------------------------------------------------------------------------------------------------- weapons
/** one-handed bow (the sparabara holds it in the right hand behind his pavise): a copy of the library bow without the two-handed flag */
function oneHandBow(name, o) {
  return {
    name, meta: { style: 'shoot', len: o.len, back: o.back, rest: [R_UP, 0, 0], twoHanded: false, grip: [4, 10, 4], minLen: 8, kind: 'ranged', noClamp: true, ready: 80 },
    build(ctx) {
      const g = newGrid('weapon'), U = ctx.len, Lw = ctx.back;
      const curve = (L) => (d) => { const t = d / L; return -Math.round(3.4 * Math.pow(Math.min(t / 0.78, 1), 2) + (t > 0.78 ? -4 * (t - 0.78) / 0.22 : 0)); };
      const limb = (sign, L) => {
        let prevZ = 4;
        for (let d = 1; d <= L; d++) {
          const y = 10 + sign * d, z = 4 + curve(L)(d), tip = d > L - 3, horn = d > L * 0.55;
          const c = tip ? ctx.t(0.9 + 0.12 * (d % 2)) : (horn ? V(shade(0xc8a870, 0.9 + 0.2 * hash3(4, y, 4, 2))) : wood(y, 2, o.base || 0x6a3a1c));
          for (let zz = Math.min(prevZ, z); zz <= Math.max(prevZ, z); zz++) B(g, d < L * 0.62 ? 3 : 4, y, zz, 4, y, zz, c);
          if (d < L * 0.45) B(g, 3, y, z + 1, 4, y, z + 1, c);
          prevZ = z;
        }
        return [10 + sign * L, 4 + curve(L)(L)];
      };
      const up = limb(1, U), lo = limb(-1, Lw);
      B(g, 3, 8, 3, 5, 11, 5, V(0x6a4426));
      g.line(4, lo[0], lo[1], 4, up[0], up[1], V(0xc9c1a6), 1);
      return g;
    },
  };
}
M.sparabara_bow = oneHandBow('Bow (one-handed)', { len: 15, back: 10 });

/** the cataphract's lance: kontos haft with a swallow-tailed team pennon under the head; one-handed here so the small shield stays */
M.kontos_pennon = {
  name: 'Kontos with pennon', meta: { style: 'thrust', len: 26, back: 8, rest: [R_UP, 0, 0], twoHanded: false, grip: [4, 10, 4], minLen: 14, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len, y0 = 10 - ctx.back;
    for (let y = y0 + 2; y <= yt - 6; y++) B(g, 3, y, 3, 4, y, 4, wood(y, 1, 0x7a5a38));
    B(g, 4, y0, 4, 4, y0 + 1, 4, V(ctx.m[1]));
    B(g, 3, 8, 3, 5, 11, 5, V(shade(0xa8743e, 0.9)));
    B(g, 3, yt - 6, 3, 5, yt - 6, 5, V(ctx.m[2]));
    for (let i = 0; i < 6; i++) { const hw = [1, 1, 1, 1, 1, 0][i], y = yt - 5 + i; for (let z = 4 - hw; z <= 4 + hw; z++) B(g, 4, y, z, 4, y, z, edgeCol(ctx, z === 4 + hw && hw ? 'edge' : 'mid')); }
    // pennon: a tinted swallow-tail streaming to the left from the shaft below the head
    const yp = yt - 7;
    for (let i = 1; i <= 4; i++) { const hgt = i <= 2 ? 4 : (i === 3 ? 3 : 2); for (let k = 0; k < hgt; k++) { if (i === 4 && k === 1) continue; P(g, 4 + i, yp - k, 4, ctx.t(0.92 + 0.12 * hash3(i, k, 2, 3))); } }
    P(g, 4, yp, 5, V(ctx.m[3]));
    return g;
  },
};

// ---------------------------------------------------------------------------------------------------------------- off hands
// Immortal: the gerron, a curved wicker shield with a wide team rim band all round, a central boss and cross lashings.
O.gerron = {
  name: 'Wicker gerron', meta: { kind: 'shield', w: 14, h: 13 },
  build(ctx) {
    const g = newGrid('offhand');
    for (let y = 1; y <= 13; y++) for (let x = 1; x <= 14; x++) {
      const dx = Math.min(x - 1, 14 - x), dy = Math.min(y - 1, 13 - y), d = Math.min(dx, dy);
      if (dx + dy < 2 && dx < 2 && dy < 2) continue;                                   // rounded corners
      const k = (x >= 5 && x <= 10) ? 5 : 4;
      let c;
      if (d <= 1) c = ctx.t(0.9 + 0.14 * hash3(x, y, 1, 4));                           // 2-voxel team band
      else c = ((x + (y >> 1)) % 2) ? V(shade(0xb89452, 0.9)) : V(shade(0xd8b66e, 1.0));
      g.set(x, y, k, c);
      if (d <= 1 && k > 4) g.set(x, y, k - 1, ctx.t(0.78)); else if (d <= 1) g.set(x, y, 3, ctx.t(0.62));
      if (d === 0) g.set(x, y, 3, V(shade(0x6a4a2a, 0.9)));
    }
    B(g, 3, 7, 5, 12, 7, 5, V(shade(0x6a4a2a, 0.95)));                                // lashing
    B(g, 7, 3, 5, 8, 11, 5, V(shade(0x6a4a2a, 0.95)));
    B(g, 6, 6, 5, 9, 8, 5, (x, y) => V(ctx.m[(x + y) % 2 ? 3 : 4]));                  // boss
    P(g, 7, 7, 5, V(ctx.m[4]));
    return g;
  },
};

// Sparabara: the pavise, 12 wide x 16 tall, stakes at the foot, upright reeds, a 4-voxel team band across the top and a firing notch.
O.pavise_wall = {
  name: 'Wicker pavise (wall)', meta: { kind: 'shield', w: 12, h: 16 },
  build(ctx) {
    const g = newGrid('offhand');
    for (let y = 0; y < 16; y++) for (let x = 2; x <= 13; x++) {
      const k = (x >= 6 && x <= 9) ? 5 : 4;
      const reed = (x % 3 === 0) ? V(shade(0xa88444, 0.9)) : ((x + (y >> 1)) % 2 ? V(shade(0xd0ae66, 1.0)) : V(shade(0xbc9a58, 0.95)));
      let c = reed;
      if (y >= 12) c = ctx.t(((x + y) % 2 ? 0.98 : 0.86) * (0.95 + 0.1 * hash3(x, y, 2, 3)));            // the team band (4 rows)
      else if (y === 11) c = V(shade(ctx.c.secondary, 0.95));                                           // gold lashing under it
      else if (y % 5 === 2) c = V(shade(0x7a5a30, 0.9));                                                // horizontal bindings
      else if (y <= 1 && x % 2 === 0) c = V(shade(0x6a4a2a, 0.9));                                       // stakes at the foot
      if (y <= 1 && x % 2 === 1 && y === 0) continue;                                                   // pointed foot
      g.set(x, y, k, c);
      if (x === 5 || x === 10) g.set(x, y, 5, c);
      if (x === 2 || x === 13 || y === 0) g.set(x, y, k - 1, y >= 12 ? ctx.t(0.7) : V(ctx.m[1]));
      if (y >= 12) g.set(x, y, 3, ctx.t(0.62));                                                         // band shows from behind too
    }
    for (let x = 3; x <= 12; x += 3) P(g, x, 7, 5, V(ctx.m[3]));                                         // studs
    return g;
  },
};

registerParts(PARTS);
