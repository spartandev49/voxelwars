// Arena Builder navigation analysis (pure): the nav grid with the real catalog footprints stamped, zone walkability, the A -> B path check for
// unit radii 0.45 and 0.55 (decisions D11 / verification W1), the cheapest-obstacle path used by the "carve a ramp" fix, the ramp carver
// itself (shared with the Ramp / Road tool) and zone levelling. Uses world/nav.js unchanged.
//
// Radius model: the nav grid is 1 u. A unit of radius r needs every cell offset (a, b) whose nearest point is closer than r to be passable,
// so r <= 0.5 fits any single walkable cell column and r = 0.55 needs a corridor at least two cells wide ("close a corridor to the narrower
// radius" is exactly the negative control of W1). Destructible (soft) props count as open, as in the sim.

import { NavGrid, NAV } from '../../world/nav.js';
import { CELL, HSTEP, MAT } from '../../world/arena.js';
import { propInfo } from '../../content/era_ancient/props/catalog.js';
import { clamp, lerp, smoothstep, zoneBox } from './geom.js';

const SQ2 = Math.SQRT2;

/** Props as the sim hands them to nav.applyProps (sim/world.js navProp). */
export function navProps(arena) {
  return arena.props.map((p) => {
    const info = propInfo(p.t), s = p.s || 1;
    return { x: p.x, z: p.z, radius: info ? info.r * s : 0, blocks: info ? info.blocks : 'none', hp: info ? (info.hp === Infinity ? Infinity : info.hp * s) : Infinity };
  });
}
export function buildNav(arena) { const nav = new NavGrid(arena); nav.applyProps(navProps(arena), arena.hazards); return nav; }

/** Nav cell indices whose centre lies inside a zone rect. */
export function zoneNavCells(nav, zn) {
  const b = zoneBox(zn), out = [];
  const c0 = Math.max(0, nav.cellX(b.x0)), c1 = Math.min(nav.n - 1, nav.cellX(b.x1));
  const r0 = Math.max(0, nav.cellZ(b.z0)), r1 = Math.min(nav.n - 1, nav.cellZ(b.z1));
  for (let cz = r0; cz <= r1; cz++) for (let cx = c0; cx <= c1; cx++) {
    const x = nav.worldX(cx), z = nav.worldZ(cz);
    if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) out.push(cx + cz * nav.n);
  }
  return out;
}
/** Cells of a zone where a soldier can actually be placed (the placement rule of Game._validity: walkable, no hard or soft prop). */
export function zoneWalkable(nav, zn) {
  let n = 0;
  for (const i of zoneNavCells(nav, zn)) if (nav.walk[i] === 1 && nav.block[i] === 0 && nav.soft[i] === 0) n++;
  return n;
}

// ------------------------------------------------------------------------------------------------------------- path check
export function clearanceOffsets(r) {
  const out = [], m = Math.ceil(r + 0.5);
  for (let a = -m; a <= m; a++) for (let b = -m; b <= m; b++) {
    if (!a && !b) continue;
    const dx = Math.max(Math.abs(a) - 0.5, 0), dz = Math.max(Math.abs(b) - 0.5, 0);
    if (Math.hypot(dx, dz) < r - 1e-9) out.push([a, b]);
  }
  return out;
}
/** Per-cell "a unit of radius r fits here" mask. */
export function openMask(nav, r) {
  const n = nav.n, N = n * n, open = new Uint8Array(N), offs = clearanceOffsets(r);
  const pass = (i) => nav.walk[i] === 1 && nav.block[i] === 0;
  for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) {
    const i = cx + cz * n;
    if (!pass(i)) continue;
    let ok = true;
    for (let k = 0; k < offs.length && ok; k++) {
      const x = cx + offs[k][0], z = cz + offs[k][1];
      if (x < 0 || z < 0 || x >= n || z >= n) { ok = false; break; }
      const j = x + z * n;
      if (!pass(j)) ok = false;
      else if (Math.abs(offs[k][0]) <= 1 && Math.abs(offs[k][1]) <= 1 && Math.abs(nav.hs[j] - nav.hs[i]) > 1.0) ok = false;
    }
    if (ok) open[i] = 1;
  }
  return open;
}
/** Is there a walkable path from any zone A cell to any zone B cell for a unit of radius r? */
export function pathExists(nav, arena, r) {
  const n = nav.n, N = n * n, open = openMask(nav, r);
  const srcs = zoneNavCells(nav, arena.zones.A).filter((i) => open[i]), goal = new Uint8Array(N);
  let goals = 0;
  for (const i of zoneNavCells(nav, arena.zones.B)) if (open[i]) { goal[i] = 1; goals++; }
  if (!srcs.length || !goals) return { ok: false, sources: srcs.length, goals };
  const seen = new Uint8Array(N), q = new Int32Array(N);
  let qh = 0, qt = 0;
  for (const i of srcs) { seen[i] = 1; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++];
    if (goal[i]) return { ok: true, sources: srcs.length, goals };
    const cx = i % n, cz = (i / n) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= n || z >= n) continue;
      const j = x + z * n;
      if (seen[j] || !open[j] || !nav.canStepSoft(cx, cz, x, z)) continue;
      seen[j] = 1; q[qt++] = j;
    }
  }
  return { ok: false, sources: srcs.length, goals };
}

