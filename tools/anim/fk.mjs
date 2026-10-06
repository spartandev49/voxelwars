// Forward kinematics of the voxel humanoid rig "hum1" (docs/spec.md section 3.1) driven by baked clips.
// Units: VOXELS (1 voxel = 0.1 world unit). Character faces +Z, +Y up, character LEFT = +X.
//
// Part transform:  world = parentWorld * T(origin) * R(pose)        (R = Ry(ry)*Rx(rx)*Rz(rz), rotation about the part's own pivot)
// Root transform:  rootWorld = T(rootX*L, root*L, rootZ*L) * T(hip) * Ry(rootYaw)*Rx(rootPitch)*Rz(rootRoll) * T(-hip)   with L = 10 voxels (leg length), hip = (0,10,0)
//   i.e. the root's Euler is (rx=rootPitch, ry=rootYaw(optional, 0 if absent), rz=rootRoll) in the same Y*X*Z order as every part. It rotates the
//   whole rig about the HIP pivot; rootX/root(=Y)/rootZ are translation offsets in leg-length fractions (1.0 = 10 voxels = 1 world unit).

import { Q, V, eulerToQuat } from './math.mjs';

export const LEG_VOX = 10;
export const HIP = [0, 10, 0];
export const PART_IDS = ['body', 'head', 'armUL', 'armLL', 'armUR', 'armLR', 'legUL', 'legLL', 'legUR', 'legLR'];

// origin: from parent pivot (voxels). box: [x0,y0,z0,x1,y1,z1] relative to the part's own pivot (voxels).
export const RIG = {
  body:  { parent: 'root',  origin: [0, 10, 0],     box: [-5, 0, -2.5, 5, 9, 2.5],   color: '#c9a25c' },
  head:  { parent: 'body',  origin: [0, 9, 0],      box: [-4, 0, -4, 4, 7, 4],       color: '#e6c19a' }, // real grid is 10^3 (helmets); skin-sized box drawn here
  armUL: { parent: 'body',  origin: [6.5, 8, 0],    box: [-1.5, -5, -1.5, 1.5, 0, 1.5], color: '#e6c19a' },
  armLL: { parent: 'armUL', origin: [0, -5, 0],     box: [-1.5, -5, -1.5, 1.5, 0, 1.5], color: '#e6c19a' },
  armUR: { parent: 'body',  origin: [-6.5, 8, 0],   box: [-1.5, -5, -1.5, 1.5, 0, 1.5], color: '#e6c19a' },
  armLR: { parent: 'armUR', origin: [0, -5, 0],     box: [-1.5, -5, -1.5, 1.5, 0, 1.5], color: '#e6c19a' },
  legUL: { parent: 'root',  origin: [3, 10, 0],     box: [-2, -5, -2, 2, 0, 2],       color: '#7a5b3a' },
  legLL: { parent: 'legUL', origin: [0, -5, 0],     box: [-2, -5, -2, 2, 0, 4],       color: '#7a5b3a' }, // foot extends +Z
  legUR: { parent: 'root',  origin: [-3, 10, 0],    box: [-2, -5, -2, 2, 0, 2],       color: '#7a5b3a' },
  legLR: { parent: 'legUR', origin: [0, -5, 0],     box: [-2, -5, -2, 2, 0, 4],       color: '#7a5b3a' },
};

/** Clip pose at (fractional) frame f -> { part: {t:[x,y,z] world voxel position of pivot, q: world quat} }; clip is the baked JSON clip. */
export function sampleClip(clip, f) {
  const N = clip.frames;
  let i0, i1, a;
  if (clip.loop) { f = ((f % N) + N) % N; i0 = Math.floor(f); i1 = (i0 + 1) % N; a = f - i0; }
  else { f = Math.max(0, Math.min(N - 1, f)); i0 = Math.floor(f); i1 = Math.min(N - 1, i0 + 1); a = f - i0; }
  const g = (arr, i, k) => arr[i * 3 + k];
  const lerp = (arr, i0, i1, k, a) => g(arr, i0, k) + (g(arr, i1, k) - g(arr, i0, k)) * a;
  const lerp1 = (arr) => arr ? arr[i0] + (arr[i1] - arr[i0]) * a : 0;
  const pose = {};
  for (const id of PART_IDS) {
    const arr = clip.q[id];
    pose[id] = arr ? [lerp(arr, i0, i1, 0, a), lerp(arr, i0, i1, 1, a), lerp(arr, i0, i1, 2, a)] : [0, 0, 0];
  }
  pose.root = { ty: lerp1(clip.root), pitch: lerp1(clip.rootPitch), roll: lerp1(clip.rootRoll), yaw: lerp1(clip.rootYaw), tx: lerp1(clip.rootX), tz: lerp1(clip.rootZ) };
  return pose;
}

