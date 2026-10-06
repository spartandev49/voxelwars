// UNITS-B Mythic parts for the three hum1 monsters: Minotaur (bull head with tinted horn caps + brass nose ring, fur body, tinted harness and loincloth),
// Cyclops (one-eye face, one-shoulder tunic + rope belt, tree-trunk club, the boulder in the off hand) and Medusa (a crown of fat snakes with glowing eyes,
// stone-green gaze, gorgon gown and stole). Monsters are scaled up by stats.js (minotaur 1.7, cyclops 2.2); the part grids stay the canonical hum1 sizes.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, Xs, P, Ps, E, hash3, newGrid, headSpace, cutFaceCube, metalAt, vgrad, sprite } from './_kit.js';
import { lathe } from './helms.js';
import { wood } from './weapons_melee.js';
import { furV, snake, fringeV } from './_units_b_kit.js';

export const PARTS = { helms: {}, tunics: {}, armors: {}, shoulders: {}, mains: {}, offs: {} };
const H = PARTS.helms, TU = PARTS.tunics, AR = PARTS.armors, SH = PARTS.shoulders, M = PARTS.mains, O = PARTS.offs;
const G9 = () => ({ body: newGrid('body'), armUL: newGrid('armUL'), armUR: newGrid('armUR'), armLL: newGrid('armLL'), armLR: newGrid('armLR'), legUL: newGrid('legUL'), legUR: newGrid('legUR'), legLL: newGrid('legLL'), legLR: newGrid('legLR') });
const both = (o, a, b, fn) => { fn(o[a], 0); fn(o[b], 1); };
const noise = (x, y, z, s = 1, a = 0.14) => 1 + (hash3(x, y, z, s) - 0.5) * 2 * a;
const R_CARRY = 2.44;

// ================================================================================================================ MINOTAUR
const COAT = 0x6b4a30;
H.minotaur_head = {
  name: 'Minotaur head', meta: { hair: 'none', noEyes: true },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const coat = (x, y, z, f = 1) => V(shade(COAT, f * (0.76 + 0.36 * hash3(x, y, z, 5) + (y > 4 ? 0.05 : 0))));
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.5, 3.5], [2.6, 2.6]], { color: (x, y, z) => coat(x, y, z), n: 2.8 });
    cutFaceCube(hs);
    B(hs, 2, 0, 8, 7, 5, 8, (x, y, z) => coat(x, y, z, y === 5 ? 0.7 : 1));                  // face plane (the skull cube was carved out)
    B(hs, 2, 5, 9, 7, 5, 9, (x, y, z) => coat(x, y, z, 0.55));                               // heavy brow ridge
    B(hs, 3, 0, 9, 6, 3, 9, V(0xd7a08e)); B(hs, 4, 1, 9, 5, 2, 9, V(0xe8b4a2));             // broad pink muzzle
    B(hs, 2, 0, 8, 7, 3, 8, V(0xc58a78));
    Ps(hs, 4, 2, 9, V(0x2a1612)); Ps(hs, 3, 2, 9, V(0x4a2a24));                              // nostrils
    B(hs, 3, 0, 9, 6, 0, 9, V(0xb07868));                                                    // mouth line
    // the brass nose ring: a bright U hanging under the nostrils
    Ps(hs, 3, 1, 9, V(0xe0b82e)); Ps(hs, 3, 0, 9, V(0xf6d850)); B(hs, 4, 0, 9, 5, 0, 9, V(0xe0b82e));
    // eyes: small, angry, bloodshot
    Ps(hs, 3, 3, 8, V(0x140c0a)); Ps(hs, 2, 3, 8, V(0xf0e4d0)); Ps(hs, 3, 4, 8, V(0x24100c)); Ps(hs, 4, 4, 8, V(0x24100c));
    Ps(hs, 2, 4, 8, V(0x8a2a22));
    // ears, then thick horns that sweep out, up and forward; the last three voxels are team-coloured caps
    Bs(hs, 0, 4, 2, 1, 5, 3, (x, y, z) => coat(x, y, z, 0.8));
    const hornV = (y) => V(mixRGB(0x9a8864, 0xf2e8cc, Math.min(1, Math.max(0, (y - 5) / 6))));
    Bs(hs, 0, 5, 3, 1, 7, 6, hornV(5));
    Bs(hs, 0, 8, 4, 1, 9, 6, hornV(8));
    Bs(hs, 0, 10, 4, 1, 10, 6, hornV(10));
    Bs(hs, 0, 11, 5, 1, 11, 7, ctx.t(1.0));
    Bs(hs, 1, 12, 6, 2, 12, 8, ctx.t(0.95));
    Bs(hs, 2, 13, 7, 2, 13, 8, ctx.t(0.9));
    Bs(hs, 0, 10, 4, 1, 10, 6, ctx.t(1.1));                                                  // team band at the base of the cap
    B(hs, 3, 6, 3, 6, 7, 6, (x, y, z) => coat(x, y, z, 0.62));                                // dark forelock between the horns
    return { head, crest };
  },
};

