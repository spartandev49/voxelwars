// elephant1: the war elephant. Parts: body, head, trunkA, trunkB, trunkC, earL, earR, tail, legFL, legFR, legBL, legBR, howdah (13) + two hum_lite
// archers a1_, a2_ (prefixes) composed on the howdah's attach points `howdah_a`, `howdah_b` => 25 parts.
// CONVENTIONS (voxels; +Z forward, +X left; positive rx rotates +Y toward +Z; left = +X):
//   body    parent root, origin [0,16,0], pivot at the BELLY LINE on the centre line (barrel 31 voxels tall incl. the blanket, 66 long, 30 wide).
//           The team blanket (T voxels, gold hem + tassels) and the head cloth are baked into body/head.
//   legXX   parent body, origins (+-7, 6, +15) front / (+-7, 6, -15.5) hind, pivot at the TOP (6 voxels inside the barrel), hang 22 voxels along -Y
//           (hips 2.2 u above the ground). Forward swing = negative rx. Stride recipe in meta.gait (walk amp 0.36, duty 0.72 -> stride 2.15 u; run amp 0.5).
//   head    parent body, origin (0,20,25) = skull/neck joint; pivot there. Positive rx nods the head DOWN (gore strike), negative lifts it (trumpet). Tusks
//           (ivory with gold bands) are baked into the head.
//   trunkA  parent head, origin (0,-3.4,15.5) = trunk root, pivot there, hangs down 10 and leans 3.5 forward;  trunkB parent trunkA, origin (0,-10,3.5), hangs 10;
//           trunkC parent trunkB, origin (0,-10,1.5), hangs 7 then curls forward at the tip (attach `trunk_tip`). Each segment pivots at its top and hangs along -Y:
//           positive rx swings its lower end BACKWARD (-Z), NEGATIVE rx swings it forward/up (curl, trumpet, swing); ry sways it sideways.
//   earL/R  parent head, origins (+-8.8, 9, 3), pivot at the top-front of each flap (flap hangs 23 down and 17 back), REST ry -+0.32 (flared outward). Flap by rotating
//           ry (earL: more negative = further out) with a little rz.
//   tail    parent body, origin (0,18,-30), pivot at the root, hangs 18 along -Y; swish with rz.
//   howdah  parent body (static), origin (0,30,1), pivot at its floor centre; attach `howdah_a` (local +4.2, 2, +5) and `howdah_b` (-4.2, 2, -5) are the crew FEET
//           points (floor top). Crew a1_ yaw +0.5 (left), a2_ yaw -0.5 (right) so both flanks are covered.
//   Attach: head_top, mouth, trunk_tip, howdah_a, howdah_b, feet.  meta.clipMap maps strike_thrust/slash/bite/headbutt -> strike_gore, cast/taunt/cheer -> trumpet.
//   Size: shoulder/back 4.6 u, howdah rim 5.6 u, crew heads ~7.7 u; footprint 3.0 x 6.0 u (collision radius is SIM's).
import { LG, V, T, G, C, shade, mixRGB, newModel, addLG, attachLG, shellOf, RNG } from './common.js';
import { stampLocal } from './quad1.js';
import { composeModels } from '../../../voxel/compose.js';
import { buildHumLite } from './hum_lite.js';

