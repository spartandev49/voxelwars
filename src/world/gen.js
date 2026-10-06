// Procedural arena recipes. Each recipe returns a fully built Arena (terrain, materials, water, zones, hazards, props, env).
// Recipes are deterministic for a given (recipe, size, seed). Props use ids from content/era_ancient/props/catalog.js.
//
// Look rules (the arena look gate, docs/sheets/arenas_*.png):
//  * terrain is shaped as smooth float fields (broad hills, deliberate plateaus), terraced into 0.5 u / 1 u steps, de-spiked and only
//    then committed to the voxel heightfield, so there are no single-step contour rings;
//  * zones are flattened with a soft shoulder (no visible rectangles); the symmetric arenas (S22) are built from symmetric noise and
//    mirrored/rotated props so both sides are really equal;
//  * props go through one placer: spacing from catalog radii, no blocking props inside zones or on the walking lanes, never in water or
//    lava, slope limits, big footprints flatten the ground under them (nothing floats), clustered groves instead of uniform confetti.

import { Arena, MAT, MATERIALS, CELL, SIZES } from './arena.js';
import { RNG, Noise2D, clamp, smoothstep, lerp } from '../core/rng.js';
import { PROP_CATALOG } from '../content/era_ancient/props/catalog.js';

const TAU = Math.PI * 2;
const DECOR = new Set(['bush', 'wheat', 'reeds', 'bones', 'skull_pile', 'fire_pit', 'campfire', 'goat_pen', 'cloud_island', 'banner_post']);

export function inZone(a, x, z, pad = 0) {
  for (const k of ['A', 'B']) { const q = a.zones[k]; if (Math.abs(x - q.x) <= q.w / 2 + pad && Math.abs(z - q.z) <= q.d / 2 + pad) return true; }
  return false;
}

