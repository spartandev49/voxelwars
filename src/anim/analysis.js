// Motion analysis helpers (pure): forward kinematics identical to VoxSkin's part chain, ground clearance, foot slide, joint ranges.
// Used by tests/anim and by the clip DSL's floor fit. Units: WORLD units unless stated.

import { Animator } from './animator.js';
import { mat3, describeModel, describeRig, HUM1_RIG, fk, rootPoint, lowestPoint, partPointWorld, solidBounds } from './kin.js';
export { describeModel, describeRig, HUM1_RIG, fk, rootPoint, lowestPoint, partPointWorld };

const HALF = Math.PI / 2;

/**
 * Contact points of a foot (part pivot frame, world units): heel / middle / toe of the sole line (bottom row of the part's solid voxels) for a foot with a
 * real sole (hum1: 6 voxels long), the middle only for a rigid leg whose foot is a point (hooves, bird legs).
 */
export function soleVerts(model, partIdx, three) {
  const pt = model.parts[partIdx], b = solidBounds(pt.grid), vs = model.voxelSize;
  if (!b) return [[0, 0, 0]];
  const y = (b.y0 - pt.pivot[1]) * vs, x = ((b.x0 + b.x1 + 1) / 2 - pt.pivot[0]) * vs;
  const zc = ((b.z0 + b.z1 + 1) / 2 - pt.pivot[2]) * vs;
  return three ? [[x, y, (b.z0 - pt.pivot[2]) * vs], [x, y, zc], [x, y, (b.z1 + 1 - pt.pivot[2]) * vs]] : [[x, y, zc]];
}

/**
 * World-z range of planted runs. A contact point is "planted" while it is within `tol` (world units) of the lowest height it reaches over the cycle; its
 * world z (the root moves at v u/s: z + v * t) must then stay put. Returns the worst z range of any complete planted run (runs touching the window edges
 * are ignored). `pts` = [[x,y,z]...] model-space samples, one per `dt`; `skip` samples are dropped from the start; `sc` = instance scale.
 */
export function plantedSlide(pts, dt, v, sc, tol, skip = 0) {
  const n = pts.length; let minY = Infinity;
  for (let i = skip; i < n; i++) if (pts[i][1] < minY) minY = pts[i][1];
  let worst = 0, inRun = false, lo = 0, hi = 0, start = 0;
  for (let i = skip; i < n; i++) {
    const zw = pts[i][2] * sc + v * i * dt, pl = (pts[i][1] - minY) * sc <= tol;
    if (pl) { if (!inRun) { inRun = true; start = i; lo = hi = zw; } else { if (zw < lo) lo = zw; if (zw > hi) hi = zw; } }
    else if (inRun) { inRun = false; if (start > skip) worst = Math.max(worst, hi - lo); }
  }
  return worst;
}

/**
 * Sample a clip on a model for a time series and collect per-frame data.
 * opts: {t0,t1,dt, state}. Returns {times, minY[], feetL, feetR (sole centre), vertsL, vertsR (heel/middle/toe tracks), root:[...]}.
 */
export function profileClip(model, clipId, opts = {}) {
  const desc = describeModel(model);
  const P = desc.P, pose = new Float32Array(P * 9), W = new Float64Array(P * 12);
  const rig = model.meta.rig || 'hum1';
  const dur = Animator.clipDur ? Animator.clipDur(clipId, rig) : 1;
  const dt = opts.dt || 1 / 30, t1 = opts.t1 !== undefined ? opts.t1 : dur;
  const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
  const iLL = model.partIndex('legLL'), iLR = model.partIndex('legLR');
  const out = { times: [], minY: [], feetL: [], feetR: [], vertsL: [], vertsR: [], root: [] };
  const vL = iLL >= 0 ? soleVerts(model, iLL, true) : [], vR = iLR >= 0 ? soleVerts(model, iLR, true) : [];
  for (let k = 0; k < 3; k++) { out.vertsL.push([]); out.vertsR.push([]); }
  const st = Object.assign({ clip: clipId, t: 0, rate: 1, flinch: 0, dir: 0, prev: clipId, blend: 1 }, opts.state || {});
  const pt = [0, 0, 0];
  for (let t = opts.t0 || 0; t <= t1 + 1e-9; t += dt) {
    st.t = t;
    Animator.pose(model, st, { root, phase: 0 }, pose);
    fk(desc, pose, W);
    out.times.push(t); out.minY.push(lowestPoint(desc, W, root));
    if (iLL >= 0) { out.feetL.push(partPointWorld(desc, W, iLL, 0, -0.5, 0, root, [0, 0, 0]).slice()); for (let k = 0; k < 3; k++) out.vertsL[k].push(partPointWorld(desc, W, iLL, vL[k][0], vL[k][1], vL[k][2], root, [0, 0, 0]).slice()); }
    if (iLR >= 0) { out.feetR.push(partPointWorld(desc, W, iLR, 0, -0.5, 0, root, [0, 0, 0]).slice()); for (let k = 0; k < 3; k++) out.vertsR[k].push(partPointWorld(desc, W, iLR, vR[k][0], vR[k][1], vR[k][2], root, [0, 0, 0]).slice()); }
    out.root.push({ x: root.x, y: root.y, z: root.z, pitch: root.pitch, roll: root.roll, yaw: root.yaw });
  }
  void pt; void HALF;
  return out;
}

