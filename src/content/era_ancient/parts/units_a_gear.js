// UNITS-A hand items: 'mains' (weapon grid 9x48x9, grip voxel (4,10,4), shaft along +Y, edge toward +Z) and 'offs' (offhand grid 16x16x6, pivot (8,8,3), face normal +Z).
// ctx.len = voxels from the grip to the tip (already clamped by the compiler's weapon length rule), ctx.back = voxels behind the grip.
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, Ps, E, hash3, newGrid, gripWrap, sprite, emblem } from './_kit.js';
import { wood, PARTS as MELEE } from './weapons_melee.js';

export const PARTS = { mains: {}, offs: {} };
const M = PARTS.mains, O = PARTS.offs;
const R_UP = 0.3, R_CARRY = 2.44;

// ------------------------------------------------------------------------------------------------ mains
/** The philosopher's scroll: a fat rolled papyrus with wooden knobs, a team-colour ribbon, and a sheet that has unrolled down the front (with scribbles). It is a blunt argument. */
M.scroll = {
  name: 'Scroll', meta: { style: 'bash', ready: 14, len: 12, back: 6, rest: [0.7, 0, 0], grip: [4, 10, 4], minLen: 9, kind: 'melee', faction: 'hellenes' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len, y0 = 10 - ctx.back;
    const pap = (x, y, z, f = 1) => V(shade(0xeadcae, f * (0.9 + 0.14 * hash3(x, y, z, 7))));
    // the roll: radius 2 cylinder from y0 to yt, ring lines every 3rd row, wooden knobs on both ends
    for (let y = y0 + 1; y <= yt - 1; y++) for (let z = 2; z <= 6; z++) for (let x = 2; x <= 6; x++) {
      const d = Math.hypot(x - 4, z - 4); if (d > 2.0) continue;
      g.set(x, y, z, (y % 4 === 0) ? pap(x, y, z, 0.78) : pap(x, y, z, z > 4 ? 1.06 : 0.94));
    }
    for (const [y, f] of [[y0, 0.9], [yt, 1.0]]) { B(g, 3, y, 3, 5, y, 5, wood(y, 3, 0x7a4e26)); P(g, 4, y + (y === yt ? 1 : -1), 4, V(shade(ctx.m[3], f))); }
    B(g, 3, y0 + 1, 3, 5, y0 + 1, 5, wood(y0, 4, 0x6a4020)); B(g, 3, yt - 1, 3, 5, yt - 1, 5, wood(yt, 5, 0x6a4020));
    // ribbon (tinted) round the roll above the hand, tails hanging
    for (let y = yt - 5; y <= yt - 4; y++) for (let z = 1; z <= 7; z++) for (let x = 1; x <= 7; x++) { const d = Math.hypot(x - 4, z - 4); if (d >= 1.9 && d <= 2.7) g.set(x, y, z, ctx.t(0.98)); }
    B(g, 5, yt - 9, 6, 5, yt - 4, 6, ctx.t(1.02)); P(g, 6, yt - 8, 6, ctx.t(0.9)); P(g, 5, yt - 10, 6, ctx.t(0.85));
    // the unrolled sheet hanging down the front with lines of writing
    for (let y = yt - 3; y >= yt - 10 && y > y0 + 2; y--) for (let x = 2; x <= 4; x++) {
      const ragged = y === yt - 10 && x === 3; if (ragged) continue;
      g.set(x, y, 6, (y % 2 === 0 && hash3(x, y, 3, 9) > 0.25) ? V(0x4a3a24) : pap(x, y, 6, 1.04));
    }
    gripWrap(g, ctx, 8, 11);
    return g;
  },
};

