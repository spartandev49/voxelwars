// Ray picking for the Voxel Painter's 3D view: pure maths on a voxel grid whose cells are 1 unit cubes spanning [0,sx] x [0,sy] x [0,sz].
// rayVoxels (Amanatides-Woo DDA) finds the first solid voxel and the face it was entered through; rayWalls finds the three "back walls" of the
// grid box (the ones behind the model as seen from the camera) so the first voxel of an empty part can be placed on a wall.

function slab(ro, rd, lo, hi) {
  let t0 = -Infinity, t1 = Infinity, axis = -1;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(rd[a]) < 1e-12) { if (ro[a] < lo[a] || ro[a] > hi[a]) return null; continue; }
    let ta = (lo[a] - ro[a]) / rd[a], tb = (hi[a] - ro[a]) / rd[a];
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    if (ta > t0) { t0 = ta; axis = a; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;
  }
  return { t0, t1, axis };
}

/** First solid voxel along the ray: {cell:[x,y,z], normal:[nx,ny,nz], t} or null. ro/rd are in grid units (rd need not be normalised). */
export function rayVoxels(grid, ro, rd) {
  const { sx, sy, sz, d } = grid;
  const hit = slab(ro, rd, [0, 0, 0], [sx, sy, sz]);
  if (!hit || hit.t1 < 0) return null;
  const t0 = Math.max(hit.t0, 0);
  const p = [ro[0] + rd[0] * (t0 + 1e-6), ro[1] + rd[1] * (t0 + 1e-6), ro[2] + rd[2] * (t0 + 1e-6)];
  const size = [sx, sy, sz];
  const cell = [Math.min(sx - 1, Math.max(0, Math.floor(p[0]))), Math.min(sy - 1, Math.max(0, Math.floor(p[1]))), Math.min(sz - 1, Math.max(0, Math.floor(p[2])))];
  const step = [0, 0, 0], tMax = [Infinity, Infinity, Infinity], tDelta = [Infinity, Infinity, Infinity];
  for (let a = 0; a < 3; a++) {
    if (rd[a] > 0) { step[a] = 1; tDelta[a] = 1 / rd[a]; tMax[a] = t0 + (cell[a] + 1 - (ro[a] + rd[a] * t0)) / rd[a]; }
    else if (rd[a] < 0) { step[a] = -1; tDelta[a] = -1 / rd[a]; tMax[a] = t0 + (cell[a] - (ro[a] + rd[a] * t0)) / rd[a]; }
  }
  let axis = hit.axis >= 0 && t0 === hit.t0 ? hit.axis : -1, t = t0;
  for (let n = 0; n < sx + sy + sz + 3; n++) {
    if (d[cell[0] + sx * (cell[2] + sz * cell[1])]) {
      const normal = [0, 0, 0]; if (axis >= 0) normal[axis] = -step[axis];
      return { cell: cell.slice(), normal, t };
    }
    axis = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
    t = tMax[axis]; cell[axis] += step[axis]; tMax[axis] += tDelta[axis];
    if (cell[axis] < 0 || cell[axis] >= size[axis]) return null;
  }
  return null;
}

/** The nearest of the three back walls of the grid box (relative to `cam`): {cell, normal, t} where cell is the grid cell touching the wall. */
export function rayWalls(sx, sy, sz, ro, rd, cam) {
  const size = [sx, sy, sz]; let best = null;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(rd[a]) < 1e-12) continue;
    const far = cam[a] > size[a] / 2 ? 0 : size[a];            // the wall on the side away from the camera
    const t = (far - ro[a]) / rd[a]; if (!(t > 0)) continue;
    const q = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
    let ok = true; for (let b = 0; b < 3; b++) if (b !== a && (q[b] < 0 || q[b] > size[b])) ok = false;
    if (!ok) continue;
    if (!best || t < best.t) {
      const cell = [Math.min(sx - 1, Math.max(0, Math.floor(q[0]))), Math.min(sy - 1, Math.max(0, Math.floor(q[1]))), Math.min(sz - 1, Math.max(0, Math.floor(q[2])))];
      cell[a] = far === 0 ? 0 : size[a] - 1;
      const normal = [0, 0, 0]; normal[a] = far === 0 ? 1 : -1;
      best = { cell, normal, t, axis: a };
    }
  }
  return best;
}

/**
 * What the pointer is over: {kind:'voxel'|'wall'|null, cell, normal, t, add}. `add` is the cell a pencil click would fill (the empty cell in front of the
 * face for a voxel, the cell touching the wall for a wall) or null when that cell is outside the grid.
 */
export function pickCell(grid, ro, rd, cam) {
  const v = rayVoxels(grid, ro, rd);
  const inb = (c) => c[0] >= 0 && c[1] >= 0 && c[2] >= 0 && c[0] < grid.sx && c[1] < grid.sy && c[2] < grid.sz;
  if (v) { const add = [v.cell[0] + v.normal[0], v.cell[1] + v.normal[1], v.cell[2] + v.normal[2]]; return { kind: 'voxel', cell: v.cell, normal: v.normal, t: v.t, add: inb(add) ? add : null }; }
  const w = rayWalls(grid.sx, grid.sy, grid.sz, ro, rd, cam || ro);
  if (w) return { kind: 'wall', cell: w.cell, normal: w.normal, t: w.t, add: w.cell.slice() };
  return { kind: null, cell: null, normal: null, t: 0, add: null };
}
