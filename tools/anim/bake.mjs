#!/usr/bin/env node
// Bake the retargeted clip library for the voxel humanoid rig "hum1" and compute the evaluation metrics.
//
//   node tools/anim/bake.mjs [--out assets/anim/humanoid_clips.json] [--metrics docs/anim_spike/metrics.json]
//                            [--sticks <scratch>/sticks.json] [--map tools/anim/mapping_ual.json] [--decimals 3]
//
// Inputs (downloaded, untrusted data; only parsed, never executed):
//   assets/raw/quaternius-ual1/files/AnimationLibrary_Godot_Standard.glb
//   assets/raw/quaternius-ual2/files/UAL2_Standard.glb
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { retargetFile, loadMapping, PARTS } from './retarget.mjs';
import { fk, sampleClip, sampleClipSlerp, ankle, partPoint, RIG, PART_IDS, LEG_VOX } from './fk.mjs';
import { V, Q, eulerToQuat } from './math.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const outPath = path.resolve(opt('out', path.join(ROOT, 'assets/anim/humanoid_clips.json')));
const metricsPath = path.resolve(opt('metrics', path.join(ROOT, 'docs/anim_spike/metrics.json')));
const sticksPath = path.resolve(opt('sticks', path.join(os.tmpdir(), 'hum1_sticks.json')));
const mapPath = path.resolve(opt('map', path.join(HERE, 'mapping_ual.json')));
const DEC = +opt('decimals', 3);
const LIBS = [
  path.join(ROOT, 'assets/raw/quaternius-ual1/files/AnimationLibrary_Godot_Standard.glb'),
  path.join(ROOT, 'assets/raw/quaternius-ual2/files/UAL2_Standard.glb'),
];
const deg = x => x * 180 / Math.PI;
const rnd = (v, d = DEC) => { const k = 10 ** d; return Math.round(v * k) / k; };

const mapping = loadMapping(mapPath);
const clips = {}, stats = {}, sticks = {};
let model = null;
for (const glb of LIBS) {
  const r = retargetFile(glb, mapPath, null, false, true);
  Object.assign(clips, r.clips); Object.assign(stats, r.stats); Object.assign(sticks, r.sticks);
  model = model || r.model;
}
// keep mapping order
const ordered = {};
for (const k of Object.keys(mapping.clips)) if (clips[k]) ordered[k] = clips[k]; else console.warn('NOT PRODUCED:', k);

// ---------------------------------------------------------------- metrics
const metrics = { legLenSrcMetres: model.legLenSrc, clips: {} };
const FRAME_LIST = c => Array.from({ length: c.frames }, (_, i) => i);

/** floor contact points: every box corner, except that the lower leg counts only its 4x4 column (the toe overhang is ignored,
 *  a rigid foot cannot stay flat when the shin tilts, which would otherwise dominate the numbers) */
function contactPoints(W) {
  const pts = [];
  for (const id of PART_IDS) {
    let [x0, y0, z0, x1, y1, z1] = RIG[id].box;
    if (id === 'legLL' || id === 'legLR') z1 = 2;
    for (const z of [z0, z1]) for (const y of [y0, y1]) for (const x of [x0, x1]) pts.push(partPoint(W, id, [x, y, z]));
  }
  return pts;
}
function floorStats(c) {
  let minY = 1e9, worst = 0;
  const per = [];
  for (let f = 0; f < c.frames; f++) {
    const W = fk(sampleClip(c, f));
    let m = 1e9; for (const p of contactPoints(W)) m = Math.min(m, p[1]);
    per.push(m); if (m < minY) { minY = m; worst = f; }
  }
  return { per, minY, worst };
}
function lowestSole(c) {
  let m = 1e9;
  for (let f = 0; f < c.frames; f++) { const W = fk(sampleClip(c, f)); m = Math.min(m, ankle(W, 'L')[1], ankle(W, 'R')[1]); }
  return m;
}

/** ankle track in the character frame (voxels): root offsets included, rootYaw excluded (heading-relative) */
function ankleTrack(c, side) {
  const out = [];
  for (let f = 0; f < c.frames; f++) { const W = fk(sampleClip(c, f)); out.push(ankle(W, side)); }
  return out;
}