/** The senator's bag of coins: a fat leather purse tied with a team ribbon, gold coins spilling out of the top, one stamped coin on the front. */
M.coin_bag = {
  name: 'Bag of coins', meta: { style: 'throw', ready: 8, len: 13, back: 4, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 9, kind: 'melee', faction: 'romans' },
  build(ctx) {
    const g = newGrid('weapon'), cy = 16 + Math.max(0, ctx.len - 13) * 0;
    const bag = (x, y, z, f = 1) => V(shade(0x8a5a30, f * (0.82 + 0.28 * hash3(x, y, z, 17))));
    const gold = (x, y, z, f = 1) => V(shade(0xf2c63a, f * (0.9 + 0.2 * hash3(x, y, z, 18))));
    B(g, 4, 6, 4, 4, 11, 4, V(0x6a4020));                                                // the cord the hand holds
    gripWrap(g, ctx, 8, 11);
    E(g, 4, cy, 4, 3.6, 3.6, 3.4, (x, y, z, d) => bag(x, y, z, 1.12 - 0.3 * d));
    B(g, 3, cy - 4, 3, 5, cy - 4, 5, bag(4, cy - 4, 4, 0.8));                            // gathered neck
    for (let y = cy + 2; y <= cy + 3; y++) for (let z = 2; z <= 6; z++) for (let x = 2; x <= 6; x++) { const d = Math.hypot(x - 4, z - 4); if (d <= 1.6) g.set(x, y, z, V(shade(0x6a4020, 0.9))); }
    B(g, 3, cy + 2, 3, 5, cy + 2, 5, ctx.t(1.0)); P(g, 4, cy + 2, 6, ctx.t(0.9)); P(g, 5, cy + 1, 6, ctx.t(0.85));             // ribbon tied round the neck
    // coins pile out of the mouth
    for (const [x, y, z, f] of [[3, cy + 3, 4, 1.0], [5, cy + 3, 3, 1.1], [4, cy + 4, 4, 1.15], [4, cy + 3, 5, 1.0], [3, cy + 4, 5, 1.05], [5, cy + 4, 4, 0.95]]) P(g, x, y, z, gold(x, y, z, f));
    P(g, 4, cy + 5, 4, V(0xfff3a8)); P(g, 3, cy + 5, 5, V(0xffe27a));
    // stamped coin on the front of the bag
    B(g, 3, cy - 1, 7, 5, cy + 1, 7, V(0xf2c63a)); P(g, 4, cy, 7, V(0xb8861a)); P(g, 3, cy + 1, 7, V(0xfff3a8));
    // a couple of loose coins dangling from the cord
    P(g, 6, cy - 3, 5, gold(6, cy - 3, 5)); P(g, 6, cy - 4, 5, V(0xb8861a));
    return g;
  },
};

/** Anubis' khopesh-spear with a pennon: the temple guard's long spear-sickle, a swallow-tailed team-colour streamer tied below the blade and streaming backwards. */
M.khopesh_spear_pennon = {
  name: 'Khopesh-spear with pennon', meta: Object.assign({}, MELEE.mains.khopesh_spear.meta, { faction: 'egyptians' }),
  build(ctx) {
    const g = MELEE.mains.khopesh_spear.build(ctx), yt = 9 + ctx.len, y0 = yt - 10;
    B(g, 3, y0, 3, 5, y0 + 1, 5, V(ctx.m[3]));                                                       // gold binding where the streamer is tied
    for (let k = 0; k < 4; k++) for (let dy = 0; dy < [5, 4, 3, 2][k]; dy++) P(g, 4, y0 + 1 - dy, 3 - k, ctx.t(0.9 + 0.14 * ((k + dy) % 2)));       // the streamer flying backwards
    for (let i = 0; i < 9; i++) for (let x = 3; x <= 5; x++) if (!(i >= 7 && x === 4)) P(g, x, y0 - 1 - i, 5, ctx.t(0.9 + 0.14 * ((i + x) % 2)));    // and a tail hanging down the haft
    return g;
  },
};

