// chariot1: Egyptian two-horse chariot. Rig parts: body, wheelL, wheelR, pole (4). Unit (chariot_archer) = chariot1 + two quad1 horses (prefixes h1_, h2_, k=0.9, lean:
// mane/ears baked, team plumes + harness: 8 parts each) + two hum_lite crew (d_ driver, a_ archer with a baked bow) => 32 parts (<= 48, decisions_r3 D3).
// CONVENTIONS (voxels; +Z forward, +X left; positive rx rotates +Y toward +Z):
//   body   : root, pivot ON THE GROUND under the middle of the box (y=0 ground; grid z -42..42 so the yoke attach points lie inside it). Floor top y=10, box z -8..+8,
//            x +-8. Painted team panels, gold front disc, rear footboard, quiver case on the right side.
//   wheelL/R: parent body, origins (+-10, 8, -1), pivot at the hub, axle along X, radius 0.8 u (meta.wheelRadius); roll about X (positive rx = rolling forward;
//            angle = distance / radius). 6 spokes.
//   pole   : parent body, origin (0,11,7), pivot at the box front; rises to the yoke (0,22,36.7) with the yoke bar (x +-12.5) and team yoke pads. Static (may rock a hair).
//   attach : seat_driver (+4.2, 10, +2.2), seat_archer (-4.2, 10, -4.2) (crew feet on the floor), yoke_1 (+7.5, 0, +29) and yoke_2 (-7.5, 0, +29) = ground points under
//            the horses (their body pivots land at legLen above them), all in body-local voxels.
//   sub-rigs (meta.subrigs): '' chariot1, h1_ quad1 (left horse), h2_ quad1 (right horse), d_ hum_lite, a_ hum_lite. d_ arms rest forward (-1.0) holding the reins.
//   The horses are 2.8 u wide together + wheels = 2.7 u footprint, 7.5 u long; clips: horses gallop, crew play crew_* (animator CREW_OF), wheels roll with distance.
import { LG, V, T, C, shade, newModel, addLG, attachLG, wheelLG } from './common.js';
import { composeModels } from '../../../voxel/compose.js';
import { buildHorse } from './quad1.js';
import { buildHumLite } from './hum_lite.js';

