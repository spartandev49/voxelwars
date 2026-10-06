// Voxel level of detail: halve a grid's resolution (2x2x2 cells -> 1 voxel) for far-away units. Pure (no THREE).
// A coarse cell is solid when >= 3 of its 8 fine voxels are solid (keeps thin limbs alive without fattening the silhouette);
// its colour is the average of the solid voxels; it is team-tinted when >= 1/3 of the solids are (so the team colour stays readable at a distance),
// glowing when any glow voxel is present in a mostly-glow cell. Used by render/voxskin.js (far mesh, ~1/4 of the triangles).
import { VoxelGrid, F_TEAM, F_GLOW, F_SOLID } from './grid.js';

export function downsample2(g) {
  const sx = (g.sx + 1) >> 1, sy = (g.sy + 1) >> 1, sz = (g.sz + 1) >> 1;
  const o = new VoxelGrid(sx, sy, sz);
  for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    let n = 0, r = 0, gr = 0, b = 0, team = 0, glow = 0;
    for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
      const v = g.get(x * 2 + dx, y * 2 + dy, z * 2 + dz); if (!v) continue;
      n++; r += (v >>> 16) & 255; gr += (v >>> 8) & 255; b += v & 255;
      const f = v >>> 24; if (f & F_TEAM) team++; if (f & F_GLOW) glow++;
    }
    if (n < 3) continue;
    const flags = F_SOLID | (team * 3 >= n ? F_TEAM : 0) | (glow * 2 >= n ? F_GLOW : 0);
    o.set(x, y, z, (((flags & 0xff) << 24) | ((Math.round(r / n) & 255) << 16) | ((Math.round(gr / n) & 255) << 8) | (Math.round(b / n) & 255)) >>> 0);
  }
  return o;
}

/** pivot / size of a part for the far mesh */
export const lodPivot = (pivot) => [pivot[0] / 2, pivot[1] / 2, pivot[2] / 2];
