// Forward kinematics for the Animator and the analysis tools (pure, no dependencies): the same part chain math as VoxSkin.add, root transform, lowest point.
// Units: WORLD units.

import { isGlow } from '../voxel/grid.js';

/** voxel bounds of a part's SOLID voxels (glow voxels - halos, flames - are light, not matter, and never touch the ground) */
function solidBounds(g) {
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1, y1 = -1, z1 = -1;
  for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) {
    const v = g.d[g.idx(x, y, z)];
    if (v && !isGlow(v)) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z; if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z; }
  }
  return x1 < 0 ? null : { x0, y0, z0, x1, y1, z1 };
}

export function mat3(rx, ry, rz, m) {
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
    const b = solidBounds(p.grid);
    if (b) box.set([(b.x0 - p.pivot[0]) * vs, (b.y0 - p.pivot[1]) * vs, (b.z0 - p.pivot[2]) * vs, (b.x1 + 1 - p.pivot[0]) * vs, (b.y1 + 1 - p.pivot[1]) * vs, (b.z1 + 1 - p.pivot[2]) * vs], i * 6);
  }
  return { P, ids, parent, origin, rest, box, vs };
}

/** forward kinematics: W (Float64Array P*12, 3x4 rows) = model-space transform of every part (root-relative), same math as VoxSkin.add */
export function fk(desc, pose, W) {
  const m = new Float64Array(9), r = new Float64Array(9), b = new Float64Array(9);
  for (let p = 0; p < desc.P; p++) {
    const q = p * 9;
    mat3(pose[q + 3], pose[q + 4], pose[q + 5], m);
    const rs = desc.rest[p];
    if (rs[0] || rs[1] || rs[2]) {
      mat3(rs[0], rs[1], rs[2], r);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) b[i * 3 + j] = m[i * 3] * r[j] + m[i * 3 + 1] * r[3 + j] + m[i * 3 + 2] * r[6 + j];
      m.set(b);
    }
    const sx = pose[q + 6], sy = pose[q + 7], sz = pose[q + 8];
    m[0] *= sx; m[3] *= sx; m[6] *= sx; m[1] *= sy; m[4] *= sy; m[7] *= sy; m[2] *= sz; m[5] *= sz; m[8] *= sz;
    const tx = desc.origin[p * 3] + pose[q], ty = desc.origin[p * 3 + 1] + pose[q + 1], tz = desc.origin[p * 3 + 2] + pose[q + 2];
    const w = p * 12, pi = desc.parent[p];
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