export function buildChariotRig(o = {}) {
  const m = newModel(o.id || 'chariot_rig', { rig: 'chariot1', kind: 'bespoke', species: 'chariot' });
  const body = new LG(36, 28, 84, 18, 0, 42);
  const FLOOR = 10, wood = V(C.wood), woodD = V(C.woodDark);
  // floor (planks)
  body.box(-8, 8, -8, 8, FLOOR, 8.5, (x, y, z) => (((Math.floor(z) >> 1) & 1) ? V(C.plank) : V(C.plankDark)));
  body.box(-10.4, 7, -2, 10.4, 9.2, 0, woodD);                                   // axle
  body.box(-1.2, 7.5, 2, 1.2, 8.5, 9, woodD);                                    // pole stay
  // side panels (woven, painted with the team colour), height rising toward the front
  const panelH = (z) => 5 + ((z + 8) * 3) / 16;
  for (const sx of [-1, 1]) {
    for (let zi = -8; zi < 8; zi++) {
      const h = Math.round(panelH(zi + 0.5));
      for (let yi = 0; yi < h; yi++) {
        const wv = ((zi + yi) & 1) ? T(0xffffff) : T(0xe0e0e0);
        body.box(sx * 8 - (sx > 0 ? 1.5 : -0.5) - 0.5, FLOOR + yi, zi, sx * 8 + (sx > 0 ? 0.5 : -1.5) + 0.5, FLOOR + yi + 1, zi + 1, yi === h - 1 ? V(C.gold) : (yi === 0 ? woodD : wv));
      }
    }
  }
  // front panel (higher, curved look), gold sun disc on the face
  body.box(-8, FLOOR, 6.5, 8, FLOOR + 11, 8.5, (x, y, z) => ((Math.floor(x) + Math.floor(y)) & 1 ? T(0xffffff) : T(0xe0e0e0)));
  body.box(-8, FLOOR + 10, 6.5, 8, FLOOR + 11, 8.5, V(C.gold));
  body.box(-8, FLOOR, 6.5, 8, FLOOR + 1, 8.5, woodD);
  body.ell(0, FLOOR + 6, 8.6, 3.2, 3.2, 0.8, V(C.gold)); body.ell(0, FLOOR + 6, 8.9, 1.4, 1.4, 0.8, V(0xfff0b0));
  // rear footboard + a quiver case on the right side
  body.box(-8, 8, -9.5, 8, FLOOR, -8, wood);
  body.box(-10.2, FLOOR + 1, -4, -8.4, FLOOR + 8, -1, V(C.leather)); body.box(-10, FLOOR + 8, -3.6, -8.6, FLOOR + 11, -1.4, V(C.linen));
  addLG(m, 'body', body, { origin: [0, 0, 0] });

  // wheels
  const wheel = () => wheelLG(8, 2, { spokes: 6, rim: V(C.wood), spoke: V(C.woodLight), hub: V(C.woodDark), hubCap: V(C.gold), tire: V(C.leatherDark), rimW: 2, fullSpokes: true });
  addLG(m, 'wheelL', wheel(), { parent: 'body', origin: [10, 8, -1] });
  addLG(m, 'wheelR', wheel(), { parent: 'body', origin: [-10, 8, -1] });

  // pole + yoke
  const pole = new LG(32, 18, 44, 16, 4, 4);
  pole.tube([0, 0, 0], [0, 11, 29.7], 1.6, 1.3, V(C.wood), 1);
  pole.box(-12.5, 10.6, 29, 12.5, 13.2, 31.2, V(C.woodLight));
  for (const sx of [-1, 1]) {
    pole.box(sx * 12.5 - 0.7, 10.2, 28.6, sx * 12.5 + 0.7, 13.6, 31.6, V(C.gold));
    pole.box(sx * 7.5 - 2.5, 9.6, 28.4, sx * 7.5 + 2.5, 11.2, 31.8, T(0xffffff));                // yoke pads over the withers
  }
  addLG(m, 'pole', pole, { parent: 'body', origin: [0, 11, 7] });

  attachLG(m, 'seat_driver', 'body', body, [4.2, FLOOR, 2.2]);
  attachLG(m, 'seat_archer', 'body', body, [-4.2, FLOOR, -4.2]);
  attachLG(m, 'yoke_1', 'body', body, [7.5, 0, 29]);
  attachLG(m, 'yoke_2', 'body', body, [-7.5, 0, 29]);
  m.meta.wheelRadius = 0.8;
  return m;
}

/** chariot_archer unit */
export function buildChariotArcher(o = {}) {
  const id = o.id || 'chariot_archer';
  const rig = buildChariotRig({ id: id + '_rig' });
  const hk = (coat, extra) => buildHorse(Object.assign({ id: 'horse_' + coat, coat, k: 0.9, saddle: 'none', plume: true, lean: true, harness: true, trim: C.gold }, extra));
  const h1 = hk('chestnut', { blaze: true }), h2 = hk('bay', { socks: ['FL', 'BR'] });
  // crew: hum_lite stand-ins, or compileSoldier(bp, {lite:true}) models passed as o.driver / o.archer
  const driver = o.driver || buildHumLite({ id: 'driver', skin: 0xb98660, hat: 'cap' });
  const archer = o.archer || buildHumLite({ id: 'archer', skin: 0xd9a47c, hat: 'wreath', tool: 'bow' });
  const out = composeModels(id, [
    { model: rig },
    { model: h1, prefix: 'h1_', on: 'yoke_1' },
    { model: h2, prefix: 'h2_', on: 'yoke_2' },
    { model: driver, prefix: 'd_', on: 'seat_driver' },
    { model: archer, prefix: 'a_', on: 'seat_archer' },
  ]);
  // driver holds the reins forward
  for (const p of ['d_armUL', 'd_armUR']) { const q = out.byId[p]; if (q) q.rest[0] = -1.0; }
  out.meta.kind = 'bespoke'; out.meta.species = 'chariot';
  return out;
}
