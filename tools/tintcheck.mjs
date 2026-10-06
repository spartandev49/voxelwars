// Team-tint coverage per humanoid (spec 5 / criterion U3): the share of VISIBLE surface made of F_TEAM voxels, measured on orthographic
// z-buffer projections (front, back, left + right side = "side") of the compiled model, in two poses: the rest pose (arms hanging) and
// the READY stance used by the contact sheets. A unit passes when the pooled tinted/visible ratio is >= 30% in BOTH poses AND every
// projection is >= 22% (so the back of a unit cannot hide behind its shield).
//
//   node tools/tintcheck.mjs                 all units in src/content/era_ancient/units/*.js
//   node tools/tintcheck.mjs --units hoplite,spartan [--json] [--min 0.30]
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { readyPose } from './contact_pose.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP = await import(pathToFileURL(path.join(root, 'src/content/era_ancient/blueprints.js')).href);
const { STAT_TABLE } = await import(pathToFileURL(path.join(root, 'src/content/era_ancient/stats.js')).href);

export const MIN_POOLED = 0.30, MIN_VIEW = 0.22;
const RES = 2;                // pixels per voxel in the projection buffers
const SUB = [0.17, 0.5, 0.83]; // sub-voxel sample offsets (27 samples per voxel)

/** project every solid voxel of a posed model; returns per-view {covered, tinted} */
export function projectModel(model, pose) {
  const T3 = BP.restTransforms(model, pose), s = model.voxelSize;
  const views = {
    front: { u: (p) => p[0], d: (p) => p[2] }, back: { u: (p) => -p[0], d: (p) => -p[2] },
    left: { u: (p) => -p[2], d: (p) => p[0] }, right: { u: (p) => p[2], d: (p) => -p[0] },
  };
  const W = 400, H = 480, ox = 200, oy = 10;       // buffer in 0.05 u pixels: x -10..10 u, y -0.5..23.5 u
  const bufs = {}; for (const k of Object.keys(views)) bufs[k] = { depth: new Float32Array(W * H).fill(-1e9), tint: new Uint8Array(W * H) };
  const px = 1 / (s * RES);
  const pt = [0, 0, 0];
  for (const part of model.parts) {
    const { R, t } = T3[part.id], g = part.grid, pv = part.pivot;
    for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) {
      const v = g.d[x + g.sx * (z + g.sz * y)]; if (!v) continue;
      const tint = ((v >>> 24) & 2) ? 1 : 0;
      for (const a of SUB) for (const b of SUB) for (const c of SUB) {
        const lx = (x + a - pv[0]) * s, ly = (y + b - pv[1]) * s, lz = (z + c - pv[2]) * s;
        pt[0] = R[0] * lx + R[1] * ly + R[2] * lz + t[0]; pt[1] = R[3] * lx + R[4] * ly + R[5] * lz + t[1]; pt[2] = R[6] * lx + R[7] * ly + R[8] * lz + t[2];
        const iy = Math.floor(oy + pt[1] * px);
        if (iy < 0 || iy >= H) continue;
        for (const k of Object.keys(views)) {
          const V = views[k], ix = Math.floor(ox + V.u(pt) * px);
          if (ix < 0 || ix >= W) continue;
          const B = bufs[k], i = iy * W + ix, d = V.d(pt);
          if (d > B.depth[i]) { B.depth[i] = d; B.tint[i] = tint; }
        }
      }
    }
  }
  const out = {};
  for (const k of Object.keys(bufs)) { let cov = 0, tin = 0; const B = bufs[k]; for (let i = 0; i < B.depth.length; i++) if (B.depth[i] > -1e8) { cov++; tin += B.tint[i]; } out[k] = { covered: cov, tinted: tin }; }
  return out;
}
function summarize(pr) {
  const r = (k) => (pr[k].covered ? pr[k].tinted / pr[k].covered : 0);
  const side = (pr.left.covered + pr.right.covered) ? (pr.left.tinted + pr.right.tinted) / (pr.left.covered + pr.right.covered) : 0;
  const cov = pr.front.covered + pr.back.covered + pr.left.covered + pr.right.covered, tin = pr.front.tinted + pr.back.tinted + pr.left.tinted + pr.right.tinted;
  // pooled over the three projections: front, back and ONE side (both sides averaged)
  const pooled = (pr.front.tinted + pr.back.tinted + (pr.left.tinted + pr.right.tinted) / 2) / (pr.front.covered + pr.back.covered + (pr.left.covered + pr.right.covered) / 2);
  return { front: r('front'), back: r('back'), side, pooled, all: cov ? tin / cov : 0 };
}

/** Compile + measure. Returns metrics plus tint {front, back, side, pooled} for the READY pose and tintRest for the hanging pose. */
export function tintReport(bp, opts = {}) {
  const c = BP.compileSoldier(bp, opts);
  const rest = summarize(projectModel(c.model, null));
  const ready = summarize(projectModel(c.model, readyPose(c.model, { weaponStyle: c.weaponStyle, twoHanded: c.twoHanded })));
  const views = [rest.front, rest.back, rest.side, ready.front, ready.back, ready.side];
  const pass = rest.pooled >= MIN_POOLED && ready.pooled >= MIN_POOLED && views.every((v) => v >= MIN_VIEW);
  return { id: bp.id, voxels: c.voxels, parts: c.parts, height: c.height, reach: c.reach, radius: c.radius, weaponLen: c.weaponLen, tint: ready, tintRest: rest, pass };
}

export async function loadUnits() {
  const dir = path.join(root, 'src/content/era_ancient/units'), out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js') && !x.startsWith('_')).sort()) {
    const m = await import(pathToFileURL(path.join(dir, f)).href);
    for (const [id, spec] of Object.entries(m.MODELS || {})) out[id] = spec;
  }
  return out;
}
export const optsFor = (id) => { const st = STAT_TABLE[id]; return st ? { range: st.melee ? st.melee.range : undefined, radius: st.radius, scale: st.scale } : {}; };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const units = await loadUnits();
  const want = opt('units', null) ? opt('units').split(',') : Object.keys(units);
  const rows = []; let fails = 0;
  for (const id of want) {
    const spec = units[id]; if (!spec) { console.error('unknown unit', id); process.exit(2); }
    const bp = spec.blueprint || spec.bp || spec;
    const r = tintReport(bp, optsFor(id)); rows.push(r); if (!r.pass) fails++;
  }
  if (args.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else {
    const pc = (v) => String((v * 100).toFixed(0)).padStart(3) + '%';
    console.log('unit'.padEnd(18) + ' ready: front  back  side pooled |  rest: front  back  side pooled | verdict');
    for (const r of rows) console.log(r.id.padEnd(18) + `        ${pc(r.tint.front)}  ${pc(r.tint.back)}  ${pc(r.tint.side)}  ${pc(r.tint.pooled)}  |       ${pc(r.tintRest.front)}  ${pc(r.tintRest.back)}  ${pc(r.tintRest.side)}  ${pc(r.tintRest.pooled)}  | ${r.pass ? 'PASS' : 'FAIL'}`);
    console.log(fails ? `${fails} of ${rows.length} FAIL (need pooled >= ${MIN_POOLED * 100}% in both poses, each view >= ${MIN_VIEW * 100}%)` : `all ${rows.length} pass`);
  }
  process.exit(fails ? 1 : 0);
}