// ------------------------------------------------------------------------------------------------------------- cheapest path (carve target)
/** Dijkstra over the nav grid where obstacles are expensive instead of forbidden. Returns a smoothed polyline [{x, z}] from zone A to zone B or null. */
export function findCarvePath(nav, arena) {
  const n = nav.n, N = n * n;
  const A = zoneNavCells(nav, arena.zones.A), B = zoneNavCells(nav, arena.zones.B);
  if (!A.length || !B.length) return null;
  const isB = new Uint8Array(N); for (const i of B) isB[i] = 1;
  const dist = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const heap = []; // binary heap of [d, i]
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  for (const i of A) { dist[i] = 0; push(0, i); }
  let goal = -1;
  while (heap.length) {
    const [d, i] = pop();
    if (done[i]) continue; done[i] = 1;
    if (isB[i]) { goal = i; break; }
    const cx = i % n, cz = (i / n) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= n || z >= n) continue;
      const j = x + z * n; if (done[j]) continue;
      let c = nav.walk[j] ? (nav.block[j] ? 8 : (nav.soft[j] ? 1.6 : nav.cost[j])) : 14;
      const dh = Math.abs(nav.hs[j] - nav.hs[i]); if (dh > 1.0) c += 3 + dh * 0.6;
      const nd = d + c * (dx && dz ? SQ2 : 1);
      if (nd < dist[j]) { dist[j] = nd; prev[j] = i; push(nd, j); }
    }
  }
  if (goal < 0) return null;
  const cells = []; for (let i = goal; i >= 0; i = prev[i]) cells.push(i);
  cells.reverse();
  let pts = cells.map((i) => ({ x: nav.worldX(i % n), z: nav.worldZ((i / n) | 0) }));
  // keep one point inside each zone so the ramp reaches them without carving their interiors
  const a = zoneBox(arena.zones.A), b = zoneBox(arena.zones.B), inside = (p, bx) => p.x >= bx.x0 && p.x <= bx.x1 && p.z >= bx.z0 && p.z <= bx.z1;
  let s = 0; while (s + 1 < pts.length && inside(pts[s + 1], a)) s++;
  let e = pts.length - 1; while (e - 1 > s && inside(pts[e - 1], b)) e--;
  pts = pts.slice(s, e + 1);
  // moving-average smoothing (the 8-connected path is jagged)
  const sm = pts.map((p, k) => { let sx = 0, sz = 0, c = 0; for (let j = Math.max(0, k - 3); j <= Math.min(pts.length - 1, k + 3); j++) { sx += pts[j].x; sz += pts[j].z; c++; } return { x: sx / c, z: sz / c }; });
  if (sm.length) { sm[0] = pts[0]; sm[sm.length - 1] = pts[pts.length - 1]; }
  return sm;
}

// ------------------------------------------------------------------------------------------------------------- ramp carving
export const RAMP = { sample: 0.5, maxStepPerSample: 0.75, shoulder: 1.5, width: 4 };

