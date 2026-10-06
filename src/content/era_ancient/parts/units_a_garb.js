// UNITS-A garments: tunics, armours, shoulders, capes, backs and legs for the Hellene, Roman and Egyptian specials. Same conventions as torsos.js / shoulders.js /
// capes.js / backs.js / legs.js (body grid x0..9, y0..8, z0..4 front=4; arms 3x5x3; legs 4x5x4 + 4x5x6; cape 10x14x2; back 12x14x8 content toward -Z).
// Cloth is team tinted through ctx.t(f); faction colours, metals, skin and leather stay neutral.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, Ps, E, hash3, newGrid, metalAt, sprite, vgrad } from './_kit.js';
import { PARTS as TORSOS } from './torsos.js';
import { PARTS as LEGS } from './legs.js';

export const PARTS = { tunics: {}, armors: {}, shoulders: {}, capes: {}, backs: {}, legs: {} };
const TU = PARTS.tunics, AR = PARTS.armors, SH = PARTS.shoulders, CP = PARTS.capes, BK = PARTS.backs, LG = PARTS.legs;

const G9 = () => ({ body: newGrid('body'), armUL: newGrid('armUL'), armUR: newGrid('armUR'), armLL: newGrid('armLL'), armLR: newGrid('armLR'), legUL: newGrid('legUL'), legUR: newGrid('legUR'), legLL: newGrid('legLL'), legLR: newGrid('legLR') });
const both = (o, a, b, fn) => { fn(o[a], 0); fn(o[b], 1); };
const noise = (x, y, z, s = 1, a = 0.14) => 1 + (hash3(x, y, z, s) - 0.5) * 2 * a;
const neckOpen = (g) => { X(g, 3, 8, 3, 6, 8, 4); X(g, 4, 7, 4, 5, 7, 4); };
const lea = (x, y, z, base = 0x6a4224, f = 1) => V(shade(base, f * (0.84 + 0.3 * hash3(x, y, z, 71))));

// ------------------------------------------------------------------------------------------------ tunics
/** Philosopher's himation: a white chiton underneath, a big tinted drape over the left shoulder, across the chest to the right hip, wrapped round the legs. */
TU.himation = {
  name: 'Himation (draped robe)', meta: { faction: 'hellenes' },
  build(ctx) {
    const o = G9(), g = o.body;
    const white = (x, y, z, f = 1) => V(shade(0xf4f0e4, f * noise(x, y, z, 3, 0.04)));
    const drape = (x, y, z, f = 1) => ctx.t(f * noise(x, y, z, 4, 0.09) * (((x + y * 2) % 5 === 0) ? 0.88 : 1));
    const trim = (x, y, z) => V(shade(ctx.c.primary, 0.85 + 0.2 * hash3(x, y, z, 5)));
    const xmin = (y) => Math.max(0, Math.round(5 - (8 - y) * 1.25));
    B(g, 0, 0, 0, 9, 8, 4, (x, y, z) => white(x, y, z, y === 8 ? 1.04 : 1));
    for (let y = 0; y <= 8; y++) for (let z = 0; z <= 4; z++) {
      const lo = z >= 2 ? xmin(y) : (y >= 7 ? 3 : 0);
      for (let x = lo; x <= 9; x++) g.set(x, y, z, drape(x, y, z, 0.96 + 0.03 * y));
    }
    for (let y = 1; y <= 8; y++) if (xmin(y) > 0) P(g, xmin(y), y, 4, trim(xmin(y), y, 4));                  // dark edge of the drape along the diagonal
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? trim(x, y, z) : 0));    // hem
    neckOpen(g);
    const un = (a) => B(a, 0, 0, 0, 2, 4, 2, (x, y, z) => drape(x, y, z, 0.98));
    un(o.armUL); B(o.armLL, 0, 2, 0, 2, 4, 2, (x, y, z) => drape(x, y, z, 0.94)); B(o.armLL, 0, 2, 0, 2, 2, 2, trim);
    B(o.armUR, 0, 3, 0, 2, 4, 2, (x, y, z) => white(x, y, z)); B(o.armUR, 0, 3, 0, 2, 3, 2, trim);               // short white chiton sleeve, bare forearm
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => drape(x, y, z, 0.94)));
    both(o, 'legLL', 'legLR', (l) => { B(l, 0, 2, 0, 3, 4, 3, (x, y, z) => drape(x, y, z, 0.9)); B(l, 0, 2, 0, 3, 2, 3, trim); });
    return o;
  },
};

