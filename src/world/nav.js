// Navigation grid + flow fields over an Arena. Pure data/typed arrays.
// Nav cell = 1.0 world unit (2x2 terrain cells). A cell is walkable if its terrain is gentle enough, not deep water/lava, and not covered
// by a blocking prop footprint. Flow fields are Dijkstra distance maps from a set of source cells; units follow the gradient.

import { CELL, HSTEP, MATERIALS } from './arena.js';

export const NAV = 1.0;
const SQ2 = 1.41421356;
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [-1, 1, SQ2], [1, -1, SQ2], [-1, -1, SQ2]];

export class NavGrid {
  constructor(arena) {
    this.arena = arena;
    this.n = Math.floor(arena.size / 2);        // nav cells per side
    this.half = arena.half();
    const N = this.n * this.n;
    this.walk = new Uint8Array(N);               // 1 walkable
    this.hs = new Float32Array(N);               // mean ground height (world units)
    this.cost = new Float32Array(N);             // movement cost multiplier (>= 1)
    this.block = new Uint8Array(N);              // hard prop blocking count (indestructible)
    this.soft = new Uint8Array(N);               // soft blocking count (destructible props: passable for pathing at a high cost, solid until destroyed)
    this.hazard = new Uint8Array(N);             // 0 none, 1 hazard (avoid)
    this.version = 0;
    this.rebuild();
  }
  idx(cx, cz) { return cx + cz * this.n; }
  cellX(x) { return Math.floor((x + this.half) / NAV); }
  cellZ(z) { return Math.floor((z + this.half) / NAV); }
  cx(x) { const c = Math.floor((x + this.half) / NAV); return c < 0 ? 0 : c >= this.n ? this.n - 1 : c; }
  cz(z) { const c = Math.floor((z + this.half) / NAV); return c < 0 ? 0 : c >= this.n ? this.n - 1 : c; }
  worldX(cx) { return (cx + 0.5) * NAV - this.half; }
  worldZ(cz) { return (cz + 0.5) * NAV - this.half; }
  inside(x, z) { return x > -this.half + 0.3 && x < this.half - 0.3 && z > -this.half + 0.3 && z < this.half - 0.3; }

