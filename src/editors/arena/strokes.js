// Arena Builder terrain engine (pure): the cell recorder behind every undoable terrain edit, the brush Stroke (raise/lower, smooth, flatten,
// paint, noise) and the Stamp presets (hill, crater, mesa, trench, island, ridge). Everything works on an Arena's `h` and `m` arrays and
// returns dirty rectangles in cell coordinates so the renderer rebuilds only the chunks that changed.
//
// A stroke captures the original value of every cell it touches (first touch wins), so one undo step per stroke restores the exact
// heightmap and material map. Heights are accumulated in floats while a stroke is open (slow strokes still move the terrain) and
// rounded into the Uint8 height map; materials are painted with a deterministic dither so soft edges look like scatter, not stripes.

import { CELL, HSTEP, MAX_H, MAT } from '../../world/arena.js';
import { Noise2D } from '../../core/rng.js';
import { clamp, lerp, smoothstep, falloffW, brushDist, symCell, symField, canonCell, symWorld, hash01, TAU } from './geom.js';
import { BRUSH } from './consts.js';

/** One height step is HSTEP world units; a dab at strength 1 moves the centre cell by this many steps. */
export const STEP_PER_DAB = 1.0;
export const NOISE_AMP = 2.5;

// ------------------------------------------------------------------------------------------------------------- recorder
/** Records the first-touch value of every cell it writes; `finish()` produces the compact delta used by the undo command. */
export class CellRecorder {
  constructor(arena) {
    this.a = arena; this.n = arena.size;
    const N = this.n * this.n;
    this.T = new Uint8Array(N); this.H0 = new Uint8Array(N); this.M0 = new Uint8Array(N);
    this.list = [];
  }
  touch(i) { if (!this.T[i]) { this.T[i] = 1; this.H0[i] = this.a.h[i]; this.M0[i] = this.a.m[i]; this.list.push(i); } }
  setH(i, v) { this.touch(i); this.a.h[i] = v < 0 ? 0 : v > MAX_H ? MAX_H : Math.round(v); }
  setM(i, m) { this.touch(i); this.a.m[i] = m; }
  /** @returns {{idx:Int32Array,h0:Uint8Array,h1:Uint8Array,m0:Uint8Array,m1:Uint8Array,rect:{x0,z0,x1,z1}}|null} null when nothing changed */
  finish() {
    const a = this.a, n = this.n, keep = [];
    let x0 = n, z0 = n, x1 = -1, z1 = -1;
    for (const i of this.list) {
      if (a.h[i] === this.H0[i] && a.m[i] === this.M0[i]) continue;
      keep.push(i);
      const x = i % n, z = (i / n) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    if (!keep.length) return null;
    const idx = Int32Array.from(keep), h0 = new Uint8Array(idx.length), h1 = new Uint8Array(idx.length), m0 = new Uint8Array(idx.length), m1 = new Uint8Array(idx.length);
    for (let k = 0; k < idx.length; k++) { const i = idx[k]; h0[k] = this.H0[i]; h1[k] = a.h[i]; m0[k] = this.M0[i]; m1[k] = a.m[i]; }
    return { idx, h0, h1, m0, m1, rect: { x0, z0, x1, z1 } };
  }
}

// ------------------------------------------------------------------------------------------------------------- stroke
const DEFAULTS = { radius: BRUSH.radiusDefault, strength: BRUSH.strengthDefault, shape: 'circle', falloff: 'smooth', symmetry: 'off', material: MAT.grass, target: null, seed: 1, noiseScale: 12 };

/** Brush stroke. tool: 'raise' | 'smooth' | 'flatten' | 'paint' | 'noise'. Call dab() repeatedly, then end() for the delta. */
export class Stroke {
  constructor(arena, tool, opts) {
    this.a = arena; this.n = arena.size; this.tool = tool;
    this.o = Object.assign({}, DEFAULTS, opts || {});
    this.rec = new CellRecorder(arena);
    const N = this.n * this.n;
    this.F = new Float32Array(N);       // float heights of touched cells
    this.W = new Float32Array(N);       // weights of the current dab
    this.S = new Int32Array(N);         // dab stamp (which dab last wrote W[i])
    this.dabId = 0; this.cells = []; this.dabs = 0;
    this.target = this.o.target;        // flatten target (height steps); null = sample under the first dab
    this.nz = tool === 'noise' ? new Noise2D(this.o.seed | 0) : null;
    this._field = null;
  }
  /** Current float height of a cell (touched cells keep the stroke's accumulated float). */
  _cur(i) { return this.rec.T[i] ? this.F[i] : this.a.h[i]; }
  _touchF(i) { if (!this.rec.T[i]) { this.rec.touch(i); this.F[i] = this.a.h[i]; } }
  _commitH(i) { const f = clamp(this.F[i], 0, MAX_H); this.F[i] = f; this.a.h[i] = Math.round(f); }

