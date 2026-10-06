// Motion analysis helpers (pure): forward kinematics identical to VoxSkin's part chain, ground clearance, foot slide, joint ranges.
// Used by tests/anim and by the clip DSL's floor fit. Units: WORLD units unless stated.

import { Animator } from './animator.js';

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

function mat3(rx, ry, rz, m) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  m[0] = cy * cz + sy * sx * sz; m[1] = -cy * sz + sy * sx * cz; m[2] = sy * cx;
  m[3] = cx * sz; m[4] = cx * cz; m[5] = -sx;
  m[6] = -sy * cz + cy * sx * sz; m[7] = sy * sz + cy * sx * cz; m[8] = cy * cx;
}

/**
 * Build a flat description {ids, parent:Int16Array, origin:Float64Array(3n) world units, rest:Array, box:Array(6n) world units} from a ModelDef
 * (box = tight grid bounds relative to the pivot) or from a rig table (HUM1_RIG, voxel units * vs).
 */
export function describeModel(model, parts) {
  const P = model.parts.length, ids = [], parent = new Int16Array(P), origin = new Float64Array(P * 3), rest = [], box = new Float64Array(P * 6);
  const vs = model.voxelSize;
  for (let i = 0; i < P; i++) {
    const p = model.parts[i];
    ids.push(p.id); parent[i] = p.parentIndex; origin.set(p.origin, i * 3); rest.push(p.rest.slice());
    const b = p.grid.bounds();
    if (b) box.set([(b.x0 - p.pivot[0]) * vs, (b.y0 - p.pivot[1]) * vs, (b.z0 - p.pivot[2]) * vs, (b.x1 + 1 - p.pivot[0]) * vs, (b.y1 + 1 - p.pivot[1]) * vs, (b.z1 + 1 - p.pivot[2]) * vs], i * 6);
  }
  return { P, ids, parent, origin, rest, box, vs };
}

/** forward kinematics: W (Float64Array P*12, 3x4 rows) = model-space transform of every part (root-relative) */
export function fk(desc, pose, W) {
  const m = new Float64Array(9), r = new Float64Array(9);
  for (let p = 0; p < desc.P; p++) {
    const q = p * 9;
    mat3(pose[q + 3], pose[q + 4], pose[q + 5], m);
    const rs = desc.rest[p];
    if (rs[0] || rs[1] || rs[2]) {
      mat3(rs[0], rs[1], rs[2], r);
      const b = new Float64Array(9);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) b[i * 3 + j] = m[i * 3] * r[j] + m[i * 3 + 1] * r[3 + j] + m[i * 3 + 2] * r[6 + j];
      m.set(b);
    }
    for (let j = 0; j < 3; j++) { m[j] *= pose[q + 6]; m[3 + j] *= pose[q + 7]; m[6 + j] *= pose[q + 8]; } // scale columns (approx: per-axis scale applied after rotation as VoxSkin does)
    // VoxSkin: a00 *= psx; a10 *= psx; a20 *= psx (column scale) -> columns of the matrix
    const tx = desc.origin[p * 3] + pose[q], ty = desc.origin[p * 3 + 1] + pose[q + 1], tz = desc.origin[p * 3 + 2] + pose[q + 2];
    const w = p * 12, pi = desc.parent[p];
    // undo the row-scaling above and apply column scaling like VoxSkin
    const a = [m[0] / pose[q + 6] * pose[q + 6], 0, 0];
    void a;
    mat3(pose[q + 3], pose[q + 4], pose[q + 5], m);
    if (rs[0] || rs[1] || rs[2]) { mat3(rs[0], rs[1], rs[2], r); const b = new Float64Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) b[i * 3 + j] = m[i * 3] * r[j] + m[i * 3 + 1] * r[3 + j] + m[i * 3 + 2] * r[6 + j]; m.set(b); }
    const sx = pose[q + 6], sy = pose[q + 7], sz = pose[q + 8];
    m[0] *= sx; m[3] *= sx; m[6] *= sx; m[1] *= sy; m[4] *= sy; m[7] *= sy; m[2] *= sz; m[5] *= sz; m[8] *= sz;
    if (pi < 0) {
      W[w] = m[0]; W[w + 1] = m[1]; W[w + 2] = m[2]; W[w + 3] = tx; W[w + 4] = m[3]; W[w + 5] = m[4]; W[w + 6] = m[5]; W[w + 7] = ty; W[w + 8] = m[6]; W[w + 9] = m[7]; W[w + 10] = m[8]; W[w + 11] = tz;
    } else {
      const u = pi * 12;
      for (let i = 0; i < 3; i++) {
        const a0 = W[u + i * 4], a1 = W[u + i * 4 + 1], a2 = W[u + i * 4 + 2], a3 = W[u + i * 4 + 3];
        W[w + i * 4] = a0 * m[0] + a1 * m[3] + a2 * m[6]; W[w + i * 4 + 1] = a0 * m[1] + a1 * m[4] + a2 * m[7]; W[w + i * 4 + 2] = a0 * m[2] + a1 * m[5] + a2 * m[8];
        W[w + i * 4 + 3] = a0 * tx + a1 * ty + a2 * tz + a3;
      }
    }
  }
  return W;
}

