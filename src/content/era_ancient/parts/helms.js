// Helms (category 'helms'): build(ctx) returns {head, crest}. Drawn in HEAD SPACE through HeadSpace (y<8 -> head grid, y>=8 -> crest grid).
// Head grid: face cube x2..7, y0..5, z2..7 (skin, never replaced); shell ring x1..8, z1..8; crest volume y 8..13.
// Silhouette first: crests, plumes, horns and wings are what reads at 40 px. Plumes/cloth are team tinted (ctx.t()).
import { registerParts, UNLOCKS } from './_registry.js';
import { V, T, G, shade, mixRGB, B, Bs, Be, X, Xs, P, Ps, E, sprite, cutFaceCube, vgrad, lighten, darken, hash3, headSpace, metalAt, metalRGB, NONE, newGrid } from './_kit.js';

/** lathe: stack of rounded-square cross-sections. rows[i] = [hx, hz] at y = y0+i (null = skip), n = squareness (2 ellipse .. 4 squircle). */
export function lathe(g, rows, o = {}) {
  const cx = o.cx ?? 4.5, cz = o.cz ?? 4.5, n = o.n ?? 3, y0 = o.y0 ?? 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const y = y0 + i, hx = r[0], hz = r[1];
    for (let z = Math.floor(cz - hz); z <= Math.ceil(cz + hz); z++) for (let x = Math.floor(cx - hx); x <= Math.ceil(cx + hx); x++) {
      const ax = Math.abs(x - cx) / hx, az = Math.abs(z - cz) / hz;
      if (Math.pow(ax, n) + Math.pow(az, n) > 1.0001) continue;
      const v = o.color(x, y, z, ax, az); if (v) g.set(x, y, z, v);
    }
  }
  return g;
}
const mcol = (ctx, y, y1 = 7, bias = 0) => metalAt(ctx, 0.18 + 0.72 * Math.min(1, y / y1) + bias);
const bowlColor = (ctx) => (x, y, z, ax, az) => metalAt(ctx, 0.2 + 0.1 * y * 0.7 + (x > 4.5 ? 0.04 : 0) + ((ax > 0.85 || az > 0.85) ? -0.05 : 0.02) + (y >= 6 ? 0.05 : 0));
const fur = (base, s) => (x, y, z) => V(shade(base, 0.82 + 0.34 * hash3(x, y, z, s)));
const HAIR_ALL = { hair: 'all' };
const SILLY = UNLOCKS.silly_helms;

const rowsCap = (h) => { const r = []; for (let y = 0; y < h; y++) r.push([3.9, 3.9]); return r; };

/** horsehair crest builder. kind 'long' (front-to-back arch), 'transverse' (ear to ear fan). colour fn gives voxel for strand (x,y,z,k) */
function horsehair(hs, ctx, kind, top, tint = true) {
  const col = (x, y, z, k) => (tint ? ctx.t(0.82 + 0.3 * hash3(x, y, z, 5) + (k > 0.8 ? 0.1 : 0)) : V(shade(ctx.c.primary, 0.82 + 0.3 * hash3(x, y, z, 5))));
  if (kind === 'long') {
    const h = [0, 2, 4, 5, 6, 6, 5, 4, 3, 0].map((v) => Math.min(v, top - 7 + 1));
    B(hs, 4, 7, 1, 5, 7, 8, mcol(ctx, 7, 7, 0.1));                                 // metal crest holder
    for (let z = 1; z <= 8; z++) for (let y = 8; y < 8 + h[z]; y++) Bs(hs, 4, y, z, 4, y, z, col(4, y, z, (y - 8) / h[z]));
    for (let y = 3; y <= 8; y++) Bs(hs, 4, y, 0, 4, y, 0, col(4, y, 0, 0));        // tail drooping behind the helm
    Bs(hs, 4, 2, 0, 4, 2, 0, col(4, 2, 0, 0));
  } else {
    const h = [0, 3, 4, 5, 6, 6, 5, 4, 3, 0];
    for (let x = 1; x <= 8; x++) {
      const base = x >= 2 && x <= 7 ? 7 : 6;
      for (let y = base; y < 7 + h[x]; y++) { P(hs, x, y, 4, col(x, y, 4, (y - base) / (7 + h[x] - base))); P(hs, x, y, 5, col(x, y, 5, (y - base) / (7 + h[x] - base))); }
    }
  }
}

// ---------------------------------------------------------------------------------------------- the registry
export const PARTS = { helms: {} };
const H = PARTS.helms;
H.none = { name: 'No helm', build: () => null, meta: HAIR_ALL };

H.laurel = {
  name: 'Laurel wreath', meta: HAIR_ALL,
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const leaf = (x, y, z) => V(hash3(x, y, z, 2) > 0.5 ? 0x4f8a3a : 0x6aa84a);
    // ring around the brow (y4..5), leaves alternate in height, gold berries
    for (let z = 1; z <= 8; z++) for (let x = 1; x <= 8; x++) {
      const edge = x === 1 || x === 8 || z === 1 || z === 8; if (!edge) continue;
      if ((x === 1 || x === 8) && (z === 1 || z === 8)) continue;
      P(hs, x, 5, z, leaf(x, 5, z));
      if (hash3(x, 6, z, 4) > 0.55 && z > 2) P(hs, x, 6, z, leaf(x, 6, z));
      if (hash3(x, 4, z, 6) > 0.7) P(hs, x, 4, z, leaf(x, 4, z));
    }
    Ps(hs, 3, 6, 8, V(0xd8b040)); Ps(hs, 2, 6, 7, V(0xd8b040));                      // berries
    P(hs, 4, 4, 0, V(0xe8e2d0)); P(hs, 5, 3, 0, V(0xe8e2d0)); P(hs, 4, 3, 0, ctx.t(1)); P(hs, 5, 2, 0, ctx.t(1)); // ribbon tails
    return { head, crest };
  },
};

