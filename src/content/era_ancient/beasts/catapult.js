// catapult1: onager. Rig parts: frame, wheelL, wheelR, arm, sling (+ optional `stone`, the loaded boulder, child of sling: ANIM may scale it to 0 at launch and back to 1 on
// reload) = 6 parts; three hum_lite crew c1_, c2_, c3_ composed on the frame's ground-level attach points => 24 parts.
// The machine is modelled at design size and built K = 1.25 times bigger (SLG) so it dwarfs its crew; numbers below are the REAL voxels.
// CONVENTIONS (voxels; +Z = the way the arm throws, +X = left; positive rx rotates +Y toward +Z):
//   frame  : root, pivot on the GROUND at the middle (y=0 ground). Spans z -28..+22, x +-15.5, 4.1 u tall (arm tip higher). Team: rail panels, stop-bar cushion, banner.
//   wheelL/R: parent frame, origins (+-13.8, 7.5, -5), pivot at the hub, axle along X, radius 0.75 u (meta.wheelRadius). Roll about X.
//   arm    : parent frame, origin (0, 17.5, 13.1) = the torsion axle; pivot there. Grows along +Y 30 voxels beyond the axle (6.5 behind as a butt). REST rx = -0.55
//            (leaning back, cocked halfway). `launch` sweeps rx from about -2.2 (pulled down toward the winch) to +0.25 (hits the front stop bar).
//   sling  : parent arm, origin (0, 31.3, 0.6) = the arm tip; pivot there, hangs along -Y (14 voxels). REST rx = +0.55 (hangs plumb in the world at the arm's rest angle;
//            sling swing is relative to the arm).   stone: parent sling, origin (0,-11.9,0), pivot at its centre.
//   crew   : c1_ (+4.2*K,0,-23*K) and c2_ at the winch behind the frame (face +Z, arms rest forward -1.15 on the crank), c3_ at (+17*K, 0, +4*K) the loader (yaw -1.2, arms -0.7).
//   attach : crew_1, crew_2, crew_3 (ground points), muzzle (above the stop bar, where the stone leaves).  meta.clipMap: throw/shoot_bow/cast -> launch.
import { LG, SLG, V, T, C, shade, newModel, addLG, attachLG, wheelLG } from './common.js';
import { composeModels } from '../../../voxel/compose.js';
import { buildHumLite } from './hum_lite.js';