/** Generation context handed to every recipe: float terrain fields, symmetric noise, zone flattening, terracing and the prop placer. */
class Gen {
  constructor(a, rng, nz) {
    this.a = a; this.rng = rng; this.nz = nz; this.n = a.size; this.W = a.worldSize(); this.half = this.W / 2;
    this.F = new Float32Array(this.n * this.n); this.M = new Uint8Array(this.n * this.n);
    this.sym = null;                 // null | 'rot' (180 deg) | 'mx' (x -> -x) | 'mxz' (both mirrors)
    this.hash = new Map(); this.clears = []; this.placedCount = 0;
    this.areaK = (this.W / 96) ** 2;                     // prop counts are written for a 96 u (medium) arena and scale with area
    this.hs = clamp(this.W / 96, 0.7, 1.2);              // mountain height scale
  }
  // ---------------------------------------------------------------- fields
  /** Wrap a scalar field so it is symmetric under the recipe's symmetry (continuous, no seams). */
  S(f) {
    const m = this.sym;
    if (!m) return f;
    if (m === 'rot') return (x, z) => (f(x, z) + f(-x, -z)) * 0.5;
    if (m === 'mx') return (x, z) => (f(x, z) + f(-x, z)) * 0.5;
    return (x, z) => (f(x, z) + f(-x, z) + f(x, -z) + f(-x, -z)) * 0.25;
  }
  fbm(x, z, s, o = 3) { return this.nz.fbm(x / s, z / s, o); }
  wobble(x, z) { return (this._wob || (this._wob = this.S((px, pz) => this.fbm(px, pz, 8, 2))))(x, z); }
  ridged(x, z, s, o = 3) { return this.nz.ridged(x / s, z / s, o); }
  /** Sample hfn(x,z) -> height in steps (float) and mfn(x,z,h) -> material id for every cell. */
  fill(hfn, mfn) {
    const a = this.a, n = this.n;
    for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) {
      const x = a.worldX(cx), z = a.worldZ(cz), h = hfn(x, z, cx, cz);
      this.F[cx + cz * n] = h; this.M[cx + cz * n] = mfn ? mfn(x, z, h, cx, cz) : MAT.grass;
    }
  }
  smooth(passes = 1) {
    const n = this.n, F = this.F, T = new Float32Array(F.length);
    for (let p = 0; p < passes; p++) {
      for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) { const i = x + z * n; T[i] = (F[Math.max(0, x - 1) + z * n] + F[i] * 2 + F[Math.min(n - 1, x + 1) + z * n]) * 0.25; }
      for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) { const i = x + z * n; F[i] = (T[x + Math.max(0, z - 1) * n] + T[i] * 2 + T[x + Math.min(n - 1, z + 1) * n]) * 0.25; }
    }
  }
  setZones(frac = 0.3, depth = 0.7, width = 0.2) {
    const W = this.W;
    this.a.zones = { A: { x: -W * frac, z: 0, w: W * width, d: W * depth }, B: { x: W * frac, z: 0, w: W * width, d: W * depth } };
  }
  /** Flatten a zone to `target` steps (default: the rounded mean under it) with a soft shoulder of `margin` units. */
  flatZone(k, margin = 7, target, q = 1) {
    const z = this.a.zones[k], a = this.a, n = this.n;
    const x0 = z.x - z.w / 2, x1 = z.x + z.w / 2, z0 = z.z - z.d / 2, z1 = z.z + z.d / 2;
    if (target === undefined) {
      let s = 0, c = 0;
      for (let cz = Math.max(0, a.cz(z0)); cz <= Math.min(n - 1, a.cz(z1)); cz++) for (let cx = Math.max(0, a.cx(x0)); cx <= Math.min(n - 1, a.cx(x1)); cx++) { s += this.F[cx + cz * n]; c++; }
      target = Math.round((s / Math.max(1, c)) / q) * q;
    }
    const cx0 = Math.max(0, a.cx(x0 - margin)), cx1 = Math.min(n - 1, a.cx(x1 + margin)), cz0 = Math.max(0, a.cz(z0 - margin)), cz1 = Math.min(n - 1, a.cz(z1 + margin));
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const wx = a.worldX(cx), wz = a.worldZ(cz), dx = Math.max(0, Math.abs(wx - z.x) - z.w / 2), dz = Math.max(0, Math.abs(wz - z.z) - z.d / 2);
      const wob = this.wobble(wx, wz) * margin * 0.3;                                  // organic shoulders (symmetric for symmetric arenas)
      const t = 1 - smoothstep(0, margin, Math.max(0, Math.hypot(dx, dz) + wob));
      if (t > 0) { const i = cx + cz * n; this.F[i] = lerp(this.F[i], target, t); }
    }
    return target;
  }
  flatZones(margin = 7, q = 1, targets = {}) { for (const k of ['A', 'B']) this.flatZone(k, margin, targets[k], q); }
  /** Flatten any soft-edged rectangle (centre, half sizes) to a height. */
  flatRect(cx, cz, hw, hd, target, margin = 3) {
    const a = this.a, n = this.n;
    for (let j = Math.max(0, a.cz(cz - hd - margin)); j <= Math.min(n - 1, a.cz(cz + hd + margin)); j++) for (let i = Math.max(0, a.cx(cx - hw - margin)); i <= Math.min(n - 1, a.cx(cx + hw + margin)); i++) {
      const wx = a.worldX(i), wz = a.worldZ(j), d = Math.hypot(Math.max(0, Math.abs(wx - cx) - hw), Math.max(0, Math.abs(wz - cz) - hd)) + this.wobble(wx + 40, wz) * margin * 0.3;
      const t = 1 - smoothstep(0, margin, Math.max(0, d)); if (t > 0) this.F[i + j * n] = lerp(this.F[i + j * n], target, t);
    }
  }
  /** Quantise to plateaus of q steps; `sharp` (0..1) flattens the terrace treads and steepens the risers. */
  terrace(q = 2, sharp = 0.4) {
    const F = this.F, k = 1 + sharp * 3;
    for (let i = 0; i < F.length; i++) {
      const u = F[i] / q, f = Math.floor(u), t = u - f;
      const tt = t < 0.5 ? 0.5 * Math.pow(2 * t, k) : 1 - 0.5 * Math.pow(2 * (1 - t), k);
      F[i] = (f + tt) * q;
    }
  }
  /** Write the float field to the arena and remove single-cell spikes and pits. */
  commit(despike = 2, islands = 30) {
    const a = this.a, n = this.n;
    for (let i = 0; i < this.F.length; i++) { a.h[i] = clamp(Math.round(this.F[i]), 0, 119); a.m[i] = this.M[i]; }
    for (let p = 0; p < despike; p++) {
      const src = a.h.slice();
      for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
        const i = x + z * n, h = src[i];
        const nb = [src[Math.max(0, x - 1) + z * n], src[Math.min(n - 1, x + 1) + z * n], src[x + Math.max(0, z - 1) * n], src[x + Math.min(n - 1, z + 1) * n]];
        const mx = Math.max(...nb), mn = Math.min(...nb);
        if (h > mx) a.h[i] = mx; else if (h < mn) a.h[i] = mn;
      }
    }
    if (islands > 0) this.cleanIslands(islands);
  }
  /** Merge tiny plateaus and pits (connected equal-height patches smaller than `minSize` cells) into their neighbours: kills contour speckle. */
  cleanIslands(minSize = 30, passes = 2) {
    const a = this.a, n = this.n, N = n * n;
    for (let p = 0; p < passes; p++) {
      const seen = new Uint8Array(N), stack = new Int32Array(N);
      for (let i0 = 0; i0 < N; i0++) {
        if (seen[i0]) continue;
        const h = a.h[i0]; let sp = 0, size = 0; const cells = [], nb = new Map();
        stack[sp++] = i0; seen[i0] = 1;
        while (sp > 0) {
          const i = stack[--sp], x = i % n, z = (i / n) | 0; size++; if (size <= minSize + 1) cells.push(i);
          for (let k = 0; k < 4; k++) {
            const X = x + (k === 0 ? 1 : k === 1 ? -1 : 0), Z = z + (k === 2 ? 1 : k === 3 ? -1 : 0);
            if (X < 0 || Z < 0 || X >= n || Z >= n) continue;
            const j = X + Z * n;
            if (a.h[j] === h) { if (!seen[j]) { seen[j] = 1; stack[sp++] = j; } } else nb.set(a.h[j], (nb.get(a.h[j]) || 0) + 1);
          }
        }
        if (size < minSize && nb.size) {
          let best = -1, bd = 1e9, bc = -1;
          for (const [hh, c] of nb) { const d = Math.abs(hh - h); if (d < bd || (d === bd && (c > bc || (c === bc && hh < best)))) { bd = d; best = hh; bc = c; } }
          for (const i of cells) a.h[i] = best;
        }
      }
    }
  }
  /** Repaint materials after the heights are final: fn(x,z,h,slope,cx,cz) -> material id (or -1 to keep). */
  paint(fn) {
    const a = this.a, n = this.n;
    for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) {
      const i = cx + cz * n, h = a.h[i];
      const slope = Math.max(Math.abs(a.getH(cx + 1, cz) - h), Math.abs(a.getH(cx - 1, cz) - h), Math.abs(a.getH(cx, cz + 1) - h), Math.abs(a.getH(cx, cz - 1) - h));
      const m = fn(a.worldX(cx), a.worldZ(cz), h, slope, cx, cz);
      if (m >= 0) a.m[i] = m;
    }
  }
  /** Cells with a steep neighbour (>= minSlope steps) become `mat` (cliff faces and ledges read as rock / earth). */
  slopeMat(mat, minSlope = 2, from = null) {
    this.paint((x, z, h, s, cx, cz) => (s >= minSlope && (!from || from.includes(this.a.m[cx + cz * this.n])) ? mat : -1));
  }
  setH(cx, cz, v) { this.a.setH(cx, cz, v); }
  /** Set the height of every cell within `r` of a point (hard), used under big props. */
  levelDisc(x, z, r, h) {
    const a = this.a;
    for (let j = a.cz(z - r); j <= a.cz(z + r); j++) for (let i = a.cx(x - r); i <= a.cx(x + r); i++) if ((a.worldX(i) - x) ** 2 + (a.worldZ(j) - z) ** 2 <= r * r) a.setH(i, j, h);
  }
  /** Level a strip along a segment to the height at its start (walls on a flat footing), with a one-cell skirt. */
  levelStrip(x0, z0, x1, z1, hw, h) {
    const a = this.a, L = Math.hypot(x1 - x0, z1 - z0), steps = Math.ceil(L / (CELL * 0.5));
    for (let s = 0; s <= steps; s++) { const t = s / steps; this.levelDisc(lerp(x0, x1, t), lerp(z0, z1, t), hw, h); }
  }

  // ---------------------------------------------------------------- props
  info(t) { return PROP_CATALOG[t]; }
  fp(t, s) { const i = PROP_CATALOG[t]; return Math.max(0.3, ((i && i.r) || 0.3) * s); }
  blocking(t) { const i = PROP_CATALOG[t]; return !!i && i.r > 0 && i.blocks !== 'none'; }
  keepClear(x, z, r) { this.clears.push([x, z, r]); }
  keepClearPath(pts, hw) { for (let i = 0; i < pts.length - 1; i++) this.clears.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], hw]); }
  _clearHit(x, z, rad) {
    for (const c of this.clears) {
      if (c.length === 3) { if ((x - c[0]) ** 2 + (z - c[1]) ** 2 < (c[2] + rad) ** 2) return true; }
      else { // segment
        const dx = c[2] - c[0], dz = c[3] - c[1], l2 = dx * dx + dz * dz || 1, t = clamp(((x - c[0]) * dx + (z - c[1]) * dz) / l2, 0, 1);
        if ((x - (c[0] + dx * t)) ** 2 + (z - (c[1] + dz * t)) ** 2 < (c[4] + rad) ** 2) return true;
      }
    }
    return false;
  }
  _near(x, z, r, fn) {
    const k = 4, i0 = Math.floor((x - r) / k), i1 = Math.floor((x + r) / k), j0 = Math.floor((z - r) / k), j1 = Math.floor((z + r) / k);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const l = this.hash.get(i * 4096 + j); if (l) for (const p of l) if (fn(p)) return true; }
    return false;
  }
  _copies(x, z, r) {
    const m = this.sym, out = [[x, z, r]];
    if (!m) return out;
    const eps = 0.35;
    if (m === 'rot') { if (Math.hypot(x, z) > eps) out.push([-x, -z, r + Math.PI]); }
    else if (m === 'mx') { if (Math.abs(x) > eps) out.push([-x, z, -r]); }
    else {
      if (Math.abs(x) > eps) out.push([-x, z, -r]);
      if (Math.abs(z) > eps) out.push([x, -z, Math.PI - r]);
      if (Math.abs(x) > eps && Math.abs(z) > eps) out.push([-x, -z, r + Math.PI]);
    }
    return out;
  }
  /** Random variant that suits the biome: no mossy rocks on sand, snowy pines only in snow, embers only on ash. */
  pickVariant(t) {
    const rng = this.rng, biome = this.a.biome, any = rng.int(0, 3);
    const from = (list) => list[Math.floor(rng.next() * list.length)];
    if (t === 'rock_small' || t === 'rock_big') return biome === 'sand' ? from([0, 1, 3]) : biome === 'snow' || biome === 'stone' || biome === 'ash' || biome === 'marble' ? from([0, 0, 3]) : any;
    if (t === 'tree_pine') return biome === 'snow' ? from([1, 1, 3]) : from([0, 0, 2]);
    if (t === 'tree_dead') return biome === 'ash' ? from([3, 3, 0, 1]) : from([0, 1, 2]);
    if (t === 'tree_oak') return biome === 'grass' ? any : from([0, 2]);
    if (t === 'skull_pile') return biome === 'ash' ? from([1, 3]) : from([0, 2]);
    if (t === 'bush') return any;
    return any;
  }
  /** Validity of one prop at (x,z): bounds, water, lava, zones, lanes, slope and spacing. */
  ok(t, x, z, s, o = {}) {
    const a = this.a, info = PROP_CATALOG[t], fp = this.fp(t, s), m = o.margin ?? 2.5;
    if (Math.abs(x) > this.half - m || Math.abs(z) > this.half - m) return false;
    const cx = a.cx(x), cz = a.cz(z), h = a.getH(cx, cz);
    if (MATERIALS[a.getM(cx, cz)].hazard === 'lava' && !o.lava) return false;
    if (a.water > 0 && !o.water && h < a.water + (o.shore ?? 1)) return false;
    if (o.water && a.water > 0 && h >= a.water - 1) return false;
    const blk = this.blocking(t);
    if (!o.inZones && inZone(a, x, z, blk ? 1.6 : 0.4)) return false;
    if (!o.force && this._clearHit(x, z, blk ? fp * 0.8 : 0.1)) return false;
    for (const hz of a.hazards) if ((x - hz.x) ** 2 + (z - hz.z) ** 2 < (hz.r + fp + 0.6) ** 2) return false;
    if (!o.force && !o.flatten) {
      const maxSlope = o.maxSlope ?? (fp > 0.9 ? 3 : 2), rr = Math.max(0.4, fp * 0.9);
      let mn = h, mx = h;
      for (const [dx, dz] of [[rr, 0], [-rr, 0], [0, rr], [0, -rr]]) { const q = a.getH(a.cx(x + dx), a.cz(z + dz)); if (q < mn) mn = q; if (q > mx) mx = q; }
      if (mx - mn > maxSlope) return false;
    }
    if (!o.force && !o.noSpacing) {
      const gapB = o.gap ?? 0.8;
      if (this._near(x, z, fp + 7, (p) => {
        const need = (fp + p.fp) * 0.95 + ((blk || p.blk) ? gapB : 0.15);
        return (x - p.x) ** 2 + (z - p.z) ** 2 < need * need;
      })) return false;
    }
    return true;
  }
  _commitProp(t, x, z, r, s, v, o) {
    const a = this.a, fp = this.fp(t, s);
    if (o.flatten) { const hh = a.getH(a.cx(x), a.cz(z)); this.levelDisc(x, z, fp + 0.35, hh); }
    const p = { t, x, z, r, s, v };
    a.props.push(p);
    const rec = { x, z, fp, blk: this.blocking(t) };
    const key = Math.floor(x / 4) * 4096 + Math.floor(z / 4);
    let arr = this.hash.get(key); if (!arr) this.hash.set(key, (arr = [])); arr.push(rec);
    this.placedCount++;
    return p;
  }
  /** Place a prop (and its symmetric copies). o: {r,s,v,flatten,force,inZones,noSym,gap,maxSlope,water,shore,lava,margin}. Returns true on success. */
  put(t, x, z, o = {}) {
    if (!PROP_CATALOG[t]) throw new Error('Unknown prop ' + t);
    const rng = this.rng, s = o.s ?? rng.range(0.9, 1.25), r = o.r ?? rng.range(0, TAU), v = o.v ?? this.pickVariant(t);
    const copies = o.noSym ? [[x, z, r]] : this._copies(x, z, r);
    for (const c of copies) if (!this.ok(t, c[0], c[1], s, o)) return false;
    // a symmetric copy must not overlap its own original (props close to an axis)
    if (copies.length > 1 && !o.noSpacing && !o.force) {
      const need = this.fp(t, s) * 2 * 0.95 + (this.blocking(t) ? (o.gap ?? 0.8) : 0.15);
      for (let i = 1; i < copies.length; i++) if ((copies[i][0] - x) ** 2 + (copies[i][1] - z) ** 2 < need * need) return false;
    }
    for (const c of copies) this._commitProp(t, c[0], c[1], c[2], s, v, o);
    return true;
  }
  /** Scatter `count` props (ids array or {id: weight}) by rejection sampling. o adds: region(x,z), density(x,z) 0..1, scale:[a,b]. */
  scatter(ids, count, o = {}) {
    const rng = this.rng, list = Array.isArray(ids) ? ids : Object.entries(ids).flatMap(([k, w]) => Array(Math.max(1, Math.round(w))).fill(k));
    const copies = this.sym === 'mxz' ? 4 : this.sym ? 2 : 1, want = Math.ceil(count * (o.fixed ? 1 : this.areaK) / copies), W = this.W, m = o.margin ?? 2.5;
    let placed = 0;
    for (let tries = 0; tries < want * 60 && placed < want; tries++) {
      const x = rng.range(-W / 2 + m, W / 2 - m), z = rng.range(-W / 2 + m, W / 2 - m);
      if (o.region && !o.region(x, z)) continue;
      if (o.density && rng.next() > o.density(x, z)) continue;
      const t = list[Math.floor(rng.next() * list.length)], sc = o.scale ? rng.range(o.scale[0], o.scale[1]) : undefined;
      if (this.put(t, x, z, Object.assign({}, o, { s: sc }))) placed++;
    }
    return placed * copies;
  }
  /** Clustered groves: pick `n` centres, then place `per` props around each (gaussian spread `rad`). */
  groves(ids, n, per, rad, o = {}) {
    const rng = this.rng, list = Array.isArray(ids) ? ids : Object.entries(ids).flatMap(([k, w]) => Array(Math.max(1, Math.round(w))).fill(k));
    const copies = this.sym === 'mxz' ? 4 : this.sym ? 2 : 1, want = Math.ceil(n * (o.fixed ? 1 : this.areaK) / copies), W = this.W;
    let made = 0;
    for (let tries = 0; tries < want * 80 && made < want; tries++) {
      const cx = rng.range(-W / 2 + rad, W / 2 - rad), cz = rng.range(-W / 2 + rad, W / 2 - rad);
      if (o.region && !o.region(cx, cz)) continue;
      if (inZone(this.a, cx, cz, rad * 0.5) && !o.inZones) continue;
      let c = 0;
      for (let k = 0; k < per * 5 && c < per; k++) {
        const x = cx + rng.gauss() * rad, z = cz + rng.gauss() * rad;
        const t = list[Math.floor(rng.next() * list.length)], sc = o.scale ? rng.range(o.scale[0], o.scale[1]) : undefined;
        if (this.put(t, x, z, Object.assign({}, o, { s: sc }))) c++;
      }
      if (c >= Math.max(2, per * 0.4)) made++;
    }
  }
  /** Props along a segment every `step` units. */
  line(t, x0, z0, x1, z1, step, o = {}) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(L / step)), ang = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) { const u = i / n; this.put(t, lerp(x0, x1, u), lerp(z0, z1, u), Object.assign({ r: ang, force: true, noSym: true, s: 1 }, o)); }
  }
  ring(t, cx, cz, rx, rz, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU + (o.phase || 0);
      this.put(t, cx + Math.cos(th) * rx, cz + Math.sin(th) * rz, Object.assign({ r: -th + Math.PI / 2, force: true, noSym: true, s: 1 }, o));
    }
  }
  /** Raw prop (no checks, no symmetry) for hand-placed landmarks. */
  raw(t, x, z, o = {}) { return this._commitProp(t, x, z, o.r ?? 0, o.s ?? 1, o.v ?? 0, o); }
}

