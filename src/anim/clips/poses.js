// Pose vocabulary for hum1 authoring (angles in radians, VoxSkin convention: positive rx rotates +Y toward +Z).
//   arm raised FORWARD = negative rx on armU*; elbow bend = negative rx on armL* (hand comes forward/up); knee flex = positive rx on legL*
//   ry = azimuth about the vertical (positive turns +Z toward +X = the character's LEFT); rz abducts the limb (left arm +rz outward, right arm -rz)
export const arm = (side, o = {}) => {
  const fwd = o.fwd || 0, out = o.out || 0, across = o.across || 0, elbow = o.elbow || 0;
  return side === 'L'
    ? { armUL: [-fwd, -across, out], armLL: [-elbow, 0, o.wrist || 0] }
    : { armUR: [-fwd, across, -out], armLR: [-elbow, 0, -(o.wrist || 0)] };
};
export const leg = (side, o = {}) => {
  const fwd = o.fwd || 0, out = o.out || 0, knee = o.knee || 0;
  return side === 'L' ? { legUL: [-fwd, o.turn || 0, out], legLL: [knee, 0, 0] } : { legUR: [-fwd, -(o.turn || 0), -out], legLR: [knee, 0, 0] };
};
/** shallow merge of pose dictionaries; the `root` sub-objects are merged key by key */
export const merge = (...ps) => {
  const out = Object.assign({}, ...ps);
  const roots = ps.filter((p) => p && p.root);
  if (roots.length) out.root = Object.assign({}, ...roots.map((r) => r.root));
  return out;
};
/** crouch: both knees bent by k with thighs forward 0.55k so the feet stay under the hips; includes the root drop (world u) */
export const crouch = (k, spread = 0) => {
  const f = k * 0.55;
  return { ...leg('L', { fwd: f, knee: k, out: spread }), ...leg('R', { fwd: f, knee: k, out: spread }), root: { y: -(10 - 5 * (Math.cos(f) + Math.cos(f - k))) * 0.1 } };
};

import { solveLeg } from '../gait.js';
const _l = [0, 0];
/** hip height (voxels) at which a flat foot planted at z (voxels, relative to the hip) touches the ground with a vertical shin */
export const flatReach = (z) => 5 + Math.sqrt(Math.max(0.25, 25 - Math.min(z * z, 24.5)));
/**
 * Plant the feet with IK. zL / zR = world z of the left / right sole (voxels), hipZ = hip position along the facing axis (voxels),
 * h = hip height above ground (voxels; default = mean of the flat-foot reaches, so neither foot digs in), liftL / liftR = sole
 * height above ground (voxels) for a foot in the air. Returns the leg pose + root drop/advance.
 */
export const feet = (zL, zR, o = {}) => {
  const hipZ = o.hipZ || 0;
  const h = o.h !== undefined ? o.h : (flatReach(zL - hipZ) + flatReach(zR - hipZ)) / 2;
  solveLeg(zL - hipZ, o.liftL || 0, h, _l, o.tol !== undefined ? o.tol : 1.1); const aL = _l[0], kL = _l[1];
  solveLeg(zR - hipZ, o.liftR || 0, h, _l, o.tol !== undefined ? o.tol : 1.1); const aR = _l[0], kR = _l[1];
  return {
    legUL: [aL, o.turnL || 0, o.spreadL !== undefined ? o.spreadL : (o.spread || 0)], legLL: [kL, 0, 0],
    legUR: [aR, o.turnR || 0, o.spreadR !== undefined ? o.spreadR : -(o.spread || 0)], legLR: [kR, 0, 0],
    root: { y: (h - 10) * 0.1, z: hipZ * 0.1 },
  };
};

// ---- shared stances ------------------------------------------------------------------------------------------------------
/** ready stance (idle_combat mean pose): left foot forward, shield forward-left, weapon arm cocked at the hip */
export const READY = merge(
  { body: [0.14, -0.28, 0], head: [-0.12, 0.28, 0], armUR: [-0.55, 0.2, -0.3], armLR: [-1.15, 0, 0], armUL: [-0.55, -0.2, 0.25], armLL: [-1.2, 0, 0] },
  feet(2.6, -2.6, { turnL: 0.12, turnR: -0.5, spread: 0.1 }), { root: { y: feet(2.6, -2.6).root.y, pitch: 0.02 } },
);
export const ready = (extra = {}) => merge(READY, extra, { root: Object.assign({}, READY.root, extra.root || {}) });
/** the same ready stance with the feet re-planted for a new hip position: ready with hipZ / heights */
export const readyAt = (hipZ, o = {}, extra = {}) => ready(merge(feet(2.6, -2.6, Object.assign({ turnL: 0.12, turnR: -0.5, spread: 0.1, hipZ }, o)), extra, { root: Object.assign({ pitch: 0.02 }, feet(2.6, -2.6, Object.assign({ hipZ }, o)).root, extra.root || {}) }));
