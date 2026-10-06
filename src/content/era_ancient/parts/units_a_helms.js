// UNITS-A helms (Hellenes, Romans, Egyptians): self-registering into the 'helms' category. Same conventions as helms.js: build(ctx) -> {head, crest, body?}
// drawn in HEAD SPACE (y < 8 -> head grid, y >= 8 -> crest grid), never replacing the skull cube (cutFaceCube). meta.faction is informational (Workshop grouping).
import { registerParts } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, X, Xs, P, Ps, E, cutFaceCube, hash3, headSpace, metalAt, newGrid } from './_kit.js';
import { lathe } from './helms.js';

export const PARTS = { helms: {} };
const H = PARTS.helms;
const mcol = (ctx, y, y1 = 7, bias = 0) => metalAt(ctx, 0.18 + 0.72 * Math.min(1, y / y1) + bias);
const bowl = (ctx) => (x, y, z, ax, az) => metalAt(ctx, 0.2 + 0.07 * y + (x > 4.5 ? 0.04 : 0) + ((ax > 0.85 || az > 0.85) ? -0.05 : 0.02));

// ---------------------------------------------------------------------------------------------- Hellenes
/** Thracian alopekis: a fox-skin cap with the whole fox on it: ears up, a weary face over the brow, ear flaps and the tail down the back. Natural colours (no tint). */
H.thracian_fox = {
  name: 'Thracian fox-skin cap', meta: { hair: 'none', faction: 'hellenes' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const fur = (x, y, z, f = 1) => V(shade(0xc2622a, f * (0.8 + 0.38 * hash3(x, y, z, 3))));
    const cream = (x, y, z, f = 1) => V(shade(0xf0e6d0, f * (0.92 + 0.14 * hash3(x, y, z, 4))));
    const dark = V(0x24140e), nose = V(0x120a08);
    lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.7, 3.7], [3.2, 3.2], [2.3, 2.3]], { color: (x, y, z) => fur(x, y, z, y > 6 ? 1.08 : 0.96), n: 2.6 });
    cutFaceCube(hs);
    // brow band of fur keeps the wearer's face clear; the fox's own face lies above it (eyes half shut, muzzle pointing forward, black nose)
    B(hs, 2, 4, 8, 7, 4, 8, (x, y, z) => fur(x, y, z, 0.9));
    B(hs, 2, 5, 8, 7, 7, 8, (x, y, z) => fur(x, y, z, 1.06));
    B(hs, 3, 5, 8, 6, 5, 8, (x, y, z) => cream(x, y, z, 0.96));                        // cheeks
    B(hs, 4, 5, 9, 5, 6, 9, (x, y, z) => cream(x, y, z, 1.04));                        // muzzle
    B(hs, 4, 5, 9, 5, 5, 9, nose);                                                     // nose
    Ps(hs, 3, 7, 8, dark); Ps(hs, 2, 7, 8, cream(2, 7, 8));                            // eyes: dark pupil, pale corner
    B(hs, 2, 8, 8, 7, 8, 8, (x, y, z) => fur(x, y, z, 0.78));                          // heavy lids (the fox has seen things)
    // ears: broad triangles (inner ear dark), pointing a little outward
    Bs(hs, 2, 8, 3, 3, 8, 5, (x, y, z) => fur(x, y, z, 1.1)); Bs(hs, 2, 9, 3, 3, 9, 4, (x, y, z) => fur(x, y, z, 1.12)); Bs(hs, 2, 10, 3, 2, 10, 4, (x, y, z) => fur(x, y, z, 1.18));
    Ps(hs, 2, 11, 3, dark); Bs(hs, 3, 8, 5, 3, 9, 5, V(0x6a3a2a));
    // ear flaps, back flap
    Bs(hs, 1, 0, 3, 1, 4, 6, (x, y, z) => fur(x, y, z, 0.92)); Bs(hs, 1, 0, 3, 1, 0, 6, (x, y, z) => cream(x, y, z, 0.95));
    B(hs, 2, 0, 1, 7, 4, 1, (x, y, z) => fur(x, y, z, 0.88)); B(hs, 3, 1, 0, 6, 5, 0, (x, y, z) => fur(x, y, z, 0.8));
    // the tail hangs down the back over the shoulder blades, white tip
    const body = newGrid('body');
    for (let y = 8; y >= 1; y--) {
      const w = y >= 6 ? 2 : (y >= 3 ? 3 : 2), x0 = 5 - Math.floor(w / 2), x1 = x0 + w - 1;
      for (let x = x0; x <= x1; x++) body.set(x, y, 0, y <= 2 ? cream(x, y, 0, 1.0) : (y === 3 && (x + y) % 2 ? dark : fur(x, y, 0, 0.9 + 0.05 * (8 - y))));
    }
    return { head, crest, body };
  },
};

