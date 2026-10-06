// UNITS-B Barbarian parts: horned helms (small for the axe thrower, giant for the chieftain), the druid's hood / robe / golden sickle, the axe thrower's
// belt of throwing axes + back rack + off-hand axe, the chieftain's war-horn baldric and bearskin cloak. Same conventions as the core modules.
// Fur, horns, iron and the club stay natural; cloth (tunic sleeves, trews, robes, baldric, hood) is team cloth via ctx.t().
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, Xs, P, Ps, E, hash3, newGrid, headSpace, cutFaceCube, metalAt, vgrad } from './_kit.js';
import { lathe } from './helms.js';
import { wood, edgeCol } from './weapons_melee.js';
import { furV, cl } from './_units_b_kit.js';

export const PARTS = { helms: {}, faces: {}, tunics: {}, armors: {}, capes: {}, backs: {}, mains: {}, offs: {} };
const F = PARTS.faces, H = PARTS.helms, TU = PARTS.tunics, AR = PARTS.armors, CP = PARTS.capes, BK = PARTS.backs, O = PARTS.offs;
const G9 = () => ({ body: newGrid('body'), armUL: newGrid('armUL'), armUR: newGrid('armUR'), armLL: newGrid('armLL'), armLR: newGrid('armLR'), legUL: newGrid('legUL'), legUR: newGrid('legUR'), legLL: newGrid('legLL'), legLR: newGrid('legLR') });
const both = (o, a, b, fn) => { fn(o[a], 0); fn(o[b], 1); };
const noise = (x, y, z, s = 1, a = 0.14) => 1 + (hash3(x, y, z, s) - 0.5) * 2 * a;
const bone = (y, y0, span) => V(mixRGB(0x9a8a68, 0xf4ecd2, Math.min(1, Math.max(0, (y - y0) / span))));

// ---------------------------------------------------------------------------------------------------------------- helms
/** horned iron cap with a fur-trimmed brim, cheek plates, a nasal bar and a pair of horns that sprout sideways and curl up (tall: giant) */
function hornedCap(name, o) {
  return {
    name, meta: { hair: o.hair || 'none', horns: o.top - 4 },
    build(ctx) {
      const { head, crest, hs } = headSpace();
      const iron = (x, y, z) => metalAt(ctx, 0.2 + 0.07 * (y - 4) + (hash3(x, y, z, 2) > 0.85 ? 0.06 : 0) + (x > 4.5 ? 0.04 : 0));
      lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.6, 3.6], [3.1, 3.1], [2.2, 2.2]], { color: iron, n: 2.5 });
      cutFaceCube(hs);
      // fur-trimmed brim: shaggy ring around y4, a little higher at the back
      for (let z = 0; z <= 9; z++) for (let x = 0; x <= 9; x++) if (hs.get(x, 4, z)) hs.set(x, 4, z, V(shade(0xd6c8a4, 0.72 + 0.4 * hash3(x, 4, z, 5))));
      Bs(hs, 1, 5, 1, 1, 5, 3, (x, y, z) => V(shade(0xd6c8a4, 0.7 + 0.4 * hash3(x, y, z, 6))));
      X(hs, 3, 0, 8, 6, 3, 8);
      Bs(hs, 1, 1, 3, 1, 3, 7, (x, y, z) => metalAt(ctx, 0.3 + 0.05 * y));                // cheek plates
      B(hs, 4, 1, 8, 5, 5, 8, (x, y) => metalAt(ctx, 0.5 + 0.04 * y));                    // nasal bar
      if (o.rim) B(hs, 3, 8, 3, 6, 8, 6, V(ctx.m[3]));
      // horns: thick root at the temple, out, up, tip curling in (and forward when `sweep`)
      const t = o.top, tt = t - 4;
      Bs(hs, 0, 5, 3, 1, 6, 6, bone(5, 5, tt));
      Bs(hs, 0, 7, 3 + (o.thick ? 0 : 1), 1, 8, 6 - (o.thick ? 0 : 1), bone(7, 5, tt));
      for (let y = 9; y <= t - 2; y++) Bs(hs, 0, y, 4, o.thick ? 1 : 0, y, 5 + (o.thick ? 1 : 0), bone(y, 5, tt));
      Bs(hs, 1, t - 1, 4 + (o.sweep ? 1 : 0), 1, t - 1, 5 + (o.sweep ? 2 : 0), bone(t - 1, 5, tt));
      Bs(hs, 2, t, 4 + (o.sweep ? 2 : 0), 2, t, 5 + (o.sweep ? 2 : 0), bone(t, 5, tt));
      if (o.sweep) Bs(hs, 2, t + 1, 7, 2, t + 1, 7, bone(t + 1, 5, tt));
      return { head, crest };
    },
  };
}
H.horned_fur_cap = hornedCap('Horned fur cap', { top: 10 });
H.horned_giant = hornedCap('Giant horned helm', { top: 12, thick: true, sweep: true, rim: true });