function corinthian(kind, name, top) {
  return {
    name, meta: { hair: 'none', crest: kind },
    build(ctx) {
      const { head, crest, hs } = headSpace();
      const rows = [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.3, 3.3], [2.0, 2.0]];
      lathe(hs, rows, { color: bowlColor(ctx) });
      cutFaceCube(hs);
      // open the face: eye slits (y3), mouth (x3..6, y0..2) and keep the T-shaped nasal guard
      X(hs, 2, 3, 8, 3, 3, 8); X(hs, 6, 3, 8, 7, 3, 8); X(hs, 3, 0, 8, 6, 2, 8);
      B(hs, 4, 1, 8, 5, 4, 8, mcol(ctx, 5, 7, 0.1)); B(hs, 4, 2, 9, 5, 4, 9, mcol(ctx, 6, 7, 0.15));   // nasal bar sticks out
      Bs(hs, 2, 5, 9, 3, 5, 9, mcol(ctx, 6, 7, 0.1));                                                      // brow ridge
      B(hs, 1, 4, 3, 1, 4, 6, mcol(ctx, 2, 7, -0.2)); B(hs, 8, 4, 3, 8, 4, 6, mcol(ctx, 2, 7, -0.2));     // rim line
      B(hs, 2, 6, 2, 7, 6, 7, (x, y, z) => ((x + z) % 2 ? mcol(ctx, 7, 7, 0.12) : mcol(ctx, 7, 7, 0.0)));
      if (kind !== 'none') horsehair(hs, ctx, kind, top);
      return { head, crest };
    },
  };
}
H.corinthian = corinthian('long', 'Corinthian helm', 12);
H.corinthian_transverse = corinthian('transverse', 'Corinthian, transverse crest', 12);
H.corinthian_tall = corinthian('long', 'Corinthian, tall crest', 13);
H.corinthian_plain = corinthian('none', 'Corinthian, no crest', 7);

H.attic = {
  name: 'Attic helm', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.3, 3.3], [2.0, 2.0]], { color: bowlColor(ctx) });
    cutFaceCube(hs);
    X(hs, 2, 0, 8, 7, 4, 8);                                                       // open face
    Bs(hs, 1, 0, 6, 1, 2, 8, mcol(ctx, 2, 7, 0.0));                               // hinged cheek flaps
    Bs(hs, 3, 5, 9, 4, 5, 9, mcol(ctx, 6, 7, 0.15));                              // brow peak
    B(hs, 1, 5, 2, 8, 5, 8, (x, y, z) => (x === 1 || x === 8 || z === 1 || z === 8 ? mcol(ctx, 3, 7, -0.25) : 0));   // rim band
    B(hs, 4, 7, 2, 5, 7, 7, mcol(ctx, 7, 7, 0.2));
    B(hs, 4, 0, 0, 5, 3, 0, mcol(ctx, 3, 7, 0.0)); B(hs, 3, 0, 1, 6, 1, 1, mcol(ctx, 2, 7, 0));   // neck guard
    return { head, crest };
  },
};

H.phrygian = {
  name: 'Phrygian cap', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const col = (x, y, z) => ctx.t(0.85 + 0.2 * hash3(x, y, z, 3) + (y >= 6 ? 0.08 : 0));
    lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.5, 3.5], [2.6, 2.6]], { color: col });
    cutFaceCube(hs);
    X(hs, 2, 4, 8, 7, 4, 8);
    B(hs, 1, 4, 1, 8, 4, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? V(ctx.c.secondary) : 0));
    // the forward-curling tip
    const tip = [[4, 8, 4], [4, 9, 5], [4, 10, 6], [4, 10, 7], [4, 9, 8], [4, 8, 8]];
    for (const [x, y, z] of tip) { B(hs, x, y, z, x + 1, y, z, ctx.t(0.95 + 0.1 * hash3(x, y, z, 1))); }
    B(hs, 4, 7, 4, 5, 7, 7, ctx.t(1));
    return { head, crest };
  },
};

H.chalcidian = {
  name: 'Chalcidian helm', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.3, 3.3], [2.0, 2.0]], { color: bowlColor(ctx) });
    cutFaceCube(hs);
    X(hs, 2, 0, 8, 7, 4, 8);                                                       // open face, nasal bar stays
    B(hs, 4, 1, 8, 5, 4, 8, mcol(ctx, 5, 7, 0.1));
    Xs(hs, 1, 2, 3, 1, 3, 6);                                                      // ear cutouts
    Bs(hs, 0, 0, 5, 0, 2, 8, mcol(ctx, 2, 7, 0.05));                              // flared cheek guards
    B(hs, 3, 0, 0, 6, 4, 0, mcol(ctx, 3, 7, 0));                                  // neck guard
    B(hs, 2, 0, 1, 7, 0, 1, mcol(ctx, 1, 7, -0.1));
    B(hs, 1, 5, 2, 8, 5, 8, (x, y, z) => (x === 1 || x === 8 || z === 1 || z === 8 ? V(ctx.m[1]) : 0));
    horsehair(hs, ctx, 'long', 12);
    return { head, crest };
  },
};

