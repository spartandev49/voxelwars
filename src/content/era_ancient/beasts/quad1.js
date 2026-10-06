// quad1: the four-legged rig (horse, pony, camel, mastiff, battle goat, centaur body).
//
// Parts (spec 4.2, ids frozen):  body, neck, head, tail, legFL, legFR, legBL, legBR  (+ static children: saddle, mane, ears, horns, barding)
// Frames (all coordinates in VOXELS, +Z forward, +X = the animal's LEFT):
//   root            : on the ground under the body centre.
//   body            : origin [0, legLen, 0]; pivot at the BELLY LINE on the centre line (grid y=0 is the belly).
//   neck            : child of body, pivot at the neck base (inside the shoulders), the neck is baked rising forward/up.
//   head            : child of neck, pivot at the poll (top of the neck); the face is baked pointing forward/down.
//   tail            : child of body, pivot at the tail root, hangs along -Y.
//   legXY           : child of body, pivot at the TOP of the leg (2 voxels inside the barrel), legs hang along -Y.
//   saddle/barding  : child of body in the SAME frame as the body (origin [0,0,0], same pivot).
//   mane            : child of neck, same frame.   ears/horns : child of head, same frame.
// Species builders return plain {parts, attach, ...} descriptions; assembleQuad() turns them into a ModelDef.
import { LG, V, T, G, C, shade, mixRGB, newModel, addLG, attachLG, resolveCoat, shellOf, mergeSame } from './common.js';

const rnd = Math.round;
const ev = (n) => 2 * Math.round(n / 2);

/** Fill a leg from a profile list [yTop, yBottom, zBack, zFront, halfWidth, voxel] (hanging from the pivot at y=0). */
function drawLeg(lg, prof) { for (const [y0, y1, zb, zf, hw, col] of prof) lg.box(-hw, y1, zb, hw, y0, zf, col); }
/** Highest solid voxel top (local y) at (x=0, z) of an LG */
function topAt(lg, z, x = 0) {
  for (let y = lg.sy - 1; y >= 0; y--) if (lg.g.get(lg.ix(x), y, lg.iz(z))) return y + 1 - lg.py;
  return 0;
}

// ================================================================== HORSE (also pony / warhorse)
/**
 * Horse species. k scales every dimension (1 = riding horse: back 2.2 u, body 3.4 u).
 * o: {coat, k, socks:['FL'..], blaze, barded, saddle:'cloth'|'pad'|'none', plume, lean, trim}
 */
