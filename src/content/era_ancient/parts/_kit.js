// Shared toolkit for the humanoid part library (pure JS). Everything here works in GRID VOXEL INDICES of the canonical hum1 grids.
//
// Canonical grids (spec.md section 4.1). Voxel indices: x 0..sx-1 (LEFT of the character is +X), y 0..sy-1 (up), z 0..sz-1 (+Z = front).
// A pivot given as 5 on a 10-wide grid sits on the boundary between voxel 4 and 5, so even-width grids are mirror symmetric about x = 4.5.
import { VoxelGrid, V, T, G, shade, mixRGB, hexToRGB, F_TEAM, F_GLOW } from '../../../voxel/grid.js';
export { VoxelGrid, V, T, G, shade, mixRGB, hexToRGB, F_TEAM, F_GLOW };

/** Canonical grid table. origin is in voxels relative to the parent pivot. rest = static rest rotation applied by the compiler (none by default). */
export const DIM = {
  body:    { size: [10, 9, 5],   pivot: [5, 0, 2.5],  origin: [0, 10, 0],    parent: null },
  head:    { size: [10, 10, 10], pivot: [5, 0, 5],    origin: [0, 9, 0],     parent: 'body' },
  crest:   { size: [10, 8, 12],  pivot: [5, 0, 6],    origin: [0, 6, 0],     parent: 'head' },
  armUL:   { size: [3, 5, 3],    pivot: [1.5, 5, 1.5], origin: [6.5, 8, 0],  parent: 'body' },
  armLL:   { size: [3, 5, 3],    pivot: [1.5, 5, 1.5], origin: [0, -5, 0],   parent: 'armUL' },
  armUR:   { size: [3, 5, 3],    pivot: [1.5, 5, 1.5], origin: [-6.5, 8, 0], parent: 'body' },
  armLR:   { size: [3, 5, 3],    pivot: [1.5, 5, 1.5], origin: [0, -5, 0],   parent: 'armUR' },
  weapon:  { size: [9, 48, 9],   pivot: [4, 10, 4],   origin: [0, -4, 0.5],  parent: 'armLR' },
  offhand: { size: [16, 16, 6],  pivot: [8, 8, 3],    origin: [0, -4, 0.5],  parent: 'armLL' },
  legUL:   { size: [4, 5, 4],    pivot: [2, 5, 2],    origin: [3, 10, 0],    parent: null },
  legLL:   { size: [4, 5, 6],    pivot: [2, 5, 2],    origin: [0, -5, 0],    parent: 'legUL' },
  legUR:   { size: [4, 5, 4],    pivot: [2, 5, 2],    origin: [-3, 10, 0],   parent: null },
  legLR:   { size: [4, 5, 6],    pivot: [2, 5, 2],    origin: [0, -5, 0],    parent: 'legUR' },
  back:    { size: [12, 14, 8],  pivot: [6, 7, 8],    origin: [0, 7, -2.5],  parent: 'body' },
  cape:    { size: [10, 14, 2],  pivot: [5, 14, 1],   origin: [0, 8, -3],    parent: 'body' },
  cape2:   { size: [10, 10, 2],  pivot: [5, 10, 1],   origin: [0, -14, 0],   parent: 'cape' },
};
/** Parent-before-child order, the canonical part order of every compiled soldier. */
export const PART_ORDER = ['body', 'head', 'crest', 'armUL', 'armLL', 'armUR', 'armLR', 'weapon', 'offhand', 'legUL', 'legLL', 'legUR', 'legLR', 'back', 'cape', 'cape2'];

export const newGrid = (partId) => { const d = DIM[partId]; return new VoxelGrid(d.size[0], d.size[1], d.size[2]); };

// ------------------------------------------------------------------------------------------------ metals
// 5-step ramps, dark -> light: [0] deepest shadow/trim line, [2] body colour, [4] specular highlight.
export const METALS = {
  bronze:    [0x5a3416, 0x8a5524, 0xb87333, 0xdca255, 0xf6d38c],
  iron:      [0x2e2e34, 0x4a4a52, 0x6a6a72, 0x8e8e96, 0xb6b6be],
  gold:      [0x7a5a0c, 0xb08a18, 0xe0b82e, 0xf6d850, 0xfff3a8],
  silver:    [0x70767e, 0x9aa0a8, 0xc4cad2, 0xe2e6ec, 0xffffff],
  steel:     [0x3e4a58, 0x61707f, 0x8798aa, 0xb0c0d0, 0xe0eaf4],
  blackiron: [0x0f0f14, 0x1c1c24, 0x2b2b35, 0x3e3e4a, 0x585866],
};
export const METAL_KEYS = Object.keys(METALS);