function galea(name, flaps, tall, crestKind) {
  return {
    name, meta: { hair: 'none' },
    build(ctx) {
      const { head, crest, hs } = headSpace();
      lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.4, 3.4], [2.2, 2.2]], { color: bowlColor(ctx) });
      cutFaceCube(hs);
      X(hs, 3, 0, 8, 6, 4, 8);                                                     // open face between the cheek plates
      if (flaps) Bs(hs, 1, 0, 8, 2, 3, 8, mcol(ctx, 2, 7, -0.05));                 // cheek plates in front of the ears
      Bs(hs, 2, 5, 9, 4, 5, 9, mcol(ctx, 6, 7, 0.12));                             // brow ridge
      B(hs, 2, 0, 0, 7, 3, 0, mcol(ctx, 3, 7, 0));                                 // wide neck guard
      B(hs, 1, 0, 1, 8, 1, 1, mcol(ctx, 1, 7, -0.1));
      B(hs, 4, 6, 2, 5, 7, 7, mcol(ctx, 7, 7, 0.25));                              // reinforcing ridge
      B(hs, 2, 6, 4, 7, 6, 5, mcol(ctx, 7, 7, 0.18));                              // cross brace
      Bs(hs, 1, 4, 2, 1, 4, 7, V(ctx.m[0]));                                       // rim shadow line
      if (tall) { B(hs, 4, 8, 2, 5, 8, 7, mcol(ctx, 7, 7, 0.2)); }
      if (crestKind) horsehair(hs, ctx, crestKind, 11);
      return { head, crest };
    },
  };
}
H.galea = galea('Galea (Imperial Gallic)', true, false);
H.galea_crest = galea('Galea with crest', true, false, 'long');
H.galea_light = galea('Galea, light (no cheek flaps)', false, false);

H.montefortino = {
  name: 'Montefortino helm', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.6, 3.6], [3.0, 3.0], [2.2, 2.2], [1.2, 1.2]], { color: bowlColor(ctx), n: 2.6 });
    cutFaceCube(hs);
    X(hs, 3, 0, 8, 6, 4, 8);
    Bs(hs, 1, 0, 8, 2, 3, 8, mcol(ctx, 2, 7, -0.05));
    B(hs, 4, 9, 4, 5, 9, 5, mcol(ctx, 7, 7, 0.3));                                 // the button
    Bs(hs, 2, 5, 9, 4, 5, 9, mcol(ctx, 6, 7, 0.1));
    B(hs, 3, 0, 0, 6, 2, 0, mcol(ctx, 3, 7, 0));
    return { head, crest };
  },
};

H.centurion_crest = {
  name: 'Centurion helm (transverse crest)', meta: { hair: 'none', crest: 'transverse' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.4, 3.4], [2.2, 2.2]], { color: (x, y, z, ax, az) => metalAt({ m: ctx.m }, 0.35 + 0.05 * y + (x > 4.5 ? 0.05 : 0)) });
    cutFaceCube(hs);
    X(hs, 3, 0, 8, 6, 4, 8);
    Bs(hs, 1, 0, 8, 2, 3, 8, mcol(ctx, 3, 7, 0.0));
    Bs(hs, 2, 5, 9, 4, 5, 9, mcol(ctx, 6, 7, 0.12));
    B(hs, 2, 0, 0, 7, 3, 0, mcol(ctx, 3, 7, 0));
    // tall crest, ear to ear
    const h = [0, 3, 5, 6, 6, 6, 6, 5, 3, 0];
    for (let x = 1; x <= 8; x++) { const base = x >= 2 && x <= 7 ? 7 : 6; for (let y = base; y < 7 + h[x]; y++) { const c = ctx.t(0.85 + 0.25 * hash3(x, y, 4, 8) + (y > 11 ? 0.1 : 0)); P(hs, x, y, 4, c); P(hs, x, y, 5, c); } }
    B(hs, 1, 6, 4, 8, 6, 5, V(ctx.m[3]));
    return { head, crest };
  },
};

H.nemes = {
  name: 'Nemes headcloth', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const stripe = (x, y, z) => ((y + (z > 6 ? 0 : 0)) % 2 === 0 ? ctx.t(0.95 + 0.1 * hash3(x, y, z, 1)) : V(shade(ctx.c.secondary, 0.85 + 0.15 * hash3(x, y, z, 2))));
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.4, 3.4], [2.2, 2.2]], { color: stripe });
    cutFaceCube(hs);
    X(hs, 2, 0, 8, 7, 3, 8);                                                       // face open under the brow band
    Bs(hs, 0, 0, 3, 0, 3, 6, (x, y) => stripe(x, y, 4));                           // flared lappets beside the face
    Bs(hs, 1, 0, 8, 1, 3, 8, (x, y) => stripe(x, y, 7));
    B(hs, 2, 4, 8, 7, 4, 8, V(ctx.m[2]));                                          // gold brow band
    B(hs, 4, 5, 8, 5, 6, 9, V(ctx.m[3]));                                          // uraeus
    B(hs, 4, 0, 0, 5, 4, 0, (x, y) => stripe(x, y, 0));                            // back tail
    // lappets hang in front of the shoulders and a tail down the back
    const body = newGrid('body');
    for (let y = 5; y <= 8; y++) { Bs(body, 1, y, 4, 2, y, 4, stripe(1, y, 4)); }
    Bs(body, 1, 4, 4, 1, 4, 4, stripe(1, 4, 4));
    for (let y = 4; y <= 8; y++) B(body, 4, y, 0, 5, y, 0, stripe(4, y, 0));
    return { head, crest, body };
  },
};