function horseSpecies(o) {
  const k = o.k || 1, col = resolveCoat(o.coat);
  const Z = (z) => z * k, Y = (y) => y * k;
  const legLen = rnd(10 * k), barrel = 12 * k;
  const sp = { legLen, parts: {}, attach: {}, kind: 'horse' };
  const main = V(col.main), light = V(col.light), legc = V(col.leg), hoof = V(col.hoof), maneC = V(col.mane), eye = V(C.eye);
  const trim = o.trim ?? C.gold;

  // ---- body: chest + barrel + rump blobs, withers and croup
  const bl = ev(40 * k);
  const body = new LG(14, rnd(barrel + 6), bl, 7, 0, bl / 2);
  body.ell(0, Y(6.4), Z(9.8), 6, Y(6.6), Z(7.6), main);
  body.ell(0, Y(6.0), 0, 5.9, Y(6.0), Z(11.2), main);
  body.ell(0, Y(6.9), Z(-9.6), 5.8, Y(6.7), Z(7.6), main);
  body.ell(0, Y(11.6), Z(8.6), 2.4, Y(3.2), Z(4.2), main);
  body.ell(0, Y(12.4), Z(-9), 3.2, Y(2.2), Z(5), main);
  body.carve(-9, -8, -30, 9, 0, 30);
  body.paint((x, y, z) => {
    if (y < Y(2.6)) return light;
    if (y > Y(10.8) && Math.abs(z) < Z(15)) return V(shade(col.main, 0.9));
    return undefined;
  });
  sp.parts.body = { lg: body, origin: [0, legLen, 0] };

  // ---- legs
  const top = 2, LL = legLen + top;
  const mkLeg = (hind, sock) => {
    const lg = new LG(5, LL + 1, 8, 2.5, LL, 4.5);
    const w = sock ? V(0xf1efe8) : legc;
    if (!hind) {
      drawLeg(lg, [[0, -Y(5), -2.5, 2.5, 1.5, legc], [-Y(5), -Y(8), -1.5, 1.5, 1.5, w], [-Y(8), -Y(9.5), -2, 2, 1.5, w], [-Y(9.5), -LL, -2.5, 3, 1.5, hoof]]);
    } else {
      drawLeg(lg, [[0, -Y(4), -3.5, 2.5, 2.5, legc], [-Y(4), -Y(6.5), -4, 0.5, 1.5, legc], [-Y(6.5), -Y(9), -3, 0, 1.5, w], [-Y(9), -Y(9.5), -2.5, 1, 1.5, w], [-Y(9.5), -LL, -2.5, 2.5, 1.5, hoof]]);
    }
    return lg;
  };
  const fz = Z(10.5), hz = Z(-10.5), lx = 3.5, socks = o.socks || [];
  sp.parts.legFL = { lg: mkLeg(false, socks.includes('FL')), origin: [lx, top, fz], parent: 'body' };
  sp.parts.legFR = { lg: mkLeg(false, socks.includes('FR')), origin: [-lx, top, fz], parent: 'body' };
  sp.parts.legBL = { lg: mkLeg(true, socks.includes('BL')), origin: [lx, top, hz], parent: 'body' };
  sp.parts.legBR = { lg: mkLeg(true, socks.includes('BR')), origin: [-lx, top, hz], parent: 'body' };

  // ---- neck (pivot at base, inside the withers)
  const nl = Z(7.6), nh = Y(12.2);
  const neck = new LG(10, rnd(nh) + 12, rnd(nl) + 14, 5, 6, 6);
  neck.tube([0, 0, 0], [0, nh, nl], 4.7 * k, 2.9 * k, main, 0.8);
  sp.parts.neck = { lg: neck, origin: [0, Y(9.4), Z(10.6)], parent: 'body' };

  // ---- head (pivot at the poll)
  const hd = new LG(10, 20, 22, 5, 12, 4);
  hd.ell(0, -1.8, 2.7, 3.4, 4.1, 4.5, main);                                 // skull
  hd.tube([0, -2.6, 4.8], [0, -8.6, 11.6], 3.3, 2.3, main, 1.0);              // face
  hd.ell(0, -8.8, 12.0, 2.5, 2.4, 2.7, main);                                // muzzle
  hd.ell(0, -6.4, 6.4, 3.2, 3.0, 4.0, main);                                 // jaw / cheek
  hd.paint((x, y, z) => (z > 10 && y < -6.2 && col.nose !== col.main ? V(col.nose) : undefined));
  hd.set(-1.4, -8.6, 14.2, V(0x1a1216)); hd.set(0.6, -8.6, 14.2, V(0x1a1216));    // nostrils
  hd.set(-3.4, -0.8, 3.6, eye); hd.set(2.9, -0.8, 3.6, eye);                       // eyes
  hd.box(-0.5, -10.2, 11.2, 0.5, -9.8, 13.8, V(shade(col.main, 0.55)));         // mouth line
  if (o.blaze) hd.box(-0.5, -8.0, 4.4, 0.5, -0.6, 5.8, V(0xf4f1ea), 'set');
  if (o.bridle !== false) {                                                       // bridle: noseband + cheek strap + team browband
    const lea = V(C.leatherDark);
    hd.paint((x, y, z) => (Math.abs(z - 8.6) < 0.5 && y < -5.2 && y > -9.8 ? lea : (Math.abs(z - 3.2) < 0.55 && y > -4.6 && y < 1 && Math.abs(x) > 2 ? lea : undefined)));
    hd.paint((x, y, z) => (y > 0.4 && y < 1.6 && z > 0.5 && z < 4.2 ? T(0xffffff) : undefined));
  }
  if (o.barded) {                                                                  // chamfron: steel face plate with team crest
    const plate = shellOf(hd, (x, y, z, d) => d === 1 && z > 3.2 && y > -9.4 && y < 1.6 && !(y < -7 && z < 8), 1, (x, y, z) => (Math.abs(x) < 0.6 ? V(C.gold) : ((Math.floor(y) + Math.floor(z)) & 1 ? V(0xc9d0d8) : V(0xa9b2bc))));
    // plate shares the head's frame only if sizes match: stamp voxel by voxel in local coordinates
    stampLocal(hd, plate);
  }
  sp.parts.head = { lg: hd, origin: [0, nh, nl - 0.5], parent: 'neck' };
  sp.attach.head_top = { part: 'head', at: [0, 3.4, 2.6] };
  sp.attach.mouth = { part: 'head', at: [0, -9, 12] };

  // ---- ears + forelock (+ team plume) : static child of head
  const ears = new LG(10, 16, 10, 5, 0, 5);
  ears.box(-2.5, 0, 0, -1.5, 2, 1, main); ears.box(-2.5, 2, 0.5, -1.5, 3.6, 1.5, main);
  ears.box(1.5, 0, 0, 2.5, 2, 1, main); ears.box(1.5, 2, 0.5, 2.5, 3.6, 1.5, main);
  ears.box(-1, 0, 1.5, 1, 1.5, 3.5, maneC);
  if (o.plume) {
    ears.box(-1, 0, -0.5, 1, 1.5, 1.5, V(trim));
    ears.box(-1, 1.5, -0.5, 1, 6, 0.5, T(0xffffff)); ears.box(-1, 5, -1.5, 1, 8, -0.5, T(0xe8e8e8)); ears.box(-1, 7.5, -2.5, 1, 9.5, -1.5, T(0xffffff));
  }
  sp.parts.ears = { lg: ears, origin: [0, 2.4, 1.6], parent: 'head' };

  // ---- mane (static child of neck): follows the crest line
  const mane = new LG(10, rnd(nh) + 12, rnd(nl) + 14, 5, 6, 6);
  const al = Math.hypot(nh, nl), dors = [0, nl / al, -nh / al];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, r = (4.7 + (2.9 - 4.7) * t) * k;
    const cy = nh * t + dors[1] * (r - 0.2), cz = nl * t + dors[2] * (r - 0.2), len = 2.8 - t * 0.9;
    mane.box(-1, cy - len * 0.5, cz - 1.8, 1, cy + 1.4, cz + 0.4, maneC);
  }
  sp.parts.mane = { lg: mane, origin: [0, 0, 0], parent: 'neck' };

  // ---- tail
  const tail = new LG(8, 18, 12, 4, 16.5, 8);
  tail.tube([0, 0, 0], [0, -5, -2], 2.0, 2.3, maneC, 1);
  tail.tube([0, -5, -2], [0, -14, -3.6], 2.3, 1.2, maneC, 1);
  sp.parts.tail = { lg: tail, origin: [0, Y(11), Z(-16.2)], parent: 'body' };

  // ---- saddle cloth + seat (shares the body frame)
  const zc = Z(0.5);
  const topY = topAt(body, zc);
  if ((o.saddle || 'cloth') === 'cloth') {
    const sad = shellOf(body, (x, y, z, d) => Math.abs(z - zc) <= 6.4 && y > 2.8 + (Math.abs(z - zc) > 5 ? 2 : 0) && d === 1, 1,
      (x, y, z) => (y < 3.7 + (Math.abs(z - zc) > 5 ? 2 : 0) ? V(trim) : (y < 5.2 ? T(0xd8d8d8) : T(0xffffff))));
    const sy = topY + 1;
    sad.box(-3.4, sy, zc - 4.6, 3.4, sy + 1.6, zc + 3.6, V(C.leather), 'empty');
    sad.box(-3.4, sy + 1.6, zc - 4.6, 3.4, sy + 3.0, zc - 3.6, V(C.leatherDark), 'empty');
    sad.box(-1.2, sy + 1.6, zc + 2.6, 1.2, sy + 2.6, zc + 3.6, V(C.leatherDark), 'empty');
    for (const sx of [-1, 1]) sad.box(sx * 5.6 - 0.5, 1.4, zc - 6.4, sx * 5.6 + 0.5, 2.4, zc - 5.4, V(trim), 'empty');   // tassel points
    sp.parts.saddle = { lg: sad, origin: [0, 0, 0], parent: 'body' };
    sp.attach.saddle = { part: 'saddle', at: [0, sy + 3.2, zc - 0.5] };
  } else if (o.saddle === 'pad') {
    const pad = shellOf(body, (x, y, z, d) => Math.abs(z - zc) <= 5.6 && y > 6.2 && d === 1, 1, (x, y, z) => (y < 7.4 ? V(trim) : T(0xffffff)));
    sp.parts.saddle = { lg: pad, origin: [0, 0, 0], parent: 'body' };
    sp.attach.saddle = { part: 'saddle', at: [0, topY + 1 + 2.2, zc - 0.5] };
  }

  // ---- barding (cloth caparison with scale pattern, team tinted) : static child of body
  if (o.barded) {
    const bar = shellOf(body, (x, y, z, d) => (d === 1 && y > 1.2 && z > -17 * k && z < 16.5 * k) || (d === 2 && y < 3.4 && y > -2.4 && z > -16 * k && z < 15 * k), 2,
      (x, y, z, d) => {
        if (y < -0.6) return V(trim);
        if (y < 0.6 && d === 2) return V(C.steel);
        const p = (Math.floor(z) + (Math.floor(y) & 1) + (y > 9 ? Math.floor(Math.abs(x)) : 0)) & 1;
        return p ? T(0xffffff) : T(0xc4c4c4);
      });
    sp.parts.barding = { lg: bar, origin: [0, 0, 0], parent: 'body' };
  }

  // lean models bake the static children into their parents (fewer parts for composed units)
  if (o.lean) {
    mergeSame(neck, sp.parts.mane.lg); delete sp.parts.mane;
    mergeSame(hd, retarget(sp.parts.ears.lg, hd, [0, 2.4, 1.6])); delete sp.parts.ears;
  }
  sp.stats = { k, legLen, backY: legLen + 12 * k, hipH: (legLen + 2) / 10, bodyLen: 3.4 * k };
  sp.gait = { hipH: (legLen + 2) / 10, pace: false };
  return sp;
}