/** The mummy's club: tomb-wood wrapped in the same linen as its owner (tinted bands), loose strands trailing off the end. */
M.wrapped_club = {
  name: 'Wrapped tomb club', meta: { style: 'bash', len: 15, back: 5, rest: [R_CARRY, 0, 0], grip: [4, 10, 4], minLen: 10, kind: 'melee', faction: 'egyptians' },
  build(ctx) {
    const g = newGrid('weapon'), yt = 9 + ctx.len;
    B(g, 4, 5, 4, 4, 11, 4, (x, y) => wood(y, 3, 0x5a4026));
    gripWrap(g, ctx, 8, 11);
    for (let y = 12; y <= yt; y++) {
      const t = (y - 12) / Math.max(1, yt - 12), r = t < 0.3 ? 1 : (t < 0.9 ? 2 : 1);
      for (let z = 4 - r; z <= 4 + r; z++) for (let x = 4 - r; x <= 4 + r; x++) {
        if (r === 2 && Math.abs(x - 4) === 2 && Math.abs(z - 4) === 2) continue;
        const band = (y + (x > 4 ? 1 : 0)) % 3;
        g.set(x, y, z, band === 0 ? V(shade(0xe6dcc0, 0.82 + 0.2 * hash3(x, y, z, 6))) : ctx.t((band === 1 ? 1.0 : 0.88) * (0.94 + 0.1 * hash3(x, y, z, 7))));
      }
    }
    P(g, 4, yt + 1, 4, V(shade(0x5a4026, 1.1)));
    for (const [x, y, z] of [[2, yt - 3, 4], [2, yt - 4, 4], [2, yt - 5, 3], [6, yt - 2, 5], [6, yt - 3, 5], [6, yt - 4, 6], [6, yt - 5, 6]]) P(g, x, y, z, V(shade(0xeadfc4, 0.9 + 0.1 * hash3(x, y, z, 8))));
    return g;
  },
};

// ------------------------------------------------------------------------------------------------ offs
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) <= 1;

/** Thracian pelte, wicker: an oval woven buckler with the crescent notch in the top edge, a tinted rim band and a bronze boss. Wicker stays natural. */
O.pelte_wicker = {
  name: 'Wicker pelte (notched buckler)', meta: { kind: 'shield', w: 11, h: 10, faction: 'hellenes' },
  build(ctx) {
    const g = newGrid('offhand'), cx = 7.5, cy = 7.0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!inEll(x, y, cx, cy, 5.5, 4.9) || inEll(x, y, cx, cy + 5.6, 2.5, 2.3)) continue;
      const d = Math.sqrt(((x - cx) / 5.5) ** 2 + ((y - cy) / 4.9) ** 2);
      const rim = d > 0.6;
      const weave = (x + y) % 2 ? V(shade(0xb89452, 0.92)) : V(shade(0xd8b866, 1.0 + 0.06 * hash3(x, y, 3, 2)));
      g.set(x, y, 4, rim ? ctx.t(0.95 + 0.1 * (y > 7 ? 1 : 0)) : weave);
      if (d > 0.84) g.set(x, y, 5, V(shade(0x6a4224, 0.9 + 0.2 * hash3(x, y, 5, 3))));          // leather piping
      if (d > 0.6) g.set(x, y, 3, ctx.t(0.62 + 0.1 * hash3(x, y, 3, 2)));                        // dish back ring (tinted for the side view)
    }
    for (let y = 5; y <= 9; y++) for (let x = 5; x <= 10; x++) if (Math.hypot(x - 7.5, y - 7) <= 1.9) g.set(x, y, 5, V(ctx.m[(x + y) % 2 ? 3 : 4]));
    return g;
  },
};