// fur: the whole body, arms and legs are brown fur (mane-dark on the back, lighter chest) with black cloven hooves
TU.minotaur_fur = {
  name: 'Minotaur fur',
  build(ctx) {
    const o = G9(), g = o.body;
    const fur = (x, y, z, f = 1) => furV(COAT, x, y, z, 7, 0.7 * f, 1.12 * f);
    B(g, 0, 0, 0, 9, 8, 4, (x, y, z) => fur(x, y, z, z === 0 ? 0.82 : (z === 4 && y > 3 && x > 1 && x < 8 ? 1.12 : 1) * vgrad(y, 0, 8, 0.92, 1.08)));
    X(g, 3, 8, 3, 6, 8, 4); X(g, 4, 7, 4, 5, 7, 4);
    B(g, 3, 3, 4, 6, 6, 4, (x, y, z) => furV(0x9a7450, x, y, z, 9, 0.8, 1.1));                  // lighter chest
    B(g, 0, 8, 0, 9, 8, 4, (x, y, z) => fur(x, y, z, 0.78)); X(g, 3, 8, 3, 6, 8, 4);          // dark hump of mane at the nape
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 0, 0, 2, 4, 2, (x, y, z) => fur(x, y, z)));
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 2, 0, 2, 4, 2, (x, y, z) => fur(x, y, z, 0.96)); B(a, 0, 0, 0, 2, 1, 2, (x, y, z) => furV(0x4a3220, x, y, z, 3, 0.8, 1.0)); });
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => fur(x, y, z, 0.95)));
    both(o, 'legLL', 'legLR', (l) => {
      B(l, 0, 2, 0, 3, 4, 3, (x, y, z) => fur(x, y, z, 0.9));
      B(l, 0, 0, 0, 3, 1, 5, (x, y, z) => V(shade(0x241a18, 0.8 + 0.4 * hash3(x, y, z, 2) + ((x === 1 || x === 2) && z >= 4 ? 0.12 : 0))));    // hooves
      B(l, 0, 0, 4, 3, 0, 5, V(0x120c0a));
    });
    return o;
  },
};