/** Strategos' helm: an Attic helm (open face) under a very tall serrated fan crest (team colour) on a gold holder. */
H.attic_fan = {
  name: 'Attic helm, general\'s fan crest', meta: { hair: 'none', crest: 'transverse', faction: 'hellenes' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.3, 3.3], [2.0, 2.0]], { color: bowl(ctx) });
    cutFaceCube(hs);
    X(hs, 2, 0, 8, 7, 4, 8);                                                          // open face
    Bs(hs, 1, 0, 6, 1, 2, 8, mcol(ctx, 2, 7, 0.0));                                   // cheek flaps
    Bs(hs, 3, 5, 9, 4, 5, 9, mcol(ctx, 6, 7, 0.15));                                  // brow peak
    B(hs, 1, 5, 2, 8, 5, 8, (x, y, z) => (x === 1 || x === 8 || z === 2 || z === 8 ? V(ctx.m[3]) : 0));   // gold rim band
    B(hs, 4, 0, 0, 5, 3, 0, mcol(ctx, 3, 7, 0.0)); B(hs, 3, 0, 1, 6, 1, 1, mcol(ctx, 2, 7, 0));
    // crest holder (gold bar with an upright post at each end) and the fan itself: ten columns forming a half disc that is wider than the helm, serrated at the top,
    // ribs between the columns, a gold border on the rim; tinted
    B(hs, 1, 7, 3, 8, 7, 6, V(ctx.m[3])); Bs(hs, 0, 7, 4, 0, 8, 5, V(ctx.m[3]));
    const top = [9, 10, 12, 13, 13, 13, 13, 12, 10, 9];
    for (let x = 0; x <= 9; x++) for (let y = 8; y <= top[x]; y++) {
      if (y === top[x] && x % 2 === 1 && x > 1 && x < 8) continue;                       // serrated top edge
      const rim = y === top[x] || x === 0 || x === 9, t = (y - 8) / 5;
      const c = rim ? V(shade(ctx.m[3], 0.95 + 0.1 * hash3(x, y, 4, 2))) : ctx.t((x === 2 || x === 4 || x === 5 || x === 7 ? 0.8 : 0.96) + 0.28 * t + 0.05 * hash3(x, y, 4, 8));
      P(hs, x, y, 4, c); P(hs, x, y, 5, c);
      if (y < top[x] - 1 && x > 0 && x < 9) P(hs, x, y, 6, ctx.t(0.74 + 0.2 * t));
    }
    return { head, crest };
  },
};

// ---------------------------------------------------------------------------------------------- Romans
/** Murmillo: closed visor with a mesh of eye holes, a broad down-turned brim and the fish crest (the fish is the team colour). */
H.murmillo = {
  name: 'Murmillo helm (fish crest)', meta: { hair: 'none', crest: 'fish', faction: 'romans' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [4.9, 4.9], [3.9, 3.9], [3.5, 3.5], [2.6, 2.6]], {
      color: (x, y, z, ax, az) => (y === 4 ? ctx.t((ax > 0.9 || az > 0.9) ? 0.8 : 0.96) : bowl(ctx)(x, y, z, ax, az)), n: 2.8 });          // the brim is painted in the team colour
    cutFaceCube(hs);
    // visor: a plate over the face with an eye band and a mesh of breathing holes
    B(hs, 2, 0, 8, 7, 5, 8, (x, y, z) => {
      if (y === 3 && x >= 3 && x <= 6) return V(0x0c0c10);                            // eye slit
      if (y >= 1 && y <= 2 && x >= 3 && x <= 6 && (x + y) % 2 === 0) return V(0x14141a);   // mesh holes
      return mcol(ctx, 3 + (y > 3 ? 2 : 0), 7, (x === 2 || x === 7 ? -0.12 : 0.04));
    });
    B(hs, 3, 0, 9, 6, 0, 9, mcol(ctx, 1, 7, -0.1));                                   // chin ridge
    Bs(hs, 1, 0, 3, 1, 3, 8, mcol(ctx, 2, 7, -0.08));                                 // cheek plates
    B(hs, 2, 0, 0, 7, 3, 0, mcol(ctx, 3, 7, 0)); B(hs, 1, 0, 1, 8, 1, 1, mcol(ctx, 1, 7, -0.1));   // neck guard
    // fish crest: nose forward (+z), tail fin forked at the back; rows by z: [y from, y to, half width]
    const fish = { 9: [8, 8, 1], 8: [8, 10, 1], 7: [8, 12, 2], 6: [8, 13, 3], 5: [8, 13, 3], 4: [8, 12, 2], 3: [8, 11, 1], 2: [8, 9, 1], 1: [8, 12, 1] };
    for (const z of Object.keys(fish).map(Number)) {
      const [y0, y1, hw] = fish[z];
      for (let y = y0; y <= y1; y++) {
        const scale = ((y + z) & 1) ? 0.9 : 1.06, belly = y <= 9 ? 0.82 : 1.0, dorsal = y === y1 && y1 >= 11 ? 1.2 : 1.0;
        B(hs, 5 - hw, y, z, 4 + hw, y, z, ctx.t(0.92 * scale * belly * dorsal * (0.97 + 0.06 * hash3(4, y, z, 5))));
      }
    }
    for (const [y0, y1] of [[8, 9], [12, 13]]) for (let y = y0; y <= y1; y++) Bs(hs, 4, y, 0, 4, y, 0, ctx.t(y < 10 ? 0.84 : 1.14));   // forked tail fin
    Bs(hs, 2, 10, 7, 2, 11, 7, V(0xf4f4ee)); Bs(hs, 2, 10, 8, 2, 10, 8, V(0x14141a));  // bulging eyes (white, pupil looking forward)
    Bs(hs, 1, 9, 4, 1, 10, 5, ctx.t(0.76));                                            // pectoral fins
    P(hs, 4, 8, 9, V(ctx.m[3])); P(hs, 5, 8, 9, V(ctx.m[3]));                         // a gold lip on the snout
    return { head, crest };
  },
};