/** Ground-speed estimate: while a foot is planted its ankle moves backwards at the ground speed. */
function footSlide(c) {
  const N = c.frames, fps = 30;
  const res = { feet: {} };
  const speeds = [];
  for (const side of ['L', 'R']) {
    const a = ankleTrack(c, side);
    const ys = a.map(p => p[1]);
    const ymin = Math.min(...ys);
    const planted = ys.map(y => y < ymin + 0.9); // within ~0.9 voxel of the lowest point of the cycle
    // contiguous planted runs (circular)
    const runs = [];
    let i = 0;
    const start = planted.findIndex(p => !p);
    if (start < 0) continue;
    for (let k = 0; k < N; k++) {
      const idx = (start + k) % N;
      if (planted[idx]) { if (!runs.length || runs[runs.length - 1].end !== k - 1) runs.push({ first: k, end: k, idx: [idx] }); else { runs[runs.length - 1].end = k; runs[runs.length - 1].idx.push(idx); } }
    }
    const feet = [];
    for (const r of runs) {
      if (r.idx.length < 3) continue;
      // least squares line z(t) over the run (z unwrapped is not needed: single run)
      const ts = r.idx.map((_, k) => k / fps), zs = r.idx.map(ix => a[ix][2]);
      const n = ts.length, mt = ts.reduce((s, v) => s + v, 0) / n, mz = zs.reduce((s, v) => s + v, 0) / n;
      let num = 0, den = 0; ts.forEach((t, k) => { num += (t - mt) * (zs[k] - mz); den += (t - mt) ** 2; });
      const slope = num / den; // voxels / s  (negative: moving backwards)
      const resid = zs.map((z, k) => z - (mz + slope * (ts[k] - mt)));
      const rms = Math.sqrt(resid.reduce((s, v) => s + v * v, 0) / n);
      const maxdev = Math.max(...resid.map(Math.abs));
      const dur = n / fps;
      feet.push({ frames: n, dur: rnd(dur, 2), groundSpeedVox: rnd(-slope, 1), slideRmsVox: rnd(rms, 2), slideMaxVox: rnd(maxdev, 2), stanceDisp: rnd(Math.abs(slope) * dur, 1) });
      speeds.push({ v: -slope, w: n });
    }
    res.feet[side] = feet;
  }
  const tw = speeds.reduce((s, x) => s + x.w, 0);
  const v = speeds.reduce((s, x) => s + x.v * x.w, 0) / (tw || 1);
  const spread = speeds.length ? Math.max(...speeds.map(s => s.v)) - Math.min(...speeds.map(s => s.v)) : 0;
  res.speedVoxPerS = rnd(v, 1);
  res.speedUnitsPerS = rnd(v / LEG_VOX, 2); // 10 voxels = 1 leg length = 1 world unit
  res.speedSpreadVox = rnd(spread, 1);
  res.stridePerCycleVox = rnd(v * N / fps, 1);
  res.cycleSeconds = rnd(N / fps, 3);
  // mismatch if played at exactly speedRef: worst over stances of (stance displacement error)
  const worstSlide = Math.max(0, ...Object.values(res.feet).flat().map(f => f.slideMaxVox));
  res.worstSlideAtSpeedRefVox = rnd(worstSlide, 2);
  // ankle displacement mismatch per stride: |actual stance displacement - speedRef*duration| per stance
  const mism = Object.values(res.feet).flat().map(f => Math.abs(f.groundSpeedVox - v) * f.dur);
  res.stanceMismatchPerStrideVox = rnd(Math.max(0, ...mism), 2);
  return res;
}

/** limb / body / head directions of OUR rig (heading frame incl. root pitch/roll) at a (fractional) frame, for a given sampler */
const SEG = { armUL: [0, -1, 0], armLL: [0, -1, 0], armUR: [0, -1, 0], armLR: [0, -1, 0], legUL: [0, -1, 0], legLL: [0, -1, 0], legUR: [0, -1, 0], legLR: [0, -1, 0], body: [0, 1, 0], head: [0, 1, 0] };
function segDirs(c, f, sampler) {
  const W = fk(sampler(c, f));
  const o = {}; for (const [id, v] of Object.entries(SEG)) o[id] = Q.rot(W[id].q, v);
  return o;
}
const ang = (a, b) => deg(Math.acos(Math.max(-1, Math.min(1, V.dot(a, b)))));

/** Interpolation honesty test. Truth = the same retarget run at 60 fps; compare mid-frame poses obtained from the 30 fps data by
 *  (a) linear Euler interpolation and (b) quaternion slerp. Degrees of direction error over limbs, body and head. */
