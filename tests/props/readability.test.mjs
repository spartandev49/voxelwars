// Readability gate (look gate, COORD finding "canopy hides both armies"): in every arena the default battle camera must be able to SEE the
// soldiers. For each recipe x 3 seeds we place the camera exactly like Game.frameArmies + the default rig (yaw -0.7, pitch 0.65, distance from the
// army extent), take ~200 walkable sample points at HEAD height in the army zones and the corridor between them, and ray-test each point
// against the props' visual cover cylinders (catalog height x scale, radius = the equivalent-disc radius of the real voxel model above 1 u, so
// a tree is its canopy, not its trunk). At least 75% of the points must have a clear line of sight to the camera.
// Also: deploy room (every zone is >= 95% walkable with the sim's nav blockers, no blocking prop within 1.5 u of the zone edge).
//   node tests/props/readability.test.mjs [--report] [--seeds 1,3,7] [--size medium] [--yaw -0.7 --pitch 0.65]
import assert from 'node:assert';
const { generateArena, RECIPES } = await import(process.env.GEN || '../../src/world/gen.js');   // GEN=<path> compares another generator revision
import { NavGrid } from '../../src/world/nav.js';
import { PROP_CATALOG } from '../../src/content/era_ancient/props/catalog.js';
import { buildProp, variantCount, isStaticProp } from '../../src/content/era_ancient/props/models/index.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const report = args.includes('--report');
const SEEDS = opt('seeds', '1,3,7').split(',').map(Number);
// medium with the 3 seeds; small and large (the other two size classes) with one seed each unless --sizes / --seeds say otherwise
const PLAN = opt('size', '') ? [[opt('size', ''), SEEDS]] : [['medium', SEEDS], ['small', [3]], ['large', [3]]];
const YAW = +opt('yaw', -0.7), PITCH = +opt('pitch', 0.65), MIN = +opt('min', 0.75), HEAD = 2.4, N = 200;
const REF = { minDist: 6, maxDist: 150 };                                   // CameraRig.limits

// ---- visual cover cylinder per prop type (from the real voxel models; cached)
const OCC = new Map();
function occluderOf(type) {
  if (OCC.has(type)) return OCC.get(type);
  const info = PROP_CATALOG[type]; let best = { r: 0, y0: 0, y1: 0 };
  if (info && info.h >= 1.5) {
    for (let v = 0; v < variantCount(type); v++) {
      const m = buildProp(type, 0, v), p = m.parts[0], g = p.grid, vs = m.voxelSize, ground = p.pivot[1], yLow = Math.round(1.0 / vs) + ground;
      const cols = new Set(); let top = 0, ymin = 1e9;
      for (let y = yLow; y < g.sy; y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) if (g.d[g.idx(x, y, z)]) { cols.add(x + z * g.sx); if (y > top) top = y; if (y < ymin) ymin = y; }
      if (!cols.size) continue;
      const r = Math.sqrt(cols.size * vs * vs / Math.PI), y1 = (top + 1 - ground) * vs, y0 = Math.max(0.6, (ymin - ground) * vs);
      if (r > best.r) best = { r, y0: Math.min(y0, y1 - 0.3), y1 };
    }
  }
  OCC.set(type, best);
  return best;
}

/** Does segment P->Q cross the vertical cylinder (cx,cz,r) between y in [yb,yt]? */
function crosses(px, py, pz, qx, qy, qz, cx, cz, r, yb, yt) {
  const dx = qx - px, dy = qy - py, dz = qz - pz, fx = px - cx, fz = pz - cz;
  const a = dx * dx + dz * dz, c = fx * fx + fz * fz - r * r;
  let t0, t1;
  if (a < 1e-9) { if (c > 0) return false; t0 = 0; t1 = 1; }
  else {
    const b = 2 * (fx * dx + fz * dz), disc = b * b - 4 * a * c;
    if (disc < 0) return false;
    const s = Math.sqrt(disc); t0 = (-b - s) / (2 * a); t1 = (-b + s) / (2 * a);
  }
  if (t1 < 0 || t0 > 1) return false;
  t0 = Math.max(0, t0); t1 = Math.min(1, t1);
  const ya = py + dy * t0, yb2 = py + dy * t1, lo = Math.min(ya, yb2), hi = Math.max(ya, yb2);
  return hi >= yb && lo <= yt;
}
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