function slerpQ(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; let bb = b;
  if (d < 0) { d = -d; bb = [-b[0], -b[1], -b[2], -b[3]]; }
  if (d > 0.9995) return Q.norm([0, 1, 2, 3].map(i => a[i] + (bb[i] - a[i]) * t));
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return [0, 1, 2, 3].map(i => a[i] * wa + bb[i] * wb);
}

/** Like sampleClip but interpolates every part (and the root rotation) as a QUATERNION (shortest-path slerp) between the two
 *  neighbouring frames instead of lerping Euler angles. Returns a pose whose entries are {q:[x,y,z,w]} (accepted by fk()). */
export function sampleClipSlerp(clip, f) {
  const N = clip.frames;
  let i0, i1, a;
  if (clip.loop) { f = ((f % N) + N) % N; i0 = Math.floor(f); i1 = (i0 + 1) % N; a = f - i0; }
  else { f = Math.max(0, Math.min(N - 1, f)); i0 = Math.floor(f); i1 = Math.min(N - 1, i0 + 1); a = f - i0; }
  const E = (arr, i) => arr ? eulerToQuat(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]) : [0, 0, 0, 1];
  const pose = {};
  for (const id of PART_IDS) pose[id] = { q: slerpQ(E(clip.q[id], i0), E(clip.q[id], i1), a) };
  const g = arr => arr ? arr[i0] + (arr[i1] - arr[i0]) * a : 0;
  const rq = i => eulerToQuat(clip.rootPitch ? clip.rootPitch[i] : 0, clip.rootYaw ? clip.rootYaw[i] : 0, clip.rootRoll ? clip.rootRoll[i] : 0);
  pose.root = { ty: g(clip.root), tx: g(clip.rootX), tz: g(clip.rootZ), q: slerpQ(rq(i0), rq(i1), a) };
  return pose;
}

/** FK from a pose (as returned by sampleClip / sampleClipSlerp, or a hand-made one). Returns {root:{q,t}, parts:{id:{t,q}}} */
export function fk(pose) {
  const r = pose.root || {};
  const L = LEG_VOX;
  // rootWorld = T(offset) * T(hip) * Ry(yaw)*Rx(pitch)*Rz(roll) * T(-hip)
  const qr = r.q || eulerToQuat(r.pitch || 0, r.yaw || 0, r.roll || 0);
  const off = [(r.tx || 0) * L, (r.ty || 0) * L, (r.tz || 0) * L];
  const tRoot = V.add(V.add(off, HIP), Q.rot(qr, V.scale(HIP, -1)));
  const W = { root: { t: tRoot, q: qr } };
  for (const id of PART_IDS) {
    const d = RIG[id], p = W[d.parent];
    const t = V.add(p.t, Q.rot(p.q, d.origin));
    const e = pose[id] || [0, 0, 0];
    W[id] = { t, q: Q.mul(p.q, e.q ? e.q : eulerToQuat(e[0], e[1], e[2])) };
  }
  return W;
}

/** world position of a point given in a part's own pivot-relative frame */
export function partPoint(W, id, local) { return V.add(W[id].t, Q.rot(W[id].q, local)); }

/** The 8 corners of a part box in world space. */
export function partCorners(W, id) {
  const [x0, y0, z0, x1, y1, z1] = RIG[id].box;
  const out = [];
  for (const z of [z0, z1]) for (const y of [y0, y1]) for (const x of [x0, x1]) out.push(partPoint(W, id, [x, y, z]));
  return out;
}

/** ankle (sole) point of a leg: bottom of the lower leg */
export function ankle(W, side) { return partPoint(W, side === 'L' ? 'legLL' : 'legLR', [0, -5, 0]); }
/** hand point: bottom of the forearm */
export function hand(W, side) { return partPoint(W, side === 'L' ? 'armLL' : 'armLR', [0, -5, 0]); }