// harness: crossed team-leather straps with brass studs, a wide belt, tinted loincloth flaps with a gold fringe, brass bracers
AR.minotaur_harness = {
  name: 'Minotaur harness and loincloth',
  build(ctx) {
    const o = G9(), g = o.body;
    const strap = (x, y, z, k = 1.1) => ctx.t(k * (0.92 + 0.14 * hash3(x, y, z, 3)));
    for (let y = 1; y <= 8; y++) {
      const xa = Math.round(0 + (8 - y) * 0.95), xb = Math.round(9 - (8 - y) * 0.95) - 1;     // the two diagonals of the X
      for (const x0 of [xa, xb]) for (let x = x0; x <= Math.min(9, x0 + 1); x++) { P(g, x, y, 4, strap(x, y, 4)); P(g, x, y, 0, strap(x, y, 0, 1.0)); }
      if (y % 3 === 2) { P(g, xa, y, 4, V(ctx.m[3])); P(g, xb + 1, y, 4, V(ctx.m[3])); }
    }
    B(g, 4, 4, 4, 5, 5, 4, V(ctx.m[2])); P(g, 4, 5, 4, V(ctx.m[4]));                              // brass ring where the straps cross
    B(g, 0, 2, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? strap(x, y, z, 0.95) : 0));     // belt
    B(g, 4, 2, 4, 5, 3, 4, V(ctx.m[3])); P(g, 4, 2, 4, V(ctx.m[4]));
    B(g, 0, 0, 0, 9, 1, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? strap(x, y, z, 0.9) : 0));
    // loincloth: front and back flaps on the thighs, fringed
    both(o, 'legUL', 'legUR', (l) => {
      B(l, 0, 1, 3, 3, 4, 3, (x, y, z) => strap(x, y, z, 0.98));                                  // front flap
      B(l, 0, 1, 0, 3, 4, 0, (x, y, z) => strap(x, y, z, 0.85));                                  // back flap
      B(l, 0, 1, 3, 3, 1, 3, (x, y, z) => fringeV(ctx, x + 1)); B(l, 0, 1, 0, 3, 1, 0, (x, y, z) => fringeV(ctx, x));
      B(l, 0, 0, 3, 3, 0, 3, (x, y, z) => ((x % 2) ? V(shade(ctx.c.secondary, 0.9)) : 0));
    });
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 2, 0, 2, 3, 2, (x, y, z) => V(ctx.m[(x + y + z) % 2 ? 2 : 3])); });   // brass bracers
    both(o, 'armUL', 'armUR', (a) => { B(a, 0, 4, 0, 2, 4, 2, (x, y, z) => V(ctx.m[2])); });
    return o;
  },
};

// ================================================================================================================ CYCLOPS
H.cyclops_face = {
  name: 'Cyclops face', meta: { hair: 'all', noEyes: true },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const sk = (x, y, z, f = 1) => V(shade(ctx.c.skin, f * (0.92 + 0.14 * hash3(x, y, z, 1))));
    B(hs, 2, 4, 8, 7, 5, 8, (x, y, z) => sk(x, y, z, 0.82));                                    // heavy forehead
    B(hs, 2, 5, 9, 7, 5, 9, (x, y, z) => sk(x, y, z, 0.62)); B(hs, 3, 5, 9, 6, 5, 9, V(shade(ctx.c.hair, 0.8)));   // one huge brow
    B(hs, 3, 2, 8, 6, 4, 8, V(0xf4efe4));                                                        // the eye: sclera 4 x 3
    B(hs, 3, 2, 9, 6, 4, 9, V(0xf4efe4)); X(hs, 3, 2, 9, 3, 2, 9); X(hs, 6, 2, 9, 6, 2, 9); X(hs, 3, 4, 9, 3, 4, 9); X(hs, 6, 4, 9, 6, 4, 9);
    P(hs, 3, 3, 9, V(0xb8281c)); P(hs, 6, 2, 8, V(0xb8281c));                                    // bloodshot
    B(hs, 4, 2, 9, 5, 4, 9, V(ctx.c.eyes)); B(hs, 4, 3, 9, 5, 3, 9, V(0x10100c)); P(hs, 5, 4, 9, V(0xffffff));   // iris, pupil, glint
    B(hs, 3, 1, 8, 6, 1, 8, (x, y, z) => sk(x, y, z, 0.7));                                      // eye bag
    B(hs, 4, 0, 9, 5, 1, 9, (x, y, z) => sk(x, y, z, 1.1));                                      // fat nose
    B(hs, 2, 0, 8, 7, 0, 8, V(0x6a2a24)); B(hs, 3, 0, 9, 6, 0, 9, V(0x6a2a24));                  // wide mouth
    Ps(hs, 2, 0, 9, V(0xf4efe0)); Ps(hs, 2, 1, 9, V(0xf4efe0)); Ps(hs, 3, 1, 9, V(0xe8e0cc));    // two tusks
    return { head, crest };
  },
};