  /** Recompute terrain-derived data for nav cells in the rect (nav-cell coords), or everything. */
  rebuild(rect) {
    const a = this.arena, n = this.n;
    const x0 = rect ? Math.max(0, rect.x0) : 0, x1 = rect ? Math.min(n - 1, rect.x1) : n - 1;
    const z0 = rect ? Math.max(0, rect.z0) : 0, z1 = rect ? Math.min(n - 1, rect.z1) : n - 1;
    const deep = a.water > 0 ? a.water - Math.round(0.8 / HSTEP) : -1;  // below this height (steps) the cell is deep water
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const i = cx + cz * n;
      const tx = cx * 2, tz = cz * 2;
      let mn = 999, mx = -1, sum = 0, lava = false, speed = 1;
      for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
        const h = a.getH(tx + dx, tz + dz);
        if (h < mn) mn = h; if (h > mx) mx = h; sum += h;
        const mat = MATERIALS[a.getM(tx + dx, tz + dz)];
        if (mat.hazard === 'lava') lava = true;
        speed = Math.min(speed, mat.speed);
      }
      const mean = sum / 4;
      this.hs[i] = mean * HSTEP;
      let ok = (mx - mn) <= 3;
      if (a.water > 0) {
        if (mean < deep) ok = false;
        if (a.lava && mean < a.water) ok = false;       // lava: never walkable
      }
      if (lava) ok = false;
      let c = 1 / Math.max(0.4, speed);
      if (a.water > 0 && mean < a.water) c *= 1.7;      // shallow water slows
      this.cost[i] = c;
      this.walk[i] = ok ? 1 : 0;
    }
    // edge passability is handled in neighbour tests (height difference); mark cliff-adjacent cells costlier
    this.version++;
  }
  /** Stamp props and hazards. props: array of {x,z,radius,blocks}. Re-applies fully (cheap). */
  applyProps(props, hazards) {
    this.block.fill(0); this.soft.fill(0); this.hazard.fill(0);
    for (const p of props) {
      if (!p || p.dead || p.blocks === 'none' || !(p.radius > 0)) continue;
      const arr = (p.hp !== undefined && p.hp !== Infinity) ? this.soft : this.block;
      const r = p.radius, c0 = this.cellX(p.x - r), c1 = this.cellX(p.x + r), r0 = this.cellZ(p.z - r), r1 = this.cellZ(p.z + r);
      for (let cz = Math.max(0, r0); cz <= Math.min(this.n - 1, r1); cz++) for (let cx = Math.max(0, c0); cx <= Math.min(this.n - 1, c1); cx++) {
        const dx = this.worldX(cx) - p.x, dz = this.worldZ(cz) - p.z;
        if (dx * dx + dz * dz <= (r + 0.35) * (r + 0.35)) arr[cx + cz * this.n]++;
      }
    }
    for (const h of hazards || []) {
      if (h.t === 'quicksand' || h.t === 'spikes' || h.t === 'fire' || h.t === 'geyser' || h.t === 'boulders') {
        const r = h.r, c0 = this.cellX(h.x - r), c1 = this.cellX(h.x + r), r0 = this.cellZ(h.z - r), r1 = this.cellZ(h.z + r);
        for (let cz = Math.max(0, r0); cz <= Math.min(this.n - 1, r1); cz++) for (let cx = Math.max(0, c0); cx <= Math.min(this.n - 1, c1); cx++) {
          const dx = this.worldX(cx) - h.x, dz = this.worldZ(cz) - h.z;
          if (dx * dx + dz * dz <= r * r) this.hazard[cx + cz * this.n] = 1;
        }
      }
    }
    this.version++;
  }
  /** true if a unit may stand at world (x,z) */
  walkable(x, z) {
    if (!this.inside(x, z)) return false;
    const i = this.cx(x) + this.cz(z) * this.n;
    return this.walk[i] === 1 && this.block[i] === 0 && this.soft[i] === 0;
  }
  /** Can a unit step from nav cell a to neighbour b? (height + walkable) */
  canStep(ax, az, bx, bz) {
    if (bx < 0 || bz < 0 || bx >= this.n || bz >= this.n) return false;
    const j = bx + bz * this.n;
    if (!this.walk[j] || this.block[j] || this.soft[j]) return false;
    const i = ax + az * this.n;
    if (Math.abs(this.hs[j] - this.hs[i]) > 1.0) return false;
    if (ax !== bx && az !== bz) { // diagonal: both orthogonal neighbours must be passable (no corner cutting)
      const k1 = bx + az * this.n, k2 = ax + bz * this.n;
      if (!this.walk[k1] || this.block[k1] || this.soft[k1] || !this.walk[k2] || this.block[k2] || this.soft[k2]) return false;
    }
    return true;
  }
  /** Like canStep but destructible (soft) blockers count as passable (pathing through breakable walls/gates). */
  canStepSoft(ax, az, bx, bz) {
    if (bx < 0 || bz < 0 || bx >= this.n || bz >= this.n) return false;
    const j = bx + bz * this.n;
    if (!this.walk[j] || this.block[j]) return false;
    if (Math.abs(this.hs[j] - this.hs[ax + az * this.n]) > 1.0) return false;
    if (ax !== bx && az !== bz) { const k1 = bx + az * this.n, k2 = ax + bz * this.n; if (!this.walk[k1] || this.block[k1] || !this.walk[k2] || this.block[k2]) return false; }
    return true;
  }
  /** Grid line-of-walk test between two world points (Bresenham over nav cells). */
  clearLine(x0, z0, x1, z1) {
    let cx = this.cellX(x0), cz = this.cellZ(z0); const ex = this.cellX(x1), ez = this.cellZ(z1);
    const dx = Math.abs(ex - cx), dz = Math.abs(ez - cz), sx = cx < ex ? 1 : -1, sz = cz < ez ? 1 : -1;
    let err = dx - dz, px = cx, pz = cz, guard = 0;
    while (guard++ < 400) {
      if (cx === ex && cz === ez) return true;
      const e2 = err * 2;
      let nx = cx, nz = cz;
      if (e2 > -dz) { err -= dz; nx += sx; }
      if (e2 < dx) { err += dx; nz += sz; }
      if (!this.canStep(cx, cz, nx, nz)) return false;
      px = cx; pz = cz; cx = nx; cz = nz;
    }
    return false;
  }
}

/**
 * Distance field from source cells (Dijkstra with a bucket queue: integer costs, circular buckets, no heap, no allocation after construction).
 * dist is in "cell units x cost" (Float32); units follow the descent direction.
 */