/** Senator's toga: a long tinted drape with a broad purple stripe running from the left shoulder to the right hip (front) and back again, a thick roll at the waist. */
TU.toga_senator = {
  name: 'Senator toga (purple stripe)', meta: { faction: 'romans' },
  build(ctx) {
    const o = G9(), g = o.body;
    const cloth = (x, y, z, f = 1) => ctx.t(f * noise(x, y, z, 6, 0.08) * (((x * 2 + y) % 7 === 0) ? 0.9 : 1));
    const purple = (x, y, z) => V(shade(ctx.c.primary, 0.88 + 0.22 * hash3(x, y, z, 9)));
    B(g, 0, 0, 0, 9, 8, 4, (x, y, z) => cloth(x, y, z, y % 3 === 0 ? 0.96 : 1.02));
    for (let y = 0; y <= 8; y++) {
      const bx = Math.round(1 + y * 0.75);
      for (let x = bx; x <= Math.min(9, bx + 2); x++) P(g, x, y, 4, purple(x, y, 4));
      const bb = Math.round(7 - y * 0.75);
      for (let x = Math.max(0, bb - 2); x <= bb; x++) P(g, x, y, 0, purple(x, y, 0));
    }
    B(g, 0, 2, 4, 9, 3, 4, (x, y, z) => ((hash3(x, y, 4, 3) > 0.75 || g.get(x, y, 4) === purple(x, y, 4)) ? g.get(x, y, 4) : ctx.t(1.16 - 0.08 * (y === 2 ? 1 : 0))));   // the thick roll (sinus)
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? ctx.t(0.82) : 0));
    neckOpen(g);
    B(o.armUL, 0, 0, 0, 2, 4, 2, (x, y, z) => cloth(x, y, z, 1.04));                                           // left arm wrapped in the toga
    B(o.armLL, 0, 3, 0, 2, 4, 2, (x, y, z) => cloth(x, y, z, 1.0)); B(o.armLL, 0, 3, 0, 2, 3, 2, purple);
    B(o.armUR, 0, 2, 0, 2, 4, 2, (x, y, z) => cloth(x, y, z, 0.98)); B(o.armUR, 0, 2, 0, 2, 2, 2, purple);      // short tunic sleeve with a purple cuff
    both(o, 'legUL', 'legUR', (l) => B(l, 0, 0, 0, 3, 4, 3, (x, y, z) => cloth(x, y, z, 0.96)));
    both(o, 'legLL', 'legLR', (l) => { B(l, 0, 2, 0, 3, 4, 3, (x, y, z) => cloth(x, y, z, 0.93)); B(l, 0, 2, 0, 3, 2, 3, purple); });
    return o;
  },
};

