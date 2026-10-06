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
export const merge = (...ps) => Object.assign({}, ...ps);
/** crouch: both knees bent by k with thighs forward 0.55k so the feet stay under the hips; includes the root drop (world u) */
export const crouch = (k, spread = 0) => {
  const f = k * 0.55;
  return { ...leg('L', { fwd: f, knee: k, out: spread }), ...leg('R', { fwd: f, knee: k, out: spread }), root: { y: -(10 - 5 * (Math.cos(f) + Math.cos(f - k))) * 0.1 } };
};