// ------------------------------------------------------------------ small helpers
/** Distance from (x,z) to a polyline of [x,z] points. */
function distPoly(x, z, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], l2 = dx * dx + dz * dz || 1, t = clamp(((x - pts[i][0]) * dx + (z - pts[i][1]) * dz) / l2, 0, 1);
    best = Math.min(best, Math.hypot(x - (pts[i][0] + dx * t), z - (pts[i][1] + dz * t)));
  }
  return best;
}
/** Sample a curve z = f(x) into a polyline over [x0,x1]. */
function curve(f, x0, x1, n = 24) { const pts = []; for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); pts.push([x, f(x)]); } return pts; }

const R = {};
const half0 = (W) => W / 2;

// ------------------------------------------------------------------ marathon: the reference arena
/** Gentle rolling plain with broad hills, two dirt tracks between the camps, olive groves, wheat fields and a few ruins. (symmetric by 180 degrees) */
R.marathon = (g) => {
  const a = g.a, W = g.W; g.sym = 'rot';
  a.biome = 'grass'; a.env = { time: 9.5, weather: 'clear', fog: 0.16, theme: 'greek', wind: 0.35, mood: 'auto' };
  g.setZones(0.3, 0.62, 0.2);
  const hill = g.S((x, z) => g.fbm(x, z, 38, 2) * 1.4), bump = g.S((x, z) => g.fbm(x + 30, z, 13, 2));
  const trails = [curve((x) => Math.sin(x / 15) * 8, -W / 2, W / 2), curve((x) => Math.sin(x / 15 + 2.4) * 9 + 20, -W / 2, W / 2)];
  const trail = (x, z) => Math.min(distPoly(x, z, trails[0]), distPoly(x, z, trails[1]), distPoly(-x, -z, trails[1]));
  g.fill((x, z) => 12 + smoothstep(-0.1, 0.45, hill(x, z)) * 8.5 + bump(x, z) * 0.7, (x, z) => (trail(x, z) < 1.25 + g.fbm(x, z, 3, 1) * 0.5 ? MAT.dirt : MAT.grass));
  g.smooth(1); g.flatZones(9, 2); g.terrace(2, 0.35); g.commit();
  g.slopeMat(MAT.dirt, 3, [MAT.grass]);
  // wheat fields on the flat grass either side of the middle
  const fields = [[-0.12 * W, -0.26 * W, 0.7], [0.12 * W, 0.26 * W, 0.7 + Math.PI]];
  g.paint((x, z) => { for (const f of fields) { const dx = x - f[0], dz = z - f[1], c = Math.cos(f[2]), s = Math.sin(f[2]), u = dx * c + dz * s, v = -dx * s + dz * c; if (Math.abs(u) < 6.5 && Math.abs(v) < 4.2 && a.getM(a.cx(x), a.cz(z)) === MAT.grass) return MAT.savanna; } return -1; });
  for (const t of trails) g.keepClearPath(t, 1.6);
  g.keepClearPath(trails[1].map((p) => [-p[0], -p[1]]), 1.6);
  // landmarks first, then groves and fillers
  for (const f of fields) for (let i = 0; i < 16; i++) { const c = Math.cos(f[2]), s = Math.sin(f[2]), u = ((i % 4) - 1.5) * 3.2, v = (Math.floor(i / 4) - 1.5) * 2.4; g.put('wheat', f[0] + u * c - v * s, f[1] + u * s + v * c, { noSym: true, s: 1.1, v: i & 3, noSpacing: true, maxSlope: 1 }); }
  g.put('ruin_wall', -0.08 * W, -0.2 * W, { flatten: true, v: 0, s: 1.15, r: 0.4 }); g.put('column_broken', -0.02 * W, 0.06 * W, { v: 0, s: 1.1 }); g.put('column_marble', -0.07 * W, 0.02 * W, { v: 1, s: 1.15, flatten: true });
  g.groves({ tree_olive: 8, tree_cypress: 2, bush: 3, rock_small: 1 }, 6, 8, 5.5, { scale: [0.95, 1.3], gap: 1.1 });
  g.groves({ bush: 4, rock_small: 2, wheat: 1 }, 5, 5, 3.2, { scale: [0.9, 1.3] });
  g.scatter({ rock_big: 1, rock_small: 2, bush: 3 }, 14, { scale: [0.9, 1.4] });
  for (const k of ['A', 'B']) { const z = a.zones[k]; for (const sz of [-1, 1]) g.put('banner_post', z.x, sz * (z.d / 2 - 1.5), { force: true, noSym: true, s: 1.15, v: k === 'A' ? 0 : 1, inZones: true }); }
};

// ------------------------------------------------------------------ thermopylae: the Hot Gates
/** A pass between a mountain wall (north) and the sea (south) pinched by a stone wall with an 8 u gate; A holds the west. */
R.thermopylae = (g) => {
  const a = g.a, W = g.W;
  a.biome = 'stone'; a.env = { time: 8.5, weather: 'cloudy', fog: 0.3, theme: 'greek', wind: 0.4, mood: 'auto' };
  const gx = -W * 0.05;
  const pw = (x) => W * 0.125 + W * 0.13 * smoothstep(W * 0.1, W * 0.3, Math.abs(x - gx));           // half width of the corridor floor
  const ridge = (x, z) => g.ridged(x, z, 15, 3), soft = (x, z) => g.fbm(x, z, 24, 3);
  a.water = 9;
  g.fill((x, z) => {
    const w = pw(x), dN = -z - w, dS = z - w;                                           // distance beyond the north / south edge of the floor
    let h = 15 + soft(x, z) * 1.8;
    if (dN > 0) h += (smoothstep(0, 5, dN) * (11 + ridge(x, z) * 9 * smoothstep(2, 18, dN)) + smoothstep(8, 30, dN) * 8) * g.hs;     // cliffs and mountain
    if (dS > 0) h -= smoothstep(0, 9, dS) * 9;                                           // beach shelving into the sea
    return h;
  }, (x, z, h) => (h > 25 ? (g.fbm(x, z, 5, 2) > 0.1 ? MAT.stone : MAT.moss) : h < 11.5 ? MAT.sand : g.fbm(x, z, 9, 2) > 0.3 ? MAT.savanna : g.fbm(x + 5, z, 6, 2) > 0.12 ? MAT.dirt : MAT.sand));
  a.zones = { A: { x: -W * 0.32, z: 0, w: W * 0.2, d: W * 0.2 }, B: { x: W * 0.32, z: 0, w: W * 0.2, d: W * 0.2 } };
  g.smooth(1); g.flatZones(7, 1, { A: 15, B: 15 }); g.flatRect(gx, 0, 3.5, pw(gx) + 1, 15, 4); g.terrace(2, 0.3); g.commit();
  g.levelStrip(gx, -pw(gx), gx, pw(gx), 2.4, 15);
  g.slopeMat(MAT.stone, 3, [MAT.dirt, MAT.sand, MAT.moss, MAT.savanna]);
  // the wall: towers at the gate, 2.6 u wall segments out to the cliff (north) and the shore (south)
  const w = pw(gx), seg = 2.6 * 0.995;
  g.keepClearPath([[-W * 0.46, 0], [W * 0.46, 0]], 3.4);
  for (const sg of [-1, 1]) {
    const zStart = sg * 8.1, zEnd = sg * (w - 0.5);
    const n = Math.max(1, Math.floor(Math.abs(zEnd - zStart) / seg));
    for (let i = 0; i <= n; i++) g.raw('wall_stone', gx, lerp(zStart, zEnd, i / n), { r: Math.PI / 2, s: 1.3, v: 0 });
    g.raw('tower', gx, sg * 6.6, { s: 1.0, v: sg > 0 ? 3 : 0, r: sg > 0 ? Math.PI : 0 });
  }
  g.raw('banner_post', gx - 3.4, -4.4, { s: 1.2, v: 1 }); g.raw('banner_post', gx - 3.4, 4.4, { s: 1.2, v: 1 }); g.raw('torch', gx + 2.4, -4.7, { s: 1.2 }); g.raw('torch', gx + 2.4, 4.7, { s: 1.2 });
  g.raw('skull_pile', gx + 5, 5.5, { s: 1.1, v: 1, r: 0.6 }); g.raw('bones', gx + 6.5, -5.8, { s: 1.2, v: 0, r: 1.1 });
  // camps behind the zones, then rocks and cypress along the cliffs
  const campX = a.zones.A.x - a.zones.A.w / 2 - 3.6;                                  // tents sit BEHIND the deployment zone, never on its edge
  for (const [dx, z, r, v] of [[0, -6, 1.1, 0], [0, 7, 2.1, 1], [0.6, 13, 0.4, 2]]) g.raw('tent', Math.max(-half0(W) + 2, campX - dx), z, { r, v, s: 1.1 });
  g.raw('campfire', Math.max(-half0(W) + 1.5, campX + 1.2), 0.5, { s: 1.2, v: 0 }); g.raw('campfire', Math.min(half0(W) - 1.5, a.zones.B.x + a.zones.B.w / 2 + 2.6), -1, { s: 1.2, v: 2 });
  g.scatter({ rock_big: 2, rock_small: 3, bush: 3, tree_cypress: 3 }, 55, { region: (x, z) => Math.abs(z) > 5.5 && Math.abs(x - gx) > 6, scale: [0.9, 1.5] });
  g.scatter({ bones: 1, skull_pile: 1, rock_small: 2 }, 8, { region: (x, z) => x > gx + 8 && Math.abs(z) < 12, scale: [0.9, 1.3] });
};

