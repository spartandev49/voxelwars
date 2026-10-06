// Mounted units: a quad1 mount (horse / camel) + a hum1 rider composed into ONE ModelDef via composeModels.
//   rider parts are prefixed 'r_' (r_body, r_head, r_armUL ...), the rider's root parts hang off the mount's `saddle` part.
//   The rider's seated pose is baked as static `rest` rotations on the thigh/shin/cape parts (the ride_* clips only add deltas).
import { composeModels } from '../../../voxel/compose.js';
import { buildHorse, buildCamel } from './quad1.js';
import { buildFixtureRider } from './fixture_rider.js';
import { partPointAtRest, attachLocal } from './common.js';

// seated pose (radians), applied to the rider's root-level limb parts; Ry*Rx*Rz order (spread about Z first, then forward about X)
export const SEAT_REST = {
  legUL: [-1.22, 0, 0.30], legLL: [1.2, 0, 0],
  legUR: [-1.22, 0, -0.30], legLR: [1.2, 0, 0],
  cape: [0.55, 0, 0], cape2: [0.3, 0, 0],
};

/**
 * @param {{id?:string, mount?:'horse'|'camel', mountColors?:object, rider?:import('../../../voxel/model.js').ModelDef, riderKind?:string, seatOffset?:number[]}} spec
 *   mountColors: {coat:'white'|'chestnut'|'black'|'bay'|'dun'|'grey'|'palomino'|0xRRGGBB, socks, blaze, barded, saddle:'cloth'|'pad', plume, trim, k}
 */
export function buildMounted(spec = {}) {
  const mount = spec.mount || 'horse';
  const colors = spec.mountColors || {};
  const id = spec.id || ('mounted_' + mount);
  const mountModel = mount === 'camel' ? buildCamel(Object.assign({ id: id + '_mount' }, colors)) : buildHorse(Object.assign({ id: id + '_mount' }, colors));
  const rider = spec.rider || buildFixtureRider(spec.riderKind || 'greek');
  if (!rider.meta.rig) rider.meta.rig = 'hum1';
  const out = composeModels(id, [
    { model: mountModel },
    { model: rider, prefix: 'r_', on: 'saddle', offset: spec.seatOffset || [0, -10, 0] },
  ]);
  for (const [pid, rest] of Object.entries(SEAT_REST)) {
    const p = out.byId['r_' + pid];
    if (p) { p.rest[0] = rest[0]; p.rest[1] = rest[1]; p.rest[2] = rest[2]; }
  }
  out.meta.kind = 'mounted';
  out.meta.mount = mount;
  out.meta.riderPrefix = 'r_';
  out.meta.seat = { attach: 'saddle', hipOffsetVox: spec.seatOffset || [0, -10, 0] };
  return out;
}

/** Distance (u) between the saddle attach point and the rider's hip pivot at the rest pose (tests / A8). */
export function seatError(model) {
  const a = model.attach.saddle;
  const pa = partPointAtRest(model, a.part, attachLocal(model, 'saddle'));
  const pr = partPointAtRest(model, 'r_body', [0, 0, 0]);
  return Math.hypot(pa[0] - pr[0], pa[1] - pr[1], pa[2] - pr[2]);
}