/** Gladiator's subligaculum: a tinted loincloth wrapped round the hips with a front flap, a studded leather belt, nothing else (bare chest). */
TU.subligaculum = {
  name: 'Subligaculum (loincloth)', meta: { faction: 'romans' },
  build(ctx) {
    const o = G9(), g = o.body;
    B(g, 0, 0, 0, 9, 2, 4, (x, y, z) => ctx.t(noise(x, y, z, 4, 0.09) * (y === 0 ? 0.88 : 1.0)));
    B(g, 0, 3, 0, 9, 3, 4, (x, y, z) => ((x === 0 || x === 9 || z === 0 || z === 4) ? lea(x, y, z, 0x6a4224, 0.9) : 0));       // belt (balteus)
    B(g, 3, 3, 4, 6, 3, 4, (x, y, z) => V(shade(ctx.m[3], 0.9 + 0.15 * (x % 2)))); Ps(g, 1, 3, 4, V(ctx.m[4])); Ps(g, 8, 3, 4, V(ctx.m[4]));  // buckle plate + studs
    B(g, 0, 0, 0, 9, 0, 4, (x, y, z) => ((z === 4 && x % 2 === 0) ? V(shade(ctx.c.secondary, 0.9)) : 0));                      // gold hem dashes
    B(o.legUL, 0, 3, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.09) * 0.95)); B(o.legUR, 0, 3, 0, 3, 4, 3, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.09) * 0.95));
    B(o.legUL, 0, 1, 3, 1, 2, 3, (x, y, z) => ctx.t(0.9)); B(o.legUR, 2, 1, 3, 3, 2, 3, (x, y, z) => ctx.t(0.9));                // the front flap hangs between the thighs
    B(o.legUL, 0, 1, 3, 1, 1, 3, V(shade(ctx.c.secondary, 0.85))); B(o.legUR, 2, 1, 3, 3, 1, 3, V(shade(ctx.c.secondary, 0.85)));
    return o;
  },
};

/** Mummy wrappings: wound all over in strips washed in the team colour, with gaps of dark dry skin, a torn chest, loose strands. */
TU.mummy_wraps = {
  name: 'Mummy wrappings (ragged)', meta: { faction: 'egyptians' },
  build(ctx) {
    const o = G9();
    const wrap = (x, y, z, s = 0) => {
      const d = (y + (x >> 1) + (z >> 1) + s) % 4, n = hash3(x, y, z, 12 + s);
      if (n > 0.9) return 0;                                                          // ragged hole: the skin below shows
      if (n > 0.8) return V(shade(0xe2d8bc, 0.86 + 0.2 * n));                          // a loose strip of plain linen
      if (d === 3) return V(shade(0xcfc4a2, 0.8 + 0.2 * n));                           // dusty band
      return ctx.t((d === 0 ? 1.0 : d === 1 ? 0.88 : 0.95) * (0.92 + 0.14 * n));
    };
    B(o.body, 0, 0, 0, 9, 8, 4, (x, y, z) => wrap(x, y, z));
    B(o.armUL, 0, 0, 0, 2, 4, 2, (x, y, z) => wrap(x, y, z, 1)); B(o.armUR, 0, 0, 0, 2, 4, 2, (x, y, z) => wrap(x, y, z, 2));
    B(o.armLL, 0, 0, 0, 2, 4, 2, (x, y, z) => wrap(x, y + 1, z, 3)); B(o.armLR, 0, 0, 0, 2, 4, 2, (x, y, z) => wrap(x, y + 2, z, 4));
    B(o.legUL, 0, 0, 0, 3, 4, 3, (x, y, z) => wrap(x, y, z, 5)); B(o.legUR, 0, 0, 0, 3, 4, 3, (x, y, z) => wrap(x, y, z, 6));
    B(o.legLL, 0, 2, 0, 3, 4, 3, (x, y, z) => wrap(x, y + 3, z, 7)); B(o.legLR, 0, 2, 0, 3, 4, 3, (x, y, z) => wrap(x, y + 1, z, 8));
    B(o.legLL, 0, 0, 0, 3, 1, 5, (x, y, z) => wrap(x, y, z, 2)); B(o.legLR, 0, 0, 0, 3, 1, 5, (x, y, z) => wrap(x, y, z, 5));
    // the wrapping is torn open on the chest (dry ribs), strands trail off the belt and the forearms
    B(o.body, 2, 4, 4, 4, 6, 4, (x, y, z) => ((y === 5) ? V(0xd8cdb0) : V(0x2e281e))); P(o.body, 3, 6, 4, V(0xd8cdb0));
    for (const [g, x, y0, y1, z] of [[o.legUL, 1, 0, 4, 3], [o.legUR, 2, 1, 4, 3], [o.armLL, 1, 0, 2, 2], [o.armLR, 1, 0, 3, 2]]) for (let y = y0; y <= y1; y++) P(g, x, y, z, V(shade(0xe8dec2, 0.92 + 0.12 * (y % 2))));
    for (const x of [1, 4, 7]) for (let y = 3; y <= 4; y++) P(o.body, x, y, 4, V(0xeee4c8));
    return o;
  },
};

