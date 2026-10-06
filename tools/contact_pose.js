// Static "ready" stance for hum1 models, shared by tools/contact.mjs (browser) and tools/tintcheck.mjs (Node). Pure math, no THREE.
// Pose layout = VoxSkin POSE_STRIDE (9 floats per part, model part order): tx,ty,tz, rx,ry,rz, sx,sy,sz.
// The weapon/offhand "overlay" below is what ANIM's weapon tracks do per style: aim the weapon part at a world elevation
// (degrees above horizontal, toward +Z) regardless of how the forearm is bent, and keep a shield face pointing +Z.
export const STRIDE = 9;
/** weapon elevation by combat style (deg above horizontal, forward) in the ready stance */
export const READY_ELEVATION = { thrust: 8, pike: 4, slash: 40, overhead: 62, bash: 28, shoot: 90, throw: 55, cast: 78, none: 30 };

export function readyPose(model, info = {}) {
  const P = model.parts.length, out = new Float32Array(P * STRIDE);
  for (let i = 0; i < P; i++) { out[i * STRIDE + 6] = out[i * STRIDE + 7] = out[i * STRIDE + 8] = 1; }
  const ix = (id) => { const p = model.byId[id]; return p ? p.index * STRIDE : -1; };
  const set = (id, rx, ry = 0, rz = 0) => { const o = ix(id); if (o >= 0) { out[o + 3] = rx; out[o + 4] = ry; out[o + 5] = rz; } };
  const two = !!info.twoHanded;
  // legs: left foot forward, right back, slight knee bend
  set('legUL', -0.30); set('legLL', 0.50); set('legUR', 0.22); set('legLR', 0.32);
  set('body', -0.03, -0.12);
  set('head', 0.04, 0.12);
  // weapon arm (right = -X)
  const aUR = -0.72, aLR = -1.0;
  set('armUR', aUR, 0, 0.06); set('armLR', aLR);
  // shield / second hand (left = +X)
  let aUL = -0.5, aLL = -0.95;
  if (two) { aUL = -0.85; aLL = -0.95; set('armUL', aUL, -0.35, -0.12); set('armLL', aLL); }
  else { set('armUL', aUL, 0, -0.06); set('armLL', aLL); }
  const w = model.byId.weapon;
  if (w) {
    const e = (READY_ELEVATION[info.weaponStyle] ?? 30) * Math.PI / 180;
    const phi = Math.PI / 2 - e;                      // weapon +Y direction angle in the (y,z) plane
    const pose = phi - (aUR + aLR) - (w.rest[0] || 0);
    set('weapon', pose);
  }
  const o = model.byId.offhand;
  if (o) set('offhand', -(aUL + aLL) - (o.rest[0] || 0));
  return out;
}