// ------------------------------------------------------------------ colosseum
/** Oval sand floor, stepped stands with 90 cheering spectators, columns and torches around the wall, two gate niches, spikes at the centre. */
R.colosseum = (g) => {
  const a = g.a, W = g.W; g.sym = 'mxz';
  a.biome = 'sand'; a.env = { time: 14.5, weather: 'clear', fog: 0.08, theme: 'roman', wind: 0.12, mood: 'auto' };
  const rx = W * 0.325, rz = W * 0.25, ER = Math.max(0.052, 1.35 / rz), E0 = 1 + Math.max(0.075, 2.1 / rz), ROWS = Math.max(4, Math.min(7, Math.floor((1.48 - E0 - 0.03) / ER)));
  const ell = (x, z) => Math.sqrt((x / rx) ** 2 + (z / rz) ** 2);
  const niche = (x, z) => Math.abs(z) < 4.6 && Math.abs(x) > rx * 0.9 && Math.abs(x) < rx * 1.12;
  const rowH = (k) => 19 + k * 2;
  g.fill((x, z) => {
    const e = ell(x, z);
    if (niche(x, z) && e < 1.14) return 12;
    if (e < 1.0) return 12;
    if (e < E0) return 17;                                                              // podium wall (columns stand on it)
    const k = Math.floor((e - E0) / ER);
    if (k < ROWS) return rowH(k);
    if (e < E0 + ROWS * ER + 0.03) return rowH(ROWS - 1) + 3;                          // top rim
    return 10 + 6 * (1 - smoothstep(1.46, 1.8, e));
  }, (x, z) => {
    const e = ell(x, z);
    if (e < 0.18) return MAT.sandstone;
    if (e < 1.0) return MAT.sand;
    if (e < E0) return MAT.stone;
    const k = Math.floor((e - E0) / ER);
    if (k < ROWS) return k & 1 ? MAT.marble : MAT.cobble;
    return e < E0 + ROWS * ER + 0.03 ? MAT.marble : MAT.grass;
  });
  a.zones = { A: { x: -W * 0.17, z: 0, w: W * 0.14, d: W * 0.3 }, B: { x: W * 0.17, z: 0, w: W * 0.14, d: W * 0.3 } };
  g.commit(0, 0);
  g.paint((x, z, h, s) => { const e = ell(x, z); if (e < 1.0 && s === 0) { const d = Math.hypot(x, z); if (d < 3.6 && d > 2.6) return MAT.cobble; if (d <= 2.6) return MAT.ash; if (e > 0.9 || g.fbm(x, z, 4, 1) > 0.5) return MAT.sandstone; } return -1; });
  a.hazards.push({ t: 'spikes', x: 0, z: 0, r: 2.8 });
  g.keepClear(0, 0, 4.5);
  const F = { force: true, noSpacing: true };
  // everything below is built for one quadrant (x >= 0, z >= 0); the symmetry mirrors it into all four
  for (let i = 0; i < 8; i++) {                                                       // podium colonnade
    const eC = 1 + (E0 - 1) / 2, th = (i + 0.5) / 32 * TAU, x = Math.cos(th) * rx * eC, z = Math.sin(th) * rz * eC;
    if (z < 6.4) continue;
    g.put('column_marble', x, z, Object.assign({ s: Math.min(1.1, (E0 - 1) * rz * 0.78), v: i & 1, r: 0 }, F));
  }
  g.put('arch_gate', rx * 0.985, 0, Object.assign({ r: Math.PI / 2, s: 1.15, v: 0 }, F));
  g.put('statue_lion', rx * 0.8, 6.8, Object.assign({ r: -Math.PI / 2, s: 1.05, v: 1 }, F));
  g.put('torch', rx * 0.905, 3.6, Object.assign({ s: 1.4, v: 1 }, F));
  for (let i = 0; i < 5; i++) {                                                       // torches and banners along the top rim
    const th = (i + 0.5) / 20 * TAU, e = E0 + (ROWS - 0.5) * ER + 0.02, x = Math.cos(th) * rx * e, z = Math.sin(th) * rz * e;
    g.put(i & 1 ? 'banner_post' : 'torch', x, z, Object.assign({ s: i & 1 ? 1.15 : 1.5, v: i & 3 }, F));
  }
  for (let i = 0; i < 4; i++) { const th = (i + 0.4) / 14 * TAU, x = Math.cos(th) * rx * 0.955, z = Math.sin(th) * rz * 0.955; g.put(i & 1 ? 'barrel' : 'crate', x, z, Object.assign({ s: 1.1, v: i & 3 }, F)); }
  // 90 spectators: top/bottom bleachers (3 rows x 10) and the two ends (8 + 7 per end), every one on a seat row facing the arena centre
  const seat = (k, th) => { const e = E0 + (k + 0.5) * ER; return [Math.cos(th) * rx * e, Math.sin(th) * rz * e]; };
  const face = (x, z) => Math.atan2(-x, -z);
  let ci = 0;
  const topRows = ROWS >= 6 ? [1, 3, 5] : [1, 2, 3], endRows = ROWS >= 6 ? [2, 4] : [1, 2];
  for (let r = 0; r < 3; r++) for (let j = 5; j < 10; j++) { const [x, z] = seat(topRows[r], Math.PI / 2 - (j - 4.5) * 0.085); g.put('crowd', x, z, Object.assign({ r: face(x, z), s: 1, v: (ci++ * 3 + r) & 3 }, F)); }
  for (const [k, cnt] of [[endRows[0], 8], [endRows[1], 7]]) for (let j = Math.ceil((cnt - 1) / 2); j < cnt; j++) { const [x, z] = seat(k, (j - (cnt - 1) / 2) * 0.1); g.put('crowd', x, z, Object.assign({ r: face(x, z), s: 1, v: (ci++ * 3 + k) & 3 }, F)); }
  g.scatter({ palm: 1, bush: 2 }, 12, { region: (x, z) => ell(x, z) > 1.5, margin: 2, force: false });
};

// ------------------------------------------------------------------ nile
R.nile = (g) => {
  const a = g.a, W = g.W;
  a.biome = 'sand'; a.env = { time: 12.5, weather: 'clear', fog: 0.12, theme: 'egypt', wind: 0.25, mood: 'auto' };
  const zr = (x) => Math.sin(x / 17 + 0.4) * 7 + Math.sin(x / 7.5) * 1.3;               // river centre line
  const rw = (x) => 5.0 + Math.sin(x / 10 + 1) * 1.0;                                     // half width
  a.water = 11;
  const dune = (x, z) => g.fbm(x * 0.8 + z * 0.3, z * 1.2, 22, 2);
  g.fill((x, z) => {
    const d = Math.abs(z - zr(x)), w = rw(x);
    let h;
    if (d < w + 3.5) {
      const bed = 6.5 + smoothstep(w * 0.2, w + 0.5, d) * 3;                            // channel gets deeper in the middle
      h = lerp(bed, 13.2, smoothstep(w - 0.2, w + 3.2, d));
    } else h = 13.4 + smoothstep(w + 14, w + 38, d) * (2 + dune(x, z) * 3) + dune(x, z) * 0.6;
    const ford = smoothstep(5.8, 3.6, Math.abs(x)) * smoothstep(w + 2.6, w - 1, d);    // shallow crossing
    return Math.max(h, lerp(h, 10, ford));
  }, (x, z, h) => { const d = Math.abs(z - zr(x)); if (h < 11.5 && d < rw(x) + 3) return MAT.mud; if (d < rw(x) + 9) return MAT.grass; if (d < rw(x) + 12) return MAT.dirt; return g.fbm(x, z, 8, 2) > 0.45 ? MAT.sandstone : MAT.sand; });
  a.zones = { A: { x: -W * 0.28, z: zr(-W * 0.28) - W * 0.21, w: W * 0.2, d: W * 0.2 }, B: { x: W * 0.28, z: zr(W * 0.28) + W * 0.21, w: W * 0.2, d: W * 0.2 } };
  g.smooth(1); g.flatZones(7, 1, { A: 14, B: 14 });
  g.terrace(2, 0.25); g.commit();
  // the ford stays a clean 9 u wide: re-stamp it after terracing
  for (let cz = 0; cz < a.size; cz++) for (let cx = 0; cx < a.size; cx++) { const x = a.worldX(cx), z = a.worldZ(cz), d = Math.abs(z - zr(x)); if (Math.abs(x) < 4.5 && d < rw(x) + 1.6 && a.getH(cx, cz) < 10) a.setH(cx, cz, 10); }
  g.slopeMat(MAT.mud, 2, [MAT.grass]);
  g.keepClearPath(curve((x) => zr(x), -W * 0.2, W * 0.2, 12).map((p) => [p[0], p[1]]), 7.5); g.keepClear(0, zr(0), 8);
  // fertile banks: palms, reeds, wheat, then desert scatter
  const nearRiver = (x, z) => Math.abs(z - zr(x)) < rw(x) + 12;
  g.scatter({ reeds: 1 }, 34, { region: (x, z) => { const d = Math.abs(z - zr(x)); return d > rw(x) - 0.3 && d < rw(x) + 3 && Math.abs(x) > 6.5; }, shore: -2, noSpacing: true, maxSlope: 3, scale: [1, 1.4], inZones: true });
  g.groves({ palm: 6, bush: 2, reeds: 1 }, 7, 5, 4, { region: (x, z) => nearRiver(x, z) && Math.abs(z - zr(x)) > rw(x) + 4, scale: [1, 1.35] });
  for (const [fx, fz, ang] of [[-W * 0.12, zr(-W * 0.12) - 12.5, 0.1], [W * 0.14, zr(W * 0.14) + 12.5, -0.1]]) for (let i = 0; i < 18; i++) { const c = Math.cos(ang), s = Math.sin(ang), u = ((i % 6) - 2.5) * 3, v = (Math.floor(i / 6) - 1) * 2.6; g.put('wheat', fx + u * c - v * s, fz + u * s + v * c, { noSym: true, noSpacing: true, v: i & 3, s: 1.15, maxSlope: 1 }); }
  g.raw('obelisk', -W * 0.07, zr(-W * 0.07) - 9.5, { s: 1.3, v: 0 }); g.raw('obelisk', W * 0.07, zr(W * 0.07) + 9.5, { s: 1.3, v: 3 });
  g.put('pyramid', W * 0.38, -W * 0.36, { s: 0.7, v: 0, flatten: true, force: true, r: 0 });
  g.scatter({ cactus: 2, rock_small: 3, rock_big: 1, bones: 1, bush: 2, tree_dead: 1 }, 26, { region: (x, z) => Math.abs(z - zr(x)) > rw(x) + 13, scale: [0.9, 1.4] });
  g.scatter({ rock_small: 2, bush: 2 }, 8, { region: (x, z) => Math.abs(z - zr(x)) < rw(x) + 12, scale: [0.9, 1.3] });
};

