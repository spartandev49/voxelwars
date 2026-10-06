// ballista1: Roman carroballista. Rig parts: frame, wheelL, wheelR, bow, string, bolt (6) + two hum_lite crew c1_ (winch) and c2_ (loader) => 18 parts.
// Built at design size x K = 1.3 (SLG) so it dwarfs its crew; numbers below are the REAL voxels (rounded).
// CONVENTIONS (voxels; +Z = the way it shoots, +X = left; positive rx rotates +Y toward +Z):
//   frame  : root, pivot on the GROUND at the middle of the carriage (y=0 ground), spans z -33..+21, x +-16, 4.2 u tall. Slider/stock, two vertical torsion housings
//            (rope skeins, team cloth caps), team shield plate with a gold boss, winch with crank wheel, pennant, spare bolts.
//   wheelL/R: parent frame, origins (+-11.1, 7.8, -2.6), pivot at the hub, axle along X, radius 0.78 u (meta.wheelRadius). Roll about X.
//   bow    : parent frame, origin (0, 22.1, 13) = the torsion axis; pivot there. Two spring arms (rigid together), tips at x +-22, z = pivot -9.6 (strung, slightly drawn). Static.
//   string : parent frame, same origin; a V from the two arm tips to the nock at (0,0,-14) in this frame. ANIM draws it by translating along -Z and snaps it back on `launch`.
//   bolt   : parent frame, origin (0, 22.1, -1.3) = the nock; pivot at the bolt tail, shaft along +Z 32 voxels. ANIM translates it with the string, shoots it forward on
//            `launch` and scales it to 0 until the reload.
//   crew   : c1_ behind the winch (arms rest forward -1.15 on the crank), c2_ at the left side facing the machine (yaw -1.2, arms -0.8).
//   attach : crew_1, crew_2 (ground points), muzzle (bolt tip).  meta.clipMap: throw/shoot_bow/cast -> launch.
import { LG, SLG, V, T, C, shade, newModel, addLG, attachLG, wheelLG } from './common.js';
import { composeModels } from '../../../voxel/compose.js';
import { buildHumLite } from './hum_lite.js';