function interpError(c, c60) {
  const N = c.frames, last = c.loop ? N : N - 1;
  const res = {};
  for (const [mode, sampler] of [['eulerLerp', sampleClip], ['slerp', sampleClipSlerp]]) {
    let worst = 0, sum = 0, n = 0, worstAt = '', over10 = 0;
    for (let f = 0; f < last; f++) {
      if ((c.meta.cuts || []).includes(f)) continue; // trimmed hold: no 60 fps ground truth for the cut interval
      const idx60 = 2 * f + 1; if (idx60 >= c60.frames) break;
      const tr = segDirs(c60, idx60, sampleClip), m = segDirs(c, f + 0.5, sampler);
      let fw = 0;
      for (const k of Object.keys(SEG)) { const e = ang(tr[k], m[k]); sum += e; n++; if (e > worst) { worst = e; worstAt = `${k}@${f}`; } fw = Math.max(fw, e); }
      if (fw > 10) over10++;
    }
    res[mode] = { maxDeg: rnd(worst, 1), meanDeg: rnd(sum / Math.max(1, n), 2), worstAt, framesOver10deg: over10 };
  }
  return res;
}

function rangeStats(c) {
  const out = {};
  for (const p of PARTS) {
    const a = c.q[p]; const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    let step = 0, stepAt = 0;
    for (let i = 0; i < c.frames; i++) for (let k = 0; k < 3; k++) {
      const v = a[i * 3 + k]; mn[k] = Math.min(mn[k], v); mx[k] = Math.max(mx[k], v);
      if (i) { const d = Math.abs(v - a[(i - 1) * 3 + k]); if (d > step) { step = d; stepAt = i; } }
    }
    out[p] = { min: mn.map(v => rnd(deg(v), 0)), max: mx.map(v => rnd(deg(v), 0)), maxStepDeg: rnd(deg(step), 1), at: stepAt };
  }
  return out;
}