// ------------------------------------------------------------------ giza
R.giza = (g) => {
  const a = g.a, W = g.W;
  a.biome = 'sand'; a.env = { time: 15.5, weather: 'clear', fog: 0.16, theme: 'egypt', wind: 0.4, mood: 'auto' };
  const dune = (x, z) => g.ridged(x * 0.85 + z * 0.35, z * 1.25 - x * 0.2, 30, 2);
  g.setZones(0.31, 0.6, 0.2);
  const sk = clamp(W / 96, 0.72, 1.15), px = [[0, -W * 0.3, 1.6 * sk], [W * 0.1, W * 0.31, 1.05 * sk]];
  g.fill((x, z) => 14 + dune(x, z) * 6 + g.fbm(x, z, 11, 2) * 0.7, (x, z, h) => (g.fbm(x, z, 11, 2) > 0.34 ? MAT.sandstone : MAT.sand));
  g.smooth(1);
  for (const [x, z, s] of px) g.flatRect(x, z, 7.4 * s, 7.4 * s, 14, 4);
  g.flatRect(-W * 0.02, W * 0.2, 8, 6, 14, 3);
  g.flatZones(9, 2, { A: 14, B: 14 });
  g.terrace(2, 0.3); g.commit();
  g.slopeMat(MAT.sandstone, 2, [MAT.sand]);
  for (const [x, z, s] of px) g.paint((xx, zz) => (Math.abs(xx - x) < 7.8 * s && Math.abs(zz - z) < 7.8 * s ? MAT.sandstone : -1));
  g.raw('pyramid', px[0][0], px[0][1], { s: px[0][2], v: 0 }); g.raw('pyramid', px[1][0], px[1][1], { s: px[1][2], v: 1 });
  g.raw('sphinx_statue', -W * 0.02, W * 0.2, { r: Math.PI, s: 1.2, v: 0 });
  g.raw('statue_lion', -W * 0.02 - 6, W * 0.2 + 3, { r: Math.PI, s: 1, v: 0 }); g.raw('statue_lion', -W * 0.02 + 6, W * 0.2 + 3, { r: Math.PI, s: 1, v: 0 });
  g.keepClear(px[0][0], px[0][1], 12.5); g.keepClear(px[1][0], px[1][1], 9); g.keepClear(-W * 0.02, W * 0.2, 5.5);
  g.raw('obelisk', -W * 0.1, -W * 0.14, { s: 1.2, v: 0 }); g.raw('obelisk', W * 0.1, W * 0.14, { s: 1.2, v: 1 });
  g.raw('torch', px[0][0] - 3, px[0][1] + 14, { s: 1.4, v: 1 }); g.raw('torch', px[0][0] + 3, px[0][1] + 14, { s: 1.4, v: 1 });
  g.groves({ palm: 6, bush: 2, rock_small: 1 }, 3, 5, 3.4, { region: (x, z) => Math.abs(x) < W * 0.22, scale: [1, 1.35] });
  g.scatter({ cactus: 3, rock_small: 3, rock_big: 1, bones: 2, skull_pile: 1, tree_dead: 1, bush: 1 }, 34, { scale: [0.9, 1.4] });
};

// ------------------------------------------------------------------ persepolis
/** A marble courtyard raised above the sand, double colonnade, a golden throne and lions; mirror symmetric about x = 0. */
R.persepolis = (g) => {
  const a = g.a, W = g.W; g.sym = 'mx';
  a.biome = 'marble'; a.env = { time: 11, weather: 'clear', fog: 0.12, theme: 'persian', wind: 0.2, mood: 'auto' };
  const px = W * 0.335, pz = W * 0.41;
  const sd = (x, z) => Math.max(Math.abs(x) - px, Math.abs(z) - pz);                  // signed box distance (<0 inside)
  const n1 = g.S((x, z) => g.fbm(x, z, 22, 2)), n2 = g.S((x, z) => g.fbm(x, z, 6, 2));
  g.setZones(0.2, 0.5, 0.14);
  g.fill((x, z) => 14 + n1(x, z) * 0.8 + (1 - smoothstep(-0.2, 1.8, sd(x, z))) * 4, (x, z) => (sd(x, z) > 0.4 ? (n2(x, z) > 0.3 ? MAT.sandstone : MAT.sand) : MAT.marble));
  g.smooth(1); g.flatZones(8, 2, { A: 18, B: 18 }); g.terrace(2, 0.6); g.commit();
  g.paint((x, z, h, s) => {
    if (sd(x, z) > 0.2) return -1;
    if (Math.abs(x) < 1.7 && z > -pz * 0.84) return MAT.brick;                           // red carpet from the gate to the throne
    if (Math.abs(x) < 2.1 && z > -pz * 0.84) return MAT.sandstone;
    if (Math.abs(z + pz * 0.82) < 4.5 && Math.abs(x) < 9) return MAT.sandstone;          // throne dais
    return ((Math.floor(Math.abs(x) / 4.0) + Math.floor(z / 4.0)) & 1) ? MAT.marble : MAT.sandstone;
  });
  g.levelDisc(0, -W * 0.34, 5.2, 20);
  g.paint((x, z) => (Math.hypot(x, z + W * 0.34) < 5.4 ? MAT.sandstone : -1));
  g.keepClear(0, -W * 0.34, 5.5); g.keepClearPath([[0, W * 0.44], [0, -W * 0.28]], 2.4);
  const F = { force: true, noSpacing: true };
  g.raw('throne', 0, -W * 0.34, { s: 1.3, v: 0 });
  g.put('statue_lion', 8, -W * 0.28, Object.assign({ r: 0, s: 1.25, v: 1 }, F)); g.put('statue_lion', 8, W * 0.3, Object.assign({ r: Math.PI, s: 1.25, v: 0 }, F));
  g.put('torch', 3.6, -W * 0.28, Object.assign({ s: 1.5, v: 2 }, F));
  g.put('arch_gate', 0, W * 0.44, Object.assign({ r: 0, s: 1.35, v: 2 }, F));
  for (let i = -3; i <= 3; i++) g.put('column_marble', W * 0.08, i * 6.4 + 1, Object.assign({ s: 1.35, v: 0, r: 0 }, F));
  for (let i = 0; i < 9; i++) g.put('column_marble', px * 0.93, -W * 0.34 + i * (W * 0.7 / 8), Object.assign({ s: 1.25, v: i & 1 ? 1 : 3, r: 0 }, F));
  for (let i = 1; i <= 3; i++) g.put('column_marble', i * 5.8, -W * 0.4, Object.assign({ s: 1.15, v: 1, r: 0 }, F));
  g.scatter({ palm: 3, bush: 4, rock_small: 1 }, 26, { region: (x, z) => sd(x, z) > 1.5, scale: [0.95, 1.35] });
  g.scatter({ torch: 1, banner_post: 1 }, 10, { region: (x, z) => sd(x, z) < -2 && sd(x, z) > -5, scale: [1.2, 1.5] });
};

