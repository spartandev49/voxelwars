import { VoxelGrid, V } from '../src/voxel/grid.js';
import { meshGrid } from '../src/voxel/mesher.js';
import assert from 'node:assert';
const g = new VoxelGrid(4, 4, 4).box(1, 1, 1, 2, 2, 2, V(0xff8800));
const m = meshGrid(g, { size: 1 });
assert.equal(m.quadCount, 24, 'box 2x2x2 has 24 exposed faces');
// winding: geometric normal of every triangle must agree with the stored normal
let bad = 0;
for (let t = 0; t < m.indices.length; t += 3) {
  const [a, b, c] = [m.indices[t], m.indices[t + 1], m.indices[t + 2]];
  const P = i => [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]];
  const A = P(a), B = P(b), C = P(c);
  const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const sn = [m.normals[a * 3], m.normals[a * 3 + 1], m.normals[a * 3 + 2]];
  if (n[0] * sn[0] + n[1] * sn[1] + n[2] * sn[2] <= 0) bad++;
}
assert.equal(bad, 0, 'all triangles wind CCW relative to their normals');
// RLE roundtrip
const r = VoxelGrid.fromRLE(g.toRLE());
assert.deepEqual(Array.from(r.d), Array.from(g.d));
console.log('mesher OK', m.quadCount, 'quads');