/** Copy `src` voxels (src frame offset by `off` voxels inside dst's frame) into dst where empty. */
function retarget(src, dst, off) {
  const tmp = new LG(dst.sx, dst.sy, dst.sz, dst.px, dst.py, dst.pz);
  stampLocal(tmp, src, off);
  return tmp;
}
/** Stamp src into dst using LOCAL coordinates (src voxel centre + off -> dst), only where dst is empty. */
export function stampLocal(dst, src, off = [0, 0, 0]) {
  const g = src.g;
  for (let j = 0; j < g.sy; j++) for (let k = 0; k < g.sz; k++) for (let i = 0; i < g.sx; i++) {
    const v = g.d[g.idx(i, j, k)]; if (!v) continue;
    dst.setIfEmpty(src.cx(i) + off[0], src.cy(j) + off[1], src.cz(k) + off[2], v);
  }
  return dst;
}

// ================================================================== CAMEL (dromedary)
function camelSpecies(o) {
  const col = resolveCoat(o.coat || 'camel'), k = 1;
  const legLen = 14;
  const sp = { legLen, parts: {}, attach: {}, kind: 'camel' };
  const main = V(col.main), light = V(col.light), legc = V(col.leg), pad = V(col.hoof), maneC = V(col.mane), eye = V(C.eye), dark = V(col.dark);
  const trim = o.trim ?? C.gold;
  const body = new LG(12, 22, 38, 6, 0, 19);
  body.ell(0, 5.2, 9.6, 5.0, 5.2, 6.8, main);
  body.ell(0, 5.0, 0, 4.9, 5.0, 10.4, main);
  body.ell(0, 5.4, -9.8, 4.9, 5.4, 6.8, main);
  body.ell(0, 11.2, -3.4, 3.8, 5.6, 5.8, main);                // hump
  body.ell(0, 9.0, 8.8, 3.2, 2.8, 3.8, main);                   // withers
  body.ell(0, 1.4, 11.8, 2.6, 1.8, 3, dark);                    // brisket pad
  body.carve(-9, -8, -30, 9, 0, 30);
  body.paint((x, y, z) => {
    if (y < 2.6) return light;
    if (y > 12.4 && z < 2.5 && z > -9) return V(shade(col.mane, 1.15));
    if (z > 13 && y < 7) return V(shade(col.mane, 1.25));
    return undefined;
  });
  sp.parts.body = { lg: body, origin: [0, legLen, 0] };

  const top = 2, LL = legLen + top;
  const mkLeg = (hind) => {
    const lg = new LG(5, LL + 1, 9, 2.5, LL, 4.5);
    if (!hind) drawLeg(lg, [[0, -6, -2.5, 2.5, 1.5, legc], [-6, -9.5, -1.5, 1.5, 1.5, legc], [-9.5, -11, -2.5, 2.0, 1.5, dark], [-11, -15, -1.5, 1.5, 1.5, legc], [-15, -LL, -2.5, 3.5, 2.5, pad]]);
    else drawLeg(lg, [[0, -5, -3.5, 2.5, 2.5, legc], [-5, -9, -4, -0.5, 1.5, legc], [-9, -11, -3.5, -0.5, 1.5, dark], [-11, -15, -2.5, 0.5, 1.5, legc], [-15, -LL, -3, 3, 2.5, pad]]);
    return lg;
  };
  sp.parts.legFL = { lg: mkLeg(false), origin: [3.5, top, 10.5], parent: 'body' };
  sp.parts.legFR = { lg: mkLeg(false), origin: [-3.5, top, 10.5], parent: 'body' };
  sp.parts.legBL = { lg: mkLeg(true), origin: [3.5, top, -10.5], parent: 'body' };
  sp.parts.legBR = { lg: mkLeg(true), origin: [-3.5, top, -10.5], parent: 'body' };

  // S-curved neck: forward-up, then upright, head carried forward
  const P = [[0, 0, 0, 4.0], [0, 4, 3.8, 3.6], [0, 9, 5.8, 3.1], [0, 13, 5.4, 2.7], [0, 16, 6.0, 2.5]];
  const neck = new LG(12, 27, 20, 6, 6, 6);
  for (let i = 0; i < P.length - 1; i++) neck.tube(P[i].slice(0, 3), P[i + 1].slice(0, 3), P[i][3], P[i + 1][3], main, 0.78);
  sp.parts.neck = { lg: neck, origin: [0, 6.8, 12.2], parent: 'body' };

  const hd = new LG(8, 16, 17, 4, 9, 4);
  hd.ell(0, -0.2, 2.2, 2.5, 2.5, 3.3, main);
  hd.tube([0, -0.8, 4.4], [0, -2.4, 9.6], 2.2, 1.8, main, 1.0);
  hd.ell(0, -2.8, 10.1, 1.9, 1.5, 1.6, main);                                   // upper lip
  hd.ell(0, -4.6, 8.4, 1.6, 1.0, 2.2, V(shade(col.main, 0.92)));   // drooping lower lip
  hd.set(-1.2, -2.6, 11.4, V(0x2a1c12)); hd.set(0.4, -2.6, 11.4, V(0x2a1c12));   // nostrils
  hd.set(-2.8, 0.8, 2.8, eye); hd.set(2.3, 0.8, 2.8, eye);
  hd.box(-0.5, -3.9, 8.5, 0.5, -3.7, 11.2, V(shade(col.main, 0.55)));
  sp.parts.head = { lg: hd, origin: [0, 16, 5.6], parent: 'neck' };
  sp.attach.head_top = { part: 'head', at: [0, 3, 2.2] };
  sp.attach.mouth = { part: 'head', at: [0, -4, 10] };

  const ears = new LG(10, 8, 8, 5, 0, 4);
  ears.box(-3.4, 0, 0, -2.4, 2, 1, main); ears.box(2.4, 0, 0, 3.4, 2, 1, main); ears.box(-3.4, 2, 0, -2.4, 2.8, 1, V(col.mane)); ears.box(2.4, 2, 0, 3.4, 2.8, 1, V(col.mane));
  sp.parts.ears = { lg: ears, origin: [0, 2.2, 0.8], parent: 'head' };

  // throat fur and crest tuft
  const mane = new LG(12, 27, 20, 6, 6, 6);
  for (let i = 0; i < P.length - 1; i++) {
    for (let s = 0; s < 4; s++) {
      const t = s / 4, c = [P[i][0], P[i][1] + (P[i + 1][1] - P[i][1]) * t, P[i][2] + (P[i + 1][2] - P[i][2]) * t], r = P[i][3] + (P[i + 1][3] - P[i][3]) * t;
      if (i >= 1) mane.box(-1, c[1] - 2.4, c[2] + r * 0.55, 1, c[1] + 0.6, c[2] + r + 0.6, maneC);
      if (i <= 1) mane.box(-1, c[1] + r * 0.5, c[2] - r - 0.8, 1, c[1] + r + 0.8, c[2] - r * 0.4, maneC);
    }
  }
  sp.parts.mane = { lg: mane, origin: [0, 0, 0], parent: 'neck' };

  const tail = new LG(5, 14, 7, 2.5, 12.5, 3);
  tail.tube([0, 0, 0], [0, -6.5, -1.6], 1.2, 1.0, maneC, 1);
  tail.ell(0, -9.2, -2, 1.6, 2.6, 1.6, maneC);
  sp.parts.tail = { lg: tail, origin: [0, 8.6, -16.2], parent: 'body' };

  // saddle: wooden frame with cantle/pommel + team blanket draped over the back, in front of the hump
  const zc = 5.0, topY = topAt(body, zc);
  const sad = shellOf(body, (x, y, z, d) => Math.abs(z - zc) <= 6.4 && y > 2.2 + (Math.abs(z - zc) > 5 ? 2 : 0) && d === 1, 1,
    (x, y, z) => (y < 3.0 + (Math.abs(z - zc) > 5 ? 2 : 0) ? V(trim) : (y < 5 ? T(0xd0d0d0) : T(0xffffff))));
  const sy = topY + 1;
  sad.box(-3.6, sy, zc - 4.4, 3.6, sy + 1.4, zc + 4.2, V(C.leather), 'empty');
  sad.box(-3.6, sy + 1.4, zc - 4.4, 3.6, sy + 4.4, zc - 3.2, V(C.woodDark), 'empty');      // cantle
  sad.box(-1.4, sy + 1.4, zc + 3.0, 1.4, sy + 3.4, zc + 4.2, V(C.woodDark), 'empty');     // pommel
  for (const sx of [-1, 1]) sad.box(sx * 5.4 - 0.5, 1.2, zc - 6.4, sx * 5.4 + 0.5, 2.2, zc - 5.4, V(trim), 'empty');
  sp.parts.saddle = { lg: sad, origin: [0, 0, 0], parent: 'body' };
  sp.attach.saddle = { part: 'saddle', at: [0, sy + 3.0, zc - 0.5] };
  sp.stats = { k, legLen, backY: legLen + 9.6, hipH: (legLen + 2) / 10, bodyLen: 3.2 };
  sp.gait = { hipH: (legLen + 2) / 10, pace: true };
  return sp;
}