  /** Apply one dab at world (wx, wz). `lower` flips the raise tool. Returns the dirty cell rect or null. */
  dab(wx, wz, lower = false) {
    const a = this.a, n = this.n, o = this.o, half = a.half();
    const u = (wx + half) / CELL, v = (wz + half) / CELL;
    const rc = Math.max(0.6, o.radius / CELL);
    const id = ++this.dabId, S = this.S, W = this.W, cells = this.cells, sym = o.symmetry;
    cells.length = 0;
    let rx0 = n, rz0 = n, rx1 = -1, rz1 = -1;
    // weights are computed for the real dab only; mirrored cells receive the SAME float, so symmetric strokes are exactly symmetric
    const x0 = Math.max(0, Math.floor(u - rc - 1)), x1 = Math.min(n - 1, Math.ceil(u + rc + 1));
    const z0 = Math.max(0, Math.floor(v - rc - 1)), z1 = Math.min(n - 1, Math.ceil(v + rc + 1));
    const put = (i, w) => {
      if (S[i] !== id) { S[i] = id; W[i] = w; cells.push(i); const x = i % n, z = (i / n) | 0; if (x < rx0) rx0 = x; if (x > rx1) rx1 = x; if (z < rz0) rz0 = z; if (z > rz1) rz1 = z; }
      else if (w > W[i]) W[i] = w;
    };
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const d = brushDist(o.shape, x, z, u, v, rc);
      if (d >= 1) continue;
      const w = falloffW(o.falloff, d);
      if (w <= 0.001) continue;
      put(x + z * n, w);
      if (sym !== 'off') put(symCell(sym, x, z, n), w);
    }
    if (!cells.length) return null;
    this.dabs++;
    const s = o.strength;
    switch (this.tool) {
      case 'raise': {
        const k = s * STEP_PER_DAB * (lower ? -1 : 1);
        for (const i of cells) { this._touchF(i); this.F[i] += k * W[i]; this._commitH(i); }
        break;
      }
      case 'smooth': {
        const tmp = new Float32Array(cells.length), cur = (j) => this._cur(j);
        for (let k = 0; k < cells.length; k++) {
          const i = cells[k], cx = i % n, cz = (i / n) | 0;
          let sum = 0, cnt = 0;
          for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
            const xx = clamp(cx + dx, 0, n - 1), zz = clamp(cz + dz, 0, n - 1);
            sum += cur(xx + zz * n); cnt++;
          }
          tmp[k] = lerp(cur(i), sum / cnt, clamp(s * W[i] * 2, 0, 1));
        }
        for (let k = 0; k < cells.length; k++) { const i = cells[k]; this._touchF(i); this.F[i] = tmp[k]; this._commitH(i); }
        break;
      }
      case 'flatten': {
        if (this.target === null || this.target === undefined) this.target = this._cur(clamp(Math.floor(u), 0, n - 1) + clamp(Math.floor(v), 0, n - 1) * n);
        const T = this.target;
        for (const i of cells) { this._touchF(i); this.F[i] = lerp(this.F[i], T, clamp(s * W[i] * 3, 0, 1)); this._commitH(i); }
        break;
      }
      case 'noise': {
        if (!this._field) { const sc = Math.max(2, o.noiseScale), nz = this.nz; this._field = symField(o.symmetry, (pu, pv) => nz.fbm(pu / sc, pv / sc, 3), n); }
        const f = this._field;
        for (const i of cells) { const cx = i % n, cz = (i / n) | 0; this._touchF(i); this.F[i] += s * W[i] * NOISE_AMP * f(cx + 0.5, cz + 0.5); this._commitH(i); }
        break;
      }
      case 'paint': {
        const mat = o.material | 0;
        for (const i of cells) {
          const cx = i % n, cz = (i / n) | 0, c = canonCell(o.symmetry, cx, cz, n);
          if (hash01(c[0], c[1], o.seed) < W[i] * s * 1.0000001 || (s >= 0.999 && W[i] >= 0.999)) { if (a.m[i] !== mat) this.rec.setM(i, mat); }
        }
        break;
      }
      default: break;
    }
    return { x0: rx0, z0: rz0, x1: rx1, z1: rz1 };
  }
  end() { return this.rec.finish(); }
}

// ------------------------------------------------------------------------------------------------------------- stamps
/** Height amplitude (steps) of a stamp for a radius (u) and strength (0..1). */
export function stampAmplitude(radiusU, strength) { const rc = radiusU / CELL; return clamp(rc * 0.35 * (0.4 + 1.2 * strength), 2, 60); }

/**
 * Apply a stamp preset centred on world (wx, wz) with heading `rot`. Records into `rec` and returns the dirty rect (cells) or null.
 * With symmetry the stamp field is combined with its own reflection (cell by cell, from the ORIGINAL heights), so the result is exactly
 * symmetric even where the copies overlap.
 */