// ------------------------------------------------------------------------------------------------ drawing
const vf = (v, x, y, z) => (typeof v === 'function' ? v(x, y, z) : v);

/** Inclusive box (x0..x1, y0..y1, z0..z1). v = voxel value or (x,y,z)=>value (0/undefined skips). */
export function B(g, x0, y0, z0, x1, y1, z1, v) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const c = vf(v, x, y, z); if (c) g.set(x, y, z, c); }
  return g;
}
/** Inclusive box that is also mirrored about the grid's centre plane (x -> sx-1-x). Pass the box on either side. */
export function Bs(g, x0, y0, z0, x1, y1, z1, v) {
  const m = g.sx - 1;
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const c = vf(v, x, y, z); if (!c) continue; g.set(x, y, z, c); g.set(m - x, y, z, c);
  }
  return g;
}
/** Box that only fills empty cells. */
export function Be(g, x0, y0, z0, x1, y1, z1, v) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const c = vf(v, x, y, z); if (c) g.setIfEmpty(x, y, z, c); }
  return g;
}
/** Erase an inclusive box. */
export function X(g, x0, y0, z0, x1, y1, z1) {
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) g.set(x, y, z, 0);
  return g;
}
/** Erase an inclusive box and its mirror. */
export function Xs(g, x0, y0, z0, x1, y1, z1) { const m = g.sx - 1; X(g, x0, y0, z0, x1, y1, z1); X(g, m - x1, y0, z0, m - x0, y1, z1); return g; }
/** Set one voxel / its mirror. */
export const P = (g, x, y, z, v) => { g.set(x, y, z, v); return g; };
export const Ps = (g, x, y, z, v) => { g.set(x, y, z, v); g.set(g.sx - 1 - x, y, z, v); return g; };

/** Filled ellipsoid by voxel INDEX distance (cx.. may be .5). v = value or (x,y,z,d)=>value where d = normalised distance (0 centre .. 1 edge). inner > 0 leaves a hollow. */
export function E(g, cx, cy, cz, rx, ry, rz, v, inner = 0) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > 1.0001 || d < inner) continue;
    const c = typeof v === 'function' ? v(x, y, z, d) : v; if (c) g.set(x, y, z, c);
  }
  return g;
}
/** Draw a 2D pixel pattern. rows[0] is the TOP row. plane 'xy' (faces +Z, fixed z) or 'zy' (faces +X, fixed x). map: char -> voxel value | fn. '.' and ' ' skip. */
export function sprite(g, rows, a0, yTop, fixed, map, plane = 'xy') {
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const ch = rows[r][c]; if (ch === '.' || ch === ' ') continue;
    const v = map[ch]; if (v === undefined) continue;
    const y = yTop - r, a = a0 + c, val = typeof v === 'function' ? v(a, y, fixed) : v; if (!val) continue;
    if (plane === 'xy') g.set(a, y, fixed, val); else g.set(fixed, y, a, val);
  }
  return g;
}
/** Remove everything inside the canonical face cube of a head grid (x2..7, y0..5, z2..7): helms/hair never replace skin. */
export const cutFaceCube = (g) => X(g, 2, 0, 2, 7, 5, 7);

/** Vertical shade factor: lo at y0 up to hi at y1. */
export const vgrad = (y, y0, y1, lo = 0.84, hi = 1.1) => lo + (hi - lo) * Math.min(1, Math.max(0, (y - y0) / Math.max(1, y1 - y0)));
export const lighten = (rgb, t) => mixRGB(rgb, 0xffffff, t);
export const darken = (rgb, t) => mixRGB(rgb, 0x000000, t);