// ================================================================== HOUND (mastiff)
function houndSpecies(o) {
  const col = resolveCoat(o.coat || 'hound');
  const legLen = 6;
  const sp = { legLen, parts: {}, attach: {}, kind: 'hound' };
  const main = V(col.main), light = V(col.light), legc = V(col.leg), dark = V(col.dark), eye = V(C.eye);
  const body = new LG(10, 11, 22, 5, 0, 11);
  body.ell(0, 3.7, 4.6, 4.0, 3.9, 4.8, main);
  body.ell(0, 3.5, 0, 3.9, 3.5, 6.2, main);
  body.ell(0, 3.9, -4.8, 3.8, 3.9, 4.4, main);
  body.carve(-9, -5, -20, 9, 0, 20);
  body.paint((x, y, z) => (y < 1.8 ? light : (y > 5.6 ? V(shade(col.main, 0.82)) : undefined)));
  sp.parts.body = { lg: body, origin: [0, legLen, 0] };

  const top = 2, LL = legLen + top;
  const mkLeg = (hind) => {
    const lg = new LG(3, LL + 1, 7, 1.5, LL, 3.5);
    if (!hind) drawLeg(lg, [[0, -4, -2, 2, 1.5, legc], [-4, -6.5, -1.5, 1.5, 1.5, legc], [-6.5, -LL, -1.5, 3, 1.5, light]]);
    else drawLeg(lg, [[0, -3.5, -3, 2, 1.5, legc], [-3.5, -6, -3, 0.5, 1.5, legc], [-6, -LL, -2, 2.5, 1.5, light]]);
    return lg;
  };
  sp.parts.legFL = { lg: mkLeg(false), origin: [2.5, top, 5.2], parent: 'body' };
  sp.parts.legFR = { lg: mkLeg(false), origin: [-2.5, top, 5.2], parent: 'body' };
  sp.parts.legBL = { lg: mkLeg(true), origin: [2.5, top, -5.4], parent: 'body' };
  sp.parts.legBR = { lg: mkLeg(true), origin: [-2.5, top, -5.4], parent: 'body' };

  // neck with spiked collar (team leather band + steel spikes)
  const neck = new LG(10, 14, 14, 5, 5, 5);
  const nv = [0, 3.6, 3.6], nl = Math.hypot(nv[1], nv[2]), ax = [0, nv[1] / nl, nv[2] / nl], pr = [0, ax[2], -ax[1]];
  neck.tube([0, 0, 0], nv, 3.5, 3.0, main, 0.95);
  neck.paint((x, y, z) => { const a = y * ax[1] + z * ax[2]; return a > 1.0 && a < 2.6 ? T(0xffffff) : undefined; });
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * Math.PI * 2, ca = Math.cos(th), sa = Math.sin(th), a = 1.8, r = 3.3;
    neck.set(ca * r * 1.0, a * ax[1] + sa * r * pr[1], a * ax[2] + sa * r * pr[2], V(C.steel));
  }
  sp.parts.neck = { lg: neck, origin: [0, 5.8, 7.0], parent: 'body' };

  const hd = new LG(8, 12, 14, 4, 7, 3);
  hd.ell(0, 0, 2.6, 3.3, 3.0, 3.4, main);
  hd.box(-2, -2.8, 4.6, 2, 0.6, 8.6, main);                          // muzzle block
  hd.box(-1.6, -3.6, 4.0, 1.6, -2.6, 7.8, dark);                      // lower jaw
  hd.ell(-2.8, -1.8, 5.2, 0.9, 1.2, 1.8, main); hd.ell(2.8, -1.8, 5.2, 0.9, 1.2, 1.8, main);   // jowls
  hd.box(-1.2, -1.0, 8.5, 1.2, -0.2, 9.1, V(col.nose));                  // nose
  hd.set(-2.0, 1.4, 5.0, eye); hd.set(1.5, 1.4, 5.0, eye);
  hd.box(-0.5, 1.8, 3.4, 0.5, 2.6, 5.6, V(shade(col.main, 0.7)));    // brow ridge
  hd.set(-0.5, -3.4, 7.4, V(C.tongue)); hd.set(-1.6, -4.4, 6.6, V(0xffffff)); hd.set(1.4, -4.2, 7.0, V(0xffffff));   // tongue + drool
  sp.parts.head = { lg: hd, origin: [0, nv[1] + 0.5, nv[2] + 0.2], parent: 'neck' };
  sp.attach.head_top = { part: 'head', at: [0, 3, 2.6] };
  sp.attach.mouth = { part: 'head', at: [0, -2, 8] };

  const ears = new LG(10, 8, 8, 5, 0, 4);
  for (const sx of [-1, 1]) { ears.box(sx * 3 - 0.5, -3, 0, sx * 3 + 0.5, 1, 2.6, dark); ears.box(sx * 3 - 0.5 + sx * 0.4, -3, 0.6, sx * 3 + 0.5 + sx * 0.4, -1, 1.6, dark); }
  sp.parts.ears = { lg: ears, origin: [0, 3.0, 0.8], parent: 'head' };

  const tail = new LG(4, 11, 10, 2, 3.2, 7.5);
  tail.tube([0, 0, 0], [0, 1.2, -3], 1.5, 1.2, main, 1);
  tail.tube([0, 1.2, -3], [0, 4.6, -4.2], 1.2, 0.8, main, 1);
  sp.parts.tail = { lg: tail, origin: [0, 5.4, -8.6], parent: 'body' };

  // battle coat (team cloth) over the back, with gold hem
  const zc = 0;
  const coat = shellOf(body, (x, y, z, d) => Math.abs(z - zc) <= 4.6 && y > 2.6 && d === 1, 1, (x, y, z) => (y < 3.4 ? V(C.gold) : (Math.abs(x) < 1.2 ? T(0xe0e0e0) : T(0xffffff))));
  sp.parts.saddle = { lg: coat, origin: [0, 0, 0], parent: 'body' };
  sp.attach.saddle = { part: 'saddle', at: [0, topAt(body, 0) + 1.2, 0] };
  sp.stats = { k: 1, legLen, backY: legLen + 7, hipH: (legLen + 2) / 10, bodyLen: 1.8 };
  sp.gait = { hipH: (legLen + 2) / 10, pace: false };
  return sp;
}