// ------------------------------------------------------------------------------------------------ armours
/** Strategos: the bronze muscle cuirass under a knotted general's sash (team colour) with the baton tucked in. */
AR.thorax_strategos = {
  name: 'Muscle cuirass, general\'s sash', meta: { metal: 'bronze', faction: 'hellenes' },
  build(ctx) {
    const o = TORSOS.armors.thorax_bronze.build(ctx), g = o.body;
    // golden trim along the neck and the shoulder straps
    B(g, 0, 8, 0, 9, 8, 4, (x, y, z) => ((g.get(x, y, z)) ? V(shade(ctx.m[3], 1.0 + 0.08 * (x % 2))) : 0));
    // the sash: two turns round the waist, a knot on the right hip with two tails hanging over the thigh
    B(g, 0, 1, 0, 9, 2, 4, (x, y, z) => ctx.t(noise(x, y, z, 5, 0.08) * (y === 1 ? 0.9 : 1.05)));
    B(g, 1, 3, 4, 3, 3, 4, ctx.t(1.1)); P(g, 2, 2, 4, ctx.t(1.25)); P(g, 2, 1, 4, ctx.t(1.25));
    B(o.legUR, 2, 2, 3, 3, 4, 3, (x, y, z) => ctx.t(0.96 - 0.04 * (4 - y))); B(o.legUR, 2, 4, 3, 3, 4, 3, ctx.t(1.15));
    // the baton, tucked into the sash on the left hip: wood with gold caps, sloping up and out
    for (const [x, y, c] of [[6, 1, V(ctx.m[3])], [7, 2, V(0x6a4020)], [8, 3, V(0x6a4020)], [9, 4, V(ctx.m[4])]]) P(g, x, y, 4, c);
    return o;
  },
};

/** Centurion: dark leather cuirass with a harness of straps across the chest carrying silver phalerae (the discs), studded straps over the shoulders. */
AR.harness_phalerae = {
  name: 'Leather cuirass with phalerae', meta: { faction: 'romans' },
  build(ctx) {
    const o = G9(), g = o.body, sv = [0x70767e, 0x9aa0a8, 0xc4cad2, 0xe2e6ec, 0xffffff];
    const leather = (x, y, z, f = 1) => V(shade(0x4a2e1a, f * noise(x, y, z, 6, 0.14) * vgrad(y, 1, 8, 0.9, 1.08)));
    B(g, 0, 1, 0, 9, 8, 4, (x, y, z) => leather(x, y, z));
    X(g, 3, 8, 3, 6, 8, 4);
    B(g, 0, 8, 0, 9, 8, 4, (x, y, z) => (g.get(x, y, z) ? V(shade(0x7a6a58, 0.9 + 0.1 * (x % 2))) : 0));
    B(g, 0, 1, 0, 9, 1, 4, (x, y, z) => V(shade(0x2a1a10, 0.9 + 0.1 * (x % 2))));                                 // lower edge
    // straps: an X across the chest and the belt, silver studs
    for (let y = 2; y <= 7; y++) { const x = Math.round(2 + (y - 2) * 0.9), x2 = 9 - x; P(g, x, y, 4, V(0x2a1a10)); P(g, x + 1, y, 4, V(0x2a1a10)); P(g, x2, y, 4, V(0x2a1a10)); P(g, x2 - 1, y, 4, V(0x2a1a10)); }
    // the phalerae: four 3x3 silver discs with a raised boss, two more studs on the straps
    const disc = (cx, cy) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = (dx === 0 && dy === 0) ? sv[4] : ((Math.abs(dx) + Math.abs(dy) === 2) ? sv[1] : sv[2 + ((dx + dy) > 0 ? 1 : 0)]); P(g, cx + dx, cy + dy, 4, V(c)); } };
    disc(2, 6); disc(7, 6); disc(2, 3); disc(7, 3);
    B(g, 4, 2, 4, 5, 3, 4, (x, y, z) => V(sv[(x + y) % 2 ? 3 : 2]));                                               // central buckle plate
    both(o, 'armUL', 'armUR', (a) => { B(a, 0, 4, 0, 2, 4, 2, (x, y, z) => V(sv[2])); B(a, 0, 3, 0, 2, 3, 2, (x, y, z) => ((x + z) % 2 ? V(sv[1]) : V(0x2a1a10))); });
    return o;
  },
};