/** Centurion's helm: a gilded (bronze) Imperial helm with broad cheek plates, an embossed brow band and a wide, flat-topped transverse crest (ear to ear) on a gold holder. */
H.centurion_gilded = {
  name: 'Centurion helm (gilded, transverse crest)', meta: { hair: 'none', crest: 'transverse', faction: 'romans' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.4, 3.4], [2.3, 2.3]], { color: bowl(ctx) });
    cutFaceCube(hs);
    X(hs, 3, 0, 8, 6, 4, 8);                                                          // open face between the cheek plates
    Bs(hs, 1, 0, 8, 2, 3, 8, mcol(ctx, 3, 7, 0.02)); Bs(hs, 1, 0, 5, 1, 3, 7, mcol(ctx, 2, 7, -0.06));
    Bs(hs, 2, 5, 9, 4, 5, 9, mcol(ctx, 6, 7, 0.12));                                  // brow ridge
    const au = [0xb08a18, 0xe0b82e, 0xf6d850];                                          // the gilding is gold whatever the helm metal is
    B(hs, 1, 5, 2, 8, 5, 8, (x, y, z) => ((x === 1 || x === 8 || z === 2 || z === 8) ? V(au[(x + z) % 2 ? 2 : 1]) : 0));   // embossed gold band
    B(hs, 2, 0, 0, 7, 3, 0, mcol(ctx, 3, 7, 0)); B(hs, 1, 0, 1, 8, 1, 1, mcol(ctx, 1, 7, -0.1));                          // wide neck guard
    // the crest: a flat-topped brush of horsehair, 3 deep, with a fine serrated top and a darker spine
    B(hs, 1, 7, 3, 8, 7, 6, V(au[1])); Bs(hs, 0, 7, 4, 0, 8, 5, V(au[2]));
    const h = [0, 5, 6, 6, 6, 6, 6, 6, 5, 0];
    for (let x = 1; x <= 8; x++) for (let y = 8; y <= 7 + h[x]; y++) {
      const top = y === 7 + h[x];
      const c = ctx.t(0.84 + 0.26 * ((y - 8) / 5) + 0.06 * hash3(x, y, 4, 8) - (x === 4 || x === 5 ? 0.06 : 0));
      if (top && x % 2 === 0) continue;
      for (let z = 4; z <= 5; z++) P(hs, x, y, z, c);
      if (!top && y < 7 + h[x] - 1) P(hs, x, y, 6, ctx.t(0.78 + 0.1 * hash3(x, y, 6, 9)));
    }
    return { head, crest };
  },
};