/** The pilum thrower's small shield: a 10-wide round parma, tinted rim band, neutral red-brown face and a gold thunderbolt. */
O.parma_small = {
  name: 'Small parma', meta: { kind: 'shield', w: 10, h: 10, faction: 'romans' },
  build(ctx) {
    const g = newGrid('offhand'), cx = 7.5, cy = 7.5, r = 5.1;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - cx, y - cy); if (d > r) continue;
      const rim = d > r - 2.8;
      g.set(x, y, 4, rim ? ctx.t(0.84 + 0.12 * (y > 7 ? 1 : 0)) : V(shade(ctx.c.primary, 0.78 + 0.2 * hash3(x, y, 1, 5))));
      if (d > r - 0.9) g.set(x, y, 5, V(ctx.m[(x + y) % 2 ? 3 : 2]));
      if (d > r - 2.3) g.set(x, y, 3, ctx.t(0.62 + 0.1 * hash3(x, y, 3, 2)));
    }
    for (const [x, y] of [[8, 11], [8, 10], [7, 9], [8, 8], [7, 7], [7, 6], [6, 5]]) { g.set(x, y, 5, V(shade(ctx.c.secondary, 1.05))); g.set(x - 1, y, 5, V(shade(ctx.c.secondary, 0.95))); }    // thunderbolt zig-zag
    for (let y = 7; y <= 8; y++) for (let x = 7; x <= 8; x++) if (!(x === 8 && y === 8)) g.set(x, y, 5, V(ctx.m[4]));
    return g;
  },
};

/** Egyptian tall shield: rounded top, 10 x 14, a tinted rim band (and tinted dish back), a gold boss and a face by variant: hide / black (emblem) / gold (emblem). */
function egyptShield(name, o) {
  return {
    name, meta: { kind: 'shield', w: 10, h: 14, faction: 'egyptians' },
    build(ctx) {
      const g = newGrid('offhand'), cx = 7.5;
      const hw = (y) => [0, 4.6, 4.9, 5, 5, 5, 5, 5, 5, 5, 4.9, 4.7, 4.1, 3.3, 2.1, 0][y] || 0;
      for (let y = 1; y <= 14; y++) for (let x = 0; x < 16; x++) {
        const w = hw(y), dx = Math.abs(x - cx); if (dx > w) continue;
        const rim = dx > w - 2.6 || y <= 3 || y >= 13;
        let face;
        if (o.face === 'hide') face = (hash3(x >> 1, y >> 1, 0, 13) > 0.7) ? V(0xf2ead6) : V(shade(0xa8703c, 0.85 + 0.2 * hash3(x, y, 1, 4)));
        else if (o.face === 'black') face = V(shade(0x1a1a20, 0.8 + 0.4 * hash3(x, y, 1, 4)));
        else if (o.face === 'team') face = ctx.t(0.58 + 0.12 * hash3(x, y, 1, 4));
        else face = V(shade(ctx.m[3], 0.88 + 0.16 * hash3(x, y, 1, 4)));
        g.set(x, y, 4, rim ? ctx.t(0.82 + 0.14 * (y > 7 ? 1 : 0) + 0.05 * hash3(x, y, 2, 3)) : face);
        if (dx > w - 0.8 || y === 1 || y === 14) g.set(x, y, 5, V(ctx.m[(x + y) % 2 ? 3 : 2]));
        if (dx > w - 2.2 || y <= 3) g.set(x, y, 3, ctx.t(0.62 + 0.1 * hash3(x, y, 3, 2)));
      }
      for (let y = 7; y <= 10; y++) for (let x = 6; x <= 9; x++) if (Math.hypot(x - 7.5, y - 8.5) <= 2.0) g.set(x, y, 5, V(ctx.m[(x + y) % 2 ? 4 : 3]));
      if (o.emblem) emblem(g, o.emblem, 4, 12, 5, o.face === 'gold' ? V(shade(ctx.c.primary, 0.9)) : V(shade(ctx.m[4], 1.0)));
      return g;
    },
  };
}
O.egyptian_shield = egyptShield('Egyptian shield (hide)', { face: 'hide' });
O.egyptian_shield_black = egyptShield('Egyptian shield (black, eye)', { face: 'black', emblem: 'eye' });
O.egyptian_shield_gold = egyptShield('Egyptian shield (gold, sun)', { face: 'gold', emblem: 'sun' });
O.egyptian_shield_team = egyptShield('Egyptian shield (team colour, eye)', { face: 'team', emblem: 'eye' });

registerParts(PARTS);