// the druid's hood: team cloth, pointed peak drooping backward, dark lining around the face, a shawl collar over the shoulders
H.druid_hood = {
  name: 'Druid hood', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const body = newGrid('body');
    const cloth = (x, y, z) => ctx.t((0.86 + 0.2 * hash3(x, y, z, 21)) * (y >= 7 ? 1.06 : 1));
    lathe(hs, [null, [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.7, 3.7], [3.3, 3.3], [2.8, 2.8], [2.2, 2.2], [1.6, 1.6]], { color: cloth, n: 2.4 });
    cutFaceCube(hs);
    X(hs, 2, 0, 8, 7, 4, 8);                                                       // the face opening
    Bs(hs, 1, 0, 6, 1, 4, 8, (x, y, z) => ctx.t(0.5 + 0.06 * hash3(x, y, z, 22)));   // dark lining either side of the face
    B(hs, 2, 5, 8, 7, 5, 8, ctx.t(0.62));                                          // brim shadow
    B(hs, 4, 8, 0, 5, 9, 0, cloth); B(hs, 4, 10, 0, 5, 10, 1, cloth); B(hs, 4, 6, 0, 5, 7, 0, cloth);   // the peak droops backward
    // shawl collar over the shoulders (body grid)
    B(body, 1, 6, 0, 8, 8, 4, (x, y, z) => ((x >= 3 && x <= 6 && z >= 1 && z <= 3 && y >= 8) ? 0 : ctx.t(0.9 + 0.2 * hash3(x, y, z, 23))));
    B(body, 3, 8, 3, 6, 8, 4, 0); X(body, 3, 8, 1, 6, 8, 3);
    B(body, 3, 6, 4, 6, 6, 4, V(shade(0x4a8a3a, 0.9))); P(body, 4, 6, 4, V(ctx.m[3])); P(body, 5, 6, 4, V(ctx.m[3]));   // leaf clasp
    return { head, crest, body };
  },
};

// a brow band for bare-headed riders (Numidian): team cloth with a gold stud and two feather tips; leaves the hair layer alone
H.brow_band = {
  name: 'Brow band', meta: { hair: 'all' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const ring = (x, z) => (x === 1 || x === 8 || z === 1 || z === 8) && !((x === 1 || x === 8) && (z === 1 || z === 8));
    B(hs, 1, 5, 1, 8, 5, 8, (x, y, z) => (ring(x, z) ? ctx.t(1.0 + 0.1 * hash3(x, y, z, 31)) : 0));
    B(hs, 1, 4, 1, 8, 4, 8, (x, y, z) => (ring(x, z) && z > 4 ? ctx.t(0.85) : 0));
    P(hs, 4, 5, 8, V(ctx.m[3])); P(hs, 5, 5, 8, V(ctx.m[3]));
    for (const [x, h] of [[7, 3], [8, 2]]) for (let i = 0; i < h; i++) P(hs, x, 6 + i, 3, V(shade(0xf0ead8, 0.9 + 0.1 * i)));   // two short feathers
    return { head, crest };
  },
};