// ------------------------------------------------------------------------------------------------ shoulders
/** Gladiator's manica: a segmented arm guard on the weapon arm (rings of metal alternating with tinted leather bands), a bracer and a shoulder plate on the other. */
SH.manica = {
  name: 'Manica (gladiator arm guard)', meta: { faction: 'romans' },
  build(ctx) {
    const o = { body: newGrid('body'), armUL: newGrid('armUL'), armUR: newGrid('armUR'), armLL: newGrid('armLL'), armLR: newGrid('armLR') };
    const m = ctx.m;
    const seg = (a, y0, y1, p) => { for (let y = y0; y <= y1; y++) B(a, 0, y, 0, 2, y, 2, (x, yy, z) => (((y + p) % 2 === 0) ? V(m[(x + z) % 2 ? 3 : 2]) : ctx.t(0.9 + 0.1 * (x % 2)))); };
    seg(o.armUR, 0, 4, 0); seg(o.armLR, 2, 4, 1);                                                                    // the whole sword arm down to the wrist
    B(o.armLR, 0, 2, 0, 2, 2, 2, V(m[1])); B(o.armUR, 0, 4, 0, 2, 4, 2, V(m[3]));
    B(o.armUL, 0, 4, 0, 2, 4, 2, (x, y, z) => V(m[(x + z) % 2 ? 4 : 3])); B(o.armUL, 0, 3, 0, 2, 3, 2, V(m[1]));       // shoulder plate (galerus) on the net arm
    B(o.body, 8, 8, 0, 9, 8, 4, (x, y, z) => V(m[(x + z) % 2 ? 3 : 2])); B(o.body, 9, 7, 0, 9, 7, 4, V(m[1]));
    B(o.armLL, 0, 2, 0, 2, 3, 2, (x, y, z) => ctx.t(0.9 + 0.12 * (y % 2))); B(o.armLL, 0, 4, 0, 2, 4, 2, V(m[2]));    // tinted leather bracer
    return o;
  },
};

/** Priest of Ra's leopard pelt: spotted skin over the left shoulder, the cat's face on the chest, paws and tail hanging. Natural colours. */
SH.leopard_mantle = {
  name: 'Leopard pelt', meta: { faction: 'egyptians' },
  build(ctx) {
    const body = newGrid('body'), L = newGrid('armUL');
    const pelt = (x, y, z, f = 1) => {
      const spot = hash3(x >> 0, y, z, 14) > 0.74, rosette = ((x * 3 + y * 5 + z * 2) % 7) === 0;
      return V(shade(spot || rosette ? 0x2a1a10 : 0xd6a048, f * (0.9 + 0.2 * hash3(x, y, z, 15))));
    };
    const xmin = (y) => Math.min(8, 3 + (8 - y));
    for (let y = 8; y >= 1; y--) for (let z = (y >= 6 ? 0 : 3); z <= 4; z++) for (let x = xmin(y); x <= 9; x++) { if (y === 8 && x < 5) continue; body.set(x, y, z, pelt(x, y, z, 0.96 + 0.02 * y)); }
    B(body, 3, 1, 0, 9, 8, 0, (x, y, z) => pelt(x, y, z, 0.94));       // across the back too
    X(body, 3, 8, 3, 6, 8, 4);
    B(body, 7, 4, 4, 9, 6, 4, (x, y, z) => V(shade(0xe8c070, 0.92 + 0.1 * hash3(x, y, z, 2))));               // the leopard's face
    P(body, 7, 6, 4, V(0x14100c)); P(body, 9, 6, 4, V(0x14100c)); P(body, 8, 5, 4, V(0xd88a8a)); B(body, 7, 4, 4, 9, 4, 4, V(0xf0e8d6));
    Ps(body, 6, 7, 4, V(0x2a1a10));
    for (let y = 1; y <= 3; y++) for (const x of [7, 8]) P(body, x, y, 4, V(y === 1 ? 0x14100c : shade(0xd6a048, 0.95)));   // paws dangling
    B(L, 0, 2, 0, 2, 4, 2, (x, y, z) => pelt(x, y, z, 1.0));
    return { body, armUL: L };
  },
};

