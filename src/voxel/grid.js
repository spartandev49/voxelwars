// VoxelGrid: dense Uint32 voxel storage + a small modelling DSL.
//
// Voxel value encoding (0 = empty):
//   bits 24..31 : flags  (bit0 = SOLID always set, bit1 = TEAM tint, bit2 = EMISSIVE)
//   bits  0..23 : 0xRRGGBB
// So a voxel is self-describing: no palette management, trivial to serialise and to paint.
//
// Coordinates: x = right, y = up, z = forward. Integer voxel cells. The DSL always takes
// (x, y, z) corner + size (w, h, d) for boxes, and centre + radius for round shapes.

export const F_SOLID = 1;
export const F_TEAM = 2;
export const F_GLOW = 4;

/** Make a voxel value from 0xRRGGBB. */
export const V = (rgb, flags = 0) => ((((F_SOLID | flags) & 0xff) << 24) | (rgb & 0xffffff)) >>> 0;
/** Team tinted voxel. The base colour is multiplied by the team colour at render time, so use light bases. */
export const T = (rgb = 0xffffff) => V(rgb, F_TEAM);
/** Emissive voxel (ignores lighting, feeds bloom). */
export const G = (rgb) => V(rgb, F_GLOW);

export const vRGB = (v) => v & 0xffffff;
export const vFlags = (v) => (v >>> 24) & 0xff;
export const isTeam = (v) => (v >>> 24 & F_TEAM) !== 0;
export const isGlow = (v) => (v >>> 24 & F_GLOW) !== 0;