H.pschent = {
  name: 'Pschent (double crown)', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const red = (x, y, z) => V(shade(0xb82a22, 0.8 + 0.3 * hash3(x, y, z, 4)));
    const white = (x, y, z) => V(shade(0xf2efe6, 0.9 + 0.12 * hash3(x, y, z, 5)));
    lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.5, 3.5], [3.0, 3.0]], { color: red });
    cutFaceCube(hs);
    X(hs, 2, 4, 8, 7, 4, 8);
    B(hs, 1, 4, 1, 8, 4, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? V(ctx.m[2]) : 0));
    B(hs, 3, 8, 1, 6, 12, 2, red);                                                  // tall back plate of the red crown
    lathe(hs, [null, null, null, null, null, null, null, null, [2.3, 2.7], [2.2, 2.7], [2.2, 2.6], [2.2, 2.4], [1.9, 2.1], [1.3, 1.5]], { color: white, n: 2.4 });
    B(hs, 4, 8, 8, 5, 10, 8, red); B(hs, 4, 11, 8, 5, 11, 9, red);                  // curled wire at the front
    B(hs, 4, 5, 8, 5, 6, 9, V(ctx.m[3]));                                           // uraeus
    return { head, crest };
  },
};

H.khepresh = {
  name: 'Khepresh (blue crown)', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const blue = (x, y, z) => V(shade(0x2d4fb0, 0.85 + 0.25 * hash3(x, y, z, 7) + (y > 9 ? 0.08 : 0)));
    lathe(hs, [null, null, null, [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.8, 3.8], [3.5, 3.5], [3.1, 3.1], [2.6, 2.6], [2.0, 2.0], [1.2, 1.2]], { color: blue, n: 2.6 });
    cutFaceCube(hs);
    X(hs, 2, 3, 8, 7, 3, 8);
    for (let y = 4; y <= 10; y += 2) for (let z = 1; z <= 8; z++) for (let x = 1; x <= 8; x++) if (hs.get(x, y, z) && (x + z + y) % 3 === 0 && (x === 1 || x === 8 || z === 1 || z === 8 || y > 8)) hs.set(x, y, z, V(ctx.m[3]));
    B(hs, 1, 3, 1, 8, 3, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? V(ctx.m[2]) : 0));
    B(hs, 4, 5, 8, 5, 7, 9, V(ctx.m[3]));
    return { head, crest };
  },
};

H.persian_tiara = {
  name: 'Persian tiara', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const cloth = (x, y, z) => ctx.t(0.88 + 0.16 * hash3(x, y, z, 3));
    lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.2, 3.2], [3.2, 3.2], [3.2, 3.2], [3.3, 3.3], [3.3, 3.3], [3.3, 3.3], [3.4, 3.4], [3.4, 3.4]], { color: cloth, n: 2.2 });
    cutFaceCube(hs);
    X(hs, 2, 4, 8, 7, 4, 8);
    B(hs, 1, 4, 1, 8, 4, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? V(ctx.m[2]) : 0));
    for (let y of [6, 9, 12]) B(hs, 1, y, 1, 8, y, 8, (x, yy, z) => (hs.get(x, yy, z) ? V(ctx.m[y === 12 ? 3 : 2]) : 0));
    for (let z = 1; z <= 8; z++) for (let x = 1; x <= 8; x++) if (hs.get(x, 13, z) && (x + z) % 2) hs.set(x, 13, z, 0);   // crenellated top
    for (let y of [7, 8, 10, 11]) for (let z = 1; z <= 8; z++) for (let x = 1; x <= 8; x++) if (hs.get(x, y, z) && (x * 3 + z * 5 + y) % 7 === 0) hs.set(x, y, z, V(ctx.m[3]));
    return { head, crest };
  },
};

H.persian_cap = {
  name: 'Persian felt cap', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const felt = (x, y, z) => ctx.t(0.82 + 0.22 * hash3(x, y, z, 9));
    lathe(hs, [null, null, null, [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.5, 3.5], [3.0, 3.0], [2.4, 2.6], [1.6, 2.0]], { color: felt, n: 2.4 });
    cutFaceCube(hs);
    X(hs, 2, 3, 8, 7, 3, 8);
    B(hs, 1, 3, 1, 8, 3, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? V(ctx.m[2]) : 0));
    B(hs, 2, 0, 0, 7, 3, 0, felt); B(hs, 1, 0, 1, 1, 2, 5, felt); B(hs, 8, 0, 1, 8, 2, 5, felt);   // neck veil and ear flaps
    B(hs, 4, 10, 5, 5, 10, 6, felt);
    return { head, crest };
  },
};