// ================================================================== BATTLE GOAT
function goatSpecies(o) {
  const col = resolveCoat(o.coat || 'goat');
  const legLen = 7;
  const sp = { legLen, parts: {}, attach: {}, kind: 'goat' };
  const main = V(col.main), light = V(col.light), legc = V(col.leg), dark = V(col.dark), maneC = V(col.mane);
  const body = new LG(10, 12, 24, 5, 0, 12);
  body.ell(0, 4.2, 5.2, 4.0, 4.1, 4.8, main);
  body.ell(0, 3.9, 0, 3.9, 3.9, 6.4, main);
  body.ell(0, 4.3, -5.4, 3.9, 4.1, 4.6, main);
  body.carve(-9, -5, -20, 9, 0, 20);
  body.paint((x, y, z) => (y < 2 ? light : (y > 6.6 ? V(shade(col.main, 0.82)) : undefined)));
  sp.parts.body = { lg: body, origin: [0, legLen, 0] };

  const top = 2, LL = legLen + top, hoofC = V(col.hoof);
  const mkLeg = (hind) => {
    const lg = new LG(3, LL + 1, 6, 1.5, LL, 3);
    if (!hind) drawLeg(lg, [[0, -3.5, -1.5, 1.5, 1.5, legc], [-3.5, -7, -1, 1, 1.5, dark], [-7, -LL, -1.5, 1.5, 1.5, hoofC]]);
    else drawLeg(lg, [[0, -3.5, -2.5, 1.5, 1.5, legc], [-3.5, -6.5, -2.5, 0, 1.5, dark], [-6.5, -LL, -1.5, 1.5, 1.5, hoofC]]);
    return lg;
  };
  sp.parts.legFL = { lg: mkLeg(false), origin: [2.5, top, 5.4], parent: 'body' };
  sp.parts.legFR = { lg: mkLeg(false), origin: [-2.5, top, 5.4], parent: 'body' };
  sp.parts.legBL = { lg: mkLeg(true), origin: [2.5, top, -5.6], parent: 'body' };
  sp.parts.legBR = { lg: mkLeg(true), origin: [-2.5, top, -5.6], parent: 'body' };

  const neck = new LG(10, 14, 12, 5, 5, 5);
  neck.tube([0, 0, 0], [0, 5.4, 3.4], 3.0, 2.2, main, 0.88);
  neck.paint((x, y, z) => (y > 0.6 && y < 2.0 ? T(0xffffff) : undefined));                      // team collar
  neck.set(0, 1.4, 3.4, V(C.gold)); neck.set(0, 0.6, 3.6, V(C.gold));                          // bell
  sp.parts.neck = { lg: neck, origin: [0, 6.6, 6.6], parent: 'body' };

  const hd = new LG(10, 14, 14, 5, 8, 3);
  hd.ell(0, -0.2, 2.0, 2.3, 2.5, 2.7, main);
  hd.tube([0, -1.0, 3.6], [0, -3.2, 7.4], 1.9, 1.4, main, 1);
  hd.ell(0, -2.6, 4.2, 1.7, 1.3, 2.4, main);
  hd.box(-0.6, -3.6, 7.2, 0.6, -2.6, 8.0, V(0x2a2a30));                                        // nose
  hd.set(-2.2, 0.4, 3.2, V(0xe0c24a)); hd.set(1.7, 0.4, 3.2, V(0xe0c24a));                      // yellow goat eyes
  hd.set(-2.2, 0.4, 3.9, V(0x1a1a1a)); hd.set(1.7, 0.4, 3.9, V(0x1a1a1a));
  hd.box(-0.8, -9, 5.4, 0.8, -3.2, 6.8, maneC); hd.box(-0.5, -10, 5.8, 0.5, -9, 6.6, maneC);  // beard
  // tiny bronze helmet with a team crest
  hd.ell(0, 1.5, 1.6, 2.6, 1.6, 2.9, V(C.bronze), 'set');
  hd.box(-0.5, 2.6, -1.0, 0.5, 4.4, 3.4, T(0xffffff));
  hd.box(-0.5, 0.6, 4.0, 0.5, 2.0, 4.6, V(C.bronze));                                           // nasal
  sp.parts.head = { lg: hd, origin: [0, 5.4, 3.2], parent: 'neck' };
  sp.attach.head_top = { part: 'head', at: [0, 5, 1.6] };
  sp.attach.mouth = { part: 'head', at: [0, -3, 7.5] };

  const ears = new LG(14, 6, 8, 7, 0, 4);
  for (const sx of [-1, 1]) { ears.box(sx * 3.2 - 0.5, 0, 0, sx * 3.2 + 0.5, 1, 1.6, dark); ears.box(sx * 4.2 - 0.5, -1, 0.2, sx * 4.2 + 0.5, 0.4, 1.4, dark); }
  sp.parts.ears = { lg: ears, origin: [0, 0.4, 1.0], parent: 'head' };

  // huge curled horns (static child of head): control polyline for the left horn, mirrored
  const horns = new LG(24, 20, 20, 12, 8, 6);
  const H = [[1.4, 2.2, 0.4, 1.7], [2.4, 4.4, -1.6, 1.6], [3.6, 5.8, -4.2, 1.5], [5.4, 5.2, -6.6, 1.4], [6.8, 3.2, -7.2, 1.3], [7.4, 0.6, -5.6, 1.1], [6.8, -0.8, -3.2, 0.9], [5.4, -0.6, -1.8, 0.7]];
  for (const sx of [-1, 1]) for (let i = 0; i < H.length - 1; i++) {
    const a = H[i], b = H[i + 1];
    horns.tube([sx * a[0], a[1], a[2]], [sx * b[0], b[1], b[2]], a[3], b[3], (x, y, z) => ((Math.floor(z * 0.8 + y * 0.8) & 1) ? V(0xd8cca6) : V(0xbfb284)), 1);
  }
  sp.parts.horns = { lg: horns, origin: [0, 0, 0], parent: 'head' };

  const tail = new LG(4, 6, 6, 2, 0, 3);
  tail.tube([0, 0, 0], [0, 3, -1.6], 1.1, 0.8, main, 1);
  sp.parts.tail = { lg: tail, origin: [0, 7.8, -9.6], parent: 'body' };

  const zc = 0;
  const bl = shellOf(body, (x, y, z, d) => Math.abs(z - zc) <= 5 && y > 3.0 && d === 1, 1, (x, y, z) => (y < 3.8 ? V(C.gold) : (Math.abs(x) < 1.2 ? T(0xdcdcdc) : T(0xffffff))));
  sp.parts.saddle = { lg: bl, origin: [0, 0, 0], parent: 'body' };
  sp.attach.saddle = { part: 'saddle', at: [0, topAt(body, 0) + 1.2, 0] };
  sp.stats = { k: 1, legLen, backY: legLen + 8, hipH: (legLen + 2) / 10, bodyLen: 2.2 };
  sp.gait = { hipH: (legLen + 2) / 10, pace: false };
  return sp;
}

