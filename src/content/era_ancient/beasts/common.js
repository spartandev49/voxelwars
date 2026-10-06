// BEASTS shared toolkit (pure JS, deterministic).
//
//  * LG: a "local grid": a VoxelGrid addressed in PIVOT-RELATIVE continuous coordinates (voxel units). Shapes are filled by
//    voxel CENTRES, so a pivot on a voxel boundary gives mirror-symmetric (even width) shapes and a pivot on a voxel centre
//    gives odd widths. Every beast part is modelled in its own pivot frame, exactly the frame ModelDef.addPart() uses.
//  * palettes, tiny helpers to add parts / attach points, team-tint measurement.
import { VoxelGrid, V, T, G, shade, mixRGB, F_TEAM, F_GLOW } from '../../../voxel/grid.js';
import { ModelDef } from '../../../voxel/model.js';
import { RNG } from '../../../core/rng.js';

export { V, T, G, shade, mixRGB, F_TEAM, F_GLOW, VoxelGrid, ModelDef, RNG };
export const VS = 0.1;                       // voxel size shared by every shipped model
const EPS = 1e-6;

/** value helper: a voxel value or a (x,y,z,v)=>value function */
const val = (v, x, y, z, old) => (typeof v === 'function' ? v(x, y, z, old) : v);

export class LG {
  /**
   * @param sx,sy,sz grid size in voxels   @param px,py,pz pivot in grid voxel coords (may be fractional)
   */
  constructor(sx, sy, sz, px = sx / 2, py = 0, pz = sz / 2) {
    this.g = new VoxelGrid(sx, sy, sz);
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.px = px; this.py = py; this.pz = pz;
  }
  get pivot() { return [this.px, this.py, this.pz]; }
  /** local continuous coord -> voxel index along an axis */
  ix(x) { return Math.floor(x + this.px + EPS); }
  iy(y) { return Math.floor(y + this.py + EPS); }
  iz(z) { return Math.floor(z + this.pz + EPS); }
  set(x, y, z, v) { this.g.set(this.ix(x), this.iy(y), this.iz(z), val(v, x, y, z)); return this; }
  setIfEmpty(x, y, z, v) { this.g.setIfEmpty(this.ix(x), this.iy(y), this.iz(z), val(v, x, y, z)); return this; }
  get(x, y, z) { return this.g.get(this.ix(x), this.iy(y), this.iz(z)); }
  erase(x, y, z) { this.g.set(this.ix(x), this.iy(y), this.iz(z), 0); return this; }
  /** voxel-centre coordinate of grid index */
  cx(i) { return i + 0.5 - this.px; }
  cy(j) { return j + 0.5 - this.py; }
  cz(k) { return k + 0.5 - this.pz; }

