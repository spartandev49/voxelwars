// Off-hand items (category 'offs'): shields, torch, second blade, arrow bundle. Grid 16x16x6, pivot (8,8,3) = the hand.
// Shield FACE normal is +Z: plate at z=4, raised rim/emblem at z=5, dish rim/back at z=3. Faces are team tinted (ctx.t()).
// meta: {kind:'shield'|'item', w, h, rest?:[rx,ry,rz]}  rest is applied after the animated rotation (second_sword hangs down-forward like a main-hand blade).
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, P, E, hash3, emblem, EMBLEMS, sprite, newGrid, metalAt, lighten, darken } from './_kit.js';

const CX = 7.5, CY = 7.5;
const inDisc = (x, y, r, cx = CX, cy = CY, sy = 1) => ((x - cx) * (x - cx) + (y - cy) * (y - cy) / (sy * sy)) <= r * r;
const woodC = (x, y, k = 0, base = 0x9a7040) => V(shade(base, 0.86 + 0.24 * hash3(x, y, 3, k)));

export const PARTS = { offs: {} };
const O = PARTS.offs;
O.none = { name: 'Nothing', build: () => null, meta: { kind: 'none' } };

/** generic round shield. o: {r, rim, boss, emblem, planks, ring, back} */
function roundShield(name, o) {
  return {
    name, meta: { kind: 'shield', w: Math.round(o.r * 2), h: Math.round(o.r * 2) },
    build(ctx) {
      const g = newGrid('offhand'), r = o.r, e = o.emblem ?? ctx.emblem;
      const rimC = (x, y, hi) => V(ctx.m[hi ? 3 : 2]);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        if (!inDisc(x, y, r)) continue;
        const d = Math.sqrt((x - CX) * (x - CX) + (y - CY) * (y - CY));
        const isRim = d > r - 1.35;
        const faceTint = ctx.t(0.9 + 0.16 * hash3(x, y, 1, 4) + (o.planks && x % 3 === 0 ? -0.07 : 0));
        // face plate (z=4)
        g.set(x, y, 4, isRim ? ctx.t(0.78 + 0.12 * (y > 7 ? 1 : 0)) : (o.ring && Math.abs(d - r * 0.62) < 0.55 ? V(shade(ctx.c.secondary, 0.85)) : faceTint));
        // raised rim at the front (z=5): metal (the tinted plate shows beside it and from the side)
        if (isRim && d > r - 0.85) g.set(x, y, 5, rimC(x, y, y > 7 && x < 9));
        // dish back (z=3): tinted ring so the side and back views carry team colour
        if (o.back !== false && d > r - 2.2) g.set(x, y, 3, ctx.t(0.62 + 0.1 * hash3(x, y, 3, 2)));
      }
      if (o.boss) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (inDisc(x, y, o.boss, CX, CY)) g.set(x, y, 5, V(ctx.m[(x + y) % 2 ? 3 : 4])); }
      if (e && e !== 'none' && !o.noEmblem) emblem(g, e, Math.round(CX - 3.5), Math.round(CY + 3.5), 5, V(shade(ctx.c.secondary, 1.05)));
      return g;
    },
  };
}
O.hoplon = roundShield('Hoplon', { r: 7.9, ring: true });
O.round_shield = roundShield('Round shield', { r: 6.9, boss: 2.1, planks: true, noEmblem: true });
O.buckler = roundShield('Buckler', { r: 4.6, boss: 2.2, noEmblem: true, back: false });
O.parma = roundShield('Parma', { r: 5.9, boss: 1.6, ring: false, noEmblem: false });

