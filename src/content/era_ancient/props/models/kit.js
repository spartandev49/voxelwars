// Prop-model kit: a ground-relative voxel "pen", damage helpers (cracks, chips, rubble) and the stage machinery shared by
// every prop module. Pure JS (runs in Node tests): no THREE, no Math.random (every builder draws from the RNG it is handed).
//
// Conventions for every prop model
//   * voxelSize 0.1; one part 'root'; the pivot sits at the footprint centre, y = ground (voxels below it are a foundation skirt
//     that is buried in the terrain so props never float on terraced ground).
//   * the model FRONT faces +Z (the same as a soldier); long things (walls, gates) run along X.
//   * stage 0 intact, stage 1 cracked, stage 2 collapsed rubble (a low pile). Indestructible props return the intact model for 1 and 2.

import { VoxelGrid, V, G, shade, mixRGB, recolor } from '../../../../voxel/grid.js';
import { ModelDef } from '../../../../voxel/model.js';
import { RNG, hashString } from '../../../../core/rng.js';

export { V, G, shade, mixRGB, recolor, RNG, hashString };
export const VOX = 0.1;

/** Deterministic hash noise 0..1 for a lattice point (stable textures that do not consume RNG state). */
export function h3(x, y, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647) + Math.imul(s | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** A VoxelGrid whose Y axis is relative to the ground: y = 0 is the surface, negative y is the buried foundation skirt. */
export class Pen extends VoxelGrid {
  constructor(sx, sy, sz, ground = 0) {
    super(sx, sy + ground, sz);
    this.ground = ground;       // voxels below ground level
    this.H = sy;                // voxels above ground level
    this.cx = (sx - 1) / 2; this.cz = (sz - 1) / 2;   // centre in voxel-index space (odd sizes give an integer centre)
    this.emitters = [];         // {x,y,z (pen coords, y above ground), kind:'fire'|'smoke'|'ember'}
  }
  set(x, y, z, v) { return super.set(x, Math.round(y) + this.ground, z, v); }
  setIfEmpty(x, y, z, v) { return super.setIfEmpty(x, Math.round(y) + this.ground, z, v); }
  get(x, y, z) { return super.get(Math.round(x), Math.round(y) + this.ground, Math.round(z)); }
  /** box(): a colour function (x,y,z) is also accepted for the colour argument. */
  box(x, y, z, w, h, d, v) {
    if (typeof v === 'function') return this.fill(x, y, z, w, h, d, (i, j, k, X, Y, Z) => v(X, Y, Z));
    return super.box(x, y, z, w, h, d, v);
  }
  /** Fill a box; colour comes from fn(i,j,k,x,y,z) (return 0 to skip a voxel) or a constant voxel value. */
  fill(x, y, z, w, h, d, fn) {
    const f = typeof fn === 'function' ? fn : () => fn;
    for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) for (let i = 0; i < w; i++) { const c = f(i, j, k, x + i, y + j, z + k); if (c) this.set(x + i, y + j, z + k, c); }
    return this;
  }
  /** Ellipsoid with a per-voxel colour function fn(x,y,z,nx,ny,nz) where n* are -1..1 offsets from the centre. */
  blob(cx, cy, cz, rx, ry, rz, fn) {
    const f = typeof fn === 'function' ? fn : () => fn;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, nz = (z - cz) / rz;
      if (nx * nx + ny * ny + nz * nz > 1.0001) continue;
      const c = f(x, y, z, nx, ny, nz); if (c) this.set(x, y, z, c);
    }
    return this;
  }
  /** Rectangular frustum: cross-section lerps from (w0,d0) at y0 to (w1,d1) at y0+h, centred on (cx,cz). fn(i,j,k,x,y,z). */
  frustum(cx, cz, y0, h, w0, d0, w1, d1, fn) {
    const f = typeof fn === 'function' ? fn : () => fn;
    for (let j = 0; j < h; j++) {
      const t = h > 1 ? j / (h - 1) : 0, w = Math.round(w0 + (w1 - w0) * t), d = Math.round(d0 + (d1 - d0) * t);
      const xs = Math.round(cx - w / 2), zs = Math.round(cz - d / 2);
      for (let k = 0; k < d; k++) for (let i = 0; i < w; i++) { const c = f(i, j, k, xs + i, y0 + j, zs + k, w, d); if (c) this.set(xs + i, y0 + j, zs + k, c); }
    }
    return this;
  }
  /** Round disc/cylinder with colour fn(x,y,z). */
  disc(cx, cz, y, len, r, fn) {
    const f = typeof fn === 'function' ? fn : () => fn;
    for (let t = 0; t < len; t++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x - cx) * (x - cx) + (z - cz) * (z - cz) > r * r + 0.0001) continue;
      const c = f(x, y + t, z); if (c) this.set(x, y + t, z, c);
    }
    return this;
  }
  /** Cylinder along an axis with a colour fn(x,y,z): axis 'x' -> (a,b) = (y,z) centre; axis 'z' -> (a,b) = (x,y) centre; start..start+len along the axis. */
  tube(axis, a, b, start, len, r, fn) {
    const f = typeof fn === 'function' ? fn : () => fn, rr = r * r + 0.0001;
    for (let t = 0; t < len; t++) for (let u = Math.floor(a - r); u <= Math.ceil(a + r); u++) for (let w = Math.floor(b - r); w <= Math.ceil(b + r); w++) {
      if ((u - a) * (u - a) + (w - b) * (w - b) > rr) continue;
      const x = axis === 'x' ? start + t : axis === 'z' ? u : u, y = axis === 'x' ? u : axis === 'z' ? w : start + t, z = axis === 'x' ? w : axis === 'z' ? start + t : w;
      const c = f(x, y, z); if (c) this.set(x, y, z, c);
    }
    return this;
  }
  /** coordinates of a pen point in raw grid space (for ModelDef attach points). */
  raw(x, y, z) { return [x, y + this.ground, z]; }
  emit(x, y, z, kind = 'fire') { this.emitters.push({ x, y, z, kind }); return this; }
}