function resample(pts, step) {
  if (!pts.length) return [];
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z));
  const total = cum[cum.length - 1], out = [];
  if (total < 1e-6) return [{ x: pts[0].x, z: pts[0].z }];
  let seg = 1;
  for (let s = 0; s <= total + 1e-9; s += step) {
    while (seg < cum.length - 1 && cum[seg] < s) seg++;
    const a = pts[seg - 1], b = pts[seg], l = cum[seg] - cum[seg - 1] || 1, t = clamp((s - cum[seg - 1]) / l, 0, 1);
    out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  }
  const last = pts[pts.length - 1], lo = out[out.length - 1];
  if (Math.hypot(last.x - lo.x, last.z - lo.z) > 0.05) out.push({ x: last.x, z: last.z });
  return out;
}
/** Smallest-error profile whose steps are at most m per sample: midpoint of the lower and upper Lipschitz hulls. */
export function limitSlope(H, m) {
  const n = H.length, L = H.slice(), U = H.slice();
  for (let k = 1; k < n; k++) L[k] = Math.max(L[k], L[k - 1] - m);
  for (let k = n - 2; k >= 0; k--) L[k] = Math.max(L[k], L[k + 1] - m);
  for (let k = 1; k < n; k++) U[k] = Math.min(U[k], U[k - 1] + m);
  for (let k = n - 2; k >= 0; k--) U[k] = Math.min(U[k], U[k + 1] + m);
  return H.map((_, k) => (L[k] + U[k]) / 2);
}
function distPointSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
/** Props that block movement and sit on (or within a unit radius of) a corridor: the ones a ramp / road must clear. */
export function corridorBlockers(arena, pts, halfWidth) {
  const out = [];
  for (const p of arena.props) {
    const info = propInfo(p.t); if (!info || info.blocks === 'none' || !(info.r > 0)) continue;
    const reach = halfWidth + info.r * (p.s || 1) + 0.35;
    let hit = false;
    for (let k = 1; k < pts.length && !hit; k++) if (distPointSeg(p.x, p.z, pts[k - 1].x, pts[k - 1].z, pts[k].x, pts[k].z) <= reach) hit = true;
    if (pts.length === 1 && Math.hypot(p.x - pts[0].x, p.z - pts[0].z) <= reach) hit = true;
    if (hit) out.push(p);
  }
  return out;
}

/**
 * Cut a walkable ramp along a polyline. Heights follow the terrain as closely as a slope of at most `maxStepPerSample` allows, the corridor
 * is at least `width` u wide with a soft shoulder, never below the water surface, and `paint` lays cobble on the core.
 * Records into `rec`; returns {rect, blockers} (blockers = props the caller should remove) or null for a degenerate line.
 */
export function carveRamp(arena, rec, line, o) {
  o = Object.assign({ width: RAMP.width, shoulder: RAMP.shoulder, paint: true, material: MAT.cobble }, o || {});
  const P = resample(line, RAMP.sample);
  if (P.length < 2) return null;
  const n = arena.size, half = arena.half(), hw = o.width / 2;
  const minDry = arena.water > 0 ? arena.water + 1 : 0;
  const H = P.map((p) => Math.max(arena.heightAt(p.x, p.z) / HSTEP, minDry));
  let D = limitSlope(H, RAMP.maxStepPerSample).map((v) => Math.max(v, minDry));
  // re-close upward only (keeps the dry minimum and the slope limit)
  for (let k = 1; k < D.length; k++) D[k] = Math.max(D[k], D[k - 1] - RAMP.maxStepPerSample);
  for (let k = D.length - 2; k >= 0; k--) D[k] = Math.max(D[k], D[k + 1] - RAMP.maxStepPerSample);
  const reach = hw + o.shoulder;
  let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
  for (const p of P) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z); }
  const cx0 = Math.max(0, Math.floor((minx - reach + half) / CELL)), cx1 = Math.min(n - 1, Math.ceil((maxx + reach + half) / CELL));
  const cz0 = Math.max(0, Math.floor((minz - reach + half) / CELL)), cz1 = Math.min(n - 1, Math.ceil((maxz + reach + half) / CELL));
  const w = cx1 - cx0 + 1, hgt = cz1 - cz0 + 1;
  const best = new Float32Array(w * hgt).fill(Infinity), bestK = new Int32Array(w * hgt).fill(-1);
  const rc = Math.ceil(reach / CELL) + 1;
  for (let k = 0; k < P.length; k++) {
    const pu = (P[k].x + half) / CELL, pv = (P[k].z + half) / CELL;
    for (let z = Math.max(cz0, Math.floor(pv) - rc); z <= Math.min(cz1, Math.floor(pv) + rc); z++) for (let x = Math.max(cx0, Math.floor(pu) - rc); x <= Math.min(cx1, Math.floor(pu) + rc); x++) {
      const d = Math.hypot(x + 0.5 - pu, z + 0.5 - pv) * CELL;
      const li = (x - cx0) + (z - cz0) * w;
      if (d < best[li]) { best[li] = d; bestK[li] = k; }
    }
  }
  let any = false, rx0 = n, rz0 = n, rx1 = -1, rz1 = -1;
  for (let z = cz0; z <= cz1; z++) for (let x = cx0; x <= cx1; x++) {
    const li = (x - cx0) + (z - cz0) * w, d = best[li];
    if (!(d <= reach)) continue;
    const i = x + z * n, t = d <= hw ? 1 : 1 - smoothstep(0, o.shoulder, d - hw);
    const nh = lerp(arena.h[i], D[bestK[li]], t);
    const rounded = clamp(Math.round(nh), 0, 120);
    if (rounded !== arena.h[i]) { rec.setH(i, rounded); any = true; }
    if (d <= hw && (o.paint || arena.m[i] === MAT.lava) && arena.m[i] !== o.material) { rec.setM(i, o.material); any = true; }
    if (x < rx0) rx0 = x; if (x > rx1) rx1 = x; if (z < rz0) rz0 = z; if (z > rz1) rz1 = z;
  }
  return { rect: rx1 >= 0 ? { x0: rx0, z0: rz0, x1: rx1, z1: rz1 } : null, blockers: corridorBlockers(arena, P, hw), changed: any };
}