export function applyStamp(arena, rec, kind, wx, wz, o) {
  o = Object.assign({ radius: 8, strength: 0.5, rot: 0, symmetry: 'off' }, o || {});
  const n = arena.size, half = arena.half(), R = o.radius / CELL;
  const u = (wx + half) / CELL, v = (wz + half) / CELL, A = stampAmplitude(o.radius, o.strength);
  const reach = (kind === 'crater' ? R * 1.25 : kind === 'trench' || kind === 'ridge' ? R * 1.05 : R) + 1;
  const ci = clamp(Math.floor(u), 0, n - 1) + clamp(Math.floor(v), 0, n - 1) * n;
  const ctx = { R, u, v, A, c: Math.cos(o.rot), s: Math.sin(o.rot), base: arena.h[ci], water: arena.water > 0 ? arena.water : 0 };
  const sym = o.symmetry;
  const boxes = [[Math.max(0, Math.floor(u - reach)), Math.min(n - 1, Math.ceil(u + reach)), Math.max(0, Math.floor(v - reach)), Math.min(n - 1, Math.ceil(v + reach))]];
  if (sym !== 'off') { const [a0, a1, b0, b1] = boxes[0]; boxes.push([sym === 'mz' ? a0 : n - 1 - a1, sym === 'mz' ? a1 : n - 1 - a0, sym === 'mx' ? b0 : n - 1 - b1, sym === 'mx' ? b1 : n - 1 - b0]); }
  // snapshot of the ORIGINAL heights over every box so overlapping copies read the same values
  const seen = new Set(); let rx0 = n, rz0 = n, rx1 = -1, rz1 = -1;
  const region = [];
  for (const [x0, x1, z0, z1] of boxes) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const i = x + z * n; if (seen.has(i)) continue; seen.add(i); region.push(i); }
  const results = [];
  for (const i of region) {
    const x = i % n, z = (i / n) | 0;
    const a = stampContrib(kind, ctx, x, z), mi = sym !== 'off' ? symCell(sym, x, z, n) : -1;
    const b = mi >= 0 ? stampContrib(kind, ctx, mi % n, (mi / n) | 0) : null;
    if (!a && !b) continue;
    const h = arena.h[i];
    let nh = h, mat = -1;
    if (kind === 'mesa') {
      const t = 1 - (1 - (a ? a.t : 0)) * (1 - (b ? b.t : 0)); nh = lerp(h, ctx.base + A, t);
    } else if (kind === 'island') {
      const t = 1 - (1 - (a ? a.t : 0)) * (1 - (b ? b.t : 0)), top = islandTop(ctx);
      nh = Math.max(h, lerp(h, top, t));
      const dd = Math.min(a ? a.dd : 9, b ? b.dd : 9); mat = dd > 0.5 ? MAT.sand : MAT.grass;
    } else nh = h + (a ? a.add : 0) + (b ? b.add : 0);
    results.push([i, clamp(Math.round(nh), 0, MAX_H), mat]);
  }
  for (const [i, nh, mat] of results) {
    let changed = false;
    if (nh !== arena.h[i]) { rec.setH(i, nh); changed = true; }
    if (mat >= 0 && arena.m[i] !== mat) { rec.setM(i, mat); changed = true; }
    if (changed) { const x = i % n, z = (i / n) | 0; if (x < rx0) rx0 = x; if (x > rx1) rx1 = x; if (z < rz0) rz0 = z; if (z > rz1) rz1 = z; }
  }
  return rx1 >= 0 ? { x0: rx0, z0: rz0, x1: rx1, z1: rz1 } : null;
}
const islandTop = (ctx) => (ctx.water ? ctx.water + 2 : ctx.base + ctx.A * 0.5) + ctx.A * 0.15;

/** What the stamp does to cell (x, z) (null = untouched): {add} | {t} (mesa) | {t, dd} (island). */
function stampContrib(kind, ctx, x, z) {
  const { R, u, v, A, c, s } = ctx;
  const dx = x + 0.5 - u, dz = z + 0.5 - v;
  const along = dx * s + dz * c, across = dx * c - dz * s;
  const dd = Math.sqrt(dx * dx + dz * dz) / R;
  switch (kind) {
    case 'hill': { if (dd >= 1) return null; const b = 0.5 + 0.5 * Math.cos(Math.PI * dd); return { add: A * b * b }; }
    case 'crater': {
      if (dd >= 1.25) return null;
      const bowl = dd <= 0.85 ? -A * (1 - (dd / 0.85) * (dd / 0.85)) : 0;
      return { add: bowl + A * 0.35 * Math.exp(-(((dd - 0.97) / 0.17) ** 2)) };
    }
    case 'mesa': { if (dd >= 1) return null; return { t: 1 - smoothstep(0.62, 1.0, dd) }; }
    case 'trench': {
      const a1 = Math.abs(along) / R, c1 = Math.abs(across) / (R * 0.3);
      if (a1 >= 1 || c1 >= 1) return null;
      return { add: -A * (1 - smoothstep(0.7, 1.0, c1)) * (1 - smoothstep(0.85, 1.0, a1)) };
    }
    case 'island': { if (dd >= 1) return null; return { t: 1 - smoothstep(0.5, 1.0, dd), dd }; }
    case 'ridge': {
      const a1 = Math.abs(along) / R, c1 = Math.abs(across) / (R * 0.28);
      if (a1 >= 1 || c1 >= 1) return null;
      return { add: A * Math.pow(1 - c1, 0.9) * (1 - smoothstep(0.55, 1.0, a1)) };
    }
    default: return null;
  }
}

export { TAU };