/** Wrap a pen into a one-part ModelDef at voxelSize 0.1 with the pivot at the footprint centre on the ground. */
export function finishModel(id, pen, extra = {}) {
  const m = new ModelDef(id, VOX);
  m.addPart('root', pen, { pivot: [pen.sx / 2, pen.ground, pen.sz / 2] });
  m.meta = Object.assign({ kind: 'prop', rig: 'static', ground: pen.ground }, extra);
  m.meta.emitters = pen.emitters.map((e) => ({ kind: e.kind, x: (e.x + 0.5 - pen.sx / 2) * VOX, y: (e.y + 0.5) * VOX, z: (e.z + 0.5 - pen.sz / 2) * VOX }));
  for (let i = 0; i < pen.emitters.length; i++) { const e = pen.emitters[i]; m.addAttach('emit' + i, 'root', [e.x + 0.5, e.y + pen.ground + 0.5, e.z + 0.5]); }
  return m;
}

/** Bounds of a prop model in world units relative to its pivot (ground centre), plus the footprint "blocking radius". */
export function measure(model) {
  const p = model.parts[0], g = p.grid, b = g.bounds(), vs = model.voxelSize;
  if (!b) return { empty: true, height: 0, baseRadius: 0, halfX: 0, halfZ: 0, depthBelow: 0, voxels: 0 };
  const ground = p.pivot[1], px = p.pivot[0], pz = p.pivot[2];
  // base slab: the first 6 voxels above ground (what units bump into); falls back to the whole body for floating props
  let x0 = 1e9, x1 = -1, z0 = 1e9, z1 = -1;
  for (let y = ground; y < Math.min(g.sy, ground + 6); y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) {
    if (g.d[g.idx(x, y, z)]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  }
  const slab = x1 >= 0;
  if (!slab) { x0 = b.x0; x1 = b.x1; z0 = b.z0; z1 = b.z1; }
  const halfX = Math.max(px - x0, x1 + 1 - px) * vs, halfZ = Math.max(pz - z0, z1 + 1 - pz) * vs;
  return {
    empty: false, slab,
    height: (b.y1 + 1 - ground) * vs, depthBelow: Math.max(0, ground - b.y0) * vs,
    halfX, halfZ, baseRadius: Math.max(halfX, halfZ),
    fullHalfX: Math.max(px - b.x0, b.x1 + 1 - px) * vs, fullHalfZ: Math.max(pz - b.z0, b.z1 + 1 - pz) * vs,
    voxels: g.count(),
  };
}

/** Distinct colours of a model with their voxel counts, most common first (flag bits stripped). */
export function colorHistogram(model) {
  const m = new Map();
  for (const p of model.parts) { const d = p.grid.d; for (let i = 0; i < d.length; i++) { const v = d[i]; if (v) { const c = v & 0xffffff; m.set(c, (m.get(c) || 0) + 1); } } }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map((e) => ({ rgb: e[0], n: e[1] }));
}

// ---------------------------------------------------------------- damage helpers (raw grid coordinates)
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function isSurface(g, x, y, z) {
  for (let k = 0; k < 6; k++) { const n = N6[k]; if (!g.get(x + n[0], y + n[1], z + n[2])) return true; }
  return false;
}
/** Flat list [x,y,z,...] of surface voxels above the foundation skirt (raw coordinates). */
export function surfaceVoxels(pen, minY = pen.ground) {
  const out = [], g = pen;
  for (let y = minY; y < g.sy; y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) {
    if (g.d[g.idx(x, y, z)] && isSurface(g, x, y, z)) out.push(x, y, z);
  }
  return out;
}
function carveSphereRaw(g, cx, cy, cz, r, floorY) {
  const rr = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    if (y < floorY) continue;
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) + (z - cz) * (z - cz) <= rr && g.inb(x, y, z)) g.d[g.idx(x, y, z)] = 0;
  }
}
/** Bite spherical chunks out of the surface; `bias` (0..1) prefers high bites (broken tops). */
export function chip(pen, rng, { bites = 10, rmin = 1.2, rmax = 3.2, bias = 0.6, keepBase = 2 } = {}) {
  const s = surfaceVoxels(pen); if (!s.length) return pen;
  const n = s.length / 3, floorY = pen.ground + keepBase;
  for (let b = 0; b < bites; b++) {
    let best = -1, by = -1;
    for (let t = 0; t < 1 + Math.round(bias * 4); t++) { const k = Math.floor(rng.next() * n); const y = s[k * 3 + 1]; if (y > by) { by = y; best = k; } }
    carveSphereRaw(pen, s[best * 3], s[best * 3 + 1], s[best * 3 + 2], rng.range(rmin, rmax), floorY);
  }
  return pen;
}
/** Random-walk dark cracks across the surface, from a high start point downward. */
export function cracks(pen, rng, { n = 3, len = 20, dark = 0.45 } = {}) {
  const s = surfaceVoxels(pen); if (!s.length) return pen;
  const cnt = s.length / 3;
  for (let c = 0; c < n; c++) {
    let best = -1, by = -1;
    for (let t = 0; t < 6; t++) { const k = Math.floor(rng.next() * cnt); if (s[k * 3 + 1] > by) { by = s[k * 3 + 1]; best = k; } }
    let x = s[best * 3], y = s[best * 3 + 1], z = s[best * 3 + 2];
    for (let i = 0; i < len; i++) {
      const v = pen.d[pen.idx(x, y, z)];
      if (v && !((v >>> 24) & 4)) pen.d[pen.idx(x, y, z)] = recolor(v, shade(v & 0xffffff, dark));
      let moved = false;
      for (let tries = 0; tries < 8 && !moved; tries++) {
        const dx = Math.floor(rng.next() * 3) - 1, dz = Math.floor(rng.next() * 3) - 1, dy = rng.next() < 0.7 ? -1 : 0;
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (pen.get(nx, ny, nz) && ny >= pen.ground && isSurface(pen, nx, ny, nz)) { x = nx; y = ny; z = nz; moved = true; }
      }
      if (!moved) break;
    }
  }
  return pen;
}
/** Darken a random fraction of the surface (soot, weathering). Glow voxels are never darkened. */
export function darken(pen, rng, p = 0.2, f = 0.8) {
  const s = surfaceVoxels(pen);
  for (let i = 0; i < s.length; i += 3) {
    if (rng.next() > p) continue;
    const idx = pen.idx(s[i], s[i + 1], s[i + 2]), v = pen.d[idx];
    if (!((v >>> 24) & 4)) pen.d[idx] = recolor(v, shade(v & 0xffffff, f));
  }
  return pen;
}
/** Remove voxel islands that are not connected (6- or 26-neighbourhood) to the lowest rows, so chips never leave floating cubes. */
export function prune(pen, conn = 6, seedRows = 3) {
  const { sx, sy, sz } = pen, N = sx * sy * sz, seen = new Uint8Array(N), stack = new Int32Array(N);
  let sp = 0;
  for (let y = 0; y < Math.min(sy, pen.ground + seedRows); y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) { const i = pen.idx(x, y, z); if (pen.d[i]) { seen[i] = 1; stack[sp++] = i; } }
  const nb = [];
  if (conn === 6) for (const n of N6) nb.push(n); else for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) if (a || b || c) nb.push([a, b, c]);
  while (sp > 0) {
    const i = stack[--sp], x = i % sx, z = Math.floor(i / sx) % sz, y = Math.floor(i / (sx * sz));
    for (let k = 0; k < nb.length; k++) {
      const X = x + nb[k][0], Y = y + nb[k][1], Z = z + nb[k][2];
      if (X < 0 || Y < 0 || Z < 0 || X >= sx || Y >= sy || Z >= sz) continue;
      const j = pen.idx(X, Y, Z);
      if (pen.d[j] && !seen[j]) { seen[j] = 1; stack[sp++] = j; }
    }
  }
  for (let i = 0; i < N; i++) if (pen.d[i] && !seen[i]) pen.d[i] = 0;
  return pen;
}
/** Generic stage-1 look: chipped, cracked, weathered. */
export function defaultDamage(pen, rng) {
  const surf = surfaceVoxels(pen).length / 3;
  chip(pen, rng, { bites: Math.max(5, Math.min(46, Math.round(surf / 160))), rmin: 1.2, rmax: 3.4, bias: 0.7 });
  cracks(pen, rng, { n: 3 + Math.round(Math.min(4, surf / 1500)), len: 22 });
  darken(pen, rng, 0.16, 0.8);
  prune(pen, 26);
  return pen;
}