/** Camera exactly like Game.frameArmies (army extent proxied by the zones shrunk to 70%) + CameraRig._apply. */
export function battleCamera(a, yaw = YAW, pitch = PITCH) {
  const zs = [a.zones.A, a.zones.B];
  let cx = 0, cz = 0; for (const z of zs) { cx += z.x; cz += z.z; } cx /= 2; cz /= 2;
  let r = 0; for (const z of zs) for (const sx of [-1, 1]) for (const sz of [-1, 1]) r = Math.max(r, Math.hypot(z.x + sx * z.w * 0.35 - cx, z.z + sz * z.d * 0.35 - cz));
  const dist = Math.min(REF.maxDist, Math.max(REF.minDist, r * 1.12 + 14)), ty = a.heightAt(cx, cz) + 1, cp = Math.cos(pitch);
  let px = cx + Math.sin(yaw) * cp * dist, py = ty + Math.sin(pitch) * dist, pz = cz + Math.cos(yaw) * cp * dist;
  const g = a.heightAt(px, pz) + 1.4; if (py < g) py = g;
  return { x: px, y: py, z: pz, tx: cx, ty, tz: cz, dist };
}

/** Walkable head-height sample points in both zones and the corridor between them (Halton, deterministic). */
export function samplePoints(a, nav, n = N) {
  const A = a.zones.A, B = a.zones.B, pts = [];
  const x0 = Math.min(A.x - A.w / 2, B.x - B.w / 2), x1 = Math.max(A.x + A.w / 2, B.x + B.w / 2), z0 = Math.min(A.z - A.d / 2, B.z - B.d / 2), z1 = Math.max(A.z + A.d / 2, B.z + B.d / 2);
  const band = Math.min(A.d, B.d) * 0.4, abx = B.x - A.x, abz = B.z - A.z, L2 = abx * abx + abz * abz || 1;
  const inRect = (z, x, zz) => Math.abs(x - z.x) <= z.w * 0.475 && Math.abs(zz - z.z) <= z.d * 0.475;
  for (let i = 1; pts.length < n && i < 40000; i++) {
    const x = x0 + (x1 - x0) * halton(i, 2), zz = z0 + (z1 - z0) * halton(i, 3);
    const t = Math.max(0, Math.min(1, ((x - A.x) * abx + (zz - A.z) * abz) / L2)), d = Math.hypot(x - (A.x + abx * t), zz - (A.z + abz * t));
    if (!(inRect(A, x, zz) || inRect(B, x, zz) || d <= band)) continue;
    if (!nav.walkable(x, zz)) continue;
    pts.push([x, a.cellHeight(x, zz) + HEAD, zz]);
  }
  return pts;
}

export function visibleFraction(a, nav, cam, pts) {
  const cyl = [];
  for (const p of a.props) {
    const info = PROP_CATALOG[p.t]; if (!info) continue;
    const o = occluderOf(p.t); if (o.r <= 0) continue;
    const y = a.cellHeight(p.x, p.z);
    cyl.push([p.x, p.z, o.r * p.s, y + o.y0 * p.s, y + o.y1 * p.s]);
  }
  let clear = 0, terrain = 0;
  for (const q of pts) {
    let hit = false;
    const mnx = Math.min(cam.x, q[0]) - 12, mxx = Math.max(cam.x, q[0]) + 12, mnz = Math.min(cam.z, q[2]) - 12, mxz = Math.max(cam.z, q[2]) + 12;
    for (const c of cyl) {
      if (c[0] < mnx || c[0] > mxx || c[1] < mnz || c[1] > mxz) continue;
      if (c[4] < q[1]) continue;                                            // shorter than a head: cannot hide it from above
      if (crosses(cam.x, cam.y, cam.z, q[0], q[1], q[2], c[0], c[1], c[2], c[3], c[4])) { hit = true; break; }
    }
    if (!hit) clear++;
    // informational: terrain between the camera and the head
    let tb = false; const steps = 40;
    for (let s = 1; s < steps; s++) { const t = s / steps, x = cam.x + (q[0] - cam.x) * t, z = cam.z + (q[2] - cam.z) * t, y = cam.y + (q[1] - cam.y) * t; if (a.cellHeight(x, z) > y) { tb = true; break; } }
    if (tb) terrain++;
  }
  return { fraction: clear / pts.length, terrain: terrain / pts.length, n: pts.length };
}

