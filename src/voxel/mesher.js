// Face-culling voxel mesher with per-vertex ambient occlusion, per-voxel colour jitter,
// and a per-vertex "flag" channel (0 normal, 1 team tint, 2 emissive).
// Pure typed-array output so it runs in Node (tests) and the browser.

import { F_TEAM, F_GLOW } from './grid.js';

// face table: normal n, tangents t1,t2 with t1 x t2 = n (CCW seen from outside)
const FACES = [
  { n: [1, 0, 0], t1: [0, 1, 0], t2: [0, 0, 1], shade: 0.86 },
  { n: [-1, 0, 0], t1: [0, 0, 1], t2: [0, 1, 0], shade: 0.86 },
  { n: [0, 1, 0], t1: [0, 0, 1], t2: [1, 0, 0], shade: 1.0 },
  { n: [0, -1, 0], t1: [1, 0, 0], t2: [0, 0, 1], shade: 0.62 },
  { n: [0, 0, 1], t1: [1, 0, 0], t2: [0, 1, 0], shade: 0.93 },
  { n: [0, 0, -1], t1: [0, 1, 0], t2: [1, 0, 0], shade: 0.78 },
];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
// sRGB byte -> linear float (the renderer outputs sRGB, so vertex colours must be linear)
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
export const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * @param {import('./grid.js').VoxelGrid} grid
 * @param {{size?:number, pivot?:number[], jitter?:number, ao?:boolean, bakeShade?:boolean}} opts
 *   size   : world units per voxel
 *   pivot  : voxel-space point that becomes the local origin
 *   jitter : +/- brightness variation per voxel (0..0.2)
 *   bakeShade: multiply colours by a fixed per-face-direction shade (gives readable form even in flat light)
 * @returns {{positions:Float32Array, normals:Float32Array, colors:Float32Array, flags:Float32Array, indices:Uint32Array, vertexCount:number, quadCount:number}}
 */
export function meshGrid(grid, opts = {}) {
  const size = opts.size ?? 0.1;
  const pv = opts.pivot || [0, 0, 0];
  const jitter = opts.jitter ?? 0.05;
  const useAO = opts.ao !== false;
  const bake = opts.bakeShade !== false;
  const { sx, sy, sz, d } = grid;
  const solid = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) ? 0 : (d[x + sx * (z + sz * y)] ? 1 : 0);

  // first pass: count faces
  let nq = 0;
  for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    if (!d[x + sx * (z + sz * y)]) continue;
    for (let f = 0; f < 6; f++) { const n = FACES[f].n; if (!solid(x + n[0], y + n[1], z + n[2])) nq++; }
  }
  const positions = new Float32Array(nq * 12), normals = new Float32Array(nq * 12), colors = new Float32Array(nq * 12), flags = new Float32Array(nq * 4);
  const indices = new Uint32Array(nq * 6);
  let q = 0;
  for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    const v = d[x + sx * (z + sz * y)];
    if (!v) continue;
    const fl = (v >>> 24) & 0xff;
    const flagVal = (fl & F_GLOW) ? 2 : (fl & F_TEAM) ? 1 : 0;
    const j = 1 + (hash3(x, y, z) - 0.5) * 2 * jitter;
    const cr = LIN[(v >> 16) & 255], cg = LIN[(v >> 8) & 255], cb = LIN[v & 255];
    for (let f = 0; f < 6; f++) {
      const F = FACES[f], n = F.n;
      if (solid(x + n[0], y + n[1], z + n[2])) continue;
      const ao = [0, 0, 0, 0];
      for (let c = 0; c < 4; c++) {
        const s1 = CORNERS[c][0], s2 = CORNERS[c][1];
        const ax = x + n[0], ay = y + n[1], az = z + n[2];
        const a = solid(ax + F.t1[0] * s1, ay + F.t1[1] * s1, az + F.t1[2] * s1);
        const b = solid(ax + F.t2[0] * s2, ay + F.t2[1] * s2, az + F.t2[2] * s2);
        const cc = solid(ax + F.t1[0] * s1 + F.t2[0] * s2, ay + F.t1[1] * s1 + F.t2[1] * s2, az + F.t1[2] * s1 + F.t2[2] * s2);
        ao[c] = (a && b) ? 0 : 3 - (a + b + cc);
      }
      const base = q * 4;
      for (let c = 0; c < 4; c++) {
        const s1 = CORNERS[c][0], s2 = CORNERS[c][1];
        // corner position on the face
        let px = x + (n[0] > 0 ? 1 : 0), py = y + (n[1] > 0 ? 1 : 0), pz = z + (n[2] > 0 ? 1 : 0);
        if (s1 > 0) { px += F.t1[0]; py += F.t1[1]; pz += F.t1[2]; }
        if (s2 > 0) { px += F.t2[0]; py += F.t2[1]; pz += F.t2[2]; }
        const o = (base + c) * 3;
        positions[o] = (px - pv[0]) * size; positions[o + 1] = (py - pv[1]) * size; positions[o + 2] = (pz - pv[2]) * size;
        normals[o] = n[0]; normals[o + 1] = n[1]; normals[o + 2] = n[2];
        const m = (useAO ? AO_CURVE[ao[c]] : 1) * (bake ? F.shade : 1) * j;
        colors[o] = Math.min(1, cr * m); colors[o + 1] = Math.min(1, cg * m); colors[o + 2] = Math.min(1, cb * m);
        flags[base + c] = flagVal;
      }
      const i = q * 6;
      if (ao[0] + ao[2] > ao[1] + ao[3]) { indices[i] = base; indices[i + 1] = base + 1; indices[i + 2] = base + 2; indices[i + 3] = base; indices[i + 4] = base + 2; indices[i + 5] = base + 3; }
      else { indices[i] = base + 1; indices[i + 1] = base + 2; indices[i + 2] = base + 3; indices[i + 3] = base + 1; indices[i + 4] = base + 3; indices[i + 5] = base; }
      q++;
    }
  }
  return { positions, normals, colors, flags, indices, vertexCount: nq * 4, quadCount: nq };
}