/**
 * A low mound of broken pieces. o = {w,d,h (voxels), cols:[0xRRGGBB], kind:'chunks'|'planks'|'leaf'|'mixed', n, ground}
 * The pile sits on the ground (y>=0) with an outer scatter of chips; deterministic for a given rng.
 */
export function rubblePile(rng, o) {
  const w = Math.max(6, o.w | 0), d = Math.max(6, o.d | 0), h = Math.max(3, o.h | 0), kind = o.kind || 'chunks';
  const pen = new Pen(w + 4, h + 4, d + 4, o.ground ?? 1);
  const cx = (pen.sx - 1) / 2, cz = (pen.sz - 1) / 2, cols = o.cols && o.cols.length ? o.cols : [0xb8b2a4, 0x9a958a];
  const top = new Int16Array(pen.sx * pen.sz);            // column heights
  const colour = () => shade(cols[Math.floor(rng.next() * cols.length)], 0.82 + rng.next() * 0.36);
  const target = (x, z) => { const dx = (x - cx) / (w / 2), dz = (z - cz) / (d / 2), r2 = dx * dx + dz * dz; return r2 >= 1 ? 0 : h * Math.pow(1 - r2, 0.75); };
  const n = o.n || Math.round(w * d / 9 + h * 4);
  let placed = 0;
  for (let tries = 0; tries < n * 12 && placed < n; tries++) {
    const a = rng.next() * Math.PI * 2, rr = Math.sqrt(rng.next()) * 0.95;
    const x = Math.round(cx + Math.cos(a) * rr * w / 2), z = Math.round(cz + Math.sin(a) * rr * d / 2);
    const k = kind === 'mixed' ? (rng.next() < 0.5 ? 'chunks' : 'planks') : kind;
    let sx = 2, sy = 2, sz = 2;
    if (k === 'chunks') { sx = rng.int(2, 4); sy = rng.int(2, 3); sz = rng.int(2, 4); }
    else if (k === 'planks') { const long = rng.int(5, 9); const alongX = rng.next() < 0.5; sx = alongX ? long : 1 + rng.int(0, 1); sz = alongX ? 1 + rng.int(0, 1) : long; sy = 1 + rng.int(0, 1); }
    else { sx = sz = rng.int(2, 4); sy = sx; }
    const x0 = x - (sx >> 1), z0 = z - (sz >> 1);
    let base = 0;
    for (let j = 0; j < sz; j++) for (let i = 0; i < sx; i++) { const X = x0 + i, Z = z0 + j; if (X >= 0 && Z >= 0 && X < pen.sx && Z < pen.sz) base = Math.max(base, top[X + Z * pen.sx]); }
    if (base + sy > target(x, z) + 1.2 && base > 0) continue;
    const c = colour();
    if (k === 'leaf') pen.blob(x0 + sx / 2, base + sy / 2, z0 + sz / 2, sx / 2, sy / 2, sz / 2, c); else pen.box(x0, base, z0, sx, sy, sz, c);
    for (let j = 0; j < sz; j++) for (let i = 0; i < sx; i++) { const X = x0 + i, Z = z0 + j; if (X >= 0 && Z >= 0 && X < pen.sx && Z < pen.sz) top[X + Z * pen.sx] = Math.max(top[X + Z * pen.sx], base + sy); }
    placed++;
  }
  // loose chips around the pile
  for (let i = 0; i < Math.round(w * d / 40); i++) {
    const a = rng.next() * Math.PI * 2, rr = 0.8 + rng.next() * 0.35;
    const x = Math.round(cx + Math.cos(a) * rr * w / 2), z = Math.round(cz + Math.sin(a) * rr * d / 2);
    if (x >= 0 && z >= 0 && x < pen.sx && z < pen.sz && !top[x + z * pen.sx]) pen.set(x, 0, z, colour());
  }
  return pen;
}