/** Broad collar (usekh) in gold: concentric bead rows round the neck over chest, shoulders and back; turquoise accent row. */
SH.broad_collar_gold = {
  name: 'Gold broad collar', meta: { faction: 'egyptians' },
  build(ctx) {
    const body = newGrid('body');
    const col = (r, x, y, z) => (r === 3 ? V(shade(ctx.c.primary, 0.9 + 0.2 * hash3(x, y, z, 3))) : V(shade(ctx.m[r % 2 ? 3 : 2], 0.92 + 0.16 * hash3(x, y, z, 2))));
    for (const z of [0, 4]) for (let y = 3; y <= 8; y++) for (let x = 0; x <= 9; x++) {
      const r = Math.round(Math.hypot(x - 4.5, (y - 8.6) * 0.85));
      if (r >= 2 && r <= 6 - (z === 0 ? 1 : 0)) P(body, x, y, z, col(r, x, y, z));
    }
    for (let z = 1; z <= 3; z++) for (let x = 0; x <= 9; x++) { const r = Math.round(Math.abs(x - 4.5)); if (r >= 2) P(body, x, 8, z, col(r, x, 8, z)); }
    X(body, 3, 8, 3, 6, 8, 4);
    return { body };
  },
};

// ------------------------------------------------------------------------------------------------ capes
/** Thracian zeira: a short woollen cloak in bold bands (team / cream / dark brown), with a fringe at the hem. */
CP.striped_cloak = {
  name: 'Striped Thracian cloak', meta: { faction: 'hellenes' },
  build(ctx) {
    const g = newGrid('cape'), rows = 10, y0 = 14 - rows;
    const band = (x, y, z) => {
      const k = x % 5;
      if (k <= 1) return ctx.t((0.96 + 0.1 * hash3(x, y, z, 82)) * ((y + x) % 4 === 0 ? 0.9 : 1.0));
      if (k === 2) return V(shade(0xefe4c8, 0.9 + 0.14 * hash3(x, y, z, 83)));
      return V(shade(0x4a2c1c, 0.85 + 0.2 * hash3(x, y, z, 84)));
    };
    B(g, 0, y0, 0, 9, 13, 1, (x, y, z) => ((y === y0 && (x + z) % 2 === 0) ? 0 : band(x, y, z)));                         // fringed hem
    B(g, 0, 13, 0, 9, 13, 1, (x, y, z) => V(shade(ctx.c.secondary, 0.88 + 0.1 * (x % 2))));                             // collar band
    P(g, 4, 13, 1, V(ctx.m[3])); P(g, 5, 13, 1, V(ctx.m[3]));
    return { cape: g };
  },
};