  /** Box [x0,x1) x [y0,y1) x [z0,z1) in local coords (voxels whose centre lies inside). mode: 'set' | 'empty' (only empty cells) */
  box(x0, y0, z0, x1, y1, z1, v, mode = 'set') {
    const g = this.g;
    const i0 = Math.ceil(x0 + this.px - 0.5 - EPS), i1 = Math.ceil(x1 + this.px - 0.5 - EPS) - 1;
    const j0 = Math.ceil(y0 + this.py - 0.5 - EPS), j1 = Math.ceil(y1 + this.py - 0.5 - EPS) - 1;
    const k0 = Math.ceil(z0 + this.pz - 0.5 - EPS), k1 = Math.ceil(z1 + this.pz - 0.5 - EPS) - 1;
    for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
      if (!g.inb(i, j, k)) continue;
      const idx = g.idx(i, j, k);
      if (mode === 'empty' && g.d[idx]) continue;
      g.d[idx] = val(v, i + 0.5 - this.px, j + 0.5 - this.py, k + 0.5 - this.pz, g.d[idx]) >>> 0;
    }
    return this;
  }
  carve(x0, y0, z0, x1, y1, z1) { return this.box(x0, y0, z0, x1, y1, z1, 0); }
  /** Ellipsoid by voxel centres. */
  ell(cx, cy, cz, rx, ry, rz, v, mode = 'set') {
    const g = this.g;
    const i0 = Math.floor(cx - rx + this.px - 0.5), i1 = Math.ceil(cx + rx + this.px - 0.5);
    const j0 = Math.floor(cy - ry + this.py - 0.5), j1 = Math.ceil(cy + ry + this.py - 0.5);
    const k0 = Math.floor(cz - rz + this.pz - 0.5), k1 = Math.ceil(cz + rz + this.pz - 0.5);
    for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
      if (!g.inb(i, j, k)) continue;
      const x = i + 0.5 - this.px, y = j + 0.5 - this.py, z = k + 0.5 - this.pz;
      const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
      if (dx * dx + dy * dy + dz * dz > 1.0001) continue;
      const idx = g.idx(i, j, k);
      if (mode === 'empty' && g.d[idx]) continue;
      g.d[idx] = val(v, x, y, z, g.d[idx]) >>> 0;
    }
    return this;
  }
  /** Tapered tube: chain of ellipsoids from p0 to p1; radius r0 -> r1; xs scales the x radius (flattened necks etc.) */
  tube(p0, p1, r0, r1, v, xs = 1, mode = 'set') {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
    const len = Math.hypot(dx, dy, dz), n = Math.max(2, Math.ceil(len * 2.2));
    for (let i = 0; i <= n; i++) {
      const t = i / n, r = r0 + (r1 - r0) * t;
      this._ell(p0[0] + dx * t, p0[1] + dy * t, p0[2] + dz * t, Math.max(0.5, r * xs), Math.max(0.5, r), Math.max(0.5, r), v, mode);
    }
    return this;
  }
  /** Thin line of single voxels (or thicker via t) */
  line(p0, p1, v, t = 1, mode = 'set') {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) * 2));
    for (let i = 0; i <= n; i++) {
      const f = i / n, x = p0[0] + dx * f, y = p0[1] + dy * f, z = p0[2] + dz * f;
      if (t <= 1) { if (mode === 'empty') this._setIfEmpty(x, y, z, v); else this._set(x, y, z, v); }
      else this._ell(x, y, z, t / 2, t / 2, t / 2, v, mode);
    }
    return this;
  }
  /** Cylinder around an axis ('x'|'y'|'z') through (a,b) (the two other local coords in order), from s0 to s1 along the axis. */
  cyl(axis, a, b, s0, s1, r, v, mode = 'set') {
    const rr = r * r + 0.0001;
    if (axis === 'x') { // a=y, b=z
      for (let y = Math.floor(a - r) - 1; y <= Math.ceil(a + r) + 1; y++) for (let z = Math.floor(b - r) - 1; z <= Math.ceil(b + r) + 1; z++) {
        const yy = y + 0.5, zz = z + 0.5; if ((yy - a) * (yy - a) + (zz - b) * (zz - b) > rr) continue;
        this._box(s0, yy - 0.5, zz - 0.5, s1, yy + 0.5, zz + 0.5, v, mode);
      }
    } else if (axis === 'y') { // a=x, b=z
      for (let x = Math.floor(a - r) - 1; x <= Math.ceil(a + r) + 1; x++) for (let z = Math.floor(b - r) - 1; z <= Math.ceil(b + r) + 1; z++) {
        const xx = x + 0.5, zz = z + 0.5; if ((xx - a) * (xx - a) + (zz - b) * (zz - b) > rr) continue;
        this._box(xx - 0.5, s0, zz - 0.5, xx + 0.5, s1, zz + 0.5, v, mode);
      }
    } else { // z: a=x, b=y
      for (let x = Math.floor(a - r) - 1; x <= Math.ceil(a + r) + 1; x++) for (let y = Math.floor(b - r) - 1; y <= Math.ceil(b + r) + 1; y++) {
        const xx = x + 0.5, yy = y + 0.5; if ((xx - a) * (xx - a) + (yy - b) * (yy - b) > rr) continue;
        this._box(xx - 0.5, yy - 0.5, s0, xx + 0.5, yy + 0.5, s1, v, mode);
      }
    }
    return this;
  }
  /** Visit every solid voxel with local centre coords; fn returns a new value (or undefined to keep). */
  paint(fn) {
    const g = this.g;
    for (let j = 0; j < g.sy; j++) for (let k = 0; k < g.sz; k++) for (let i = 0; i < g.sx; i++) {
      const idx = g.idx(i, j, k), o = g.d[idx]; if (!o) continue;
      const r = fn(i + 0.5 - this.px, j + 0.5 - this.py, k + 0.5 - this.pz, o, i, j, k);
      if (r !== undefined) g.d[idx] = r >>> 0;
    }
    return this;
  }
  /** Mirror +x half onto -x (the grid must be centred: pivot on the centre line). */
  mirror() { this.g.mirrorX(); return this; }
  /** true if the voxel at index (i,j,k) is solid */
  solidIdx(i, j, k) { return this.g.inb(i, j, k) && this.g.d[this.g.idx(i, j, k)] !== 0; }
  count() { return this.g.count(); }
  bounds() { return this.g.bounds(); }
}
LG.prototype._box = LG.prototype.box; LG.prototype._ell = LG.prototype.ell; LG.prototype._set = LG.prototype.set; LG.prototype._setIfEmpty = LG.prototype.setIfEmpty;