/**
 * Foot slide metric for a looping locomotion clip played at ground speed v (u/s) with rate = v / speedRef.
 * A contact point (heel, middle, toe of each sole) is "planted" while within `plantTol` of the lowest height it reaches over the cycle. During a stance the
 * point's WORLD z (the hip travels at v) should stay constant: slide = range of world z during the stance.
 * Returns {stride, worst, perFoot, ratio}, ratio = worst slide / stride (stride = distance travelled per cycle at v).
 */
export function footSlide(model, clipId, v, speedRef, opts = {}) {
  const rig = model.meta.rig || 'hum1';
  const dur = Animator.clipDur(clipId, rig);
  const rate = v / speedRef, dtClip = 1 / 60, plantTol = opts.plantTol !== undefined ? opts.plantTol : 0.035;
  const prof = profileClip(model, clipId, { t0: 0, t1: 2 * dur - dtClip, dt: dtClip });   // two cycles so no stance straddles the seam
  const stride = v * (dur / rate);
  const perFoot = [];
  for (const tracks of [prof.vertsL, prof.vertsR]) {
    let w = 0;
    for (const tr of tracks) w = Math.max(w, plantedSlide(tr, dtClip / rate, v, 1, plantTol, 0));
    perFoot.push(w);
  }
  const worst = Math.max(...perFoot);
  return { stride, worst, perFoot, ratio: stride > 0 ? worst / stride : 0 };
}

// ------------------------------------------------------------------------------------------------------------------ live (pipeline) metrics
/**
 * Foot slide of the REAL pipeline: the model walks at ground speed v (u/s) for `seconds`; extra.gait accumulates v*dt exactly like u.gait in the
 * sim, so the animator mixes walk/jog/run by speed. Planted contact points (see footSlide) should stay put in world space.
 * opts: {legs (part ids, default hum1 legLL/legLR), clip, scale, plantTol, seconds}. Returns {ratio, worst, stride, stepsPerSec, a, b}, ratio = worst slide / distance per gait cycle.
 */
export function footSlideLive(model, v, opts = {}) {
  const desc = describeModel(model), P = desc.P, pose = new Float32Array(P * 9), W = new Float64Array(P * 12);
  const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
  // legs to track: default the hum1 pair (heel / middle / toe); any other rig passes its own leg part ids (a rigid leg: its sole point)
  const humLegs = !opts.legs;
  const legs = (opts.legs || ['legLL', 'legLR']).map((id) => model.partIndex(id)).filter((i) => i >= 0);
  const verts = legs.map((i) => soleVerts(model, i, humLegs));
  const dt = 1 / 60, seconds = opts.seconds || 4, plantTol = opts.plantTol !== undefined ? opts.plantTol : 0.035;
  const clip = opts.clip || 'walk';
  const st = { clip, t: 0, rate: 1, flinch: 0, dir: 0, prev: clip, blend: 1 };
  const sc = opts.scale || 1;
  const extra = { root, speed: v, gait: 0, id: 7, t: 0, heading: 0, scale: sc };
  const info = Animator.gaitInfo(model, v, sc);
  const n = Math.round(seconds / dt), tracks = [];
  for (let k = 0; k < legs.length; k++) for (let j = 0; j < verts[k].length; j++) tracks.push([]);
  for (let i = 0; i < n; i++) {
    extra.gait = v * i * dt; extra.t = i * dt; st.t = i * dt;
    Animator.pose(model, st, extra, pose);
    fk(desc, pose, W);
    let ti = 0;
    for (let k = 0; k < legs.length; k++) for (const lv of verts[k]) tracks[ti++].push(partPointWorld(desc, W, legs[k], lv[0], lv[1], lv[2], root, [0, 0, 0]).slice());
  }
  const skip = Math.round(0.5 / dt);
  let worst = 0; for (const tr of tracks) worst = Math.max(worst, plantedSlide(tr, dt, v, sc, plantTol, skip));
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