/** Mummy's trailing bandage: long loose strips of linen hanging off the shoulders at different lengths, ragged tips, a wrapped shawl at the top (team colour). */
CP.bandage_trail = {
  name: 'Trailing bandages', meta: { faction: 'egyptians' },
  build(ctx) {
    const cape = newGrid('cape'), c2 = newGrid('cape2');
    const lin = (x, y, z, f = 1) => V(shade(0xe6dcc0, f * (0.84 + 0.2 * hash3(x, y, z, 87))));
    B(cape, 0, 11, 0, 9, 13, 1, (x, y, z) => ctx.t(0.9 + 0.12 * hash3(x, y, z, 88) - (y === 11 ? 0.08 : 0)));         // shawl of wrapping across the shoulders
    // strips: [x, length (rows below y=11 in total, can run into cape2), width]
    for (const [x, len, w] of [[1, 12, 1], [3, 8, 2], [5, 14, 1], [6, 10, 1], [8, 11, 2], [0, 5, 1]]) {
      for (let i = 0; i < len; i++) {
        const y = 10 - i;
        if (hash3(x, i, 7, 3) > 0.9 && i > 3) continue;                                                           // a gap in the strip
        for (let k = 0; k < w; k++) for (let z = 0; z <= 1; z++) {
          if (i > len - 3 && k === w - 1 && w > 1) continue;                                                      // pointed tip
          if (y >= 0) cape.set(x + k, y, z, lin(x + k, y, z, i % 3 === 0 ? 0.9 : 1.0));
          else if (y >= -3) c2.set(x + k, 9 + (y + 1), z, lin(x + k, y, z, 0.94));
        }
      }
    }
    return { cape, cape2: c2 };
  },
};

/** The pharaoh's state cape: tinted from collar to hem, gold-bordered with turquoise beads, a gold ankh across the shoulder blades. */
CP.royal_cape = {
  name: 'Royal cape (gold-bordered)', meta: { faction: 'egyptians' },
  build(ctx) {
    const cape = newGrid('cape'), c2 = newGrid('cape2');
    const cloth = (x, y, z, f = 1) => ctx.t(f * (0.94 + 0.12 * hash3(x, y, z, 81)) * (x % 3 === 0 ? 0.95 : 1.0));
    const gold = (x, y, z) => V(shade(ctx.m[3], 0.86 + 0.2 * hash3(x, y, z, 6)));
    B(cape, 0, 0, 0, 9, 13, 1, (x, y, z) => ((x === 0 || x === 9) ? gold(x, y, z) : cloth(x, y, z, vgrad(y, 0, 13, 0.92, 1.06))));
    B(cape, 0, 13, 0, 9, 13, 1, (x, y, z) => gold(x, y, z));                                                       // upright gold collar
    B(c2, 0, 7, 0, 9, 9, 1, (x, y, z) => ((x === 0 || x === 9) ? gold(x, y, z) : cloth(x, y + 14, z, 0.96)));
    B(c2, 1, 7, 0, 8, 7, 1, (x, y, z) => ((x % 2) ? V(shade(ctx.c.primary, 0.9)) : gold(x, y, z)));                // hem: turquoise and gold beads
    const ankh = ['.####.', '##..##', '##..##', '.####.', '..##..', '######', '..##..', '..##..', '..##..'];
    sprite(cape, ankh, 2, 11, 0, { '#': (x, y) => V(shade(ctx.m[4], 0.94 + 0.08 * (y % 2))) });
    P(cape, 4, 13, 1, V(ctx.m[4])); P(cape, 5, 13, 1, V(ctx.m[4]));
    return { cape, cape2: c2 };
  },
};

// ------------------------------------------------------------------------------------------------ backs
/** Two pilum crossed on the back: wooden shafts, long iron necks, small pyramid heads, a tinted sling strap. */
BK.pilum_pair = {
  name: 'Two pilum (crossed)', meta: { faction: 'romans' },
  build(ctx) {
    const g = newGrid('back');
    const wood = (x, y, z) => V(shade(0x8a5a2e, 0.86 + 0.24 * hash3(x, y, z, 91)));
    const pil = (xa, xb, z) => {
      for (let y = 0; y <= 13; y++) {
        const x = Math.round(xa + (xb - xa) * (y / 13));
        if (y <= 7) { P(g, x, y, z, wood(x, y, z)); if (y >= 3 && y <= 5) P(g, x + 1, y, z, wood(x + 1, y, z)); }
        else if (y <= 11) P(g, x, y, z, V(ctx.m[y % 2 ? 2 : 1]));
        else P(g, x, y, z, V(ctx.m[y === 13 ? 4 : 3]));
      }
      P(g, Math.round(xa + (xb - xa) * 7 / 13), 7, z, V(ctx.m[0]));                                                // socket where wood meets iron
    };
    pil(2, 9, 6); pil(9, 2, 5);
    for (let i = 0; i < 8; i++) { const x = 2 + i, y = 10 - Math.round(i * 1.1); P(g, x, y, 7, ctx.t(0.95)); P(g, x + 1, y, 7, ctx.t(0.85)); }   // sling strap across the back
    return g;
  },
};