const hashN = (x, y, z) => { let h = (Math.floor(x * 3) * 374761393 + Math.floor(y * 3) * 668265263 + Math.floor(z * 3) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

export function buildElephantRig(o = {}) {
  const col = Object.assign({ main: 0x8d9099, light: 0xa7a9b1, dark: 0x6b6e79, leg: 0x80838d, nail: 0xe6dfc9, ear: 0x868a93, inner: 0xb88e8c }, o.colors || {});
  const m = newModel(o.id || 'elephant_rig', { rig: 'elephant1', kind: 'bespoke', species: 'elephant' });
  const main = V(col.main), light = V(col.light), dark = V(col.dark), legc = V(col.leg), eye = V(0x16161c);
  const wrinkle = (v, x, y, z, p = 0.1) => (hashN(x, y, z) < p ? dark : v);
  const legLen = 16;

  // ---------------------------------------------------------------- body
  const body = new LG(36, 40, 66, 18, 0, 33);
  const bm = (x, y, z) => wrinkle(main, x, y, z, 0.1);
  body.ell(0, 14, 17, 13, 14.5, 12.5, bm);
  body.ell(0, 14, 0, 13.4, 14.5, 19, bm);
  body.ell(0, 14.8, -18, 12.8, 14.8, 12.5, bm);
  body.ell(0, 25, 11, 8.5, 4.6, 8, bm);
  body.carve(-20, -8, -40, 20, 0, 40);
  body.paint((x, y, z, v) => (y < 3 ? V(col.light) : (y > 27 ? wrinkle(main, x, y, z, 0.06) : undefined)));
  // team blanket (draped over the back, hanging down both flanks) baked into the body
  const zc = 1;
  const blanket = shellOf(body, (x, y, z, d) => Math.abs(z - zc) <= 15.5 && y > 8.2 && (d === 1 || (d === 2 && y < 10.4 && Math.abs(z - zc) < 14.5)), 2, (x, y, z, d) => {
    if (d === 2) return ((Math.floor(z) & 1) ? V(C.gold) : T(0xe0e0e0));            // tassels
    if (y < 10.4) return V(C.gold);                                                  // hem
    if (y < 12.4) return T(0xb8b8b8);                                                // dark team band
    if (Math.abs(Math.abs(z - zc) - 15) < 0.8) return V(C.gold);                      // end borders
    const dia = (Math.floor((z + y) / 3.2) + Math.floor((z - y) / 3.2)) & 1;         // diamonds
    return dia ? T(0xffffff) : T(0xd4d4d4);
  });
  stampLocal(body, blanket);
  // gold edge piping along the top of the blanket
  body.paint((x, y, z, v) => (y > 29.5 && y < 31.5 && Math.abs(x) < 1.2 && Math.abs(z - zc) < 15 && ((v >>> 24) & 2) ? V(C.gold) : undefined));
  addLG(m, 'body', body, { origin: [0, legLen, 0] });

  // ---------------------------------------------------------------- legs (pillars)
  const top = 6, LL = legLen + top;
  const leg = (hind) => {
    const lg = new LG(10, LL + 1, 12, 5, LL, 6);
    const lw = (x, y, z) => wrinkle(legc, x, y, z, 0.13);
    if (!hind) {
      lg.box(-5, -(LL - 5), -5, 5, 0, 5, lw);
      lg.box(-4.5, -(LL - 2), -4.5, 4.5, -(LL - 5), 4.5, lw);
      lg.box(-5, -LL, -5, 5, -(LL - 2), 5.5, lw);
    } else {
      lg.box(-5, -(LL - 8), -5.5, 5, 0, 5.5, lw);
      lg.box(-4.5, -(LL - 3), -5.5, 4.5, -(LL - 8), 4.5, lw);
      lg.box(-5, -LL, -5.5, 5, -(LL - 3), 5.5, lw);
    }
    // knee wrinkle rings
    lg.paint((x, y, z) => ((y < -(LL * 0.45) && y > -(LL * 0.45) - 2 && (Math.floor(y) & 1)) ? dark : undefined));
    // toenails (front face, bottom)
    const zf = hind ? 5.5 : 5.5;
    for (const nx of [-3, 0, 3]) lg.box(nx - 1, -LL + 0.2, zf - 0.5, nx + 1, -LL + 2.2, zf + 0.5, V(col.nail));
    return lg;
  };
  addLG(m, 'legFL', leg(false), { parent: 'body', origin: [7, top, 15] });
  addLG(m, 'legFR', leg(false), { parent: 'body', origin: [-7, top, 15] });
  addLG(m, 'legBL', leg(true), { parent: 'body', origin: [7, top, -15.5] });
  addLG(m, 'legBR', leg(true), { parent: 'body', origin: [-7, top, -15.5] });

  // ---------------------------------------------------------------- head
  const hd = new LG(30, 34, 40, 15, 14, 8);
  const hm = (x, y, z) => wrinkle(main, x, y, z, 0.07);
  hd.ell(0, 4, 6, 9.6, 10, 9, hm);                            // skull
  hd.ell(0, 9, 4, 6.2, 5.4, 6.4, hm);                         // forehead dome
  hd.ell(0, -2.4, 12.5, 6.4, 7.2, 5.2, hm);                   // face
  hd.ell(-6.2, -1, 10, 3.0, 4.2, 3.2, hm); hd.ell(6.2, -1, 10, 3.0, 4.2, 3.2, hm);   // cheeks
  hd.set(-8.6, 4.4, 10, eye); hd.set(-8.6, 3.4, 10, eye); hd.set(7.6, 4.4, 10, eye); hd.set(7.6, 3.4, 10, eye);
  hd.box(-9.2, 5.6, 9.2, -8, 6.6, 11.4, dark); hd.box(8, 5.6, 9.2, 9.2, 6.6, 11.4, dark);   // brow ridges
  hd.box(-3, -8.6, 14, 3, -7.4, 17, V(0xb08488));              // mouth / chin
  // tusks: curved ivory with gold bands
  const TP = [[5.6, -4.6, 13.5], [6.6, -8.2, 17], [6.9, -9.8, 21.8], [6.0, -8.6, 26], [4.8, -6.0, 29]];
  const segCol = [V(col.nail), V(C.gold), V(col.nail), V(col.nail), V(col.nail)];
  for (const sx of [-1, 1]) for (let i = 0; i < TP.length - 1; i++) {
    const a = TP[i], b = TP[i + 1];
    hd.tube([sx * a[0], a[1], a[2]], [sx * b[0], b[1], b[2]], 2.0 - i * 0.28, 2.0 - (i + 1) * 0.28, i === 1 || i === 3 ? V(C.gold) : segCol[0], 1);
  }
  // team head cloth: a draped forehead plate between the ears down to the trunk root, gold piped
  const hcloth = shellOf(hd, (x, y, z, d) => d === 1 && z > 3.5 && y > -6 && Math.abs(x) < 6.4 && y < 12.5 - Math.max(0, z - 12) * 1.4, 1, (x, y, z) => (y < -4.4 || Math.abs(Math.abs(x) - 6) < 0.9 ? V(C.gold) : ((Math.floor(y + 20) + Math.floor(z)) & 3) === 0 ? T(0xdcdcdc) : T(0xffffff)));
  stampLocal(hd, hcloth);
  addLG(m, 'head', hd, { parent: 'body', origin: [0, 20, 25] });
  attachLG(m, 'head_top', 'head', hd, [0, 14, 5]);
  attachLG(m, 'mouth', 'head', hd, [0, -7, 16]);

  // ---------------------------------------------------------------- trunk (3 segments)
  const trunkSeg = (len, r0, r1, dz, tail = null) => {
    const lg = new LG(14, len + 12, 20, 7, len + 6, 6);
    const tm = (x, y, z) => ((Math.floor(y) % 3 === 0) ? V(shade(col.main, 0.86)) : wrinkle(main, x, y, z, 0.05));
    lg.tube([0, 0, 0], [0, -len, dz], r0, r1, tm, 0.97);
    return lg;
  };
  const A = trunkSeg(10, 5.4, 4.7, 3.5), B = trunkSeg(10, 4.7, 3.9, 1.5);
  addLG(m, 'trunkA', A, { parent: 'head', origin: [0, -3.4, 15.5] });
  addLG(m, 'trunkB', B, { parent: 'trunkA', origin: [0, -10, 3.5] });
  // trunk C: hangs, then curls forward at the tip
  const Cc = new LG(14, 22, 22, 7, 14, 6);
  const tmc = (x, y, z) => ((Math.floor(y) % 3 === 0) ? V(shade(col.main, 0.86)) : main);
  Cc.tube([0, 0, 0], [0, -7, 0.8], 3.9, 3.3, tmc, 0.97);
  Cc.tube([0, -7, 0.8], [0, -10.2, 4.2], 3.3, 2.6, main, 0.97);
  Cc.box(-1.4, -11.6, 4.2, 1.4, -10, 6.4, main);
  Cc.set(-0.8, -10.8, 6.5, V(0x2b1e22)); Cc.set(0.8, -10.8, 6.5, V(0x2b1e22));          // nostrils
  addLG(m, 'trunkC', Cc, { parent: 'trunkB', origin: [0, -10, 1.5] });
  attachLG(m, 'trunk_tip', 'trunkC', Cc, [0, -11, 6.5]);

  // ---------------------------------------------------------------- ears
  const ear = (sx) => {
    // thin plate: grey OUTER face (x*sx > 0), soft pink INNER face, darker rim and wrinkle speckle
    const lg = new LG(4, 34, 28, 2, 30, 24);
    const outer = col.ear, rim = shade(col.ear, 0.78);
    lg.ell(0, -11.5, -9, 1.2, 12.4, 9.8, (x, y, z) => {
      const dy = (y + 11.5) / 12.4, dz = (z + 9) / 9.8, edge = dy * dy + dz * dz > 0.72;
      if (x * sx > 0) return V(edge ? rim : (hashN(x, y, z) < 0.12 ? shade(outer, 0.88) : outer));
      return V(edge ? shade(col.inner, 0.8) : col.inner);
    });
    return lg;
  };
  addLG(m, 'earL', ear(1), { parent: 'head', origin: [8.8, 9, 3], rest: [0, -0.32, 0.08] });
  addLG(m, 'earR', ear(-1), { parent: 'head', origin: [-8.8, 9, 3], rest: [0, 0.32, -0.08] });

  // ---------------------------------------------------------------- tail
  const tail = new LG(6, 22, 8, 3, 18, 4);
  tail.tube([0, 0, 0], [0, -13, -2], 1.5, 1.0, V(col.dark), 1);
  tail.ell(0, -16, -2.4, 1.7, 2.8, 1.7, V(0x3c3e46));
  addLG(m, 'tail', tail, { parent: 'body', origin: [0, 18, -30] });

  // ---------------------------------------------------------------- howdah (static child of body)
  const hw = new LG(28, 34, 32, 14, 0, 16);
  const plank = (x, y, z) => (((Math.floor(y / 2) + (Math.floor(Math.abs(z) / 4))) & 1) ? V(C.plank) : V(C.plankDark));
  const WALL = 9;
  hw.box(-11, 0, -13, 11, 2, 13, V(C.woodDark));                                        // floor beams
  for (const [x0, x1, z0, z1] of [[-11, 11, 11, 13], [-11, 11, -13, -11], [-11, -9, -13, 13], [9, 11, -13, 13]]) hw.box(x0, 2, z0, x1, 2 + WALL, z1, plank);   // walls
  // painted team panels on the outer faces
  const panel = (x0, x1, y0, y1, z0, z1) => { hw.box(x0, y0, z0, x1, y1, z1, T(0xffffff)); };
  panel(-9, 9, 3.4, 9.5, 13, 13.6); panel(-9, 9, 3.4, 9.5, -13.6, -13);                 // front / back
  panel(11, 11.6, 3.4, 9.5, -11, 11); panel(-11.6, -11, 3.4, 9.5, -11, 11);                 // sides
  hw.box(-9, 2, -11, 9, 2.7, 11, (x, y, z) => ((Math.floor(x) + Math.floor(z)) & 1 ? T(0xe0e0e0) : T(0xffffff)));   // team carpet on the floor
  for (const [x0, x1, z0, z1] of [[-11.6, 11.6, 12.8, 13.8], [-11.6, 11.6, -13.8, -12.8]]) hw.box(x0, 2 + WALL - 1, z0, x1, 2 + WALL, z1, V(C.gold));   // gold rim front/back
  for (const sx of [-1, 1]) hw.box(sx * 11.3 - 0.6, 2 + WALL - 1, -13.8, sx * 11.3 + 0.6, 2 + WALL, 13.8, V(C.gold));
  // corner posts with gold finials, canopy beams
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    hw.box(sx * 11 - 1.5, 2, sz * 13 - 1.5, sx * 11 + 1.5, 21, sz * 13 + 1.5, V(C.wood));
    hw.box(sx * 11 - 1, 21, sz * 13 - 1, sx * 11 + 1, 23, sz * 13 + 1, V(C.gold));
  }
  hw.box(-11.5, 19, -13.5, 11.5, 20.5, -12.5, V(C.woodLight)); hw.box(-11.5, 19, 12.5, 11.5, 20.5, 13.5, V(C.woodLight));
  hw.box(-11.5, 19, -13.5, -10.5, 20.5, 13.5, V(C.woodLight)); hw.box(10.5, 19, -13.5, 11.5, 20.5, 13.5, V(C.woodLight));
  // team pennant on a pole at the rear
  hw.box(-0.5, 2, -12, 0.5, 30, -11, V(C.woodDark));
  hw.box(0.5, 22, -12, 1.5, 29, -5, T(0xffffff)); hw.box(0.5, 28, -12, 1.5, 29, -5, V(C.gold)); hw.box(0.5, 22, -12, 1.5, 23, -5, V(C.gold));
  hw.box(-0.7, 30, -12.2, 0.7, 31.5, -10.8, V(C.gold));
  addLG(m, 'howdah', hw, { parent: 'body', origin: [0, 30, 1] });
  attachLG(m, 'howdah_a', 'howdah', hw, [4.2, 2, 5]);
  attachLG(m, 'howdah_b', 'howdah', hw, [-4.2, 2, -5]);

  m.addAttach('feet', 'body', [18, -legLen, 33]);
  m.meta.legLen = legLen * 0.1; m.meta.hipHeight = (legLen + top) * 0.1;
  m.meta.gait = { hipH: (legLen + top) * 0.1, pace: false, walk: { amp: 0.36, duty: 0.72, stride: +(2 * 2.2 * Math.sin(0.36) / 0.72).toFixed(2) }, run: { amp: 0.5, duty: 0.6, stride: +(2 * 2.2 * Math.sin(0.5) / 0.6).toFixed(2) } };
  return m;
}

/** The unit: war elephant + two howdah archers (hum_lite crew by default, or the supplied humanoid(s)). */
export function buildWarElephant(o = {}) {
  const rig = buildElephantRig({ id: (o.id || 'war_elephant') + '_rig', colors: o.colors });
  const mk = (n) => (o.crew && o.crew[n]) || buildHumLite({ id: 'crew' + n, skin: n ? 0xb58a62 : 0x8a5c3a, hat: n ? 'cap' : 'hood', tunic: null, tool: 'bow' });
  const a = mk(0), b = mk(1);
  const out = composeModels(o.id || 'war_elephant', [
    { model: rig },
    { model: a, prefix: 'a1_', on: 'howdah_a', offset: [0, 0, 0], rot: [0, 0.5, 0] },
    { model: b, prefix: 'a2_', on: 'howdah_b', offset: [0, 0, 0], rot: [0, -0.5, 0] },
  ]);
  out.meta.kind = 'bespoke'; out.meta.species = 'elephant';
  return out;
}