/**
 * Turn a prop spec into build(stage, variant, rng) -> ModelDef.
 * spec = { variants, indestructible?, pal:[debris colours], build(v, rng) -> Pen, damage?(pen,rng,v), rubble?: {w,d,h,cols,kind,n} | fn(v)->same, afterRubble?(pen,rng,v) }
 */
export function makeBuilder(type, spec) {
  const nv = spec.variants || 1;
  return function build(stage = 0, variant = 0, rng = null) {
    stage = Math.min(2, Math.max(0, stage | 0));
    const v = ((variant | 0) % nv + nv) % nv;
    const r = rng || new RNG((hashString(type) ^ Math.imul(v + 1, 104729)) >>> 0);
    const id = `prop_${type}_s${stage}_v${v}`;
    let pen;
    if (stage === 0 || spec.indestructible) pen = spec.build(v, r.fork('build'));
    else if (stage === 1) { pen = spec.build(v, r.fork('build')); (spec.damage || defaultDamage)(pen, r.fork('damage'), v); }
    else {
      const ro = typeof spec.rubble === 'function' ? spec.rubble(v) : spec.rubble;
      pen = rubblePile(r.fork('rubble'), ro || { w: 14, d: 14, h: 5, cols: spec.pal });
      if (spec.afterRubble) spec.afterRubble(pen, r.fork('after'), v);
    }
    const m = finishModel(id, pen, { type, stage, variant: v, indestructible: !!spec.indestructible });
    return m;
  };
}