// ---------------------------------------------------------------------------------------------- Egyptians
/** Nemes-lite: a striped headcloth (team / gold) with short lappets at the ears and a gold brow band; no uraeus, no chest lappets. */
H.nemes_lite = {
  name: 'Striped headcloth (nemes-lite)', meta: { hair: 'none', faction: 'egyptians' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const stripe = (x, y, z) => ((((x + 1) >> 1) + (y >> 1) * 0 + (z > 6 ? 1 : 0)) % 2 === 0 ? ctx.t(0.94 + 0.12 * hash3(x, y, z, 1)) : V(shade(ctx.c.secondary, 0.86 + 0.14 * hash3(x, y, z, 2))));
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.4, 3.4], [2.3, 2.3]], { color: stripe });
    cutFaceCube(hs);
    X(hs, 2, 0, 8, 7, 3, 8);
    Bs(hs, 0, 0, 3, 0, 4, 6, (x, y, z) => ((y + (x === 0 ? 0 : 1)) % 2 === 0 ? ctx.t(1.0) : V(shade(ctx.c.secondary, 0.9))));   // flared lappets beside the face
    Bs(hs, 1, 0, 7, 1, 3, 8, (x, y, z) => ((y % 2) ? V(shade(ctx.c.secondary, 0.9)) : ctx.t(0.95)));
    B(hs, 2, 4, 8, 7, 4, 8, V(ctx.m[2]));                                              // gold brow band
    B(hs, 4, 0, 0, 5, 4, 0, (x, y) => (y % 2 ? ctx.t(0.9) : V(shade(ctx.c.secondary, 0.85))));   // short tail at the back
    return { head, crest };
  },
};

/** Mummy head: wound in bandage strips (gaps show the dry skin), dark sockets with green-gold glowing eyes, and loose strands. */
H.mummy_head = {
  name: 'Mummy head wraps', meta: { hair: 'none', noEyes: true, faction: 'egyptians' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const wrap = (x, y, z) => {
      const d = (x + y * 2 + (z > 4 ? z : -z) + 24) % 8, n = hash3(x, y, z, 12);
      if (d === 0 && n > 0.6) return V(0x4a4032);                                     // gap: dark dry skin
      if (d === 1 || d === 2) return V(shade(0xe6dcc0, 0.9 + 0.14 * n));               // a band of plain linen
      return ctx.t((d >= 6 ? 0.86 : 1.02) * (0.96 + 0.08 * n));
    };
    // a wrapped shell over the whole head (the face cube stays underneath)
    B(hs, 2, 6, 2, 7, 6, 7, wrap); B(hs, 3, 7, 3, 6, 7, 6, wrap);
    B(hs, 2, 0, 8, 7, 5, 8, wrap); B(hs, 2, 0, 1, 7, 5, 1, wrap);
    B(hs, 1, 0, 2, 1, 6, 7, wrap); B(hs, 8, 0, 2, 8, 6, 7, wrap);
    B(hs, 2, 6, 8, 7, 6, 8, wrap); B(hs, 2, 6, 1, 7, 6, 1, wrap);
    B(hs, 4, 0, 9, 5, 2, 9, (x, y, z) => ((y === 1) ? V(0x3a3226) : ctx.t(0.96)));      // the nose is wrapped too
    // eyes: dark sockets, glowing green core and a gold rim
    for (const x of [2, 3, 6, 7]) { P(hs, x, 4, 8, V(0x1a1610)); P(hs, x, 2, 8, V(0x1a1610)); }
    Ps(hs, 3, 3, 8, G(0xa8ff48)); Ps(hs, 2, 3, 8, G(0xffd84a));
    P(hs, 4, 3, 8, V(0x1a1610)); P(hs, 5, 3, 8, V(0x1a1610));
    // loose strands: one down the left side of the head, a wisp on the crown
    const strand = V(0xe8dec2);
    for (const [x, y, z] of [[8, 7, 5], [9, 6, 5], [9, 5, 5], [9, 4, 6], [9, 3, 6], [9, 2, 7]]) P(hs, x, y, z, strand);
    for (const [x, y, z] of [[3, 8, 4], [3, 9, 3], [4, 9, 3], [5, 8, 2]]) P(hs, x, y, z, strand);
    return { head, crest };
  },
};