// one-shoulder tunic (left shoulder), whole garment team cloth, ragged hem, twisted team-colour rope belt and a necklace of knucklebones
TU.cyclops_tunic = {
  name: 'One-shoulder tunic',
  build(ctx) {
    const o = G9(), g = o.body;
    const cloth = (x, y, z, f = 1) => ctx.t(f * noise(x, y, z, 2, 0.12));
    for (let y = 0; y <= 8; y++) {
      const x0 = Math.max(0, Math.round(5 - (8 - y) * 0.7));
      B(g, x0, y, 0, 9, y, 4, (x, yy, z) => cloth(x, yy, z, (y === 0 ? 0.86 : 1) * (x === x0 ? 0.88 : 1)));
    }
    X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ctx.t(((x + z) % 2) ? 1.3 : 0.88));                     // rope belt
    B(g, 0, 2, 0, 9, 2, 4, (x, y, z) => (((x === 0 || x === 9 || z === 0 || z === 4) && (x + z) % 2) ? ctx.t(1.1) : 0));
    B(g, 4, 0, 4, 4, 2, 4, ctx.t(1.25)); B(g, 5, 0, 4, 5, 1, 4, ctx.t(1.0));                    // knot ends
    // knucklebone necklace on the bare right chest
    for (const [x, y] of [[1, 6], [2, 5], [3, 5], [4, 6]]) P(g, x, y, 4, V(0xefe6cc));
    P(g, 2, 4, 4, V(0xf8f2e0)); P(g, 2, 3, 4, V(0x2a2020));
    both(o, 'armUL', 'armUR', (a, i) => { if (i === 0) B(a, 0, 1, 0, 2, 4, 2, (x, y, z) => cloth(x, y, z, 0.96)); });
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 2, 0, 3, 4, 3, (x, y, z) => ((y === 2 && hash3(x, y, z, 5) > 0.55) ? 0 : cloth(x, y, z, 0.94))));
    return o;
  },
};

// the club is a whole tree trunk: knotty, bark-ridged, a stump of a branch and a few stubborn leaves
M.tree_club = {
  name: 'Tree-trunk club', meta: { style: 'overhead', len: 26, back: 5, rest: [R_CARRY, 0, 0], twoHanded: false, grip: [4, 10, 4], minLen: 13, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    const bark = (x, y, z, k = 1) => V(shade(0x6e4a28, k * (0.7 + 0.5 * hash3(x, y, z, 77) + (((x + z) % 3 === 0) ? 0.08 : 0))));
    B(g, 3, 5, 3, 5, 11, 5, (x, y, z) => bark(x, y, z, 0.95));                                  // handle
    B(g, 3, 8, 3, 5, 11, 5, V(shade(0xa8743e, 0.9)));
    for (let y = 12; y <= yt; y++) {
      const t = (y - 12) / Math.max(1, yt - 12), w = t < 0.25 ? 1 : (t < 0.9 ? 3 : 2);          // trunk radius grows from 2.. to 7 across, rounded top
      const lo = 4 - w, hi = 4 + w;
      B(g, lo, y, lo, hi, y, hi, (x, yy, z) => (((x === lo || x === hi) && (z === lo || z === hi) && w > 1) ? 0 : bark(x, yy, z, 0.9 + 0.3 * t)));
    }
    B(g, 3, yt + 1, 3, 5, yt + 1, 5, bark(4, yt + 1, 4, 1.1));                                   // cut top
    for (const [x, y, z] of [[0, yt - 5, 4], [8, yt - 8, 4], [4, yt - 6, 8], [4, yt - 3, 0]]) { B(g, x, y, z, Math.min(8, x + 1), y + 1, Math.min(8, z + 1), bark(x, y, z, 0.8)); }
    for (const [x, y, z] of [[8, yt - 7, 4], [7, yt - 8, 5], [8, yt - 9, 5], [7, yt - 9, 4]]) P(g, x, y, z, V(shade(0x4fa83a, 0.8 + 0.4 * hash3(x, y, z, 5))));   // leaves on the stump
    return g;
  },
};