H.gallic_winged = {
  name: 'Gallic winged helm', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.3, 3.3], [2.0, 2.0]], { color: bowlColor(ctx) });
    cutFaceCube(hs);
    X(hs, 2, 0, 8, 7, 4, 8);
    B(hs, 1, 4, 1, 8, 4, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? V(ctx.m[1]) : 0));
    B(hs, 4, 1, 8, 5, 4, 8, mcol(ctx, 5, 7, 0.1));
    // big feathered wings out of the sides, swept up and out
    const wing = (x, y, z) => V(shade(0xf4f1e6, 0.86 + 0.14 * hash3(x, y, z, 6) - (y > 11 ? 0.05 : 0)));
    const cols = [[0, 5, 9], [0, 7, 11], [1, 8, 13]];
    for (const [x, y0, y1] of cols) Bs(hs, x, y0, 3, x, y1, 6, wing);
    Bs(hs, 0, 9, 3, 0, 10, 6, (x, y, z) => V(shade(0xd8d4c4, 0.9 + 0.1 * hash3(x, y, z, 7))));
    Bs(hs, 1, 12, 3, 1, 13, 5, wing);
    Bs(hs, 2, 13, 4, 2, 13, 5, wing);
    return { head, crest };
  },
};

function horned(name, hh, spread) {
  return {
    name, meta: { hair: 'none', horns: hh },
    build(ctx) {
      const { head, crest, hs } = headSpace();
      lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.7, 3.7], [3.1, 3.1], [2.1, 2.1]], { color: (x, y, z) => metalAt({ m: ctx.m }, 0.22 + 0.06 * y + (hash3(x, y, z, 2) > 0.8 ? 0.05 : 0)), n: 2.6 });
      cutFaceCube(hs);
      X(hs, 3, 0, 8, 6, 4, 8);
      Bs(hs, 1, 0, 8, 2, 4, 8, mcol(ctx, 3, 7, 0.0));
      B(hs, 4, 1, 8, 5, 5, 8, mcol(ctx, 5, 7, 0.1));                              // nasal bar
      B(hs, 1, 4, 1, 8, 4, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? V(ctx.m[0]) : 0));
      // horns: chunky 2x2 shafts that sprout sideways at brow height, rise, and curl inward at the tips
      const y1 = 4 + hh;
      const bone = (y) => V(mixRGB(0xefe4c6, 0xa89870, Math.min(1, (y - 4) / (hh + 1))));
      Bs(hs, 0, 4, 3, 0, 5, 6, bone(4)); Bs(hs, 1, 4, 4, 1, 5, 5, bone(4));
      for (let y = 6; y <= y1 - 2; y++) Bs(hs, 0, y, 4, 1, y, 5, bone(y));
      Bs(hs, 1, y1 - 1, 4, 2, y1 - 1, 5, bone(y1 - 1));
      Bs(hs, 2, Math.min(13, y1), 4, 2, Math.min(13, y1), 4, bone(y1));
      if (spread) Bs(hs, 3, Math.min(13, y1), 4, 3, Math.min(13, y1), 4, bone(y1));
      return { head, crest };
    },
  };
}
H.horned_small = horned('Horned helm, small', 4, false);
H.horned = horned('Horned helm', 6, true);
H.horned_big = horned('Horned helm, giant', 8, true);

H.wolf_hood = {
  name: 'Wolf-pelt hood', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const pelt = fur(0x7a7468, 4);
    lathe(hs, [null, null, [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.7, 3.7], [3.0, 3.0], [1.8, 2.2]], { color: (x, y, z) => V(shade(0x7a7468, (y > 5 ? 1.0 : 0.86) * (0.8 + 0.36 * hash3(x, y, z, 4)))), n: 2.6 });
    cutFaceCube(hs);
    X(hs, 2, 0, 8, 7, 3, 8);
    // snout over the brow, black nose, fangs
    B(hs, 3, 4, 8, 6, 5, 8, pelt); B(hs, 4, 4, 9, 5, 4, 9, V(0x8a847a)); P(hs, 4, 5, 9, V(0x15151a)); P(hs, 5, 5, 9, V(0x15151a));
    Ps(hs, 3, 3, 9, V(0xf4f0e0)); Ps(hs, 2, 4, 8, pelt);
    // ears
    Bs(hs, 2, 8, 3, 3, 9, 4, pelt); Ps(hs, 2, 10, 3, pelt); Ps(hs, 2, 8, 3, V(0x2a2622));
    // fur ruff around the face, woad stripes over the crown
    Bs(hs, 1, 0, 3, 1, 4, 8, pelt); Bs(hs, 2, 3, 8, 2, 3, 8, pelt);
    for (const x of [3, 6]) for (let z = 2; z <= 8; z++) for (const y of [8, 7, 6]) if (hs.get(x, y, z)) hs.set(x, y, z, ctx.t(1.0));
    Bs(hs, 3, 5, 8, 3, 5, 8, ctx.t(1.0));
    // back flap
    B(hs, 2, 0, 0, 7, 5, 1, pelt);
    // pelt draped over the shoulders and down the back
    const body = newGrid('body');
    const pl = fur(0x7a7468, 7);
    B(body, 0, 8, 0, 9, 8, 4, pl);
    for (let y = 5; y <= 8; y++) for (let x = 1; x <= 8; x++) { const ragged = y < 6 && hash3(x, y, 0, 3) > 0.5; if (!ragged) B(body, x, y, 0, x, y, 1, pl); }
    Bs(body, 0, 6, 0, 0, 8, 3, pl); Bs(body, 1, 7, 4, 2, 7, 4, pl);
    return { head, crest, body };
  },
};