/** Small deterministic hash noise for fur/scale/rag detail: stable per cell, independent of builder order. */
export function hash3(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1442695041) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// ------------------------------------------------------------------------------------------------ emblems (8x8 sprites)
export const EMBLEMS = {
  lambda: ['...##...', '..####..', '..#..#..', '.##..##.', '.#....#.', '##....##', '#......#', '#......#'],
  eye:    ['........', '..####..', '.#....#.', '#..##..#', '#.####.#', '.#.##.#.', '..####..', '....#...'],
  sun:    ['#..##..#', '.#.##.#.', '..####..', '########', '########', '..####..', '.#.##.#.', '#..##..#'],
  boar:   ['..#..#..', '.######.', '########', '##.##.##', '########', '.######.', '#.#..#.#', '#......#'],
  eagle:  ['#......#', '##....##', '###..###', '########', '.######.', '..####..', '...##...', '..#..#..'],
  star:   ['...##...', '...##...', '########', '.######.', '..####..', '..#..#..', '.##..##.', '.#....#.'],
  skull:  ['.######.', '########', '#.####.#', '##.##.##', '########', '.######.', '..#..#..', '..####..'],
  wave:   ['........', '.##..##.', '#..##..#', '........', '.##..##.', '#..##..#', '........', '........'],
  bolt:   ['....###.', '...###..', '..###...', '.######.', '...###..', '..###...', '.##.....', '#.......'],
};
export const EMBLEM_IDS = ['none', ...Object.keys(EMBLEMS)];
/** Stamp an emblem (8x8) with its top-left at (x0, yTop) on the plane z = z. */
export function emblem(g, name, x0, yTop, z, v) {
  const rows = EMBLEMS[name]; if (!rows) return g;
  return sprite(g, rows, x0, yTop, z, { '#': v });
}

// ------------------------------------------------------------------------------------------------ weapon helpers (weapon grid 9x48x9, grip voxel (4,10,4))
export const W = { cx: 4, cz: 4, grip: 10, top: 47, bottom: 0 };
/** Leather-wrapped grip block that also hides the hand overlap (3x3, y a..b). */
export function gripWrap(g, ctx, a = 8, b = 11) {
  const c = ctx.c.trim;
  B(g, 3, a, 3, 5, b, 5, (x, y) => V(shade(c, y % 2 ? 0.9 : 1.05)));
  return g;
}
/** Straight 1-voxel shaft along y between ya..yb (inclusive) at the weapon axis. */
export function shaft(g, ya, yb, v, thick = 1) {
  if (thick === 1) B(g, 4, ya, 4, 4, yb, 4, v); else B(g, 3, ya, 3, 4, yb, 4, v);
  return g;
}

// ------------------------------------------------------------------------------------------------ head space
/** Draw in HEAD coordinates (x 0..9, y 0..13, z -1..10): y < 8 lands in the head grid, y >= 8 in the crest grid (y-6, z+1). */
export class HeadSpace {
  constructor(head, crest) { this.head = head; this.crest = crest; this.sx = 10; this.sy = 14; this.sz = 12; }
  set(x, y, z, v) { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (y < 8) this.head.set(x, y, z, v); else this.crest.set(x, y - 6, z + 1, v); return this; }
  setIfEmpty(x, y, z, v) { x = Math.round(x); y = Math.round(y); z = Math.round(z); if (y < 8) this.head.setIfEmpty(x, y, z, v); else this.crest.setIfEmpty(x, y - 6, z + 1, v); return this; }
  get(x, y, z) { return y < 8 ? this.head.get(x, y, z) : this.crest.get(x, y - 6, z + 1); }
}
export const headSpace = () => { const head = newGrid('head'), crest = newGrid('crest'); return { head, crest, hs: new HeadSpace(head, crest) }; };
/** helm/hair builders return this: {head, crest} with empty grids dropped by the compiler */
export const headOut = (o) => ({ head: o.head, crest: o.crest });

/** interpolate the metal ramp: f 0 (shadow) .. 1 (highlight) -> voxel value */
export function metalAt(ctx, f) {
  const m = ctx.m, p = Math.min(3.98, Math.max(0, 0.4 + f * 3.4)), i = Math.floor(p);
  return V(mixRGB(m[i], m[i + 1], p - i));
}
/** raw rgb version */
export function metalRGB(ctx, f) {
  const m = ctx.m, p = Math.min(3.98, Math.max(0, 0.4 + f * 3.4)), i = Math.floor(p);
  return mixRGB(m[i], m[i + 1], p - i);
}
/** empty placeholder entry used for every category's 'none' id */
export const NONE = { name: 'None', build: () => null, meta: { hair: 'all' } };