const QS = 8;                // cost quantisation (1 cell step = 8 units)
const NBUCKET = 2048;        // > max single step cost
export class FlowField {
  constructor(nav) {
    this.nav = nav;
    const N = nav.n * nav.n;
    this.dist = new Float32Array(N);
    this.idist = new Int32Array(N);
    this.eNode = new Int32Array(N * 6 + 64);
    this.eDist = new Int32Array(N * 6 + 64);
    this.eNext = new Int32Array(N * 6 + 64);
    this.head = new Int32Array(NBUCKET);
    this.version = -1;
    this.valid = false;
  }
  /** sources: Int32Array/array of nav cell indices; count: number of valid entries. maxDist optional cutoff. extra: optional per-cell additive cost. */
  compute(sources, count, maxDist = 1e9, extra = null) {
    const nav = this.nav, n = nav.n, N = n * n, dist = this.dist, idist = this.idist, walk = nav.walk, block = nav.block, soft = nav.soft, cost = nav.cost, haz = nav.hazard, hs = nav.hs;
    const eNode = this.eNode, eDist = this.eDist, eNext = this.eNext, head = this.head, cap = eNode.length;
    const INF = 0x3fffffff, MASK = NBUCKET - 1, limit = maxDist >= 1e8 ? INF : Math.floor(maxDist * QS);
    idist.fill(INF); head.fill(-1);
    let ec = 0, pend = 0;
    for (let s = 0; s < count; s++) {
      const i = sources[s];
      if (idist[i] > 0) { idist[i] = 0; eNode[ec] = i; eDist[ec] = 0; eNext[ec] = head[0]; head[0] = ec++; pend++; }
    }
    let cur = 0;
    while (pend > 0) {
      const b = cur & MASK;
      let e = head[b];
      if (e < 0) { cur++; if (cur > limit) break; continue; }
      head[b] = -1;
      while (e >= 0) {
        const nxt = eNext[e], i = eNode[e];
        pend--;
        if (eDist[e] === idist[i]) {
          const cx = i % n, cz = (i / n) | 0, hi = hs[i];
          for (let k = 0; k < 8; k++) {
            const nb = NB[k], bx = cx + nb[0], bz = cz + nb[1];
            if (bx < 0 || bz < 0 || bx >= n || bz >= n) continue;
            const j = bx + bz * n;
            if (!walk[j] || block[j]) continue;
            const dh = hs[j] - hi; if (dh > 1.0 || dh < -1.0) continue;
            if (nb[0] !== 0 && nb[1] !== 0) { const k1 = bx + cz * n, k2 = cx + bz * n; if (!walk[k1] || block[k1] || !walk[k2] || block[k2]) continue; }
            let c = cost[j] + (haz[j] ? 8 : 0) + (soft[j] ? 30 : 0); if (extra) c += extra[j];
            let step = (nb[2] * c * QS + 0.5) | 0; if (step > 1000) step = 1000; else if (step < 1) step = 1;
            const nd = cur + step;
            if (nd < idist[j] && ec < cap) { idist[j] = nd; eNode[ec] = j; eDist[ec] = nd; const bb = nd & MASK; eNext[ec] = head[bb]; head[bb] = ec++; pend++; }
          }
        }
        e = nxt;
      }
      cur++; if (cur > limit) break;
    }
    for (let i = 0; i < N; i++) { const d = idist[i]; dist[i] = d >= INF ? 1e9 : d / QS; }
    this.version = nav.version; this.valid = true;
  }
  /** Descent direction at a world position, written to out[0..1] (unit vector) ; returns false if no gradient. */
  dir(x, z, out) {
    const nav = this.nav, n = nav.n, dist = this.dist;
    const cx = nav.cx(x), cz = nav.cz(z), i = cx + cz * n;
    let best = dist[i], bx = 0, bz = 0, found = false;
    // blend the two best neighbours for smoother headings than pure 8-way snapping
    let b2 = 1e9, b2x = 0, b2z = 0;
    for (let k = 0; k < 8; k++) {
      const nb = NB[k], x2 = cx + nb[0], z2 = cz + nb[1];
      if (x2 < 0 || z2 < 0 || x2 >= n || z2 >= n) continue;
      if (!nav.canStepSoft(cx, cz, x2, z2)) continue;
      const d = dist[x2 + z2 * n];
      if (d < best) { b2 = best; b2x = bx; b2z = bz; best = d; bx = nb[0]; bz = nb[1]; found = true; }
      else if (d < b2) { b2 = d; b2x = nb[0]; b2z = nb[1]; }
    }
    if (!found) return false;
    let dx = bx, dz = bz;
    if (b2 < 1e8 && (b2x !== 0 || b2z !== 0) && b2 <= best + 1.5) { dx += b2x * 0.5; dz += b2z * 0.5; }
    const l = Math.hypot(dx, dz) || 1;
    out[0] = dx / l; out[1] = dz / l;
    return true;
  }
  distAt(x, z) { const nav = this.nav; return this.dist[nav.cx(x) + nav.cz(z) * nav.n]; }
}