/** Retiarius' net: a coil of rope with lead weights on the left hip and the mesh trailing over the lower back. */
BK.net_coil = {
  name: 'Net and coil (hip)', meta: { faction: 'romans' },
  build(ctx) {
    const g = newGrid('back');
    const rope = (x, y, z, f = 1) => V(shade(0xb89a62, f * (0.82 + 0.3 * hash3(x, y, z, 93))));
    // the coil: a ring in the XY plane, 2 deep, on the left hip (x high)
    for (let y = 0; y <= 7; y++) for (let x = 6; x <= 11; x++) {
      const d = Math.hypot(x - 8.5, y - 3.6);
      if (d >= 1.5 && d <= 3.1) for (let z = 4; z <= 6; z++) g.set(x, y, z, rope(x, y, z, (x + y + z) % 2 ? 0.88 : 1.04));
    }
    for (const [x, y] of [[8, 0], [11, 3], [6, 3], [9, 7]]) P(g, x, y, 5, V(0x4a4a54));
    // mesh draped over the lower back: diamond lattice with weights at the lower edge
    for (let y = 0; y <= 6; y++) for (let x = 0; x <= 7; x++) {
      if (hash3(x, y, 0, 95) > 0.93) continue;
      if ((x + y) % 2 === 0 && !(x === 7 && y > 4)) g.set(x, y, 7, rope(x, y, 7, 0.96)); else if ((x + y) % 4 === 1) g.set(x, y, 6, rope(x, y, 6, 0.8));
    }
    for (const x of [0, 2, 4, 6]) P(g, x, 0, 7, V(0x4a4a54));
    B(g, 4, 6, 7, 11, 6, 7, (x, y, z) => ((x % 2) ? V(0x7a5a38) : V(0x5a4028)));                                       // cord looped on the belt
    P(g, 10, 7, 6, ctx.t(1.0)); P(g, 9, 7, 6, ctx.t(0.9));
    return g;
  },
};

// ------------------------------------------------------------------------------------------------ legs
/** Gladiator legs: a bronze greave with a knee guard on the left shin (the net-arm side), tinted leather fasciae wound round the right leg. */
LG.gladiator_legs = {
  name: 'Greave and fasciae (gladiator)', meta: { faction: 'romans' },
  build(ctx) {
    const gv = LEGS.legs.greaves.build(ctx);
    const o = { legUL: newGrid('legUL'), legUR: newGrid('legUR'), legLL: gv.legLL, legLR: newGrid('legLR') };
    B(o.legUL, 0, 3, 0, 3, 4, 3, (x, y, z) => ((y === 4 && z >= 2) ? V(ctx.m[3]) : 0));
    for (let y = 0; y <= 4; y++) B(o.legLR, 0, 1 + y, 0, 3, 1 + y, 3, (x, yy, z) => ((y + x) % 3 === 0 ? V(shade(0x6a4224, 0.9)) : ctx.t(0.88 + 0.14 * (y % 2))));
    B(o.legLR, 0, 4, 0, 3, 4, 3, ctx.t(1.04));
    B(o.legLR, 0, 1, 0, 3, 1, 3, V(shade(0x4a3020, 0.9)));
    B(o.legUR, 0, 3, 0, 3, 4, 3, (x, y, z) => ((y === 4) ? ctx.t(0.9) : 0));
    return o;
  },
};

registerParts(PARTS);
