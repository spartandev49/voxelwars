// Terrain chunk mesher (pure typed arrays; no THREE) so it can be unit-tested in Node.
// The terrain is a heightfield of 0.5-unit cubes: one top quad per column plus stacked side faces down to the
// lower neighbour (or to y=0 at the arena border, which gives the floating-diorama look). Side faces are merged
// into strata bands (turf lip / subsoil / bedrock) so a 60-step cliff is 3-4 quads, not 60.

import { CELL, HSTEP, MATERIALS } from '../world/arena.js';

const AO = [0.58, 0.72, 0.86, 1.0];
const SHADE = { px: 0.9, nx: 0.84, pz: 0.96, nz: 0.8 };

function hash2(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
import { srgbToLinear } from '../voxel/mesher.js';
function rgb(c, f = 1) { return [srgbToLinear(((c >> 16) & 255) / 255) * f, srgbToLinear(((c >> 8) & 255) / 255) * f, srgbToLinear((c & 255) / 255) * f]; }

class Buf {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.v = 0; }
  quad(a, b, c, d, nx, ny, nz, c0, c1, c2, c3, flip) {
    for (const [p, col] of [[a, c0], [b, c1], [c, c2], [d, c3]]) { this.p.push(p[0], p[1], p[2]); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); }
    const v = this.v;
    if (flip) this.i.push(v + 1, v + 2, v + 3, v + 1, v + 3, v);
    else this.i.push(v, v + 1, v + 2, v, v + 2, v + 3);
    this.v += 4;
  }
}

/**
 * Mesh the chunk covering cells [x0, x0+n) x [z0, z0+n).
 * @returns {{positions:Float32Array, normals:Float32Array, colors:Float32Array, indices:Uint32Array, quadCount:number}}
 */
export function meshTerrainChunk(arena, x0, z0, n = 16) {
  const B = new Buf();
  const S = arena.size, half = arena.half();
  const hAt = (x, z) => (x < 0 || z < 0 || x >= S || z >= S) ? 0 : arena.h[x + z * S];
  const x1 = Math.min(S, x0 + n), z1 = Math.min(S, z0 + n);
  for (let cz = z0; cz < z1; cz++) for (let cx = x0; cx < x1; cx++) {
    const h = arena.h[cx + cz * S];
    const mat = MATERIALS[arena.m[cx + cz * S]] || MATERIALS[0];
    const variant = (hash2(cx, cz) * 3) | 0;
    const jit = 0.95 + hash2(cx + 91, cz - 17) * 0.1;
    const top = rgb(mat.top[variant], jit);
    const wx = cx * CELL - half, wz = cz * CELL - half, y = h * HSTEP;
    const glow = mat.hazard === 'lava' ? 1.25 : 1.0;
    // ---- top face: per-corner AO from higher neighbours ----
    const cornerAO = (dx, dz) => {
      const a = hAt(cx + dx, cz) > h ? 1 : 0, b = hAt(cx, cz + dz) > h ? 1 : 0, c = hAt(cx + dx, cz + dz) > h ? 1 : 0;
      return (a && b) ? 0 : 3 - (a + b + c);
    };
    const ao00 = cornerAO(-1, -1), ao10 = cornerAO(1, -1), ao11 = cornerAO(1, 1), ao01 = cornerAO(-1, 1);
    const col = (ao) => { const f = AO[ao] * glow; return [Math.min(1, top[0] * f), Math.min(1, top[1] * f), Math.min(1, top[2] * f)]; };
    // vertices CCW seen from above (+y): (x,z) (x,z+1) (x+1,z+1) (x+1,z)
    B.quad([wx, y, wz], [wx, y, wz + CELL], [wx + CELL, y, wz + CELL], [wx + CELL, y, wz], 0, 1, 0, col(ao00), col(ao01), col(ao11), col(ao10), ao00 + ao11 < ao01 + ao10);
    // ---- side faces ----
    const sides = [
      { dx: 1, dz: 0, nx: 1, nz: 0, sh: SHADE.px },
      { dx: -1, dz: 0, nx: -1, nz: 0, sh: SHADE.nx },
      { dx: 0, dz: 1, nx: 0, nz: 1, sh: SHADE.pz },
      { dx: 0, dz: -1, nx: 0, nz: -1, sh: SHADE.nz },
    ];
    for (const s of sides) {
      const hn = hAt(cx + s.dx, cz + s.dz);
      if (hn >= h) continue;
      // bands from top (h) down to hn. band boundaries: lip = 1 step, subsoil = next 3 steps, then bedrock bands of 4 steps alternating tone
      let yTopStep = h;
      const bands = [];
      let remaining = h - hn;
      const lip = Math.min(remaining, 1); bands.push([lip, mat.top[variant], 0.9]); remaining -= lip;
      const sub = Math.min(remaining, 3); if (sub > 0) bands.push([sub, mat.strata[0], 1]); remaining -= sub;
      let k = 0;
      while (remaining > 0) { const m = Math.min(remaining, 4); bands.push([m, mat.strata[1], k % 2 ? 0.92 : 1.0]); remaining -= m; k++; }
      for (const [steps, c, bf] of bands) {
        const yt = yTopStep * HSTEP, yb = (yTopStep - steps) * HSTEP;
        const cc = rgb(c, s.sh * bf * (0.97 + hash2(cx * 7 + s.dx * 3, cz * 5 + s.dz * 3) * 0.06) * (mat.hazard === 'lava' ? 1.15 : 1));
        const cb = [cc[0] * 0.82, cc[1] * 0.82, cc[2] * 0.82];
        let a, b, c2, d;
        if (s.nx === 1) { a = [wx + CELL, yb, wz]; b = [wx + CELL, yt, wz]; c2 = [wx + CELL, yt, wz + CELL]; d = [wx + CELL, yb, wz + CELL]; }
        else if (s.nx === -1) { a = [wx, yb, wz + CELL]; b = [wx, yt, wz + CELL]; c2 = [wx, yt, wz]; d = [wx, yb, wz]; }
        else if (s.nz === 1) { a = [wx + CELL, yb, wz + CELL]; b = [wx + CELL, yt, wz + CELL]; c2 = [wx, yt, wz + CELL]; d = [wx, yb, wz + CELL]; }
        else { a = [wx, yb, wz]; b = [wx, yt, wz]; c2 = [wx + CELL, yt, wz]; d = [wx + CELL, yb, wz]; }
        B.quad(a, b, c2, d, s.nx, 0, s.nz, cb, cc, cc, cb, false);
        yTopStep -= steps;
      }
    }
  }
  return {
    positions: new Float32Array(B.p), normals: new Float32Array(B.n), colors: new Float32Array(B.c),
    indices: new Uint32Array(B.i), quadCount: B.v / 4,
  };
}