// ------------------------------------------------------------------ carthage
R.carthage = (g) => {
  const a = g.a, W = g.W;
  a.biome = 'sand'; a.env = { time: 17.2, weather: 'clear', fog: 0.18, theme: 'carthage', wind: 0.5, mood: 'auto' };
  a.water = 11;
  const xs = (z) => W * 0.1 + Math.sin(z / 13) * 3.2 + Math.sin(z / 5.3) * 1.1;        // shoreline x
  g.fill((x, z) => {
    const d = x - xs(z);                                                                   // + = seawards
    const land = 15 + g.fbm(x, z, 24, 2) * 3.4 + smoothstep(-W * 0.3, -W * 0.5, x) * 3;
    if (d < -4) return lerp(land, 13.6, smoothstep(-14, -4, d));
    return lerp(13.6, 4.2, smoothstep(-4, 7, d));
  }, (x, z, h) => (h < 12.6 ? MAT.sand : x > xs(z) - 9 ? (g.fbm(x, z, 4, 2) > -0.1 ? MAT.cobble : MAT.sand) : g.fbm(x, z, 7, 2) > 0.3 ? MAT.savanna : g.fbm(x + 9, z, 9, 2) > 0.3 ? MAT.dirt : MAT.grass));
  a.zones = { A: { x: -W * 0.17, z: -W * 0.3, w: W * 0.3, d: W * 0.17 }, B: { x: -W * 0.17, z: W * 0.3, w: W * 0.3, d: W * 0.17 } };
  g.smooth(1); g.flatZones(7, 1, { A: 15, B: 15 });
  const piers = [-W * 0.13, 0, W * 0.13];
  g.terrace(2, 0.35); g.commit();
  for (const pz of piers) for (let cz = 0; cz < a.size; cz++) for (let cx = 0; cx < a.size; cx++) { const x = a.worldX(cx), z = a.worldZ(cz); if (Math.abs(z - pz) < 1.6 && x > xs(pz) - 6 && x < xs(pz) + 17) { a.setH(cx, cz, 12); a.setM(cx, cz, MAT.planks); } }
  g.slopeMat(MAT.dirt, 3, [MAT.sand, MAT.savanna, MAT.grass]);
  for (const pz of piers) g.keepClearPath([[xs(pz) - 6, pz], [xs(pz) + 17, pz]], 2.2);
  // ships moored between and beside the piers (they float on the water plane and bob)
  const spots = [[-W * 0.36, 12, 0.1], [-W * 0.2, 14, -0.08], [-W * 0.065, 15, 0.12], [W * 0.065, 14, 0.05], [W * 0.2, 13, -0.1], [W * 0.36, 12, 0.1], [0, 24, 0.15]];
  spots.forEach(([z, dx, j], i) => g.put('ship', xs(z) + dx, z + (i === 6 ? 7 : 0), { force: true, noSpacing: true, water: true, r: Math.PI / 2 + j + (i % 2 ? Math.PI : 0), s: 1.15, v: i & 3 }));
  g.put('tower', xs(-W * 0.44) - 2, -W * 0.44, { force: true, s: 1.25, v: 1, r: Math.PI / 2, flatten: true });
  // harbour clutter: crate/barrel piles at the pier heads, torches along the piers, a market camp
  const F = { force: true, noSpacing: true, noSym: true };
  for (const pz of piers) {
    for (let i = 0; i < 4; i++) g.put('torch', xs(pz) + 1 + i * 4.2, pz + (i & 1 ? 0.85 : -0.85), Object.assign({ s: 1.4, v: i & 1 ? 1 : 0 }, F));
    [[-5.5, 2.4, 'crate'], [-5.5, 3.6, 'barrel'], [-4.2, 2.8, 'crate'], [-6.4, -2.6, 'barrel'], [-5.1, -3.1, 'barrel'], [15.5, 0.8, 'crate'], [15.8, -0.9, 'barrel']].forEach(([dx, dz, t], i) => g.put(t, xs(pz) + dx, pz + dz, Object.assign({ s: 1.1, v: i & 3 }, F)));
  }
  g.put('tent', -W * 0.3, -W * 0.06, Object.assign({ r: 0.4, s: 1.2, v: 0 }, F)); g.put('tent', -W * 0.27, W * 0.06, Object.assign({ r: -0.5, s: 1.2, v: 2 }, F)); g.put('tent', -W * 0.34, 0.8, Object.assign({ r: 1.5, s: 1.2, v: 1 }, F)); g.put('campfire', -W * 0.28, 0, Object.assign({ s: 1.2, v: 0 }, F));
  g.groves({ palm: 6, bush: 2, rock_small: 1 }, 5, 4, 3.4, { region: (x, z) => x > xs(z) - 12 && x < xs(z) - 2, scale: [1, 1.35] });
  g.scatter({ crate: 2, barrel: 2, rock_small: 2, bush: 3, tree_cypress: 2, tree_olive: 2 }, 26, { region: (x, z) => x < xs(z) - 5, scale: [0.95, 1.3] });
};

// ------------------------------------------------------------------ teutoburg
R.teutoburg = (g) => {
  const a = g.a, W = g.W;
  a.biome = 'grass'; a.env = { time: 7, weather: 'fog', fog: 0.3, theme: 'barbarian', wind: 0.3, mood: 'auto' };
  g.setZones(0.31, 0.46, 0.2);
  const lane = curve((x) => Math.sin(x / 16 + 0.6) * 9 + Math.sin(x / 7) * 1.5, -W / 2, W / 2, 28);
  g.fill((x, z) => 14 + smoothstep(-0.2, 0.5, g.fbm(x, z, 30, 2) * 1.3) * 6 + g.fbm(x, z, 12, 2) * 0.8, (x, z, h) => { const d = distPoly(x, z, lane); if (d < 1.6) return MAT.mud; const n = g.fbm(x, z, 5, 2); return n > 0.25 ? MAT.moss : g.fbm(x + 9, z, 7, 2) > 0.5 ? MAT.mud : MAT.grass; });
  g.smooth(1); g.flatZones(9, 2); g.terrace(2, 0.3); g.commit();
  g.slopeMat(MAT.dirt, 2, [MAT.grass, MAT.moss]);
  g.keepClearPath(lane, 2.4);
  g.raw('tent', -W * 0.46, -9, { r: 0.5, s: 1.3, v: 0 }); g.raw('tent', W * 0.46, 12, { r: 2.5, s: 1.3, v: 1 }); g.raw('campfire', -W * 0.44, -3, { s: 1.2, v: 0 }); g.raw('campfire', W * 0.43, 7, { s: 1.2, v: 1 });
  g.raw('banner_post', -W * 0.4, 8, { s: 1.2, v: 3 }); g.raw('banner_post', W * 0.4, -7, { s: 1.2, v: 0 });
  // READABILITY (docs/sheets look gate + tests/props/readability.test.mjs): the default battle camera looks down at ~37 degrees, so any tree taller than a
  // head hides soldiers within ~5 u behind it. The forest is therefore a WALL around a glade: a deep clearing of ~0.27 W each side of the lane covering both
  // zones and the whole corridor (only small young trees, bushes, logs and rocks inside), the dense old-growth forest starts beyond it and fills the edges
  // and the ends behind the camps.
  const glade = (x, z) => 1 - smoothstep(W * 0.265, W * 0.37, Math.hypot(Math.max(0, Math.abs(x) - W * 0.46) * 1.6, Math.abs(z)));
  const forest = (x, z) => (1 - glade(x, z)) * (0.6 + 0.45 * g.fbm(x + 40, z, 15, 2) + smoothstep(14, 40, distPoly(x, z, lane)) * 0.2);
  g.scatter({ tree_pine: 5, tree_oak: 4, bush: 2 }, 440, { density: forest, scale: [0.95, 1.6], gap: 1.1, maxSlope: 3 });
  g.scatter({ log: 2, bush: 3, rock_small: 2, rock_big: 1, tree_dead: 1 }, 36, { density: forest, scale: [0.9, 1.4] });
  // the glade: a few small trees in loose clumps (kept off the lane and the zones), bushes and fallen logs for cover and colour
  g.groves({ tree_oak: 3, tree_pine: 3, tree_olive: 1, bush: 4 }, 11, 4, 3.4, { region: (x, z) => Math.abs(z) > 10 && Math.abs(x) < W * 0.42, scale: [0.65, 0.95], gap: 1.5 });
  g.scatter({ bush: 4, log: 1, rock_small: 2, rock_big: 1, tree_dead: 1 }, 28, { region: (x, z) => glade(x, z) > 0.5, scale: [0.8, 1.2] });
  g.scatter({ bones: 1, skull_pile: 1, log: 1 }, 6, { region: (x, z) => distPoly(x, z, lane) < 6, scale: [1, 1.3] });
};

// ------------------------------------------------------------------ alpine
R.alpine = (g) => {
  const a = g.a, W = g.W;
  a.biome = 'snow'; a.env = { time: 13, weather: 'snow', fog: 0.35, theme: 'carthage', wind: 0.6, mood: 'auto' };
  g.setZones(0.31, 0.3, 0.2);
  const zc = (x) => Math.sin(x / 23) * 7 + Math.sin(x / 9) * 1.2;
  g.fill((x, z) => {
    const dz = z - zc(x), d = Math.abs(dz) - W * 0.12;                                  // distance beyond the pass floor
    let h = 17 + g.fbm(x, z, 14, 2) * 1.6;
    if (d > 0) { const m = g.ridged(x, z, 24, 4), tall = dz < 0 ? 1 : 0.55; h += (smoothstep(0, 22, d) * (13 + m * 15) + smoothstep(0, 5, d) * 6) * g.hs * tall; }
    return h;
  }, (x, z, h) => (h > 44 ? MAT.stone : h > 38 && g.fbm(x, z, 4, 2) > 0.2 ? MAT.stone : MAT.snow));
  g.smooth(1);
  for (const k of ['A', 'B']) a.zones[k].z = zc(a.zones[k].x);
  g.flatZones(9, 2, { A: 18, B: 18 }); g.terrace(2, 0.4); g.commit();
  g.slopeMat(MAT.stone, 5, [MAT.snow]);
  g.keepClearPath(curve(zc, -W * 0.48, W * 0.48, 20), 3);
  g.groves({ tree_pine: 9, rock_small: 2, bush: 1 }, 7, 7, 4.5, { region: (x, z) => Math.abs(z - zc(x)) > W * 0.1, scale: [0.95, 1.5] });
  g.scatter({ rock_big: 2, rock_small: 3, bones: 1, tree_dead: 1 }, 24, { scale: [0.9, 1.5] });
  g.raw('campfire', -W * 0.43, zc(-W * 0.43) + 3, { s: 1.2, v: 0 }); g.raw('campfire', W * 0.43, zc(W * 0.43) - 3, { s: 1.2, v: 2 });
  g.raw('tent', -W * 0.45, zc(-W * 0.45) - 5, { s: 1.2, r: 0.3, v: 1 }); g.raw('tent', W * 0.45, zc(W * 0.45) + 5, { s: 1.2, r: 2.9, v: 0 });
};