/** Anubis: black jackal head with a long snout, gold-lined eyes, big upright ears, a gold band and a short black wig down the back. */
H.jackal_anubis = {
  name: 'Anubis jackal head', meta: { hair: 'none', noEyes: true, faction: 'egyptians' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const fur = (x, y, z, f = 1) => V(shade(0x383844, f * (0.72 + 0.5 * hash3(x, y, z, 5)) * (y > 5 ? 1.12 : 1)));
    const gold = (f = 1) => V(shade(ctx.m[3], f));
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.6, 3.6], [2.5, 2.5]], { color: (x, y, z) => fur(x, y, z), n: 2.8 });
    cutFaceCube(hs);
    B(hs, 2, 4, 8, 7, 5, 8, (x, y, z) => fur(x, y, z, 1.0));                          // brow and forehead plate
    B(hs, 3, 0, 8, 6, 3, 8, (x, y, z) => fur(x, y, z, 1.04));                         // muzzle, wide part
    B(hs, 4, 1, 9, 5, 3, 9, (x, y, z) => fur(x, y, z, 1.18));                         // the long narrow tip of the snout (2 deep)
    B(hs, 4, 3, 9, 5, 3, 9, V(0x08080a));                                              // nose
    B(hs, 3, 1, 8, 6, 1, 8, V(0x4a3a38)); B(hs, 4, 1, 9, 5, 1, 9, V(0x4a3a38));       // mouth line
    B(hs, 3, 0, 8, 6, 0, 8, (x, y, z) => V(shade(0x5a4640, 0.9 + 0.15 * hash3(x, y, z, 3))));   // lighter chin
    // eyes: gold with a long dark liner reaching toward the ears
    Ps(hs, 3, 4, 8, V(0xf0c24a)); Ps(hs, 2, 4, 8, V(0x08080a)); Ps(hs, 3, 5, 8, V(0x08080a)); Ps(hs, 1, 4, 5, V(0x08080a));
    B(hs, 1, 5, 1, 8, 5, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? gold(0.9) : 0));   // gold headband
    P(hs, 4, 6, 9, gold(1.1)); P(hs, 5, 6, 9, gold(1.1));                              // a little gold uraeus bead
    // tall pointed ears: triangles 3 wide at the base, 1 at the tip, leaning a little outward; pinkish inner
    for (const [y, x0, x1] of [[8, 1, 3], [9, 1, 3], [10, 1, 2], [11, 1, 2], [12, 0, 1], [13, 0, 0]]) { Bs(hs, x0, y, 3, x1, y, 4, fur(x0, y, 3, 1.12)); }
    Bs(hs, 2, 8, 5, 2, 11, 5, V(0x5a2e36));
    Bs(hs, 0, 13, 3, 0, 13, 4, V(0x0a0a0e));
    // a lighter ridge along the snout and brow so the long muzzle reads
    B(hs, 3, 2, 8, 6, 2, 8, (x, y, z) => fur(x, y, z, 1.3)); B(hs, 3, 5, 8, 6, 5, 8, (x, y, z) => fur(x, y, z, 1.28));
    // wig: black locks behind, down the back with gold ends
    B(hs, 2, 0, 0, 7, 4, 0, (x, y, z) => fur(x, y, z, 0.9)); B(hs, 1, 0, 1, 8, 3, 1, (x, y, z) => fur(x, y, z, 0.85));
    const body = newGrid('body');
    for (let y = 8; y >= 3; y--) for (let x = 2; x <= 7; x++) body.set(x, y, 0, y === 3 ? gold(0.95) : fur(x, y, 0, 0.9));
    return { head, crest, body };
  },
};

/** Priest of Ra: a shaved head with a thin gold circlet and a tiny glowing sun disc on the brow. */
H.sun_circlet = {
  name: 'Sun circlet (shaved head)', meta: { hair: 'none', faction: 'egyptians' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    // shaved scalp: skin over the skull cube, a gold ring, the sun on the brow
    const sk = (x, y, z, f = 1) => V(shade(ctx.c.skin, f * (0.95 + 0.08 * hash3(x, y, z, 2))));
    B(hs, 2, 6, 2, 7, 6, 7, (x, y, z) => sk(x, y, z, 1.04)); B(hs, 1, 3, 2, 1, 5, 7, (x, y, z) => sk(x, y, z, 0.97)); B(hs, 8, 3, 2, 8, 5, 7, (x, y, z) => sk(x, y, z, 0.97));
    B(hs, 2, 3, 1, 7, 5, 1, (x, y, z) => sk(x, y, z, 0.93)); B(hs, 2, 6, 1, 7, 6, 1, (x, y, z) => sk(x, y, z, 1.0));
    B(hs, 1, 5, 1, 8, 5, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) && !((x === 1 || x === 8) && (z === 1 || z === 8)) ? V(ctx.m[3]) : 0));
    B(hs, 3, 5, 8, 6, 5, 8, V(ctx.m[2]));
    B(hs, 4, 6, 8, 5, 7, 8, G(0xffd860)); P(hs, 4, 8, 8, G(0xfff0a8)); P(hs, 5, 8, 8, G(0xfff0a8)); P(hs, 3, 6, 8, G(0xffb830)); P(hs, 6, 6, 8, G(0xffb830));
    return { head, crest };
  },
};

registerParts(PARTS);