const rows = []; let fails = 0, checked = 0;
for (const [size, seeds] of PLAN) for (const recipe of RECIPES) {
  if (recipe === 'random') continue;
  const fr = [];
  let terrain = 0, dist = 0;
  for (const seed of seeds) {
    const a = generateArena(recipe, size, seed), tag = `${recipe}/${size}/${seed}`;
    const nav = new NavGrid(a);
    nav.applyProps(a.props.map((p) => { const i = PROP_CATALOG[p.t]; return { x: p.x, z: p.z, radius: i.r * p.s, blocks: i.blocks, hp: i.hp === Infinity ? Infinity : i.hp * p.s }; }), a.hazards);
    const cam = battleCamera(a), pts = samplePoints(a, nav);
    assert.ok(pts.length >= 150, `${tag}: only ${pts.length} walkable sample points`);
    const v = visibleFraction(a, nav, cam, pts);
    fr.push(v.fraction); terrain = v.terrain; dist = cam.dist; checked++;
    if (v.fraction < MIN) { fails++; console.error(`FAIL ${tag}: only ${(100 * v.fraction).toFixed(0)}% of head-height points are visible (need ${(100 * MIN).toFixed(0)}%) camera dist ${cam.dist.toFixed(0)}`); }
    // deploy room: zones stay open
    for (const k of ['A', 'B']) {
      const z = a.zones[k]; let free = 0, tot = 0;
      for (let zz = z.z - z.d / 2 + 0.5; zz < z.z + z.d / 2; zz += 1) for (let xx = z.x - z.w / 2 + 0.5; xx < z.x + z.w / 2; xx += 1) { tot++; if (nav.walkable(xx, zz)) free++; }
      if (free / tot < 0.95) { fails++; console.error(`FAIL ${tag}: zone ${k} only ${(100 * free / tot).toFixed(0)}% walkable`); }
      for (const p of a.props) {
        const i = PROP_CATALOG[p.t]; if (!(i.r > 0) || i.blocks === 'none') continue;
        const dx = Math.max(0, Math.abs(p.x - z.x) - z.w / 2), dz = Math.max(0, Math.abs(p.z - z.z) - z.d / 2), d = Math.hypot(dx, dz);
        if (d < 1.5 && i.r * p.s < 3) { fails++; console.error(`FAIL ${tag}: ${p.t} crowds zone ${k} edge (${d.toFixed(1)} u)`); break; }
      }
    }
  }
  rows.push({ recipe, size, seeds, fr, min: Math.min(...fr), mean: fr.reduce((s, x) => s + x, 0) / fr.length, terrain, dist });
}
if (report) {
  console.log('arena        size    visible per seed                 min    mean   (terrain-occluded %, camera dist u)');
  for (const r of rows) console.log(r.recipe.padEnd(12), r.size.padEnd(7), r.fr.map((f, i) => (100 * f).toFixed(0).padStart(3) + '%(s' + r.seeds[i] + ')').join(' ').padEnd(30), (100 * r.min).toFixed(0).padStart(4) + '%', (100 * r.mean).toFixed(0).padStart(5) + '%', '  ', (100 * r.terrain).toFixed(0) + '% ' + r.dist.toFixed(0) + ' u');
}
if (fails) { console.error(fails + ' readability check(s) failed'); process.exit(1); }
console.log(`readability OK: ${checked} arena/size/seed cases, worst ${(100 * Math.min(...rows.map((r) => r.min))).toFixed(0)}% of head-height points visible (>= ${(100 * MIN).toFixed(0)}% required)`);