/**
 * LG whose modelling coordinates (box/ell/tube/line/cyl/set and the grid size + pivot) are multiplied by `k`: write a machine once at
 * "design size" and build it bigger (siege engines must tower over their hum_lite crews). Value functions get the real voxel coordinates.
 */
export class SLG extends LG {
  constructor(k, sx, sy, sz, px, py, pz) { super(Math.ceil(sx * k), Math.ceil(sy * k), Math.ceil(sz * k), px * k, py * k, pz * k); this.k = k; }
  set(x, y, z, v) { const k = this.k; return super.set(x * k, y * k, z * k, v); }
  setIfEmpty(x, y, z, v) { const k = this.k; return super.setIfEmpty(x * k, y * k, z * k, v); }
  box(x0, y0, z0, x1, y1, z1, v, mode) { const k = this.k; return super.box(x0 * k, y0 * k, z0 * k, x1 * k, y1 * k, z1 * k, v, mode); }
  ell(cx, cy, cz, rx, ry, rz, v, mode) { const k = this.k; return super.ell(cx * k, cy * k, cz * k, rx * k, ry * k, rz * k, v, mode); }
  tube(p0, p1, r0, r1, v, xs, mode) { const k = this.k; return super.tube(p0.map((n) => n * k), p1.map((n) => n * k), r0 * k, r1 * k, v, xs, mode); }
  line(p0, p1, v, t = 1, mode) { const k = this.k; return super.line(p0.map((n) => n * k), p1.map((n) => n * k), v, t <= 1 ? 1 : t * k, mode); }
  cyl(axis, a, b, s0, s1, r, v, mode) { const k = this.k; return super.cyl(axis, a * k, b * k, s0 * k, s1 * k, r * k, v, mode); }
}

/**
 * Shell: a new LG in the SAME frame as `base` holding every empty voxel within `thick` (Manhattan) voxels of a solid voxel of `base`
 * that passes `where(x,y,z,d)` (d = distance to the base, 1..thick). Used for saddle cloths and barding that wrap the body.
 */