export function buildBallistaRig(o = {}) {
  const m = newModel(o.id || 'ballista_rig', { rig: 'ballista1', kind: 'bespoke', species: 'ballista' });
  const wood = V(C.wood), woodD = V(C.woodDark), woodL = V(C.woodLight), rope = V(C.rope), ropeD = V(C.ropeDark), iron = V(C.iron);
  const plank = (x, y, z) => (((Math.floor(z) >> 2) & 1) ? V(C.plank) : V(C.plankDark));
  const K = o.k || 1.3, O = (a) => a.map((v) => v * K);       // modelled at design size, built K times bigger so it dwarfs its crew
  const f = new SLG(K, 40, 36, 60, 20, 0, 30);

  // carriage rails + cross beams (team painted outer faces)
  for (const sx of [-1, 1]) { f.box(sx * 5 - 1.5, 7, -17, sx * 5 + 1.5, 10.4, 15, plank); f.box(sx * 6.4 - (sx > 0 ? 0 : 0.5), 7.4, -14, sx * 6.4 + (sx > 0 ? 0.5 : 0), 10, 12, T(0xffffff)); }
  for (const z of [-15, -5, 4, 12]) f.box(-5, 7.4, z, 5, 10, z + 2, woodD);
  f.box(-10.5, 5.2, -3, 10.5, 7.2, -1, woodD);                                      // axle
  for (const sx of [-1, 1]) f.box(sx * 5 - 1.5, 0, 12.5, sx * 5 + 1.5, 7.4, 15.5, woodD);   // front stand
  // stock / slider: a long central beam with a groove for the bolt
  f.box(-2.2, 10, -19, 2.2, 15, 15, woodL); f.box(-0.7, 14.2, -19, 0.7, 15.4, 15, woodD);
  f.box(-2.6, 10, -19, 2.6, 11.4, 15, wood);
  // torsion housings at the front: two vertical boxes with rope skeins, joined by a top and bottom crossbeam
  for (const sx of [-1, 1]) {
    f.box(sx * 8.5 - 3.5, 11, 6.5, sx * 8.5 + 3.5, 25, 13.5, plank);
    f.cyl('y', sx * 8.5, 10, 12, 24, 2.7, (x, y, z) => (((Math.floor(y) + Math.floor(x * 0.5)) & 1) ? rope : ropeD));   // rope skein
    f.ell(sx * 8.5, 24.6, 10, 3.2, 0.7, 3.2, iron); f.ell(sx * 8.5, 11.4, 10, 3.2, 0.7, 3.2, iron);                         // washers
  }
  f.box(-9, 11, 6.5, 9, 13, 13.5, woodD); f.box(-9, 23, 6.5, 9, 25, 13.5, woodD);
  for (const sx of [-1, 1]) f.box(sx * 8.5 - 3.9, 25, 6.1, sx * 8.5 + 3.9, 26.4, 13.9, T(0xffffff));                      // team cloth caps on the torsion housings
  f.box(-9.4, 25, 6.1, 9.4, 26, 7.2, T(0xe0e0e0));
  // front shield plate (team) with a gold boss
  f.box(-9, 13, 13.5, 9, 22, 15, T(0xffffff)); f.box(-9, 21, 13.5, 9, 22, 15, V(C.gold)); f.box(-9, 13, 13.5, 9, 14, 15, V(C.gold));
  f.ell(0, 17.5, 15.2, 2.6, 2.6, 0.9, V(C.gold)); f.ell(0, 17.5, 15.8, 1.2, 1.2, 0.7, V(0xfff0b0));
  // winch at the rear: drum, ratchet, crank wheel
  f.cyl('x', 13.5, -19.5, -3, 3, 1.8, (x, y, z) => (((Math.floor(x) >> 1) & 1) ? rope : ropeD));
  f.box(-4.5, 10, -21, -3, 16, -18, woodD); f.box(3, 10, -21, 4.5, 16, -18, woodD);
  f.cyl('x', 13.5, -19.5, 4.5, 6, 3.4, woodL); f.cyl('x', 13.5, -19.5, 4.4, 4.9, 4.2, iron);
  for (let a = 0; a < 4; a++) { const ang = (a * Math.PI) / 2; f.line([6, 13.5, -19.5], [7, 13.5 + Math.sin(ang) * 5, -19.5 + Math.cos(ang) * 5], woodD, 1.6); }
  // pennant
  f.box(4.5, 10, -17, 5.5, 31, -16, woodD); f.box(5.5, 24, -17, 6.5, 30, -10, T(0xffffff)); f.box(5.5, 24, -17, 6.5, 25, -10, V(C.gold)); f.box(5.5, 29, -17, 6.5, 30, -10, V(C.gold));
  f.box(4.2, 31, -17.3, 5.8, 32.5, -15.7, V(C.gold));
  // spare bolts in a rack on the left rail
  for (let i = 0; i < 3; i++) f.box(7.4 + i * 0.0, 11 + i * 1.1, -12, 8.4, 11.8 + i * 1.1, -2, woodL);
  addLG(m, 'frame', f, { origin: [0, 0, 0] });
  attachLG(m, 'crew_1', 'frame', f, O([1, 0, -24.5]));
  attachLG(m, 'crew_2', 'frame', f, O([15, 0, 3]));
  attachLG(m, 'muzzle', 'frame', f, O([0, 17, 19]));

  const wheel = () => wheelLG(6 * K, 3, { spokes: 6, rim: woodD, spoke: wood, hub: iron, hubCap: V(C.gold), tire: iron, rimW: 1.6, fullSpokes: true });
  addLG(m, 'wheelL', wheel(), { parent: 'frame', origin: O([8.5, 6, -2]) });
  addLG(m, 'wheelR', wheel(), { parent: 'frame', origin: O([-8.5, 6, -2]) });

  // bow: two spring arms from the skeins, curved outward then back (strung)
  const bow = new SLG(K, 44, 8, 24, 22, 4, 12);
  for (const sx of [-1, 1]) {
    const pts = [[8, 0, 0, 2.6], [11.5, 0, 0.6, 2.4], [14.8, 0, -1.2, 2.0], [16.6, 0, -4.2, 1.6], [17.2, 0, -7.4, 1.3]];
    for (let i = 0; i < pts.length - 1; i++) bow.tube([sx * pts[i][0], pts[i][1], pts[i][2]], [sx * pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]], pts[i][3], pts[i + 1][3], (x, y, z) => ((Math.floor(Math.abs(x) / K) % 6 === 0) ? iron : woodL), 1);
    bow.box(sx * 17.2 - 0.9, -1.5, -8.4, sx * 17.2 + 0.9, 1.5, -6.2, iron);                  // tip nock
  }
  addLG(m, 'bow', bow, { parent: 'frame', origin: O([0, 17, 10]) });
  const str = new SLG(K, 44, 6, 30, 22, 3, 15);
  str.line([-17.2, 0, -7.4], [0, 0, -11], V(0xe6dcc0), 1.6); str.line([17.2, 0, -7.4], [0, 0, -11], V(0xe6dcc0), 1.6);
  str.box(-1.2, -0.8, -12.2, 1.2, 0.8, -10.6, V(C.leatherDark));                           // the nock slider
  addLG(m, 'string', str, { parent: 'frame', origin: O([0, 17, 10]) });

  // bolt: tail at z=0, head at z=+22
  const bolt = new SLG(K, 5, 5, 28, 2.5, 2.5, 2);
  bolt.box(-0.5, -0.5, 0, 0.5, 0.5, 21, V(C.wood));
  bolt.box(-0.5, -0.5, 21, 0.5, 0.5, 23, V(C.steel)); bolt.box(-1.2, -1.2, 18.5, 1.2, 1.2, 21, V(C.steel)); bolt.box(-0.5, -0.5, 23, 0.5, 0.5, 25, V(C.steel));
  bolt.box(-0.3, -1.6, 0, 0.3, 1.6, 3.2, V(0xe8e0c8)); bolt.box(-1.6, -0.3, 0, 1.6, 0.3, 3.2, V(0xe8e0c8));
  bolt.box(-0.3, -1.6, 0, 0.3, 1.6, 1, T(0xffffff));
  addLG(m, 'bolt', bolt, { parent: 'frame', origin: O([0, 17, -1]) });
  m.meta.wheelRadius = +(6 * K * 0.1).toFixed(3);
  return m;
}

/** ballista unit: carroballista + 2 crew */
export function buildBallista(o = {}) {
  const id = o.id || 'ballista';
  const rig = buildBallistaRig({ id: id + '_rig' });
  const out = composeModels(id, [
    { model: rig },
    { model: (o.crew && o.crew[0]) || buildHumLite({ id: 'crew1', hat: 'helm', skin: 0xe0ac84, apron: true, tunic: null }), prefix: 'c1_', on: 'crew_1' },
    { model: (o.crew && o.crew[1]) || buildHumLite({ id: 'crew2', hat: 'helm', skin: 0xc99770, tunic: null }), prefix: 'c2_', on: 'crew_2', rot: [0, -1.2, 0] },
  ]);
  for (const p of ['c1_armUL', 'c1_armUR']) { const q = out.byId[p]; if (q) q.rest[0] = -1.15; }
  for (const p of ['c2_armUL', 'c2_armUR']) { const q = out.byId[p]; if (q) q.rest[0] = -0.8; }
  out.meta.kind = 'bespoke'; out.meta.species = 'ballista';
  return out;
}