/** root transform (pitch/roll/yaw about the hip pivot is already folded into root.x/y/z by the animator) applied to a model-space point */
export function rootPoint(root, x, y, z, out) {
  const cx = Math.cos(root.pitch), sx = Math.sin(root.pitch), cy = Math.cos(root.yaw), sy = Math.sin(root.yaw), cz = Math.cos(root.roll), sz = Math.sin(root.roll);
  const m00 = cy * cz + sy * sx * sz, m01 = -cy * sz + sy * sx * cz, m02 = sy * cx, m10 = cx * sz, m11 = cx * cz, m12 = -sx, m20 = -sy * cz + cy * sx * sz, m21 = sy * sz + cy * sx * cz, m22 = cy * cx;
  out[0] = m00 * x + m01 * y + m02 * z + root.x; out[1] = m10 * x + m11 * y + m12 * z + root.y; out[2] = m20 * x + m21 * y + m22 * z + root.z;
  return out;
}

const _c = [0, 0, 0], _o = [0, 0, 0];
/** lowest world y over all part box corners (root applied, heading 0, scale 1) */
export function lowestPoint(desc, W, root) {
  let minY = Infinity;
  for (let p = 0; p < desc.P; p++) {
    const bx = desc.box, o = p * 6, w = p * 12;
    if (bx[o] === 0 && bx[o + 3] === 0 && bx[o + 1] === 0 && bx[o + 4] === 0) continue;
    for (let k = 0; k < 8; k++) {
      const x = k & 1 ? bx[o + 3] : bx[o], y = k & 2 ? bx[o + 4] : bx[o + 1], z = k & 4 ? bx[o + 5] : bx[o + 2];
      _c[0] = W[w] * x + W[w + 1] * y + W[w + 2] * z + W[w + 3]; _c[1] = W[w + 4] * x + W[w + 5] * y + W[w + 6] * z + W[w + 7]; _c[2] = W[w + 8] * x + W[w + 9] * y + W[w + 10] * z + W[w + 11];
      rootPoint(root, _c[0], _c[1], _c[2], _o);
      if (_o[1] < minY) minY = _o[1];
    }
  }
  return minY;
}

/** world position of a point given in a part's pivot frame (world units) */
export function partPointWorld(desc, W, partIndex, lx, ly, lz, root, out) {
  const w = partIndex * 12;
  _c[0] = W[w] * lx + W[w + 1] * ly + W[w + 2] * lz + W[w + 3]; _c[1] = W[w + 4] * lx + W[w + 5] * ly + W[w + 6] * lz + W[w + 7]; _c[2] = W[w + 8] * lx + W[w + 9] * ly + W[w + 10] * lz + W[w + 11];
  return rootPoint(root, _c[0], _c[1], _c[2], out);
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
 * A foot is "planted" while its sole is within `plantTol` of the lowest sole height of the cycle. For each stance the world z of the
 * foot (hip travels v*t, foot z relative to the hip comes from the pose) should stay constant: slide = range of world z during the stance.
 * Returns {stride, worst, perFoot:[...], ratio} where ratio = worst slide / stride (stride = distance travelled per cycle at v).
 */
export function footSlide(model, clipId, v, speedRef, opts = {}) {
  const rig = model.meta.rig || 'hum1';
  const dur = Animator.clipDur(clipId, rig);
  const rate = v / speedRef, dtClip = 1 / 60;
  const prof = profileClip(model, clipId, { t0: 0, t1: dur - dtClip, dt: dtClip });
  const n = prof.times.length, plantTol = opts.plantTol !== undefined ? opts.plantTol : 0.035;
  const stride = v * (dur / rate);
  let worst = 0; const perFoot = [];
  for (const feet of [prof.feetL, prof.feetR]) {
    let minY = Infinity; for (const f of feet) if (f[1] < minY) minY = f[1];
    // world z of the foot over time: hip travels at v (clip time t / rate = real time)
    const zw = feet.map((f, i) => f[2] + v * (prof.times[i] / rate));
    // find stance runs (circular)
    const planted = feet.map((f) => f[1] <= minY + plantTol);
    let slide = 0, i0 = planted.findIndex((p) => !p);
    if (i0 < 0) { perFoot.push(0); continue; }
    let runMin = 0, runMax = 0, inRun = false;
    for (let k = 1; k <= n; k++) {
      const i = (i0 + k) % n;
      if (planted[i]) { const z = zw[i] + (i < i0 && k > n - i0 ? v * (dur / rate) : 0); if (!inRun) { inRun = true; runMin = runMax = z; } else { if (z < runMin) runMin = z; if (z > runMax) runMax = z; } }
      else if (inRun) { slide = Math.max(slide, runMax - runMin); inRun = false; }
    }
    if (inRun) slide = Math.max(slide, runMax - runMin);
    perFoot.push(slide); worst = Math.max(worst, slide);
  }
  return { stride, worst, perFoot, ratio: stride > 0 ? worst / stride : 0 };
}
