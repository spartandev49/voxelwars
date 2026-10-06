// Motion analysis helpers (pure): forward kinematics identical to VoxSkin's part chain, ground clearance, foot slide, joint ranges.
// Used by tests/anim and by the clip DSL's floor fit. Units: WORLD units unless stated.

import { Animator } from './animator.js';
import { mat3, describeModel, fk, rootPoint, lowestPoint, partPointWorld } from './kin.js';
export { describeModel, fk, rootPoint, lowestPoint, partPointWorld };

const HALF = Math.PI / 2;

/** canonical hum1 part boxes (voxels, relative to the part pivot): [x0,y0,z0,x1,y1,z1] */
export const HUM1_RIG = {
  body: { parent: null, origin: [0, 10, 0], box: [-5, 0, -2.5, 5, 9, 2.5] },
  head: { parent: 'body', origin: [0, 9, 0], box: [-4.5, 0, -4.5, 4.5, 8, 4.5] },
  armUL: { parent: 'body', origin: [6.5, 8, 0], box: [-1.5, -5, -1.5, 1.5, 0, 1.5] },
  armLL: { parent: 'armUL', origin: [0, -5, 0], box: [-1.5, -5, -1.5, 1.5, 0, 1.5] },
  armUR: { parent: 'body', origin: [-6.5, 8, 0], box: [-1.5, -5, -1.5, 1.5, 0, 1.5] },
  armLR: { parent: 'armUR', origin: [0, -5, 0], box: [-1.5, -5, -1.5, 1.5, 0, 1.5] },
  legUL: { parent: null, origin: [3, 10, 0], box: [-2, -5, -2, 2, 0, 2] },
  legLL: { parent: 'legUL', origin: [0, -5, 0], box: [-2, -5, -2, 2, 0, 3] },
  legUR: { parent: null, origin: [-3, 10, 0], box: [-2, -5, -2, 2, 0, 2] },
  legLR: { parent: 'legUR', origin: [0, -5, 0], box: [-2, -5, -2, 2, 0, 3] },
};

/** description of a rig TABLE like HUM1_RIG (voxel units) in the same shape describeModel returns (world units, voxelSize 0.1) */
export function describeRig(table, vs = 0.1) {
  const ids = Object.keys(table), P = ids.length, parent = new Int16Array(P), origin = new Float64Array(P * 3), rest = [], box = new Float64Array(P * 6);
  ids.forEach((id, i) => {
    const e = table[id];
    parent[i] = e.parent ? ids.indexOf(e.parent) : -1;
    origin.set(e.origin.map((v) => v * vs), i * 3); rest.push([0, 0, 0]); box.set(e.box.map((v) => v * vs), i * 6);
  });
  return { P, ids, parent, origin, rest, box, vs };
}

/**
 * Sample a clip on a model for a time series and collect per-frame data.
 * opts: {t0,t1,dt, state}. Returns {times, minY[], feet:{L:[[x,y,z]...], R:...}, root:[...]}.
 */
export function profileClip(model, clipId, opts = {}) {
  const desc = describeModel(model);
  const P = desc.P, pose = new Float32Array(P * 9), W = new Float64Array(P * 12);
  const rig = model.meta.rig || 'hum1';
  const dur = Animator.clipDur ? Animator.clipDur(clipId, rig) : 1;
  const dt = opts.dt || 1 / 30, t1 = opts.t1 !== undefined ? opts.t1 : dur;
  const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
  const iLL = model.partIndex('legLL'), iLR = model.partIndex('legLR');
  const out = { times: [], minY: [], feetL: [], feetR: [], root: [] };
  const st = Object.assign({ clip: clipId, t: 0, rate: 1, flinch: 0, dir: 0, prev: clipId, blend: 1 }, opts.state || {});
  const pt = [0, 0, 0];
  for (let t = opts.t0 || 0; t <= t1 + 1e-9; t += dt) {
    st.t = t;
    Animator.pose(model, st, { root, phase: 0 }, pose);
    fk(desc, pose, W);
    out.times.push(t); out.minY.push(lowestPoint(desc, W, root));
    if (iLL >= 0) out.feetL.push(partPointWorld(desc, W, iLL, 0, -0.5, 0, root, [0, 0, 0]).slice()); // sole point: bottom of the lower leg
    if (iLR >= 0) out.feetR.push(partPointWorld(desc, W, iLR, 0, -0.5, 0, root, [0, 0, 0]).slice());
    out.root.push({ x: root.x, y: root.y, z: root.z, pitch: root.pitch, roll: root.roll, yaw: root.yaw });
  }
  void pt; void HALF;
  return out;
}

/**
 * Foot slide metric for a looping locomotion clip played at ground speed v (u/s) with rate = v / speedRef.
 * A foot is "planted" while its sole is within `plantTol` of the lowest sole height of the cycle. During a stance the foot's WORLD z
 * (hip travels at v, foot z relative to the hip comes from the pose) should stay constant: slide = range of world z during the stance.
 * Returns {stride, worst, perFoot, ratio}, ratio = worst slide / stride (stride = distance travelled per cycle at v).
 */