// ---------------------------------------------------------------------------------------------------------------- faces
// Axe thrower: a drooping moustache and two thin braids hanging off the chin, tied with gold (leaves the chest tunic visible)
F.beard_two_braids = {
  name: 'Two braids',
  build(ctx) {
    const head = newGrid('head'), body = newGrid('body');
    const hv = (x, y, z, f = 1) => V(shade(ctx.c.hair, f * (0.84 + 0.32 * hash3(x, y, z, 3))));
    B(head, 2, 0, 8, 7, 1, 8, (x, y, z) => hv(x, y, z, 0.95)); Bs(head, 1, 0, 4, 1, 2, 7, (x, y, z) => hv(x, y, z, 0.9));
    B(head, 3, 0, 9, 6, 0, 9, (x, y, z) => hv(x, y, z, 1.05));
    B(head, 2, 2, 8, 7, 2, 9, (x, y, z) => hv(x, y, z, 1.1));                                   // moustache
    Bs(head, 1, 1, 8, 1, 2, 9, (x, y, z) => hv(x, y, z, 1.15)); Bs(head, 1, 0, 9, 1, 0, 9, (x, y, z) => hv(x, y, z, 1.1));    // drooping ends
    for (const x of [3, 6]) { for (let y = 8; y >= 3; y--) P(body, x, y, 4, hv(x, y, 4, y % 2 ? 0.8 : 1.15)); P(body, x, 3, 4, V(ctx.m[3])); P(body, x, 2, 4, hv(x, 2, 4, 1.1)); }
    X(body, 3, 8, 3, 6, 8, 4);
    return { head, body };
  },
};

// ---------------------------------------------------------------------------------------------------------------- torso
// Axe thrower: long-sleeved team tunic, shaggy fur collar and cuffs, a wide belt with four throwing axes hung in loops.
TU.thrower_tunic = {
  name: 'Fur-trimmed tunic with axe belt',
  build(ctx) {
    const o = G9(), g = o.body;
    const fur = (x, y, z) => V(shade(0xcfc0a0, 0.62 + 0.5 * hash3(x, y, z, 41)));
    B(g, 0, 0, 0, 9, 8, 4, (x, y, z) => ctx.t(noise(x, y, z, 2, 0.1) * (y === 0 ? 0.88 : 1)));
    B(g, 0, 8, 0, 9, 8, 4, fur); X(g, 3, 8, 3, 6, 8, 4); X(g, 3, 8, 1, 6, 8, 3);                       // fur collar
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? fur(x, y, z) : 0));    // fur hem
    B(g, 0, 2, 0, 9, 2, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(0x7a5a38, 0.95)) : 0));   // belt
    B(g, 4, 2, 4, 5, 2, 4, V(ctx.m[3]));
    // four throwing axes in belt loops: haft above the belt, iron head on top
    for (const x of [1, 2, 7, 8]) { B(g, x, 3, 4, x, 5, 4, V(shade(0x8a5a2e, 0.95))); }
    for (const [x0, x1] of [[1, 2], [7, 8]]) { P(g, x0, 6, 4, V(ctx.m[3])); P(g, x1, 6, 4, V(ctx.m[4])); P(g, x0 === 1 ? 0 : 9, 6, 4, V(ctx.m[2])); P(g, x0, 7, 4, V(ctx.m[2])); P(g, x1, 5, 4, V(ctx.m[2])); }
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 0, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 3, 0.1))));
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 3, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 4, 0.1))); B(a, 0, 2, 0, 2, 2, 2, fur); });
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 3, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.1) * 0.95)));
    return o;
  },
};