H.boar_helm = {
  name: 'Boar-head helm', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.3, 3.3], [2.0, 2.0]], { color: (x, y, z) => V(shade(ctx.m[1], 0.9 + 0.2 * hash3(x, y, z, 1))) });
    cutFaceCube(hs);
    X(hs, 2, 0, 8, 7, 4, 8);
    Bs(hs, 1, 0, 8, 2, 3, 8, mcol(ctx, 2, 7, 0));
    // bristly mane along the top
    for (let z = 1; z <= 8; z++) { const h = 2 + (z % 2) + (z > 2 && z < 7 ? 1 : 0); for (let y = 7; y < 7 + h; y++) Bs(hs, 4, y, z, 4, y, z, V(shade(0x3a2a1c, 0.8 + 0.4 * hash3(4, y, z, 3)))); }
    // boar snout on the brow with tusks
    B(hs, 3, 5, 8, 6, 6, 8, V(0xc49a84)); B(hs, 3, 5, 9, 6, 6, 9, V(0xa77a66)); B(hs, 4, 5, 9, 5, 5, 9, V(0x2a1a14));
    Ps(hs, 3, 4, 9, V(0xf4f0e0)); Ps(hs, 3, 3, 9, V(0xf4f0e0));
    Ps(hs, 1, 6, 5, V(0x5a3a2a)); Ps(hs, 1, 7, 5, V(0x5a3a2a)); Ps(hs, 1, 7, 4, V(0x5a3a2a));
    return { head, crest };
  },
};

H.bull_head = {
  name: 'Bull head', meta: { hair: 'none', noEyes: true },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const coat = (x, y, z) => V(shade(0x6a4a30, 0.78 + 0.34 * hash3(x, y, z, 5) + (y > 4 ? 0.06 : 0)));
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.5, 3.5], [2.4, 2.4]], { color: coat });
    cutFaceCube(hs);
    B(hs, 2, 0, 8, 7, 5, 8, coat);                                                  // forehead / cheeks
    B(hs, 3, 0, 9, 6, 3, 9, V(0xd8a090)); B(hs, 4, 1, 9, 5, 2, 9, V(0xe8b0a0));    // broad muzzle
    B(hs, 3, 0, 8, 6, 3, 8, V(0xc08878));
    Ps(hs, 4, 1, 9, V(0x2a1a1a));                                                    // nostrils
    B(hs, 4, 0, 9, 5, 0, 9, V(0xd8b848));                                            // brass nose ring
    Ps(hs, 3, 4, 9, V(0xf2f0e6)); Ps(hs, 2, 4, 8, V(0x1a1010));                      // eyes
    Ps(hs, 2, 4, 9, V(0x1a1010));
    // ears and long curved horns
    Bs(hs, 0, 5, 4, 1, 5, 6, coat);
    const horn = (y) => V(mixRGB(0xf0e6c8, 0xb8a47c, Math.min(1, (y - 5) / 7)));
    for (let s = 0; s < 2; s++) {
      const ex = s ? 9 : 0, dx = s ? -1 : 1;
      for (let y = 6; y <= 12; y++) { const x = y <= 8 ? ex : (y <= 10 ? ex : ex + dx); P(hs, x, y, 5, horn(y)); P(hs, x, y, 4, horn(y)); }
      P(hs, ex + dx, 12, 4, horn(12)); P(hs, ex + dx, 13, 4, horn(13));
      P(hs, ex, 5, 5, horn(5)); P(hs, ex, 5, 4, horn(5));
    }
    return { head, crest };
  },
};

H.jackal_head = {
  name: 'Jackal head', meta: { hair: 'none', noEyes: true },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const coat = (x, y, z) => V(shade(0x22222a, 0.8 + 0.5 * hash3(x, y, z, 5) + (y > 5 ? 0.15 : 0)));
    lathe(hs, [[3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.5, 3.5], [2.3, 2.3]], { color: coat });
    cutFaceCube(hs);
    B(hs, 2, 2, 8, 7, 5, 8, coat);
    B(hs, 3, 0, 8, 6, 2, 8, coat);                                                   // long narrow snout
    B(hs, 4, 0, 9, 5, 2, 9, coat); B(hs, 4, 1, 9, 5, 2, 9, V(0x15151a));
    Ps(hs, 3, 3, 8, V(0xe8c050)); Ps(hs, 3, 3, 9, V(0x15151a)); Ps(hs, 2, 3, 8, V(0xe8c050));
    Ps(hs, 3, 4, 8, V(0x15151a));
    // tall pointed ears
    Bs(hs, 2, 8, 4, 3, 9, 5, coat); Bs(hs, 2, 10, 4, 2, 12, 5, coat); Bs(hs, 2, 13, 4, 2, 13, 4, V(0x15151a)); Bs(hs, 3, 10, 4, 3, 11, 5, V(0x6a4a44));
    B(hs, 1, 5, 1, 8, 5, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? V(ctx.m[2]) : 0));   // gold headband
    Ps(hs, 1, 2, 4, V(ctx.m[3]));                                                                           // earrings
    return { head, crest };
  },
};