export function footSlide(model, clipId, v, speedRef, opts = {}) {
  const rig = model.meta.rig || 'hum1';
  const dur = Animator.clipDur(clipId, rig);
  const rate = v / speedRef, dtClip = 1 / 60, plantTol = opts.plantTol !== undefined ? opts.plantTol : 0.035;
  const prof = profileClip(model, clipId, { t0: 0, t1: 2 * dur - dtClip, dt: dtClip });   // two cycles so no stance straddles the seam
  const n = prof.times.length;
  const stride = v * (dur / rate);
  let worst = 0; const perFoot = [];
  for (const feet of [prof.feetL, prof.feetR]) {
    let minY = Infinity; for (const f of feet) if (f[1] < minY) minY = f[1];
    const zw = feet.map((f, i) => f[2] + v * (prof.times[i] / rate));
    let slide = 0, runMin = 0, runMax = 0, inRun = false, runStart = 0;
    for (let i = 0; i < n; i++) {
      const pl = feet[i][1] <= minY + plantTol;
      if (pl) { if (!inRun) { inRun = true; runStart = i; runMin = runMax = zw[i]; } else { if (zw[i] < runMin) runMin = zw[i]; if (zw[i] > runMax) runMax = zw[i]; } }
      else if (inRun) { inRun = false; if (runStart > 0) slide = Math.max(slide, runMax - runMin); }
    }
    perFoot.push(slide); worst = Math.max(worst, slide);
  }
  return { stride, worst, perFoot, ratio: stride > 0 ? worst / stride : 0 };
}

// ------------------------------------------------------------------------------------------------------------------ live (pipeline) metrics
/**
 * Foot slide of the REAL pipeline: the model walks at ground speed v (u/s) for `seconds`; extra.gait accumulates v*dt exactly like u.gait in the
 * sim, so the animator mixes walk/jog/run by speed. Planted feet (sole within plantTol of the lowest sole height) should stay put in world space.
 * Returns {ratio, worst, stride, stepsPerSec, a, b} where ratio = worst slide / distance per gait cycle.
 */
export function footSlideLive(model, v, opts = {}) {
  const desc = describeModel(model), P = desc.P, pose = new Float32Array(P * 9), W = new Float64Array(P * 12);
  const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
  // legs to track: default the hum1 pair; any rig passes its own leg part ids (the sole = the bottom of the part's grid below its pivot)
  const legs = (opts.legs || ['legLL', 'legLR']).map((id) => model.partIndex(id)).filter((i) => i >= 0);
  const sole = legs.map((i) => { const pt = model.parts[i], b = pt.grid.bounds(); return ((b ? b.y0 : 0) - pt.pivot[1]) * model.voxelSize; });   // lowest solid voxel row below the pivot
  const dt = 1 / 60, seconds = opts.seconds || 4, plantTol = opts.plantTol !== undefined ? opts.plantTol : 0.035;
  const clip = opts.clip || 'walk';
  const st = { clip, t: 0, rate: 1, flinch: 0, dir: 0, prev: clip, blend: 1 };
  const sc = opts.scale || 1;
  const extra = { root, speed: v, gait: 0, id: 7, t: 0, heading: 0, scale: sc };
  const info = Animator.gaitInfo(model, v, sc);
  const n = Math.round(seconds / dt), tracks = legs.map(() => []);
  for (let i = 0; i < n; i++) {
    extra.gait = v * i * dt; extra.t = i * dt; st.t = i * dt;
    Animator.pose(model, st, extra, pose);
    fk(desc, pose, W);
    for (let k = 0; k < legs.length; k++) tracks[k].push(partPointWorld(desc, W, legs[k], 0, sole[k], 0, root, [0, 0, 0]).slice());
  }
  let worst = 0; const skip = Math.round(0.5 / dt);
  for (const feet of tracks) {
    let minY = Infinity; for (let i = skip; i < n; i++) if (feet[i][1] < minY) minY = feet[i][1];
    let inRun = false, lo = 0, hi = 0, start = 0;
    for (let i = skip; i < n; i++) {
      const zw = feet[i][2] * sc + v * i * dt;                          // world units: the model is scaled by sc
      const pl = (feet[i][1] - minY) * sc <= plantTol;
      if (pl) { if (!inRun) { inRun = true; start = i; lo = hi = zw; } else { if (zw < lo) lo = zw; if (zw > hi) hi = zw; } }
      else if (inRun) { inRun = false; if (start > skip) worst = Math.max(worst, hi - lo); }
    }
  }
  const stride = info ? info.stride : 0;
  return { ratio: stride ? worst / stride : 0, worst, stride, stepsPerSec: info ? info.stepsPerSec : 0, a: info && info.a, b: info && info.b };
}

/** per-frame speed (u/s) of a model point attached to a part (pivot frame, world units) over a clip; returns {speeds[], peakFrame} */
export function pointSpeedProfile(model, clipId, partId, local, opts = {}) {
  const desc = describeModel(model), P = desc.P, pose = new Float32Array(P * 9), W = new Float64Array(P * 12);
  const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
  const rig = model.meta.rig || 'hum1', idx = model.partIndex(partId);
  const dur = Animator.clipDur(clipId, rig), N = Math.round(dur * 30);
  const st = { clip: clipId, t: 0, rate: 1, flinch: 0, dir: 0, prev: clipId, blend: 1 };
  const pts = [];
  for (let f = 0; f < N; f++) {
    st.t = f / 30; Animator.pose(model, st, { root, heading: 0, scale: 1 }, pose); fk(desc, pose, W);
    pts.push(partPointWorld(desc, W, idx, local[0], local[1], local[2], root, [0, 0, 0]).slice());
  }
  const speeds = [0];
  for (let f = 1; f < N; f++) speeds.push(Math.hypot(pts[f][0] - pts[f - 1][0], pts[f][1] - pts[f - 1][1], pts[f][2] - pts[f - 1][2]) * 30);
  let peak = 0; for (let f = 1; f < N; f++) if (speeds[f] > speeds[peak]) peak = f;
  return { speeds, peakFrame: peak, points: pts };
}