// Druid: long team-cloth robe to the ankles, a twisted team rope belt with a hanging knot, leaf-green trim, a gold sickle clasp and bell sleeves.
TU.druid_robe = {
  name: 'Druid robe',
  build(ctx) {
    const o = G9(), g = o.body;
    const leaf = (x, y, z) => V(shade(0x4f9a3a, 0.7 + 0.5 * hash3(x, y, z, 51)));
    B(g, 0, 0, 0, 9, 8, 4, (x, y, z) => ctx.t(noise(x, y, z, 2, 0.1) * (y === 0 ? 0.9 : 1) * ((z === 4 && (x === 3 || x === 6)) ? 0.92 : 1)));
    X(g, 3, 8, 3, 6, 8, 4); X(g, 4, 7, 4, 5, 7, 4);
    Ps(g, 3, 7, 4, leaf(3, 7, 4)); Ps(g, 4, 6, 4, leaf(4, 6, 4)); Ps(g, 3, 6, 4, leaf(3, 6, 4)); Ps(g, 2, 7, 4, leaf(2, 7, 4));     // leafy collar
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ctx.t((x + z) % 2 ? 1.25 : 0.95));                                                      // twisted team-colour rope belt
    B(g, 0, 2, 0, 9, 2, 4, (x, y, z) => (((x === 0 || x === 9 || z === 0 || z === 4) && (x + z) % 2 === 0) ? V(0xe8e0c8) : 0));
    B(g, 6, 0, 4, 6, 2, 4, ctx.t(1.2)); P(g, 6, 0, 4, V(ctx.m[3])); P(g, 5, 2, 4, V(ctx.m[3]));                                   // knot and tassel
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? leaf(x, y, z) : 0));
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 0, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 3, 0.1))));
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 2, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 4, 0.1) * 0.95)); B(a, 0, 2, 0, 2, 2, 2, leaf(1, 2, 1)); });
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.1))));
    both(o, 'legLL', 'legLR', (l) => { B(l, 0, 2, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 6, 0.1) * 0.95)); B(l, 0, 2, 0, 3, 2, 3, (x, y, z) => leaf(x, y, z)); });
    return o;
  },
};

// Chieftain: the war-horn baldric. A broad team-cloth strap from the right shoulder to the left hip, a belt, and the horn (cream, gold-banded) hanging at the hip.
AR.horn_baldric = {
  name: 'War-horn baldric',
  build(ctx) {
    const o = G9(), g = o.body;
    // the strap is a DARKER shade of the team cloth than the shirt (a tinted strap, so it stays visible on the tinted shirt), with gold studs
    for (let y = 0; y <= 8; y++) {
      const x0 = Math.round(0 + (8 - y) * 0.95);
      for (let x = x0; x <= Math.min(9, x0 + 3); x++) { const edge = x === x0 || x === x0 + 3; P(g, x, y, 4, edge ? ctx.t(0.45) : ctx.t(0.62 + 0.08 * hash3(x, y, 4, 2))); P(g, x, y, 0, edge ? ctx.t(0.42) : ctx.t(0.58)); }
      if (y % 3 === 1 && x0 + 1 <= 9) P(g, x0 + 1, y, 4, V(ctx.m[3]));
    }
    B(g, 0, 7, 0, 3, 8, 4, (x, y, z) => ctx.t(0.62)); X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 1, 0, 9, 1, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? ctx.t(0.5) : 0));    // belt
    B(g, 4, 1, 4, 5, 1, 4, V(ctx.m[3]));
    // the horn lies along the left hip: a curved cream tube with a gold band and mouthpiece
    const horn = [[9, 3], [8, 3], [8, 2], [7, 2], [7, 1], [6, 1]];
    for (let i = 0; i < horn.length; i++) { const [x, y] = horn[i]; P(g, x, y, 4, V(shade(0xefe6c8, 0.86 + 0.1 * i / horn.length))); }
    P(g, 9, 4, 4, V(ctx.m[3])); P(g, 9, 3, 4, V(ctx.m[3])); P(g, 6, 0, 4, V(0xd8c8a0)); P(g, 8, 3, 3, V(0xefe6c8));
    return o;
  },
};