// ------------------------------------------------------------------ olympus
/** A marble plateau above a sea of clouds: sun mosaic plaza, 14 columns, temple and Zeus statue, floating cloud islands. Mirror symmetric (x). */
R.olympus = (g) => {
  const a = g.a, W = g.W; g.sym = 'mx';
  a.biome = 'marble'; a.env = { time: 16.8, weather: 'cloudy', fog: 0.1, theme: 'mythic', wind: 0.2, mood: 'auto' };
  const rad = W * 0.43;
  g.setZones(0.2, 0.4, 0.15);
  const puff = g.S((x, z) => Math.max(0, g.fbm(x, z, 7, 2)) * 5.2 + g.fbm(x + 10, z, 17, 2) * 1.3), moss = g.S((x, z) => g.fbm(x, z, 6, 2));
  g.fill((x, z) => {
    const d = Math.hypot(x, z);
    if (d < rad) return 32 + (d > rad * 0.86 ? 0.4 : 0);
    return 3 + puff(x, z) * 0.8 + (1 - smoothstep(rad, rad + 3, d)) * 2;
  }, (x, z) => { const d = Math.hypot(x, z); return d >= rad ? MAT.snow : d > rad * 0.8 ? MAT.moss : MAT.marble; });
  g.terrace(2, 0.4); g.commit(1);
  g.paint((x, z, h, s) => {
    const d = Math.hypot(x, z);
    if (d >= rad) return MAT.snow;
    if (d > rad * 0.97) return MAT.marble;
    if (d < rad * 0.2) { const sec = Math.floor((Math.atan2(z, x) + Math.PI) / (TAU / 16)); return (sec & 1) ? MAT.sandstone : MAT.marble; }      // sun mosaic
    if (d < rad * 0.24) return MAT.cobble;
    if (d > rad * 0.8) return moss(x, z) > 0.45 ? MAT.marble : MAT.moss;
    return ((Math.floor(Math.abs(x) / 4) + Math.floor(z / 4)) & 1) ? MAT.marble : MAT.cobble;
  });
  g.keepClear(0, -W * 0.28, 8.2); g.keepClear(0, W * 0.26, 4.2);
  const F = { force: true, noSpacing: true };
  g.raw('temple', 0, -W * 0.3, { r: 0, s: 1.15, v: 0 }); g.raw('statue_zeus', 0, W * 0.27, { r: Math.PI, s: 1.1, v: 0 });
  for (let i = 0; i < 7; i++) {                                                       // 14 columns on a ring, built for the x >= 0 half; zones leave gaps
    const th = (i + 0.5) / 14 * TAU - Math.PI / 2, x = Math.cos(th) * W * 0.335, z = Math.sin(th) * W * 0.335;
    if (Math.hypot(x, z + W * 0.3) < 9 || Math.hypot(x, z - W * 0.27) < 5.5) continue;
    g.put('column_marble', x, z, Object.assign({ s: 1.45, v: i & 3, r: 0 }, F));
  }
  for (let i = 0; i < 4; i++) { const th = (i + 0.5) / 8 * TAU - Math.PI / 2, x = Math.cos(th) * W * 0.16, z = Math.sin(th) * W * 0.16; g.put('torch', x, z, Object.assign({ s: 1.4, v: 2 }, F)); }
  g.put('statue_lion', 6, -W * 0.16, Object.assign({ r: 0, s: 1.25, v: 2 }, F));
  g.put('banner_post', 8.6, W * 0.2, Object.assign({ s: 1.4, v: 1 }, F));
  g.scatter({ column_broken: 1, tree_olive: 2, bush: 3, rock_small: 1 }, 22, { region: (x, z) => Math.hypot(x, z) > rad * 0.8 && Math.hypot(x, z) < rad * 0.95, scale: [1, 1.3] });
  // cloud islands drifting over the cloud sea
  for (const [x, z, s, v] of [[W * 0.45, W * 0.36, 2.1, 0], [W * 0.4, -W * 0.44, 1.7, 1], [W * 0.46, -W * 0.05, 1.5, 3]]) g.put('cloud_island', x, z, Object.assign({ s, v, r: 0.4 }, F));
};

// ------------------------------------------------------------------ troy
R.troy = (g) => {
  const a = g.a, W = g.W;
  a.biome = 'sand'; a.env = { time: 18.3, weather: 'clear', fog: 0.22, theme: 'greek', wind: 0.35, mood: 'auto' };
  const edge = W * 0.075, top = 21, low = 14, gate = 4.4;                              // plateau edge x, heights in steps, half gate width
  const ramp = (x, z) => 1 - smoothstep(gate + 1.5, gate + 5, Math.abs(z));          // 1 inside the gate lane
  g.fill((x, z) => {
    const rise = smoothstep(edge - 0.6, edge + 0.6, x), lane = ramp(x, z), up = rise * (1 - lane) + smoothstep(-W * 0.04, edge - 0.4, x) * lane;
    return low + g.fbm(x, z, 24, 3) * 1.1 + up * (top - low) + (x > edge ? g.fbm(x, z, 10, 2) * 0.5 : 0);
  }, (x, z, h) => (x > edge - 0.2 || (h > low + 1 && Math.abs(z) < gate + 4)) ? MAT.cobble : (g.fbm(x, z, 6, 2) > 0.3 ? MAT.dirt : MAT.sand));
  a.zones = { A: { x: -W * 0.3, z: 0, w: W * 0.2, d: W * 0.58 }, B: { x: W * 0.32, z: 0, w: W * 0.14, d: W * 0.5 } };
  g.smooth(1); g.flatZones(6, 1, { A: low, B: top });
  g.terrace(2, 0.2); g.commit();
  g.slopeMat(MAT.dirt, 2, [MAT.sand]);
  // the walls: segments tile along z on the plateau lip, a gate arch with two doors, towers beside the gate and every ~14 u
  const wx = edge + 2.4, seg = 2.6 * 0.995;
  g.levelStrip(wx, -W / 2, wx, W / 2, 2.8, top);
  g.keepClearPath([[-W * 0.4, 0], [W * 0.4, 0]], 3);
  for (const sg of [-1, 1]) {
    const z0 = sg * 8.7, z1 = sg * (W / 2 - 2.2), n = Math.max(1, Math.floor(Math.abs(z1 - z0) / seg));
    for (let i = 0; i <= n; i++) g.raw('wall_stone', wx, lerp(z0, z1, i / n), { r: Math.PI / 2, s: 1.3, v: 1 });
    g.raw('tower', wx, sg * 6.9, { s: 1.35 * clamp(W / 96, 0.85, 1.1), v: 1, r: sg > 0 ? Math.PI : 0 });
    for (const f of (W >= 90 ? [0.17, 0.33] : [0.33])) g.raw('tower', wx, sg * W * f * 1.3, { s: 1.3 * clamp(W / 96, 0.85, 1.1), v: 1, r: Math.PI / 2 * (sg > 0 ? -1 : 1) });
    g.raw('gate_door', wx, sg * 2.0, { r: Math.PI / 2, s: 0.9, v: sg > 0 ? 1 : 0 });
  }
  g.raw('arch_gate', wx, 0, { r: Math.PI / 2, s: 1.0, v: 0 });
  const F = { force: true, noSpacing: true, noSym: true };
  g.put('torch', wx - 3.4, -4.6, Object.assign({ s: 1.5, v: 1 }, F)); g.put('torch', wx - 3.4, 4.6, Object.assign({ s: 1.5, v: 1 }, F));
  g.put('banner_post', wx + 3.2, -4.8, Object.assign({ s: 1.4, v: 0 }, F)); g.put('banner_post', wx + 3.2, 4.8, Object.assign({ s: 1.4, v: 0 }, F));
  // the besiegers' camp on the plain and the city behind the walls
  for (const [x, z, r, v] of [[-W * 0.46, -W * 0.2, 0.5, 0], [-W * 0.46, W * 0.1, -0.4, 1], [-W * 0.44, W * 0.26, 0.9, 2], [-W * 0.45, -W * 0.38, 0.2, 3]]) g.put('tent', x, z, Object.assign({ r, v, s: 1.2 }, F));
  for (const [x, z] of [[-W * 0.42, -W * 0.18], [-W * 0.42, W * 0.18], [-W * 0.4, 0]]) g.put('campfire', x, z, Object.assign({ s: 1.2, v: 0 }, F));
  g.scatter({ crate: 2, barrel: 2, rock_small: 2, bush: 3 }, 16, { region: (x, z) => x < edge - 3, scale: [1, 1.3] });
  g.scatter({ rock_big: 1, tree_olive: 2, tree_cypress: 1, bush: 2 }, 14, { region: (x, z) => x < edge - 3 && x > -W * 0.2, scale: [1, 1.3] });
  g.groves({ tent: 1, crate: 2, barrel: 2, torch: 1, banner_post: 1, column_broken: 1 }, 5, 4, 3, { region: (x, z) => x > wx + 4 && x < W * 0.215, scale: [1, 1.3] });
  for (const sz of [-1, 1]) { g.put('statue_lion', W * 0.16, sz * 7.5, Object.assign({ r: -Math.PI / 2, s: 1.1, v: 0 }, F)); g.put('column_marble', wx + 5 + 5.4 * 0, sz * 11, Object.assign({ s: 1.3, v: 1 }, F)); g.put('column_marble', wx + 11, sz * 11, Object.assign({ s: 1.3, v: 1 }, F)); }
  g.put('temple', W * 0.455, 0, Object.assign({ r: -Math.PI / 2, s: 0.8, v: 0 }, F));
  for (const sz of [-1, 1]) g.put('tree_olive', W * 0.3, sz * W * 0.3, Object.assign({ s: 1.2, v: 0 }, F));
};