// the boulder in the off hand: a 14 x 14 x 6 lump of grey rock, moss on top, cracks, and a team-colour rope net so it carries tint
O.boulder = {
  name: 'Boulder', meta: { kind: 'item', w: 14, h: 14 },
  build(ctx) {
    const g = newGrid('offhand');
    E(g, 7.5, 7.5, 2.5, 7.3, 6.9, 2.6, (x, y, z, d) => {
      const n = hash3(x, y, z, 21), moss = y > 8 && hash3(x >> 1, y >> 1, z, 22) > 0.62;
      if (moss) return V(shade(0x5a8a3a, 0.8 + 0.4 * n));
      return V(shade(0x8a8c90, (0.72 + 0.42 * n) * (1.08 - 0.3 * d + (z > 3 ? 0.08 : -0.06))));
    });
    for (const [x, y] of [[5, 9], [6, 8], [6, 7], [7, 6], [7, 5], [8, 5], [9, 4]]) if (g.get(x, y, 5)) g.set(x, y, 5, V(0x4a4c52));    // crack
    // rope net (team cloth): a band around the middle and one crossing it
    for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) for (let z = 5; z >= 0; z--) {
      if (!g.get(x, y, z)) continue;
      if ((y === 7 || y === 8 || x === 7 || x === 8) && z >= 3) g.set(x, y, z, ctx.t(((x + y) % 2) ? 1.25 : 0.95));
      break;
    }
    B(g, 6, 6, 5, 9, 9, 5, (x, y, z) => ((x === 6 || x === 9 || y === 6 || y === 9) ? ctx.t(1.1) : V(shade(0x8a8c90, 0.9))));   // knot where the ropes cross
    return g;
  },
};

// ================================================================================================================ MEDUSA
const SK_G = 0x3f8a34;
H.gorgon_hair = {
  name: 'Gorgon snake hair', meta: { hair: 'none', noEyes: true },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const sc = (n, x, y, z) => (n % 6 < 2 ? V(shade(0x2a6a2a, 0.85 + 0.3 * hash3(x, y, z, 1))) : (n % 6 === 4 ? V(shade(0xb8c84a, 0.85 + 0.2 * hash3(x, y, z, 2))) : V(shade(SK_G, 0.85 + 0.35 * hash3(x, y, z, 3)))));
    // scalp mass under the snakes: dark green cap with a hairline
    B(hs, 2, 6, 2, 7, 6, (x, y, z) => V(shade(0x255a28, 0.8 + 0.4 * hash3(x, y, z, 4))));
    Bs(hs, 1, 3, 2, 1, 5, 7, (x, y, z) => V(shade(0x255a28, 0.8 + 0.4 * hash3(x, y, z, 5)))); B(hs, 2, 2, 1, 7, 5, 1, (x, y, z) => V(shade(0x255a28, 0.8 + 0.4 * hash3(x, y, z, 6))));
    B(hs, 2, 5, 7, 7, 5, 7, (x, y, z) => V(shade(0x255a28, 0.8 + 0.4 * hash3(x, y, z, 7))));
    const paths = [
      [[2, 6, 3], [1, 8, 2], [0, 10, 3], [1, 11, 5]],                     // front right
      [[6, 6, 3], [7, 8, 2], [8, 10, 3], [7, 11, 5]],                     // front left
      [[3, 6, 4], [3, 8, 3], [2, 10, 3], [2, 12, 4], [2, 12, 5]],         // tall right
      [[5, 6, 4], [5, 8, 3], [6, 10, 3], [6, 12, 4], [6, 12, 5]],         // tall left
      [[4, 6, 2], [4, 7, 1], [5, 8, 0], [5, 9, 0]],                       // rear rearing
      [[1, 6, 4], [0, 5, 5], [0, 4, 6], [0, 3, 6]],                       // right hanger
      [[7, 6, 4], [8, 5, 5], [8, 4, 6], [8, 3, 6]],                       // left hanger
    ];
    paths.forEach((pts, i) => snake(hs, pts, 2, (n, x, y, z) => sc(n + i, x, y, z), { head: V(shade(SK_G, 1.0)), eye: G(0xe8ff5a), tongue: V(0xd8281c) }));
    // the gaze: glowing stone-green eyes
    X(hs, 2, 3, 7, 7, 3, 7);
    Ps(hs, 2, 3, 8, G(0xc0ffdc)); Ps(hs, 3, 3, 8, G(0x30f080)); Ps(hs, 2, 4, 8, V(0x143a1c)); Ps(hs, 3, 4, 8, V(0x143a1c)); Ps(hs, 3, 2, 8, V(0x2f6a30));
    return { head, crest };
  },
};