export function shellOf(base, where, thick, colorFn) {
  const out = new LG(base.sx + 2 * thick + 2, base.sy + 2 * thick + 2, base.sz + 2 * thick + 2, base.px + thick + 1, base.py + thick + 1, base.pz + thick + 1);
  const g = base.g, o = thick + 1;
  const near = new Uint8Array(out.g.d.length).fill(255);
  for (let j = 0; j < g.sy; j++) for (let k = 0; k < g.sz; k++) for (let i = 0; i < g.sx; i++) {
    if (!g.d[g.idx(i, j, k)]) continue;
    for (let dj = -thick; dj <= thick; dj++) for (let dk = -thick; dk <= thick; dk++) for (let di = -thick; di <= thick; di++) {
      const md = Math.abs(di) + Math.abs(dj) + Math.abs(dk);
      if (md > thick || md === 0) continue;
      const a = i + di + o, b = j + dj + o, c = k + dk + o;
      if (!out.g.inb(a, b, c)) continue;
      if (g.get(i + di, j + dj, k + dk)) continue;
      const ix = out.g.idx(a, b, c);
      if (md < near[ix]) near[ix] = md;
    }
  }
  for (let j = 0; j < out.sy; j++) for (let k = 0; k < out.sz; k++) for (let i = 0; i < out.sx; i++) {
    const idx = out.g.idx(i, j, k); if (near[idx] === 255) continue;
    const x = out.cx(i), y = out.cy(j), z = out.cz(k);
    if (!where(x, y, z, near[idx])) continue;
    out.g.d[idx] = colorFn(x, y, z, near[idx]) >>> 0;
  }
  return out;
}
/** Copy every solid voxel of `src` into `dst` where dst is empty (both must share the same grid size and pivot). */
export function mergeSame(dst, src) {
  const a = dst.g.d, b = src.g.d;
  if (a.length !== b.length) throw new Error('mergeSame: frame mismatch');
  for (let i = 0; i < a.length; i++) if (b[i] && !a[i]) a[i] = b[i];
  return dst;
}

/** Add a part from an LG (pivot taken from the LG). */
export function addLG(model, id, lg, o = {}) {
  if (lg.count() === 0) return null;
  return model.addPart(id, lg.g, { parent: o.parent ?? null, origin: o.origin || [0, 0, 0], pivot: lg.pivot, rest: o.rest, shadow: o.shadow });
}
/** Register an attach point given in the part's LOCAL (pivot-relative) voxel coordinates. */
export function attachLG(model, name, partId, lg, [x, y, z]) {
  model.addAttach(name, partId, [x + lg.px, y + lg.py, z + lg.pz]);
}
/** World-unit offset of an attach point relative to its part's pivot (same as the spec's model.attachLocal). */
export function attachLocal(model, name) {
  const a = model.attach[name], p = model.byId[a.part];
  return [(a.at[0] - p.pivot[0]) * model.voxelSize, (a.at[1] - p.pivot[1]) * model.voxelSize, (a.at[2] - p.pivot[2]) * model.voxelSize];
}
/** Part chain -> model-space (root-relative) position of a local point of a part at rest pose (rest rotations included). */
export function partPointAtRest(model, partId, local /* world units rel. to part pivot */) {
  // build chain root..part
  const chain = []; let p = model.byId[partId];
  while (p) { chain.push(p); p = p.parent ? model.byId[p.parent] : null; }
  chain.reverse();
  let M = ident();
  for (const q of chain) {
    const R = rotXYZ(q.rest[0], q.rest[1], q.rest[2]);
    const t = q.origin;
    M = mul(M, [R[0], R[1], R[2], t[0], R[3], R[4], R[5], t[1], R[6], R[7], R[8], t[2]]);
  }
  return [M[0] * local[0] + M[1] * local[1] + M[2] * local[2] + M[3], M[4] * local[0] + M[5] * local[1] + M[6] * local[2] + M[7], M[8] * local[0] + M[9] * local[1] + M[10] * local[2] + M[11]];
}
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
function mul(a, b) { // 3x4 affine product a*b
  return [
    a[0] * b[0] + a[1] * b[4] + a[2] * b[8], a[0] * b[1] + a[1] * b[5] + a[2] * b[9], a[0] * b[2] + a[1] * b[6] + a[2] * b[10], a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3],
    a[4] * b[0] + a[5] * b[4] + a[6] * b[8], a[4] * b[1] + a[5] * b[5] + a[6] * b[9], a[4] * b[2] + a[5] * b[6] + a[6] * b[10], a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7],
    a[8] * b[0] + a[9] * b[4] + a[10] * b[8], a[8] * b[1] + a[9] * b[5] + a[10] * b[9], a[8] * b[2] + a[9] * b[6] + a[10] * b[10], a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11],
  ];
}
/** Same euler order as VoxSkin: Ry * Rx * Rz */
export function rotXYZ(rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx, cx * sz, cx * cz, -sx, -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx];
}