// ------------------------------------------------------------------ styx
R.styx = (g) => {
  const a = g.a, W = g.W;
  a.biome = 'ash'; a.env = { time: 19.4, weather: 'fog', fog: 0.34, theme: 'mythic', wind: 0.1, mood: 'auto' };   // late dusk: dark enough for the lava glow, light enough to read units
  a.water = 9; a.lava = true;
  g.setZones(0.31, 0.6, 0.2);
  const xr = (z) => Math.sin(z / 13) * 6 + Math.sin(z / 5.2) * 1.2, rw = (z) => 4.0 + Math.sin(z / 9) * 0.9;
  const bz = [-W * 0.1, W * 0.1];
  g.fill((x, z) => {
    const d = Math.abs(x - xr(z)), w = rw(z);
    let h = 15 + g.ridged(x, z, 16, 3) * 5.5 + g.fbm(x, z, 8, 2) * 0.8;
    h = lerp(5.5, h, smoothstep(w - 0.2, w + 3.4, d));
    return h;
  }, (x, z, h) => { const d = Math.abs(x - xr(z)); if (d < rw(z) + 0.2) return MAT.lava; if (d < rw(z) + 2.4) return MAT.blood; return g.fbm(x, z, 6, 2) > -0.15 ? MAT.stone : g.fbm(x + 7, z, 5, 2) > 0.2 ? MAT.cobble : MAT.ash; });
  g.smooth(1); g.flatZones(8, 2, { A: 16, B: 16 });
  // bone bridges: a 3.2 u marble deck at 16 steps (8 u) across the river; both banks are levelled to 16 around the approach so units walk straight on
  const BH = 16;
  for (let cz = 0; cz < g.n; cz++) for (let cx = 0; cx < g.n; cx++) {
    const i = cx + cz * g.n, x = a.worldX(cx), z = a.worldZ(cz);
    for (const b of bz) {
      const dz = Math.abs(z - b); if (dz > 5.2) continue;
      const d = Math.abs(x - xr(z)), w = rw(z);
      if (dz < 1.6 && d < w + 3.6) { g.F[i] = BH; g.M[i] = d < w + 1 ? MAT.marble : MAT.stone; }
      else if (d > w + 0.6) g.F[i] = lerp(g.F[i], BH, 1 - smoothstep(1.6, 5.2, dz));
    }
  }
  g.terrace(2, 0.35); g.commit(2, 30);
  for (const b of bz) for (let cz = 0; cz < a.size; cz++) for (let cx = 0; cx < a.size; cx++) { const x = a.worldX(cx), z = a.worldZ(cz); if (Math.abs(z - b) < 1.6 && Math.abs(x - xr(b)) < rw(b) + 3.6) { a.setH(cx, cz, BH); a.setM(cx, cz, (Math.abs(x - xr(b)) < rw(b) + 1) ? MAT.marble : MAT.stone); } }
  g.slopeMat(MAT.stone, 3, [MAT.ash]);
  for (const b of bz) g.keepClearPath([[xr(b) - rw(b) - 5, b], [xr(b) + rw(b) + 5, b]], 2.6);
  a.hazards.push({ t: 'geyser', x: xr(-W * 0.22) + 9, z: -W * 0.22, r: 2.6 }, { t: 'geyser', x: xr(W * 0.22) - 9, z: W * 0.22, r: 2.6 });
  for (const b of bz) {
    for (const sg of [-1, 1]) { g.raw('skull_pile', xr(b) + sg * (rw(b) + 4.6), b + 2.2, { s: 1.3, v: 1, r: sg }); g.raw('bones', xr(b) + sg * (rw(b) + 5.4), b - 2.4, { s: 1.4, v: 2, r: 0.4 * sg }); }
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) g.put('torch', xr(b) + dx * 2.6, b + dz * 1.0, { force: true, noSpacing: true, noSym: true, s: 1.5, v: 3 });
  }
  for (const hz of a.hazards) for (let i = 0; i < 5; i++) { const px = hz.x + Math.cos(i * 1.26) * (hz.r + 1.4), pz = hz.z + Math.sin(i * 1.26) * (hz.r + 1.4); g.put('rock_small', px, pz, { noSym: true, noSpacing: true, s: 1.2, v: i & 3, margin: 1 }); }
  g.groves({ tree_dead: 5, bones: 2, skull_pile: 1, rock_big: 1, rock_small: 1 }, 7, 5, 4, { scale: [1, 1.5], region: (x, z) => Math.abs(x - xr(z)) > rw(z) + 5 });
  g.scatter({ torch: 1, rock_big: 1, rock_small: 2, bones: 1 }, 24, { region: (x, z) => Math.abs(x - xr(z)) > rw(z) + 4, scale: [1, 1.4] });
};

// ------------------------------------------------------------------ cyclops
/** A green island in a blue sea with a stony highland, the cave on its southern face and goat pens on the meadow. (mirror symmetric about x) */
R.cyclops = (g) => {
  const a = g.a, W = g.W; g.sym = 'mx';
  a.biome = 'grass'; a.env = { time: 8.5, weather: 'clear', fog: 0.16, theme: 'mythic', wind: 0.4, mood: 'auto' };
  a.water = 9;
  const rad = W * 0.43, wob = g.S((x, z) => g.fbm(x, z, 14, 3)), hi = g.S((x, z) => g.fbm(x + 7, z, 12, 2));
  const hc = [0, -W * 0.14];
  g.fill((x, z) => {
    const d = Math.hypot(x, z) + wob(x, z) * 5, land = 1 - smoothstep(rad * 0.74, rad, d);
    const dh = Math.hypot(x - hc[0], (z - hc[1]) * 1.15), hill = 1 - smoothstep(W * 0.1, W * 0.2, dh);
    return 6 + land * (7.5 + hi(x, z) * 1.2) + hill * 8 * land;
  }, (x, z, h) => { const d = Math.hypot(x, z) + wob(x, z) * 5; if (h < 11.3) return MAT.sand; if (h > 19.5) return g.fbm(x, z, 5, 2) > 0.2 ? MAT.stone : MAT.moss; return MAT.grass; });
  g.setZones(0.27, 0.42, 0.18);
  g.smooth(1); g.flatZones(8, 1, { A: 14, B: 14 }); g.terrace(2, 0.4); g.commit();
  g.slopeMat(MAT.stone, 3, [MAT.grass]);
  const cave = [0, hc[1] + W * 0.145];
  g.levelDisc(cave[0], cave[1], 4.4, a.getH(a.cx(cave[0]), a.cz(cave[1])));
  g.raw('cave_mouth', cave[0], cave[1], { r: 0, s: 1.55, v: 1 }); g.keepClear(cave[0], cave[1], 6.5);
  g.put('skull_pile', 4.6, cave[1] + 6.5, { s: 1.2, v: 1, force: true, noSpacing: true }); g.put('bones', 6.2, cave[1] + 5.2, { s: 1.3, v: 0, r: 0.5, force: true, noSpacing: true });
  g.put('goat_pen', -W * 0.17, W * 0.2, { s: 1.4, v: 0, flatten: true, r: 0.2 }); g.put('goat_pen', -W * 0.2, -W * 0.2, { s: 1.3, v: 1, flatten: true, r: -0.3 });
  g.groves({ tree_olive: 6, bush: 3, rock_small: 1 }, 6, 6, 4, { scale: [1, 1.3] });
  g.groves({ palm: 4, bush: 1, rock_small: 1 }, 5, 4, 3, { region: (x, z) => a.getH(a.cx(x), a.cz(z)) < 13, shore: 1, scale: [1, 1.3] });
  g.scatter({ rock_big: 2, rock_small: 3, bones: 1, bush: 2 }, 22, { scale: [0.9, 1.5] });
};

// ------------------------------------------------------------------ oasis
R.oasis = (g) => {
  const a = g.a, W = g.W; g.sym = 'rot';
  a.biome = 'sand'; a.env = { time: 12, weather: 'clear', fog: 0.1, theme: 'egypt', wind: 0.3, mood: 'auto' };
  a.water = 10;
  const dune = g.S((x, z) => g.ridged(x * 0.9 + z * 0.4, z * 1.2 - x * 0.2, 26, 2)), sn8 = g.S((x, z) => g.fbm(x, z, 8, 2)), sn5 = g.S((x, z) => g.fbm(x, z, 5, 1)), sn10 = g.S((x, z) => g.fbm(x, z, 10, 2));
  g.setZones(0.31, 0.4, 0.15);
  g.fill((x, z) => { const d = Math.hypot(x, z); return d < 9.5 ? 7 + smoothstep(5, 9.5, d) * 5.5 : 12.5 + smoothstep(10, 22, d) * (dune(x, z) * 5 - 0.8) + sn8(x, z) * 0.4; }, (x, z) => { const d = Math.hypot(x, z); if (d < 12.5) return d < 8.5 ? MAT.mud : MAT.grass; if (d < 15) return sn5(x, z) > 0.1 ? MAT.grass : MAT.sand; return sn10(x, z) > 0.4 ? MAT.sandstone : MAT.sand; });
  g.smooth(1); g.flatZones(8, 2, { A: 14, B: 14 }); g.terrace(2, 0.3); g.commit();
  g.slopeMat(MAT.sandstone, 2, [MAT.sand]);
  const F = { force: true, noSpacing: true };
  for (let i = 0; i < (W < 90 ? 3 : 4); i++) { const th = (W < 90 ? (i + 0.5) / 6 : (i + 0.5) / 8) * TAU; g.put('palm', Math.cos(th) * 12.4, Math.sin(th) * 12.4, Object.assign({ s: 1.15, v: i & 3, r: th }, F)); }
  for (const t of [0.6, 2.0]) g.put('reeds', Math.cos(t) * 9.4, Math.sin(t) * 9.4, Object.assign({ s: 1.3, v: 2 }, F));
  g.put('tent', -17, 8, Object.assign({ r: 0.6, s: 1.1, v: 0 }, F)); g.put('campfire', -16, 3.2, Object.assign({ v: 0, s: 1.1 }, F));
  g.keepClear(0, 0, 0);
  g.scatter({ cactus: 2, rock_small: 2, bones: 1, bush: 2, rock_big: 1 }, 26, { region: (x, z) => Math.hypot(x, z) > 15, scale: [0.9, 1.4] });
  g.groves({ palm: 3, bush: 2 }, 4, 3, 2.6, { region: (x, z) => Math.hypot(x, z) > 17, scale: [1, 1.3] });
};

R.arenalab = (g) => {
  const a = g.a;
  a.biome = 'grass'; a.env = { time: 12, weather: 'clear', fog: 0.15, theme: 'greek', wind: 0.2, mood: 'auto' };
  g.setZones(0.28, 0.7, 0.22);
  g.fill(() => 16, () => MAT.grass); g.commit(0);
};

R.random = (g, recipeFn) => {
  const picks = ['marathon', 'nile', 'giza', 'teutoburg', 'alpine', 'oasis', 'cyclops', 'persepolis'];
  const pick = g.rng.int(0, picks.length - 1);
  R[picks[pick]](g);
  g.a.name = 'Random: ' + picks[pick];
};

export const RECIPES = Object.keys(R);

/** Build an arena from a recipe. size: cells per side (64..256) or 'small'|'medium'|'large'. */
export function generateArena(recipe = 'marathon', size = 'medium', seed = 1) {
  const n = typeof size === 'number' ? size : (SIZES[size] || SIZES.medium);
  const a = new Arena(n);
  a.seed = seed >>> 0;
  const rng = new RNG(a.seed * 7919 + 13), noise = new Noise2D(a.seed + 101);
  if (!R[recipe]) throw new Error('Unknown arena recipe ' + recipe);
  a.name = recipe.charAt(0).toUpperCase() + recipe.slice(1);
  const g = new Gen(a, rng, noise);
  R[recipe](g);
  // never leave zones underwater (belt and braces: recipes already keep them dry)
  for (const k of ['A', 'B']) {
    const z = a.zones[k];
    if (a.water > 0) {
      const t = a.water + 2;
      for (let cz = a.cz(z.z - z.d / 2); cz <= a.cz(z.z + z.d / 2); cz++) for (let cx = a.cx(z.x - z.w / 2); cx <= a.cx(z.x + z.w / 2); cx++) if (a.getH(cx, cz) <= a.water) a.setH(cx, cz, t);
    }
  }
  return a;
}
