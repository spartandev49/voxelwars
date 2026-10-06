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

import { timeWarp } from './dsl.js';
import { UAL_ADOPT } from './ual_adopt.js';

/** basic validation of a converted clip (finite numbers, consistent lengths, known parts): a clip that fails is not adopted */
export function validateUalClip(clip) {
  const N = clip.frames;
  if (!(N >= 2) || !clip.q) return 'no frames';
  for (const p of Object.keys(clip.q)) {
    const a = clip.q[p];
    if (a.length !== N * 3) return `${p}: length ${a.length} != ${N * 3}`;
    for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return `${p}: non-finite value`;
  }
  if (clip.root) for (const k of Object.keys(clip.root)) { const a = clip.root[k]; if (a.length !== N) return `root.${k}: length`; for (let i = 0; i < N; i++) if (!Number.isFinite(a[i])) return `root.${k}: non-finite`; }
  return '';
}

/** Build the adopted UAL clips from the JSON container: returns [{clip, entry}] (entries failing validation are reported through onSkip) */
export function buildAdopted(json, onSkip) {
  const out = [];
  if (!json || !json.clips) return out;
  for (const e of UAL_ADOPT) {
    const src = json.clips[e.src];
    if (!src) { if (onSkip) onSkip(e.id, 'missing in humanoid_clips.json'); continue; }
    let c = convertUAL(e.src, src, { id: e.id });
    const bad = validateUalClip(c);
    if (bad) { if (onSkip) onSkip(e.id, bad); continue; }
    if (e.yaw !== undefined && c.root && c.root.yaw) for (let i = 0; i < c.root.yaw.length; i++) c.root.yaw[i] *= e.yaw;
    if (e.warp) {
      const fps = c.fps;
      c = timeWarp(c, e.warp, { id: e.id });
      c.meta.src = src.meta && src.meta.src ? src.meta.src : e.src; c.meta.source = 'ual';
      void fps;
    }
    if (e.meta) Object.assign(c.meta, e.meta);
    if (e.hit !== undefined) c.meta.hitFrame = Math.round(e.hit * c.fps);
    if (e.recover !== undefined) c.meta.recoverFrame = Math.round(e.recover * c.fps);
    c.meta.cls = c.meta.cls || undefined;
    out.push({ clip: c, entry: e });
  }
  return out;
}