// gorgon gown: floor-length wrap in team cloth with a gold bust band, a belt with a gem and a gold Greek-key hem; arms bare
TU.gorgon_gown = {
  name: 'Gorgon gown',
  build(ctx) {
    const o = G9(), g = o.body;
    B(g, 0, 0, 0, 9, 8, 4, (x, y, z) => ctx.t(noise(x, y, z, 2, 0.1) * 0.92 * ((z === 4 && (x === 2 || x === 5 || x === 7)) ? 0.92 : 1)));
    X(g, 3, 8, 3, 6, 8, 4); X(g, 4, 7, 4, 5, 7, 4);
    Ps(g, 3, 7, 4, V(ctx.m[3])); Ps(g, 2, 6, 4, V(ctx.m[2])); Ps(g, 4, 6, 4, V(ctx.m[2]));        // plunging gold neckline
    B(g, 0, 5, 0, 9, 5, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(ctx.m[2]) : 0));    // gold bust band
    B(g, 0, 2, 0, 9, 2, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(ctx.m[3]) : 0));
    B(g, 4, 2, 4, 5, 2, 4, V(0x2ad870));
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => (((x === 0 || x === 9 || z === 0 || z === 4) && (x + z) % 2) ? V(shade(ctx.m[3], 0.95)) : 0));
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.1) * 0.94)));
    both(o, 'legLL', 'legLR', (l) => { B(l, 0, 2, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 6, 0.1) * 0.9)); B(l, 0, 2, 0, 3, 2, 3, (x, y, z) => (((x + z) % 2) ? V(ctx.m[3]) : V(ctx.m[2]))); });
    return o;
  },
};
// the stole: a lighter team-cloth scarf over both shoulders with two long panels down the front and one down the back
SH.gorgon_stole = {
  name: 'Gorgon stole',
  build(ctx) {
    const body = newGrid('body'), L = newGrid('armUL'), R = newGrid('armUR');
    const c = (x, y, z, f = 1.25) => ctx.t(f * (0.92 + 0.14 * hash3(x, y, z, 61)));
    B(body, 0, 7, 0, 9, 8, 4, (x, y, z) => ((x >= 3 && x <= 6 && z >= 1 && z <= 3 && y === 8) ? 0 : c(x, y, z, 1.3)));
    X(body, 3, 8, 3, 6, 8, 4);
    Bs(body, 1, 1, 4, 2, 6, 4, (x, y, z) => ((y === 1) ? V(shade(ctx.m[3], 0.95)) : c(x, y, z)));
    Bs(body, 3, 0, 0, 5, 6, 0, (x, y, z) => ((y === 0) ? V(shade(ctx.m[3], 0.9)) : c(x, y, z, 1.2)));
    for (const a of [L, R]) B(a, 0, 3, 0, 2, 4, 2, (x, y, z) => c(x, y, z, 1.2));
    return { body, armUL: L, armUR: R };
  },
};

registerParts(PARTS);