// ------------------------------------------------------------------ assembler
const ORDER = ['body', 'legFL', 'legFR', 'legBL', 'legBR', 'neck', 'head', 'tail', 'saddle', 'barding', 'mane', 'ears', 'horns'];
/** Turn a species description into a ModelDef (parents precede children). */
export function assembleQuad(id, sp, meta = {}, opts = {}) {
  const m = newModel(id, Object.assign({ rig: 'quad1', kind: 'beast' }, meta));
  const skip = opts.skip || [];
  for (const pid of ORDER) {
    const p = sp.parts[pid]; if (!p || skip.includes(pid)) continue;
    addLG(m, pid, p.lg, { parent: p.parent || null, origin: p.origin, rest: p.rest });
  }
  for (const [name, a] of Object.entries(sp.attach)) {
    if (!m.byId[a.part]) continue;
    attachLG(m, name, a.part, sp.parts[a.part].lg, a.at);
  }
  const bp = m.byId.body.pivot;
  m.attach.feet = { part: 'body', at: [bp[0], bp[1] - sp.legLen, bp[2]] };
  m.meta.legLen = sp.legLen * m.voxelSize;
  m.meta.hipHeight = (sp.legLen + 2) * m.voxelSize;
  m.meta.gait = makeGait(sp);
  m.meta.species = sp.kind;
  return m;
}