O.scutum = {
  name: 'Scutum', meta: { kind: 'shield', w: 12, h: 16 },
  build(ctx) {
    const g = newGrid('offhand'), e = ctx.emblem;
    const neutral = (x, y, z) => V(shade(ctx.c.primary, 0.78 + 0.2 * hash3(x, y, z, 5) - 0.06 * (y < 3 ? 1 : 0)));
    for (let y = 0; y < 16; y++) for (let x = 2; x <= 13; x++) {
      const dx = Math.min(x - 2, 13 - x), dy = Math.min(y, 15 - y), d = Math.min(dx, dy);
      // curved: centre columns forward (z=5), outer columns step back
      const k = x >= 6 && x <= 9 ? 5 : (x >= 4 && x <= 11 ? 4 : 3);
      let c;
      if (d === 0) c = V(ctx.m[(x + y) % 2 ? 2 : 3]);                       // metal edge
      else if (d <= 2) c = ctx.t(0.9 + 0.16 * hash3(x, y, 2, 5));          // tinted rim band
      else c = neutral(x, y, 1);                                            // neutral red-brown face
      g.set(x, y, k, c);
      if (k > 3 && d <= 2) g.set(x, y, k - 1, V(ctx.m[1]));
      if (x === 5 || x === 10) g.set(x, y, 5, c);
      if (x === 3 || x === 12) g.set(x, y, 4, c);
    }
    // boss ring (tinted) around a metal boss, then the emblem over the face
    for (let y = 5; y <= 10; y++) for (let x = 5; x <= 10; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d <= 1.7) g.set(x, y, 5, V(ctx.m[(x + y) % 2 ? 3 : 4])); else if (d <= 3.1) g.set(x, y, 5, ctx.t(1.0));
    }
    const gold = V(shade(ctx.c.secondary, 1.05));
    if (e && e !== 'none') emblem(g, e, 4, 11, 5, gold);
    if (e === 'bolt') { for (const [x, y, k] of [[3, 10, 4], [4, 11, 4], [4, 9, 4], [5, 10, 4], [3, 6, 4], [4, 5, 4], [4, 7, 4], [5, 6, 4]]) { g.set(x, y, k, gold); g.set(15 - x, y, k, gold); } }   // wings of the thunderbolt
    return g;
  },
};
O.wicker = {
  name: 'Wicker shield', meta: { kind: 'shield', w: 14, h: 12 },
  build(ctx) {
    const g = newGrid('offhand');
    for (let y = 2; y <= 13; y++) for (let x = 1; x <= 14; x++) {
      const corner = (x < 3 || x > 12) && (y < 4 || y > 11) && ((x < 3 ? 3 - x : x - 12) + (y < 4 ? 4 - y : y - 11) > 2);
      if (corner) continue;
      const weave = (x + y) % 2 ? V(shade(0xb89452, 0.92)) : V(shade(0xd0ae66, 1.0));
      const rim = x === 1 || x === 14 || y === 2 || y === 13;
      g.set(x, y, 4, rim ? ctx.t(0.95) : weave);
      if (rim) g.set(x, y, 5, ctx.t(1.05));
      if (rim) g.set(x, y, 3, V(ctx.m[1]));
    }
    B(g, 4, 5, 5, 11, 5, 5, ctx.t(0.9));                          // tinted central band
    B(g, 4, 10, 5, 11, 10, 5, ctx.t(0.9));
    for (let y = 6; y <= 9; y++) for (let x = 7; x <= 8; x++) g.set(x, y, 5, V(ctx.m[(x + y) % 2 ? 3 : 4]));
    return g;
  },
};
O.pavise = {
  name: 'Wicker pavise', meta: { kind: 'shield', w: 12, h: 16 },
  build(ctx) {
    const g = newGrid('offhand');
    for (let y = 0; y < 16; y++) for (let x = 2; x <= 13; x++) {
      const weave = (x + y) % 2 ? V(shade(0xb89452, 0.9)) : V(shade(0xd0ae66, 1.0));
      const rim = x === 2 || x === 13 || y === 0 || y === 15;
      const k = x >= 6 && x <= 9 ? 5 : 4;
      g.set(x, y, k, rim ? ctx.t(0.95) : weave);
      if (x === 5 || x === 10) g.set(x, y, 5, weave);
      if (rim) g.set(x, y, k - 1, V(ctx.m[1]));
    }
    B(g, 3, 7, 4, 12, 8, 4, ctx.t(0.9)); B(g, 6, 7, 5, 9, 8, 5, ctx.t(1.0));
    B(g, 6, 14, 5, 9, 14, 5, ctx.t(1.0));
    return g;
  },
};
O.hide_shield = {
  name: 'Hide shield', meta: { kind: 'shield', w: 11, h: 14 },
  build(ctx) {
    const g = newGrid('offhand');
    for (let y = 1; y <= 14; y++) for (let x = 2; x <= 12; x++) {
      const ex = (x - 7) / 5.6, ey = (y - 7.5) / 7;
      if (ex * ex + Math.pow(Math.abs(ey), 2.6) > 1) continue;
      const spot = hash3(Math.floor(x / 2), Math.floor(y / 2), 0, 11) > 0.72;
      const rim = ex * ex + Math.pow(Math.abs(ey), 2.6) > 0.72;
      g.set(x, y, 4, rim ? ctx.t(0.78) : (spot ? V(0xf2ead8) : ctx.t(0.9 + 0.16 * hash3(x, y, 1, 4))));
      if (rim) g.set(x, y, 5, V(shade(0x7a5a38, 0.95)));
      if (rim) g.set(x, y, 3, ctx.t(0.62));
    }
    B(g, 7, 2, 5, 7, 13, 5, V(0x6a4a2a));                                       // central stick
    B(g, 6, 7, 5, 8, 8, 5, V(ctx.m[3]));
    return g;
  },
};
O.pelte = {
  name: 'Pelte (crescent)', meta: { kind: 'shield', w: 14, h: 10 },
  build(ctx) {
    const g = newGrid('offhand');
    for (let y = 3; y <= 12; y++) for (let x = 1; x <= 14; x++) {
      const inOuter = inDisc(x, y, 6.9, 7.5, 6.5), inCut = inDisc(x, y, 5.2, 7.5, 11.6);
      if (!inOuter || inCut) continue;
      const rim = !inDisc(x, y, 5.6, 7.5, 6.5) || inDisc(x, y, 5.9, 7.5, 11.6);
      g.set(x, y, 4, rim ? V(ctx.m[2]) : ctx.t(0.88 + 0.18 * hash3(x, y, 1, 4)));
      if (rim) g.set(x, y, 5, V(ctx.m[3]));
    }
    return g;
  },
};