// ------------------------------------------------------------------------------------------------------------- zone levelling
/** Median terrain height (steps) inside a zone rect. */
export function zoneMedian(arena, zn) {
  const b = zoneBox(zn), v = [];
  const x0 = Math.max(0, arena.cx(b.x0)), x1 = Math.min(arena.size - 1, arena.cx(b.x1)), z0 = Math.max(0, arena.cz(b.z0)), z1 = Math.min(arena.size - 1, arena.cz(b.z1));
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) v.push(arena.h[x + z * arena.size]);
  if (!v.length) return 0;
  v.sort((p, q) => p - q);
  return v[v.length >> 1];
}
/**
 * Make a zone placeable: flatten it (with a soft shoulder), lift it above the water, replace lava with dirt. Records into `rec`;
 * returns {rect, blockers} where blockers are the props that cover the zone and should be removed.
 */
export function levelZone(arena, rec, zn, o) {
  o = Object.assign({ margin: 3 }, o || {});
  const n = arena.size, b = zoneBox(zn), half = arena.half();
  const minDry = arena.water > 0 ? arena.water + 1 : 0;
  const target = Math.max(zoneMedian(arena, zn), minDry);
  const x0 = Math.max(0, arena.cx(b.x0 - o.margin)), x1 = Math.min(n - 1, arena.cx(b.x1 + o.margin));
  const z0 = Math.max(0, arena.cz(b.z0 - o.margin)), z1 = Math.min(n - 1, arena.cz(b.z1 + o.margin));
  let any = false;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const wx = arena.worldX(x), wz = arena.worldZ(z);
    const dx = Math.max(0, Math.abs(wx - zn.x) - zn.w / 2), dz = Math.max(0, Math.abs(wz - zn.z) - zn.d / 2);
    const d = Math.hypot(dx, dz), t = d <= 0 ? 1 : 1 - smoothstep(0, o.margin, d);
    if (t <= 0) continue;
    const i = x + z * n, nh = Math.round(lerp(arena.h[i], target, t));
    if (nh !== arena.h[i]) { rec.setH(i, nh); any = true; }
    if (d <= 0 && arena.m[i] === MAT.lava) { rec.setM(i, MAT.dirt); any = true; }
  }
  const blockers = [];
  for (const p of arena.props) {
    const info = propInfo(p.t); if (!info || info.blocks === 'none' || !(info.r > 0)) continue;
    const r = info.r * (p.s || 1) + 0.35;
    if (p.x >= b.x0 - r && p.x <= b.x1 + r && p.z >= b.z0 - r && p.z <= b.z1 + r) blockers.push(p);
  }
  return { rect: { x0, z0, x1, z1 }, blockers, changed: any, target };
}
/** Raise only the submerged cells of a zone (plus a one unit apron) to just above the water. */
export function raiseZone(arena, rec, zn) {
  const n = arena.size, b = zoneBox(zn), minDry = arena.water > 0 ? arena.water + 1 : 0;
  if (!minDry) return null;
  const x0 = Math.max(0, arena.cx(b.x0 - 1)), x1 = Math.min(n - 1, arena.cx(b.x1 + 1)), z0 = Math.max(0, arena.cz(b.z0 - 1)), z1 = Math.min(n - 1, arena.cz(b.z1 + 1));
  let any = false;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const i = x + z * n; if (arena.h[i] < minDry) { rec.setH(i, minDry); any = true; } }
  return { rect: { x0, z0, x1, z1 }, changed: any };
}
/** Number of cells in a zone rect that are below the water surface. */
export function zoneSubmerged(arena, zn) {
  if (!(arena.water > 0)) return 0;
  const n = arena.size, b = zoneBox(zn);
  const x0 = Math.max(0, arena.cx(b.x0)), x1 = Math.min(n - 1, arena.cx(b.x1)), z0 = Math.max(0, arena.cz(b.z0)), z1 = Math.min(n - 1, arena.cz(b.z1));
  let c = 0;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (arena.h[x + z * n] < arena.water) c++;
  return c;
}
export { NAV };