// ---------------------------------------------------------------- palettes
export const C = {
  // coats
  white: { main: 0xf0ede4, light: 0xfffdf6, dark: 0xd2cdbf, leg: 0xe4e0d4, mane: 0xdcd6c6, hoof: 0x5a4a3a, nose: 0xe8b6a8 },
  chestnut: { main: 0xa85a2a, light: 0xc27a42, dark: 0x8a4620, leg: 0x934c24, mane: 0x4a2412, hoof: 0x2e2218, nose: 0x6a3a22 },
  black: { main: 0x2c2c33, light: 0x42424c, dark: 0x1a1a20, leg: 0x202026, mane: 0x0c0c10, hoof: 0x121216, nose: 0x3a3438 },
  bay: { main: 0x8a5230, light: 0xa2693f, dark: 0x6e3e22, leg: 0x2a2018, mane: 0x1c1410, hoof: 0x1c1610, nose: 0x3a2a22 },
  dun: { main: 0xc9a46a, light: 0xdcbf8a, dark: 0xa8854e, leg: 0x6a5238, mane: 0x3e3022, hoof: 0x3a2e22, nose: 0x7a5e44 },
  grey: { main: 0x9a9fa6, light: 0xb8bcc2, dark: 0x7a7f88, leg: 0x6a6f78, mane: 0x4a4e56, hoof: 0x2a2a30, nose: 0x6a6a72 },
  palomino: { main: 0xd9a95a, light: 0xeacb8a, dark: 0xb88a42, leg: 0xcf9f52, mane: 0xf1ead8, hoof: 0x6a5238, nose: 0xb88a6a },
  camel: { main: 0xc9a066, light: 0xdcbb88, dark: 0xa57e48, leg: 0xb48c54, mane: 0x8a6232, hoof: 0x6a5238, nose: 0x8a6a48 },
  hound: { main: 0x8a6e52, light: 0xa88a68, dark: 0x5e4630, leg: 0x7a5e44, mane: 0x3a2c20, hoof: 0x2a2018, nose: 0x1c1410 },
  goat: { main: 0x9a9ba0, light: 0xc9cacd, dark: 0x6a6c74, leg: 0x4a4c54, mane: 0xe8e6de, hoof: 0x22201e, nose: 0x3a3a40 },
  elephant: { main: 0x8c8f98, light: 0xa5a8b0, dark: 0x6a6d78, leg: 0x7e818b, mane: 0x555864, hoof: 0xe3dcc8, nose: 0x7a7c88 },
  // misc materials
  wood: 0x9a6a3a, woodDark: 0x6e4a28, woodLight: 0xb88650, plank: 0xa8743e, plankDark: 0x7a5028,
  iron: 0x7d838c, ironDark: 0x4e535c, steel: 0xb4bcc6, bronze: 0xc08a3a, gold: 0xe8c040, goldDark: 0xb08a20,
  leather: 0x6a4428, leatherDark: 0x452a18, rope: 0xcdb27a, ropeDark: 0xa68e58, linen: 0xe8e0c8, skin: 0xe0ac84, ivory: 0xf1ead2,
  black_: 0x16161a, eye: 0x141418, white_: 0xffffff, red: 0xb03a30, tongue: 0xe0707a,
};