// ---------------------------------------------------------------------------------------------------------------- capes / backs / offs
// Bearskin cloak: a pelt over the shoulders and upper back only (the tunic and trews stay visible below), shaggy lower edge, paws hanging at the front corners.
CP.bearskin_short = {
  name: 'Bearskin cloak (short)',
  build(ctx) {
    const cape = newGrid('cape');
    const fur = (x, y, z, f = 1) => V(shade(0x8c6c4a, f * (0.74 + 0.5 * hash3(x, y, z, 61))));
    B(cape, 0, 11, 0, 9, 13, 1, (x, y, z) => ((y < 12 && hash3(x, y, z, 62) < 0.45) ? 0 : fur(x, y, z, 0.92 + 0.04 * (y - 11))));
    B(cape, 0, 12, 0, 9, 13, 1, (x, y, z) => fur(x, y, z, 1.18));
    B(cape, 0, 9, 0, 1, 12, 1, (x, y, z) => ((hash3(x, y, z, 63) > 0.35) ? fur(x, y, z, 0.88) : 0));      // paws
    B(cape, 8, 9, 0, 9, 12, 1, (x, y, z) => ((hash3(x, y, z, 64) > 0.35) ? fur(x, y, z, 0.88) : 0));
    B(cape, 3, 12, 0, 6, 12, 1, (x, y, z) => ((x % 2) ? ctx.t(0.95) : 0));                               // tinted tie band at the neck
    return { cape };
  },
};

BK.axe_rack = {
  name: 'Throwing-axe rack',
  build(ctx) {
    const g = newGrid('back');
    B(g, 1, 6, 5, 10, 7, 7, (x, y, z) => ctx.t(((x + y) % 2 ? 1.0 : 0.88) * (0.95 + 0.1 * hash3(x, y, z, 3))));       // tinted cloth strap across the back
    const haft = V(shade(0x9a6a3a, 1.0));
    g.line(2, 1, 6, 9, 11, 6, V(shade(0x9a6a3a, 0.95)), 1); g.line(9, 1, 5, 2, 11, 5, haft, 1);                        // two crossed axes
    g.line(3, 1, 6, 9, 10, 6, haft, 1); g.line(8, 1, 5, 2, 10, 5, V(shade(0x9a6a3a, 0.9)), 1);
    for (const [x0, x1, z] of [[9, 11, 5], [0, 2, 4]]) for (let y = 9; y <= 13; y++) for (let x = x0; x <= x1; x++) {
      const edge = (x === (x0 === 9 ? 11 : 0)), corner = edge && (y === 9 || y === 13);
      if (corner) continue;
      B(g, x, y, z, x, y, z + 1, V(ctx.m[edge ? 4 : ((x + y) % 2 ? 3 : 2)]));
    }
    return g;
  },
};

// Axe thrower's second axe, carried in the off hand (hangs down-forward like the second sword)
O.throwing_axe = {
  name: 'Throwing axe (off hand)', meta: { kind: 'item', rest: [2.44, 0, 0] },
  build(ctx) {
    const g = newGrid('offhand');
    for (let y = 6; y <= 14; y++) B(g, 8, y, 4, 8, y, 4, V(shade(0x8a5a2e, 0.9 + 0.2 * hash3(8, y, 4, 2))));
    B(g, 7, 7, 3, 9, 9, 4, V(shade(0xa8743e, 0.9)));                                     // wrapped grip
    B(g, 7, 6, 3, 9, 6, 4, V(ctx.m[1]));                                                  // pommel
    for (const [y, zf] of [[15, 5], [14, 5], [13, 5], [12, 5]]) { for (let z = 3; z <= zf; z++) B(g, 7, y, z, 9, y, z, edgeCol(ctx, z === zf ? 'edge' : (z === 3 ? 'spine' : 'mid'))); }
    return g;
  },
};

// Druid's golden sickle, held in the left hand
O.golden_sickle = {
  name: 'Golden sickle (off hand)', meta: { kind: 'item', rest: [2.2, 0, 0], metal: 'gold' },
  build(ctx) {
    const g = newGrid('offhand');
    for (let y = 6; y <= 10; y++) B(g, 8, y, 4, 8, y, 4, V(shade(0x7a5a38, 0.9 + 0.2 * hash3(8, y, 4, 2))));
    B(g, 7, 7, 3, 9, 9, 4, V(shade(0xa8743e, 0.9)));
    const blade = [[4, 11], [4, 12], [5, 13], [5, 14], [4, 15], [3, 15], [2, 14]];       // crescent in the YZ plane, edge on the inside
    for (const [z, y] of blade) { B(g, 8, y, z, 8, y, z, V(ctx.m[3])); B(g, 8, y - 1, z, 8, y - 1, z, V(ctx.m[2])); }
    P(g, 8, 15, 3, V(ctx.m[4])); P(g, 8, 14, 2, V(ctx.m[4]));
    return g;
  },
};