// ------------------------------------------------------------------------------------------------ items
O.torch = {
  name: 'Torch (off hand)', meta: { kind: 'item' },
  build(ctx) {
    const g = newGrid('offhand');
    B(g, 8, 1, 4, 8, 9, 4, (x, y) => V(shade(0x7a5a38, 0.9 + 0.2 * hash3(x, y, 3, 1))));
    B(g, 7, 6, 3, 9, 10, 5, V(ctx.c.trim)); B(g, 7, 10, 3, 9, 12, 5, V(0x3a2a20));
    B(g, 7, 12, 3, 9, 14, 5, (x, y, z) => G(hash3(x, y, z, 1) > 0.5 ? 0xff8a1e : 0xff6a10));
    B(g, 8, 13, 4, 8, 15, 4, G(0xffd04a)); P(g, 8, 15, 4, G(0xffe890)); P(g, 7, 15, 4, G(0xff7a1a));
    return g;
  },
};
O.second_sword = {
  name: 'Second sword', meta: { kind: 'item', rest: [2.44, 0, 0] },
  build(ctx) {
    const g = newGrid('offhand');
    B(g, 7, 7, 3, 9, 9, 4, V(mixRGB(0x7a5232, ctx.c.trim, 0.25)));                      // grip around the hand (y8)
    B(g, 7, 6, 3, 9, 6, 3, V(ctx.m[1])); B(g, 8, 5, 3, 8, 5, 3, V(ctx.m[2]));            // pommel
    B(g, 6, 10, 3, 10, 10, 5, V(ctx.m[2]));                                              // guard
    for (let y = 11; y <= 15; y++) { const hw = y > 14 ? 0 : 1; for (let z = 4 - hw; z <= 4 + hw; z++) B(g, 8, y, z, 8, y, z, V(ctx.m[z === 4 + hw && hw ? 4 : (z === 4 ? 2 : 3)])); }
    return g;
  },
};
O.quiver_hand = {
  name: 'Arrow bundle', meta: { kind: 'item' },
  build(ctx) {
    const g = newGrid('offhand');
    B(g, 7, 6, 3, 9, 9, 5, V(ctx.c.trim));                                               // fist wrap
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 0]]) {
      const x = 8 + dx, z = 4 + dz;
      B(g, x, 2, z, x, 13, z, V(shade(0xc9a66b, 0.9 + 0.1 * hash3(x, z, 1, 1))));
      P(g, x, 14, z, V(ctx.m[3])); P(g, x, 15, z, V(ctx.m[4]));
      P(g, x, 2, z, ctx.t(1)); P(g, x, 3, z, ctx.t(0.9));
    }
    return g;
  },
};

registerParts(PARTS);