H.cyclops_head = {
  name: 'Cyclops face', meta: { hair: 'all', noEyes: true },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const sk = (f) => V(shade(ctx.c.skin, f));
    B(hs, 2, 4, 8, 7, 5, 8, (x, y, z) => sk(0.78 + 0.1 * hash3(x, y, z, 1)));       // heavy brow ridge
    B(hs, 2, 5, 9, 7, 5, 9, sk(0.7));
    B(hs, 3, 1, 8, 6, 3, 8, V(0xf4f0e6)); B(hs, 3, 2, 9, 6, 3, 9, V(0xf4f0e6));     // the one big eye
    B(hs, 4, 2, 9, 5, 3, 9, V(ctx.c.eyes)); P(hs, 4, 3, 9, V(0xffffff));
    B(hs, 3, 0, 8, 6, 0, 8, V(0x7a3a30));                                            // mouth
    Ps(hs, 3, 0, 8, V(0xf4f0e0)); Ps(hs, 3, 1, 9, V(0xf4f0e0));                      // tusks
    return { head, crest };
  },
};

H.snake_hair = {
  name: 'Snake hair', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const green = (x, y, z) => V(shade(0x4f9a3a, 0.8 + 0.4 * hash3(x, y, z, 5)));
    lathe(hs, [null, null, null, [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.6, 3.6], [3.0, 3.0]], { color: green, n: 2.4 });
    cutFaceCube(hs);
    X(hs, 2, 3, 8, 7, 3, 8);
    // 8 snakes, each a wavy path with a head and glowing eyes
    const snakes = [
      [[2, 8, 2], [1, 9, 2], [1, 10, 3], [2, 11, 3], [2, 12, 4]], [[7, 8, 2], [8, 9, 2], [8, 10, 3], [7, 11, 3], [7, 12, 4]],
      [[3, 8, 5], [3, 9, 5], [2, 10, 5], [2, 11, 6], [3, 12, 6]], [[6, 8, 5], [6, 9, 5], [7, 10, 5], [7, 11, 6], [6, 12, 6]],
      [[4, 8, 3], [4, 9, 3], [4, 10, 2], [5, 11, 2], [5, 12, 1]], [[1, 6, 4], [0, 7, 4], [0, 8, 5], [0, 9, 6], [1, 10, 7]],
      [[8, 6, 4], [9, 7, 4], [9, 8, 5], [9, 9, 6], [8, 10, 7]], [[5, 8, 7], [5, 9, 8], [4, 10, 8], [4, 11, 7], [4, 12, 7]],
    ];
    for (const s of snakes) {
      for (let i = 0; i < s.length - 1; i++) { const a = s[i], b = s[i + 1]; hs.line(a[0], a[1], a[2], b[0], b[1], b[2], green(a[0], a[1], a[2])); }
      const t = s[s.length - 1]; P(hs, t[0], t[1] + 1, t[2], G(0xf0e060)); P(hs, t[0], t[1], t[2], green(t[0], t[1], t[2]));
    }
    return { head, crest };
  },
};

H.colander = {
  name: 'Colander', unlock: SILLY, meta: { hair: 'none', metal: 'silver' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.7, 3.7], [3.1, 3.1], [2.0, 2.0]], {
      color: (x, y, z) => ((x * 7 + y * 5 + z * 3) % 4 === 0 ? V(0x3a3f48) : metalAt({ m: ctx.m }, 0.45 + 0.07 * (y - 4))), n: 2.4 });
    cutFaceCube(hs);
    X(hs, 2, 4, 8, 7, 4, 8);
    Ps(hs, 0, 5, 4, V(ctx.m[2])); Ps(hs, 0, 6, 4, V(ctx.m[3])); Ps(hs, 0, 5, 5, V(ctx.m[2])); Ps(hs, 0, 6, 5, V(ctx.m[3]));    // handles
    return { head, crest };
  },
};
H.traffic_cone = {
  name: 'Traffic cone', unlock: SILLY, meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const rows = [null, null, null, null, null, null, [3.9, 3.9], [3.5, 3.5], [3.1, 3.1], [2.7, 2.7], [2.2, 2.2], [1.7, 1.7], [1.2, 1.2], [0.8, 0.8]];
    lathe(hs, rows, { color: (x, y, z) => ((y === 9 || y === 10) ? V(0xf4f4f0) : V(shade(0xff6a14, 0.88 + 0.14 * hash3(x, y, z, 1)))), n: 2 });
    cutFaceCube(hs);
    lathe(hs, [null, null, null, null, null, [3.9, 3.9]], { color: (x, y, z) => V(0xff6a14), n: 2 });
    cutFaceCube(hs);
    return { head, crest };
  },
};
H.cooking_pot = {
  name: 'Cooking pot', unlock: SILLY, meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.9, 3.9], [3.6, 3.6]], { color: (x, y, z) => V(shade(0x3a3a42, 0.7 + 0.5 * (y - 4) / 6 + 0.1 * hash3(x, y, z, 1))), n: 2.4 });
    cutFaceCube(hs);
    X(hs, 2, 4, 8, 7, 4, 8);
    Bs(hs, 0, 6, 4, 0, 7, 5, V(0x2a2a30)); Bs(hs, 1, 8, 4, 1, 8, 5, V(0x2a2a30));
    B(hs, 4, 10, 4, 5, 10, 5, V(0x8a5a2b)); B(hs, 4, 11, 4, 5, 11, 5, V(0x8a5a2b));  // lid knob
    B(hs, 2, 6, 8, 7, 6, 8, V(0x5a5a64));
    return { head, crest };
  },
};
H.straw_hat = {
  name: 'Straw hat', unlock: SILLY, meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const straw = (x, y, z) => V(shade(0xd8b860, 0.85 + 0.22 * hash3(x, y, z, 2) + ((x + z) % 2 ? 0.04 : 0)));
    lathe(hs, [null, null, null, null, null, [4.9, 4.9], [3.6, 3.6], [3.0, 3.0], [2.2, 2.2], [1.2, 1.2]], { color: straw, n: 2 });
    lathe(hs, [null, null, null, null, null, [4.9, 4.9]], { color: straw, n: 2 });
    cutFaceCube(hs);
    B(hs, 1, 6, 1, 8, 6, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) && hs.get(x, y, z) ? ctx.t(1) : 0));   // tinted hat band
    return { head, crest };
  },
};