/** Multiply an 0xRRGGBB colour by f (clamped). */
export function shade(rgb, f) {
  const r = Math.min(255, Math.max(0, Math.round(((rgb >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((rgb >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((rgb & 255) * f)));
  return (r << 16) | (g << 8) | b;
}
/** Linear mix of two 0xRRGGBB colours. */
export function mixRGB(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
export function hexToRGB(s) {
  if (typeof s === 'number') return s & 0xffffff;
  return parseInt(String(s).replace('#', ''), 16) & 0xffffff;
}
export function rgbToHex(n) {
  return '#' + (n & 0xffffff).toString(16).padStart(6, '0');
}
/** Re-flag an existing voxel value with a different base colour, keeping flags. */
export const recolor = (v, rgb) => ((v & 0xff000000) | (rgb & 0xffffff)) >>> 0;

export class VoxelGrid {
  constructor(sx, sy, sz) {
    this.sx = sx | 0; this.sy = sy | 0; this.sz = sz | 0;
    this.d = new Uint32Array(this.sx * this.sy * this.sz);
  }
  idx(x, y, z) { return x + this.sx * (z + this.sz * y); }
  inb(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz; }
  get(x, y, z) { return this.inb(x, y, z) ? this.d[x + this.sx * (z + this.sz * y)] : 0; }
  set(x, y, z, v) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (this.inb(x, y, z)) this.d[x + this.sx * (z + this.sz * y)] = v >>> 0;
    return this;
  }
  /** Set only if currently empty. */
  setIfEmpty(x, y, z, v) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    if (this.inb(x, y, z)) { const i = x + this.sx * (z + this.sz * y); if (!this.d[i]) this.d[i] = v >>> 0; }
    return this;
  }
  erase(x, y, z) { return this.set(x, y, z, 0); }
  clone() { const g = new VoxelGrid(this.sx, this.sy, this.sz); g.d.set(this.d); return g; }
  count() { let n = 0; for (let i = 0; i < this.d.length; i++) if (this.d[i]) n++; return n; }
  clear() { this.d.fill(0); return this; }

  // ---------- DSL ----------
  /** Solid box from corner (x,y,z) with size (w,h,d). */
  box(x, y, z, w, h, d, v) {
    for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) for (let i = 0; i < w; i++) this.set(x + i, y + j, z + k, v);
    return this;
  }
  /** Box that only fills empty cells. */
  boxIfEmpty(x, y, z, w, h, d, v) {
    for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) for (let i = 0; i < w; i++) this.setIfEmpty(x + i, y + j, z + k, v);
    return this;
  }
  /** Carve a box to empty. */
  carve(x, y, z, w, h, d) { return this.box(x, y, z, w, h, d, 0); }
  /** Only the outer shell of a box. */
  hollowBox(x, y, z, w, h, d, v) {
    for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) for (let i = 0; i < w; i++) {
      if (i === 0 || j === 0 || k === 0 || i === w - 1 || j === h - 1 || k === d - 1) this.set(x + i, y + j, z + k, v);
    }
    return this;
  }
  ellipsoid(cx, cy, cz, rx, ry, rz, v) {
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx), y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry), z0 = Math.floor(cz - rz), z1 = Math.ceil(cz + rz);
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
      if (dx * dx + dy * dy + dz * dz <= 1.0001) this.set(x, y, z, v);
    }
    return this;
  }
  sphere(cx, cy, cz, r, v) { return this.ellipsoid(cx, cy, cz, r, r, r, v); }
  /** Cylinder along an axis ('y' default). (a,b) is the centre in the two other axes, start..start+len along the axis. */
  cyl(a, b, start, len, r, v, axis = 'y') {
    const rr = r * r + 0.0001;
    for (let t = 0; t < len; t++) {
      for (let p = Math.floor(a - r); p <= Math.ceil(a + r); p++) for (let q = Math.floor(b - r); q <= Math.ceil(b + r); q++) {
        if ((p - a) * (p - a) + (q - b) * (q - b) > rr) continue;
        if (axis === 'y') this.set(p, start + t, q, v);
        else if (axis === 'x') this.set(start + t, p, q, v);
        else this.set(p, q, start + t, v);
      }
    }
    return this;
  }
  /** Thick 3D line (Bresenham-ish by sampling). thick = 1 gives single voxels. */
  line(x0, y0, z0, x1, y1, z1, v, thick = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
    const r = (thick - 1) / 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, z = z0 + (z1 - z0) * t;
      if (thick <= 1) this.set(x, y, z, v); else this.ellipsoid(x, y, z, r + 0.35, r + 0.35, r + 0.35, v);
    }
    return this;
  }
  /** Cone along y: radius r0 at y0 shrinking to r1 at y0+h. */
  cone(cx, cz, y0, h, r0, r1, v) {
    for (let t = 0; t < h; t++) {
      const r = r0 + (r1 - r0) * (t / Math.max(1, h - 1));
      this.cyl(cx, cz, y0 + t, 1, Math.max(0.3, r), v, 'y');
    }
    return this;
  }
  /** Replace every voxel matching predicate/value with another. */
  replace(from, to) {
    for (let i = 0; i < this.d.length; i++) if (this.d[i] === (from >>> 0)) this.d[i] = to >>> 0;
    return this;
  }
  /** Copy the +x half onto the -x half so the model is symmetric about the grid centre. (sx odd or even OK) */
  mirrorX() {
    for (let y = 0; y < this.sy; y++) for (let z = 0; z < this.sz; z++) for (let x = 0; x < (this.sx >> 1); x++) {
      const m = this.sx - 1 - x;
      const a = this.d[this.idx(x, y, z)], b = this.d[this.idx(m, y, z)];
      if (a && !b) this.d[this.idx(m, y, z)] = a; else if (b && !a) this.d[this.idx(x, y, z)] = b;
    }
    return this;
  }
  /** Stamp another grid into this one at an offset. skipEmpty copies only solid voxels. */
  stamp(other, ox, oy, oz, skipEmpty = true) {
    for (let y = 0; y < other.sy; y++) for (let z = 0; z < other.sz; z++) for (let x = 0; x < other.sx; x++) {
      const v = other.d[other.idx(x, y, z)];
      if (v || !skipEmpty) this.set(x + ox, y + oy, z + oz, v);
    }
    return this;
  }
  /** Rotate 90deg increments about the y axis, returning a new grid. */
  rotY(turns) {
    turns = ((turns % 4) + 4) % 4;
    if (turns === 0) return this.clone();
    const swap = turns % 2 === 1;
    const g = new VoxelGrid(swap ? this.sz : this.sx, this.sy, swap ? this.sx : this.sz);
    for (let y = 0; y < this.sy; y++) for (let z = 0; z < this.sz; z++) for (let x = 0; x < this.sx; x++) {
      const v = this.d[this.idx(x, y, z)]; if (!v) continue;
      let nx, nz;
      if (turns === 1) { nx = this.sz - 1 - z; nz = x; }
      else if (turns === 2) { nx = this.sx - 1 - x; nz = this.sz - 1 - z; }
      else { nx = z; nz = this.sx - 1 - x; }
      g.set(nx, y, nz, v);
    }
    return g;
  }
  /** Tight bounding box of solid voxels, or null. */
  bounds() {
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1, y1 = -1, z1 = -1;
    for (let y = 0; y < this.sy; y++) for (let z = 0; z < this.sz; z++) for (let x = 0; x < this.sx; x++) {
      if (this.d[this.idx(x, y, z)]) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z; if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z; }
    }
    return x1 < 0 ? null : { x0, y0, z0, x1, y1, z1 };
  }

  // ---------- serialisation (run-length, base64) for saves and share codes ----------
  toRLE() {
    const out = [];
    const d = this.d; let i = 0;
    while (i < d.length) {
      const v = d[i]; let n = 1;
      while (i + n < d.length && d[i + n] === v && n < 65535) n++;
      out.push(n, v);
      i += n;
    }
    return { sx: this.sx, sy: this.sy, sz: this.sz, rle: out };
  }
  static fromRLE(o) {
    const g = new VoxelGrid(o.sx, o.sy, o.sz);
    let p = 0;
    for (let i = 0; i < o.rle.length; i += 2) { const n = o.rle[i], v = o.rle[i + 1]; for (let k = 0; k < n && p < g.d.length; k++) g.d[p++] = v >>> 0; }
    return g;
  }
}