/** Euler step vs. true rotation step: flags interpolation-unfriendly (pole) behaviour */
function poleFlags(c) {
  const flags = [];
  const N = c.frames;
  for (const p of PARTS) {
    const a = c.q[p]; const q = i => eulerToQuat(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
    for (let i = 1; i < N + (c.loop ? 1 : 0); i++) {
      const i0 = i - 1, i1 = i % N;
      let es = 0; for (let k = 0; k < 3; k++) es = Math.max(es, Math.abs(a[i1 * 3 + k] - a[i0 * 3 + k]));
      const ts = Q.angle(q(i0), q(i1));
      if (deg(es) > 25 && es > 2 * ts) flags.push(`${p}@${i}: euler ${deg(es).toFixed(0)} vs true ${deg(ts).toFixed(0)}`);
    }
  }
  return flags;
}

// ---------------------------------------------------------------- ground handling (per-clip opt-in via mapping: snap / floor)
for (const [name, c] of Object.entries(ordered)) {
  const spec = mapping.clips[name];
  const m = (metrics.clips[name] = {});
  m.floorMinYVoxBefore = rnd(floorStats(c).minY, 2);
  m.soleMinYVoxBefore = rnd(lowestSole(c), 2);
  if (spec.snap) { // constant shift so the lowest sole of the whole clip rests exactly on the ground
    const sh = -lowestSole(c) / LEG_VOX;
    c.root = c.root.map(v => rnd(v + sh));
    c.meta.groundShiftVox = rnd(sh * LEG_VOX, 2);
  }
  if (spec.floor) { // raise-only per-frame correction so no box goes below the ground (lying / rolling poses); 3-tap smoothed
    const fs0 = floorStats(c);
    const need = fs0.per.map(v => Math.max(0, -v));
    const sm = need.map((_, i) => Math.max(need[i], (need[Math.max(0, i - 1)] + need[i] * 2 + need[Math.min(need.length - 1, i + 1)]) / 4));
    c.root = c.root.map((v, i) => rnd(v + sm[i] / LEG_VOX));
    c.meta.floorRaiseMaxVox = rnd(Math.max(...sm), 2);
  }
  m.floorMinYVoxAfter = rnd(floorStats(c).minY, 2);
  m.soleMinYVoxAfter = rnd(lowestSole(c), 2);
}

// 60 fps truth for the interpolation test
const clips60 = {};
for (const glb of LIBS) Object.assign(clips60, retargetFile(glb, mapPath, null, false, false, 60).clips);

// ---------------------------------------------------------------- locomotion speedRef + all metrics
for (const [name, c] of Object.entries(ordered)) {
  const spec = mapping.clips[name];
  const m = metrics.clips[name];
  m.frames = c.frames; m.loop = c.loop; m.meta = c.meta;
  if (spec.locomotion) {
    const fsl = footSlide(c);
    m.footSlide = fsl;
    c.meta.speedRef = fsl.speedUnitsPerS;   // u/s that matches the foot cadence (leg length = 1 u = 10 voxels)
    c.meta.strideVox = fsl.stridePerCycleVox;
  }
  m.interp = interpError(c, clips60[name]);
  m.ranges = rangeStats(c);
  m.poleFlags = poleFlags(c);
  m.retarget = stats[name];
}

// ---------------------------------------------------------------- write
const dec = v => rnd(v, DEC);
function requant(c) {
  if (DEC === 3) return;
  const q = {}; for (const p of PARTS) q[p] = c.q[p].map(dec); c.q = q;
  for (const k of ['root', 'rootPitch', 'rootRoll', 'rootYaw', 'rootX', 'rootZ']) if (c[k]) c[k] = c[k].map(dec);
}
Object.values(ordered).forEach(requant);

const bank = {
  rig: 'hum1', fps: 30, parts: PARTS,
  conventions: {
    handedness: 'right-handed, +Y up, character faces +Z, character LEFT = +X (L parts at +X)',
    euler: 'local = Ry(ry)*Rx(rx)*Rz(rz) radians (== three.js Euler order YXZ), about each part pivot, in the parent frame; q[part] = [rx,ry,rz per frame]',
    root: 'root[] = vertical offset of the hip pivot, rootX/rootZ = horizontal offset, all in leg lengths (1.0 = 10 voxels = 1 u), relative to rest. rootPitch/rootRoll/rootYaw (optional, missing = 0) rotate the whole rig about the hip pivot (0,10 voxels,0): Ry(rootYaw)*Rx(rootPitch)*Rz(rootRoll). rootYaw is the removed pelvis heading and may be ignored.',
    limbs: 'upper/fore arm and thigh/shin use ry = 0 (pure swing, no twist)',
  },
  license: 'CC0 1.0 Universal (Public Domain Dedication). Source: Quaternius "Universal Animation Library" 1 and 2 (Standard), https://opengameart.org/content/universal-animation-library , https://opengameart.org/content/universal-animation-library-2 , https://quaternius.com/packs/universalanimationlibrary.html . No attribution required; credit is given anyway.',
  clips: ordered,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(bank));
fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 1));
fs.writeFileSync(sticksPath, JSON.stringify(sticks));
const size = fs.statSync(outPath).size;
console.log(`wrote ${path.relative(ROOT, outPath)}  ${Object.keys(ordered).length} clips  ${(size / 1024).toFixed(1)} KB`);
console.log(`metrics -> ${path.relative(ROOT, metricsPath)}   sticks -> ${sticksPath}`);

// ---------------------------------------------------------------- console summary
const pad = (s, n) => String(s).padEnd(n);
console.log('\n' + pad('clip', 16) + pad('fr', 4) + pad('floorMinY b->a', 15) + pad('soleMinY b->a', 15) + pad('eulerLerp max/mean/n>10', 25) + pad('slerp max/mean/n>10', 22) + pad('pole', 5) + 'speedRef mism');
for (const [name, m] of Object.entries(metrics.clips)) {
  const e = m.interp.eulerLerp, l = m.interp.slerp;
  console.log(pad(name, 16) + pad(m.frames, 4) + pad(`${m.floorMinYVoxBefore}>${m.floorMinYVoxAfter}`, 15) + pad(`${m.soleMinYVoxBefore}>${m.soleMinYVoxAfter}`, 15) + pad(`${e.maxDeg}/${e.meanDeg}/${e.framesOver10deg}`, 25) + pad(`${l.maxDeg}/${l.meanDeg}/${l.framesOver10deg}`, 22) + pad(m.poleFlags.length, 5) + (m.footSlide ? `${m.footSlide.speedUnitsPerS} ${m.footSlide.stanceMismatchPerStrideVox}` : ''));
}
