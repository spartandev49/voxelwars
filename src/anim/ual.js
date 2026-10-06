// Retargeted UAL clips (assets/anim/humanoid_clips.json, produced by tools/anim/bake.mjs) -> internal Clip format.
// The spike's JSON uses flat root arrays in LEG LENGTHS (1.0 = 10 voxels = 1 world unit): root, rootX, rootZ, rootPitch, rootRoll, rootYaw.
// Pure module.

const f32 = (a) => (a ? Float32Array.from(a) : undefined);

/** convert one JSON clip to the internal Clip format (rig hum1) */
export function convertUAL(id, c, opts = {}) {
  const N = c.frames;
  const clip = { id: opts.id || id, rig: 'hum1', fps: 30, frames: N, loop: opts.loop !== undefined ? opts.loop : !!c.loop, q: {}, meta: Object.assign({}, c.meta) };
  for (const p of Object.keys(c.q)) clip.q[p] = Float32Array.from(c.q[p]);
  const r = {};
  if (c.root) r.y = f32(c.root);
  if (c.rootX) r.x = f32(c.rootX);
  if (c.rootZ) r.z = f32(c.rootZ);
  if (c.rootPitch) r.pitch = f32(c.rootPitch);
  if (c.rootRoll) r.roll = f32(c.rootRoll);
  if (c.rootYaw) r.yaw = f32(c.rootYaw);
  if (Object.keys(r).length) clip.root = r;
  clip.meta.src = c.meta && c.meta.src ? c.meta.src : id;
  clip.meta.source = 'ual';
  return clip;
}
