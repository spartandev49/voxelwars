import { generateArena } from '../src/world/gen.js';
import { meshTerrainChunk } from '../src/render/terrainMesh.js';
import assert from 'node:assert';
const a = generateArena('thermopylae', 'medium', 3);
let q = 0, t = Date.now();
for (let z = 0; z < a.size; z += 16) for (let x = 0; x < a.size; x += 16) q += meshTerrainChunk(a, x, z, 16).quadCount;
console.log('thermopylae medium total quads', q, 'ms', Date.now() - t);
// winding check on one chunk
const m = meshTerrainChunk(a, 64, 64, 16); let bad = 0;
for (let k = 0; k < m.indices.length; k += 3) {
  const [i, j, l] = [m.indices[k], m.indices[k+1], m.indices[k+2]];
  const P = s => [m.positions[s*3], m.positions[s*3+1], m.positions[s*3+2]];
  const A=P(i),B=P(j),C=P(l); const u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]], v=[C[0]-A[0],C[1]-A[1],C[2]-A[2]];
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const s=[m.normals[i*3],m.normals[i*3+1],m.normals[i*3+2]];
  if (n[0]*s[0]+n[1]*s[1]+n[2]*s[2] <= 0) bad++;
}
assert.equal(bad, 0);
console.log('terrain mesh winding OK');