// ---- T0 additions
H.boeotian = {
  name: 'Boeotian helm', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    // low rounded crown over a broad drooping brim
    lathe(hs, [null, null, null, null, null, [4.9, 4.9], [3.7, 3.7], [3.3, 3.3], [2.4, 2.4]], { color: bowlColor(ctx), n: 2.2 });
    lathe(hs, [null, null, null, null, null, [4.9, 4.9]], { color: (x, y, z, ax, az) => (ax > 0.82 || az > 0.82 ? V(ctx.m[1]) : metalAt({ m: ctx.m }, 0.45)), n: 2.2 });
    cutFaceCube(hs);
    B(hs, 1, 4, 1, 8, 4, 8, (x, y, z) => ((x === 1 || x === 8 || z === 1 || z === 8) ? V(ctx.m[0]) : 0));
    B(hs, 3, 8, 3, 6, 8, 6, V(ctx.m[3]));                                           // crown ridge
    B(hs, 4, 9, 4, 5, 9, 5, V(ctx.m[4]));
    // big swept plume (tinted) rising from the crown and arching back
    const path = [[9, 3], [10, 3], [11, 2], [12, 2], [12, 1], [12, 0], [11, -1], [10, -1]];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      for (let k = 0; k <= 1; k++) hs.line(4 + k, a[0], a[1], 4 + k, b[0], b[1], ctx.t(0.9 + 0.2 * hash3(i, k, 1, 9)));
    }
    for (let i = 0; i < path.length - 1; i++) { const a = path[i]; P(hs, 3, a[0] - (i > 2 ? 1 : 0), a[1], ctx.t(0.85)); P(hs, 6, a[0] - (i > 2 ? 1 : 0), a[1], ctx.t(0.85)); }
    return { head, crest };
  },
};

H.leather_cap = {
  name: 'Leather cap', meta: { hair: 'none' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const lea = (x, y, z) => V(shade(0x8a5a30, 0.82 + 0.22 * hash3(x, y, z, 3) + (y > 6 ? 0.06 : 0)));
    lathe(hs, [null, null, null, null, [3.9, 3.9], [3.9, 3.9], [3.5, 3.5], [2.5, 2.5]], { color: lea, n: 2.6 });
    cutFaceCube(hs);
    X(hs, 2, 4, 8, 7, 4, 8);
    B(hs, 3, 4, 8, 6, 4, 8, V(shade(0x8a5a30, 0.7)));
    B(hs, 4, 6, 1, 5, 7, 8, (x, y, z) => (z % 2 ? V(shade(0x8a5a30, 0.66)) : 0));  // seam stitching
    Bs(hs, 1, 1, 3, 1, 3, 6, lea);                                                  // ear flaps
    return { head, crest };
  },
};

H.feather_band = {
  name: 'Feather headband', meta: { hair: 'all' },
  build(ctx) {
    const { head, crest, hs } = headSpace();
    const ringOnly = (x, z) => (x === 1 || x === 8 || z === 1 || z === 8) && !((x === 1 || x === 8) && (z === 1 || z === 8));
    B(hs, 1, 4, 1, 8, 4, 8, (x, y, z) => (ringOnly(x, z) ? ctx.t(0.95) : 0));
    B(hs, 1, 5, 1, 8, 5, 8, (x, y, z) => (ringOnly(x, z) ? V(ctx.c.secondary) : 0));
    B(hs, 1, 3, 1, 8, 3, 8, (x, y, z) => (ringOnly(x, z) && z < 4 ? ctx.t(0.85) : 0));
    // ostrich plumes sweeping up and back from the nape (tinted, white-ish tips)
    const feather = (x0, z0, h, dz) => {
      for (let i = 0; i < h; i++) {
        const y = 6 + i, z = z0 - Math.round(i * dz), c = i > h - 3 ? ctx.t(1.1) : ctx.t(0.82 + 0.2 * hash3(x0, y, z, 5));
        P(hs, x0, y, z, c); if (i > 1 && i < h - 1) P(hs, x0 + (x0 > 4 ? -1 : 1), y, z, c);
      }
    };
    feather(3, 2, 7, 0.1); feather(6, 2, 7, 0.1); feather(2, 3, 5, 0.0); feather(7, 3, 5, 0.0); feather(4, 1, 8, 0.2); feather(5, 1, 8, 0.2);
    return { head, crest };
  },
};

registerParts(PARTS);