/** Gait recipe for ANIM (see docs/beasts_rigs.md): stride (u per full leg cycle) = 2 * hipH * sin(amp) / duty. */
function makeGait(sp) {
  const L = sp.gait.hipH, st = (amp, duty) => +(2 * L * Math.sin(amp) / duty).toFixed(2);
  const pace = !!sp.gait.pace;
  return {
    hipH: L, pace,                                                       // pace = lateral pairs move together (camel)
    walk:   { amp: 0.42, duty: 0.66, stride: st(0.42, 0.66) },
    trot:   { amp: 0.55, duty: 0.5, stride: st(0.55, 0.5) },
    gallop: { amp: 0.85, duty: 0.34, stride: st(0.85, 0.34) },
  };
}

// ------------------------------------------------------------------ public species builders
export function buildHorse(o = {}) { return assembleQuad(o.id || 'horse', horseSpecies(o), { species: 'horse' }, o); }
export function buildCamel(o = {}) { return assembleQuad(o.id || 'camel', camelSpecies(o), { species: 'camel' }, o); }
export function buildHound(o = {}) { return assembleQuad(o.id || 'warhound', houndSpecies(o), { species: 'hound' }, o); }
export function buildGoat(o = {}) { return assembleQuad(o.id || 'battle_goat', goatSpecies(o), { species: 'goat' }, o); }
/** Raw species description (centaur and chariot reuse the horse body). */
export function horseDescription(o) { return horseSpecies(o); }