// Chieftain's shirt: long-sleeved team cloth to the wrist, leather cuffs, a laced collar, a broad belt and a gold-trimmed hem
TU.clan_tunic = {
  name: 'Clan shirt',
  build(ctx) {
    const o = G9(), g = o.body;
    B(g, 0, 0, 0, 9, 8, 4, (x, y, z) => ctx.t(noise(x, y, z, 2, 0.1) * (y === 0 ? 0.88 : 1) * ((z === 4 && (x === 3 || x === 6)) ? 0.93 : 1)));
    X(g, 3, 8, 3, 6, 8, 4); X(g, 4, 7, 4, 5, 7, 4);
    for (const y of [6, 5, 4]) P(g, y % 2 ? 4 : 5, y, 4, V(0xe8e0c8));                                  // lacing
    B(g, 0, 2, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? ctx.t(0.5 + 0.08 * (y - 2)) : 0));
    B(g, 4, 2, 4, 5, 3, 4, V(ctx.m[3]));
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? V(shade(ctx.c.secondary, 0.85 + 0.15 * (x % 2))) : 0));
    both(o, 'armUL', 'armUR', (a) => B(a, 0, 0, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 3, 0.1))));
    both(o, 'armLL', 'armLR', (a) => { B(a, 0, 2, 0, 2, 4, 2, (x, y, z) => ctx.t(noise(x, y, z, 4, 0.1) * 0.97)); B(a, 0, 2, 0, 2, 2, 2, ctx.t(0.5)); });
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 3, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.1) * 0.95)));
    return o;
  },
};

// the clan war-club: weathered pale wood, iron hoops and spikes (a lighter cousin of the library's massive club so it does not vanish into shadow)
PARTS.mains.war_club = {
  name: 'Clan war-club', meta: { style: 'overhead', len: 17, back: 5, rest: [2.44, 0, 0], twoHanded: true, grip: [4, 10, 4], minLen: 10, kind: 'melee' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    const wc = (x, y, z, k = 1) => V(shade(0xb08650, k * (0.78 + 0.34 * hash3(x, y, z, 9))));
    B(g, 4, 5, 4, 4, 11, 4, (x, y, z) => wc(x, y, z, 0.9)); B(g, 3, 6, 3, 5, 11, 5, (x, y, z) => wc(x, y, z, 0.9));
    B(g, 3, 8, 3, 5, 11, 5, V(shade(0x6a4a2a, 0.95)));
    // a tapering trunk: thin by the hand, swelling to a 5-wide head, rounded at the tip
    for (let y = 12; y <= yt; y++) {
      const t = (y - 12) / Math.max(1, yt - 12), r = t < 0.22 ? 1 : (t < 0.9 ? 2 : 1), lo = 4 - r, hi = 4 + r;
      B(g, lo, y, lo, hi, y, hi, (x, yy, z) => (r > 1 && (x === lo || x === hi) && (z === lo || z === hi) && (t < 0.4 || t > 0.8) ? 0 : wc(x, yy, z, 0.92 + 0.2 * t)));
    }
    for (const y of [Math.round(yt - 0.35 * ctx.len), yt - 2]) if (y > 12) B(g, 2, y, 2, 6, y, 6, (x, yy, z) => (((x === 2 || x === 6) && (z === 2 || z === 6)) ? 0 : V(ctx.m[(x + z) % 2 ? 1 : 2])));    // iron hoops
    for (let y = yt - Math.round(0.3 * ctx.len) + 1; y <= yt - 3; y += 2) for (const [dx, dz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) P(g, 4 + dx, y, 4 + dz, V(ctx.m[3]));
    P(g, 4, yt + 1, 4, V(ctx.m[4])); B(g, 3, yt, 3, 5, yt, 5, V(ctx.m[2]));
    return g;
  },
};

registerParts(PARTS);