export function buildCatapultRig(o = {}) {
  const m = newModel(o.id || 'catapult_rig', { rig: 'catapult1', kind: 'bespoke', species: 'catapult' });
  const wood = V(C.wood), woodD = V(C.woodDark), woodL = V(C.woodLight), rope = V(C.rope), ropeD = V(C.ropeDark), iron = V(C.iron);
  const plank = (x, y, z) => (((Math.floor(z) >> 2) & 1) ? V(C.plank) : V(C.plankDark));
  const K = o.k || 1.25, O = (a) => a.map((v) => v * K);       // the machine is modelled at design size and built K times bigger
  const f = new SLG(K, 36, 40, 58, 18, 0, 29);

  // side rails (y 6..9) with painted team panels on the outer faces
  for (const sx of [-1, 1]) {
    f.box(sx * 8 - 1.5, 6, -17, sx * 8 + 1.5, 9.4, 17, plank);
    f.box(sx * 9.5 - (sx > 0 ? 0 : 0.6), 6.4, -15, sx * 9.5 + (sx > 0 ? 0.6 : 0), 9, 15, T(0xffffff));
  }
  // cross beams
  for (const z of [-15, -6, 3, 13]) f.box(-8, 6.4, z, 8, 9, z + 2, woodD);
  // front feet (the machine rests on them), rear sits on the axle
  for (const sx of [-1, 1]) { f.box(sx * 8 - 1.5, 0, 12, sx * 8 + 1.5, 6.4, 15, woodD); f.box(sx * 8 - 2, 0, 11.5, sx * 8 + 2, 1, 15.5, wood); }
  f.box(-12.5, 5, -5, 12.5, 7, -3, woodD);                                         // axle beam
  // A-frame uprights + top beam + torsion skeins
  for (const sx of [-1, 1]) { f.box(sx * 8 - 1.5, 9, 8.5, sx * 8 + 1.5, 23, 12.5, wood); f.box(sx * 8 - 2, 13, 8, sx * 8 + 2, 15, 13, iron); }
  f.box(-9.5, 21.5, 8.5, 9.5, 24, 12.5, woodL);
  f.box(-6.5, 11.4, 8.8, 6.5, 16.6, 12.2, (x, y, z) => (((Math.floor(x) + Math.floor(y)) & 1) ? rope : ropeD));       // rope skein (torsion bundle)
  for (let x = -6; x <= 6; x += 3) f.box(x - 0.4, 11.2, 8.6, x + 0.4, 16.8, 12.4, V(C.leatherDark));                  // lashings
  // front stop bar with a team padded cushion
  f.box(-8.5, 18.5, 14, 8.5, 22, 17, woodD); f.box(-7.5, 19, 16.4, 7.5, 21.6, 17.8, T(0xffffff)); f.box(-7.5, 20.6, 16.4, 7.5, 21.2, 17.8, V(C.gold));
  f.box(-8.5, 12.5, 12.5, -6.5, 22, 14.5, woodD); f.box(6.5, 12.5, 12.5, 8.5, 22, 14.5, woodD);
  // windlass at the rear: drum, rope, ratchet, crank spokes
  f.cyl('x', 12.5, -17.5, -6.5, 6.5, 2.4, (x, y, z) => (((Math.floor(x) >> 1) & 1) ? rope : ropeD));
  for (const sx of [-1, 1]) { f.box(sx * 6.5 - 0.8, 12.5 - 5, -17.5 - 0.8, sx * 6.5 + 0.8, 12.5 + 5, -17.5 + 0.8, woodL); f.box(sx * 6.5 - 0.8, 12.5 - 0.8, -17.5 - 5, sx * 6.5 + 0.8, 12.5 + 0.8, -17.5 + 5, woodL); f.cyl('x', 12.5, -17.5, sx * 6.5 - 1, sx * 6.5 + 1, 1.6, iron); }
  for (const sx of [-1, 1]) f.box(sx * 6 - 1.2, 8.5, -19.5, sx * 6 + 1.2, 15, -15.5, woodD);                         // windlass posts
  // trailing rope lying on the rails + a loose coil beside the windlass
  f.line([0, 13.5, -15], [0, 8.4, 4], rope); f.line([0, 13.5, -15], [0, 9.2, 0], ropeD);
  f.ell(9, 1.2, -9, 2.6, 1.2, 2.6, rope); f.ell(9, 2.2, -9, 1.8, 1, 1.8, ropeD);
  // team banner on a pole at the rear corner
  f.box(7.5, 9, -17, 8.5, 31, -16, woodD); f.box(8.5, 24, -17, 9.5, 30, -10, T(0xffffff)); f.box(8.5, 24, -17, 9.5, 25, -10, V(C.gold)); f.box(8.5, 29, -17, 9.5, 30, -10, V(C.gold));
  f.box(7.2, 31, -17.3, 8.8, 32.5, -15.7, V(C.gold));
  addLG(m, 'frame', f, { origin: [0, 0, 0] });
  attachLG(m, 'crew_1', 'frame', f, O([4.2, 0, -23]));
  attachLG(m, 'crew_2', 'frame', f, O([-4.2, 0, -23]));
  attachLG(m, 'crew_3', 'frame', f, O([17, 0, 4]));
  attachLG(m, 'muzzle', 'frame', f, O([0, 24, 14]));

  const wheel = () => wheelLG(6 * K, 3, { spokes: 6, rim: woodD, spoke: wood, hub: iron, hubCap: V(C.gold), tire: iron, rimW: 1.6, fullSpokes: true });
  addLG(m, 'wheelL', wheel(), { parent: 'frame', origin: O([11, 6, -4]) });
  addLG(m, 'wheelR', wheel(), { parent: 'frame', origin: O([-11, 6, -4]) });

  // throwing arm: pivot at the torsion axle; butt end behind, spoon at the tip
  const arm = new SLG(K, 8, 36, 10, 4, 6, 5);
  arm.box(-1.6, -4, -1.6, 1.6, 24, 1.6, (x, y, z) => (((Math.floor(y / K) + 20) % 9 === 0) ? V(C.leatherDark) : V(C.woodLight)));
  arm.box(-2.1, -5, -2.1, 2.1, -3, 2.1, iron);                      // butt cap
  arm.box(-2.1, 3, -2.1, 2.1, 5.2, 2.1, V(C.leatherDark));          // lashing at the axle
  arm.box(-2.1, 21, -2.1, 2.1, 22.5, 2.1, iron); arm.box(-1.6, 24, -1.6, 1.6, 26, 1.6, V(C.woodLight)); arm.box(-0.8, 25, 0.5, 0.8, 26.5, 2.4, iron);   // iron band, wooden head, hook
  addLG(m, 'arm', arm, { parent: 'frame', origin: O([0, 14, 10.5]), rest: [-0.55, 0, 0] });

  const sling = new SLG(K, 6, 16, 6, 3, 14, 3);
  sling.line([-1.2, 0, 0], [-1.6, -8, 0], rope); sling.line([1.2, 0, 0], [1.6, -8, 0], rope);
  sling.ell(0, -9.5, 0, 2.6, 1.8, 2.4, V(C.leather)); sling.box(-1.5, -8, -1.5, 1.5, -7, 1.5, V(C.leatherDark));
  addLG(m, 'sling', sling, { parent: 'arm', origin: O([0, 25, 0.5]), rest: [0.55, 0, 0] });
  const stone = new SLG(K, 10, 10, 10, 5, 5, 5);
  stone.ell(0, 0, 0, 3.8, 3.6, 3.8, (x, y, z) => ((x * 7 + y * 3 + z * 5) % 4 === 0 ? V(0x777b83) : V(0x8e929a)));
  addLG(m, 'stone', stone, { parent: 'sling', origin: O([0, -9.5, 0]) });

  m.meta.wheelRadius = +(6 * K * 0.1).toFixed(3);
  return m;
}

/** catapult unit: onager + 3 crew */
export function buildCatapult(o = {}) {
  const id = o.id || 'catapult';
  const rig = buildCatapultRig({ id: id + '_rig' });
  const mk = (n, hat, skin) => (o.crew && o.crew[n - 1]) || buildHumLite({ id: 'crew' + n, hat, skin, apron: n === 1, tunic: null });   // o.crew: lite models from compileSoldier
  const out = composeModels(id, [
    { model: rig },
    { model: mk(1, 'cap', 0xb98660), prefix: 'c1_', on: 'crew_1' },
    { model: mk(2, 'hood', 0xe0ac84), prefix: 'c2_', on: 'crew_2' },
    { model: mk(3, 'cap', 0x8a5c3a), prefix: 'c3_', on: 'crew_3', rot: [0, -1.2, 0] },
  ]);
  for (const p of ['c1_armUL', 'c1_armUR', 'c2_armUL', 'c2_armUR']) { const q = out.byId[p]; if (q) q.rest[0] = -1.15; }   // hands on the crank
  for (const p of ['c3_armUL', 'c3_armUR']) { const q = out.byId[p]; if (q) q.rest[0] = -0.7; }
  out.meta.kind = 'bespoke'; out.meta.species = 'catapult';
  return out;
}