export const resolveCoat = (c) => {
  if (!c) return C.chestnut;
  if (typeof c === 'string') return C[c] && C[c].main !== undefined ? C[c] : C.chestnut;
  if (typeof c === 'number') return { main: c, light: shade(c, 1.2), dark: shade(c, 0.78), leg: shade(c, 0.86), mane: shade(c, 0.5), hoof: 0x2a2018, nose: shade(c, 0.6) };
  return Object.assign({}, C.chestnut, c);
};

// ---------------------------------------------------------------- measurement helpers (used by tests, tools and the sheet)
/** Axis-aligned world bounds of the model at rest (units), including rest rotations; uses all 8 corners of each part bounding box. */
export function modelBounds(model) {
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  const S = model.voxelSize;
  for (const part of model.parts) {
    const b = part.grid.bounds(); if (!b) continue;
    const chain = []; let q = part;
    while (q) { chain.push(q); q = q.parent ? model.byId[q.parent] : null; }
    chain.reverse();
    let M = ident();
    for (const c of chain) {
      const R = rotXYZ(c.rest[0], c.rest[1], c.rest[2]);
      M = mul(M, [R[0], R[1], R[2], c.origin[0], R[3], R[4], R[5], c.origin[1], R[6], R[7], R[8], c.origin[2]]);
    }
    for (let a = 0; a < 8; a++) {
      const lx = ((a & 1 ? b.x1 + 1 : b.x0) - part.pivot[0]) * S, ly = ((a & 2 ? b.y1 + 1 : b.y0) - part.pivot[1]) * S, lz = ((a & 4 ? b.z1 + 1 : b.z0) - part.pivot[2]) * S;
      const x = M[0] * lx + M[1] * ly + M[2] * lz + M[3], y = M[4] * lx + M[5] * ly + M[6] * lz + M[7], z = M[8] * lx + M[9] * ly + M[10] * lz + M[11];
      if (x < min[0]) min[0] = x; if (y < min[1]) min[1] = y; if (z < min[2]) min[2] = z;
      if (x > max[0]) max[0] = x; if (y > max[1]) max[1] = y; if (z > max[2]) max[2] = z;
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

/**
 * Flatten the model at rest into a world-space voxel point cloud (voxel size S, rest rotations applied) -> Map of occupied cells.
 * Rotated parts are resampled at voxel centres (cell = round(pos / S)). Returns {cells: Map<key, {v,part}>, S}
 */
export function rasterizeRest(model) {
  const S = model.voxelSize;
  const cells = new Map();
  const mats = new Array(model.parts.length);
  for (const part of model.parts) {
    const parentM = part.parent ? mats[model.byId[part.parent].index] : ident();
    const R = rotXYZ(part.rest[0], part.rest[1], part.rest[2]);
    mats[part.index] = mul(parentM, [R[0], R[1], R[2], part.origin[0], R[3], R[4], R[5], part.origin[1], R[6], R[7], R[8], part.origin[2]]);
  }
  for (const part of model.parts) {
    const M = mats[part.index], g = part.grid;
    for (let j = 0; j < g.sy; j++) for (let k = 0; k < g.sz; k++) for (let i = 0; i < g.sx; i++) {
      const v = g.d[g.idx(i, j, k)]; if (!v) continue;
      const lx = (i + 0.5 - part.pivot[0]) * S, ly = (j + 0.5 - part.pivot[1]) * S, lz = (k + 0.5 - part.pivot[2]) * S;
      const x = M[0] * lx + M[1] * ly + M[2] * lz + M[3], y = M[4] * lx + M[5] * ly + M[6] * lz + M[7], z = M[8] * lx + M[9] * ly + M[10] * lz + M[11];
      const a = Math.floor(x / S), b = Math.floor(y / S), c = Math.floor(z / S);
      cells.set(a + ',' + b + ',' + c, { v, part: part.id, a, b, c });
    }
  }
  return { cells, S };
}

/**
 * Team-tint share of the VISIBLE surface: for each of 3 projections (front/back along z, side along x, top along y) take the first
 * solid voxel along every ray; share = tinted / hit. Returns {front, side, top, mean, min}.
 */
export function teamShare(model) {
  const { cells } = rasterizeRest(model);
  const proj = (axis, dir) => {
    const best = new Map();
    for (const c of cells.values()) {
      let u, w, d;
      if (axis === 'z') { u = c.a; w = c.b; d = c.c; } else if (axis === 'x') { u = c.c; w = c.b; d = c.a; } else { u = c.a; w = c.c; d = c.b; }
      const key = u + ',' + w, cur = best.get(key);
      if (!cur || (dir > 0 ? d > cur.d : d < cur.d)) best.set(key, { d, v: c.v });
    }
    let hit = 0, team = 0;
    for (const e of best.values()) { hit++; if (((e.v >>> 24) & F_TEAM) !== 0) team++; }
    return hit ? team / hit : 0;
  };
  const front = proj('z', 1), back = proj('z', -1), left = proj('x', 1), right = proj('x', -1), top = proj('y', 1);
  const side = (left + right) / 2, fb = (front + back) / 2;
  return { front: fb, side, top, mean: (fb + side + top) / 3, min: Math.min(fb, side, top) };
}

/** Voxel count, part count, and tinted voxel count */
export function modelStats(model) {
  let voxels = 0, team = 0, glow = 0;
  for (const p of model.parts) {
    const d = p.grid.d;
    for (let i = 0; i < d.length; i++) { const v = d[i]; if (!v) continue; voxels++; const f = v >>> 24; if (f & F_TEAM) team++; if (f & F_GLOW) glow++; }
  }
  return { parts: model.parts.length, voxels, team, glow };
}

/** Make a ModelDef with the BEASTS meta conventions. */
export function newModel(id, meta = {}) {
  const m = new ModelDef(id, VS);
  m.meta = Object.assign({ author: 'beasts' }, meta);
  return m;
}

// ---------------------------------------------------------------- wheels
/**
 * Spoked wheel with its axle along X, pivot at the hub centre (rotate about X to roll). radius/thickness in voxels.
 * o: {spokes=6, rim, spoke, hub, tire, rimW}
 */
export function wheelLG(radius, thickness, o = {}) {
  const n = 2 * Math.ceil(radius) + 2, spokes = o.spokes || 6;
  const lg = new LG(thickness, n, n, thickness / 2, n / 2, n / 2);
  const rim = o.rim ?? V(C.wood), spoke = o.spoke ?? V(C.woodLight), hub = o.hub ?? V(C.woodDark), tire = o.tire ?? null, rimW = o.rimW ?? 1.8;
  const half = thickness / 2;
  for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
    const y = lg.cy(j), z = lg.cz(k), d = Math.hypot(y, z);
    if (d > radius) continue;
    let v = 0;
    if (d >= radius - rimW) v = rim;
    else if (d < Math.max(1.6, radius * 0.22)) v = hub;
    else {
      for (let s = 0; s < spokes / 2; s++) { const a = (s * Math.PI * 2) / spokes; if (Math.abs(y * Math.cos(a) - z * Math.sin(a)) < 0.72) { v = spoke; break; } }
    }
    if (!v) continue;
    for (let i = 0; i < thickness; i++) {
      let vv = v;
      if (tire && d >= radius - 0.9) vv = tire;
      if (v === hub && (i === 0 || i === thickness - 1)) vv = o.hubCap ?? hub;
      // thin spokes sit in the middle of the wheel thickness
      if (v === spoke && thickness > 2 && (i === 0 || i === thickness - 1) && !(o.fullSpokes)) continue;
      lg.g.set(i, j, k, vv);
    }
  }
  return lg;
}

/** Final touch for a single-rig model: meta.subrigs (one record covering every part) and an empty clipMap unless already set. */
export function finishModel(m) {
  m.meta.subrigs = [{ prefix: '', rig: m.meta.rig, parts: m.parts.map((p) => p.id), kind: m.meta.kind || '' }];
  if (!m.meta.clipMap) m.meta.clipMap = {};
  return m;
}
