#!/usr/bin/env node
// Direction-based retargeting of a Quaternius Universal Animation Library GLB onto the voxel rig "hum1".
//
//   node tools/anim/retarget.mjs <in.glb> <out.json> [--map tools/anim/mapping_ual.json] [--only name,name] [--verbose]
//
// Method (see docs/anim_spike.md):
//  * Source world frame == our world frame (+Y up, character faces +Z, character LEFT = +X). No axis conversion, no mirroring.
//  * Source root-bone translation is dropped (in-place). Source hips motion is kept, expressed relative to the rest hip height.
//  * Pelvis heading (yaw of the hip line, per frame, unwrapped) is REMOVED from the whole pose; the pose is heading-relative
//    (legs face forward, only genuine spine twist remains). The removed heading is exported as optional `rootYaw`.
//  * DIRECTION-BASED limbs: for each segment (upper/fore arm, thigh/shin) the world direction start->end is measured from the
//    source FK. It is expressed in the REALISED parent frame and solved as a pure swing  local = Rx(rx)*Rz(rz)  (ry = 0, i.e. no
//    twist; Y*X*Z order). This parametrisation has no gimbal pole for hinge motion (knee/elbow flexing beyond 90 deg) and is
//    solved as a whole sequence (Viterbi over the two equivalent branches) so angles are continuous: never 2*pi flips.
//  * body: direction = hip-joint midpoint -> neck (chord) with twist about that axis taken from the chest bone (gain, clamped).
//  * head: source head bone world delta (full orientation), relative to the body.
//  * root: pelvis 'up' axis swing (pitch/roll about the hip pivot) + hip-midpoint translation relative to rest in leg-length units.
//  * Euler angles rounded to 3 decimals.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGltf, prepareAnimation, sampleAnimation } from './glb.mjs';
import { V, Q, eulerToQuat, unwrapEulerSeq, wrapPi } from './math.mjs';
import { fk, sampleClip } from './fk.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PARTS = ['body', 'head', 'armUL', 'armLL', 'armUR', 'armLR', 'legUL', 'legLL', 'legUR', 'legLR'];
const PARENT = { body: 'root', head: 'body', armUL: 'body', armLL: 'armUL', armUR: 'body', armLR: 'armUR', legUL: 'root', legLL: 'legUL', legUR: 'root', legLR: 'legUR' };
// part -> [segment start bone, segment end bone]; direction = start -> end (FK positions)
const LIMBS = {
  armUL: ['uaL', 'faL'], armLL: ['faL', 'haL'], armUR: ['uaR', 'faR'], armLR: ['faR', 'haR'],
  legUL: ['thL', 'shL'], legLL: ['shL', 'ftL'], legUR: ['thR', 'shR'], legLR: ['shR', 'ftR'],
};
const LIMB_ORDER = ['armUL', 'armUR', 'legUL', 'legUR', 'armLL', 'armLR', 'legLL', 'legLR']; // parents first
const DOWN = [0, -1, 0];

export function loadMapping(file = path.join(HERE, 'mapping_ual.json')) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

/** Resolve roles -> node indices and compute the rest pose. */
export function makeModel(g, mapping) {
  const names = new Map(g.nodes.map(n => [n.name, n.index]));
  let rig = null;
  for (const [k, r] of Object.entries(mapping.rigs)) if (names.has(r.detect)) { rig = { key: k, ...r }; break; }
  if (!rig) throw new Error('no rig in mapping matches this file');
  const idx = {};
  for (const [role, nm] of Object.entries(rig.bones)) {
    if (!names.has(nm)) throw new Error(`bone ${nm} (${role}) not found in glb`);
    idx[role] = names.get(nm);
  }
  // topological order (parents first)
  const order = []; const seen = new Set();
  const visit = i => { if (seen.has(i)) return; const p = g.nodes[i].parent; if (p >= 0) visit(p); seen.add(i); order.push(i); };
  g.nodes.forEach(n => visit(n.index));
  // nodes above the pelvis: their translation is dropped (root motion removal)
  const rootChain = new Set(); for (let p = g.nodes[idx.pelvis].parent; p >= 0; p = g.nodes[p].parent) rootChain.add(p);
  const m = { g, rig, idx, order, rootChain };
  const rest = worldFK(m, new Map());
  m.rest = rest;
  const hipMid = V.scale(V.add(rest.p[idx.thL], rest.p[idx.thR]), 0.5);
  m.hipMid0 = hipMid;
  m.legLen = V.len(V.sub(rest.p[idx.thL], rest.p[idx.shL])) + V.len(V.sub(rest.p[idx.shL], rest.p[idx.ftL]));
  return m;
}

function worldFK(m, over) {
  const { g, order, rootChain } = m;
  const q = new Array(g.nodes.length), p = new Array(g.nodes.length);
  for (const i of order) {
    const n = g.nodes[i], o = over.get(i) || {};
    const lt = rootChain.has(i) ? n.t : (o.t || n.t), lq = o.q || n.q;
    if (n.parent < 0) { q[i] = lq; p[i] = lt; }
    else { q[i] = Q.mul(q[n.parent], lq); p[i] = V.add(p[n.parent], Q.rot(q[n.parent], lt)); }
  }
  return { q, p };
}

/** sample a source clip at fps; returns per-frame {q,p} world FK */
export function sampleSource(m, anim, fps) {
  const prep = prepareAnimation(m.g, anim);
  const n = Math.round(prep.duration * fps);
  const frames = [];
  for (let k = 0; k <= n; k++) frames.push(worldFK(m, sampleAnimation(prep, Math.min(prep.duration, k / fps))));
  return frames;
}

function poseDistance(m, a, b) { // max rotation difference over key bones, radians
  let d = 0;
  for (const r of ['pelvis', 'chest', 'head', 'uaL', 'faL', 'uaR', 'faR', 'thL', 'shL', 'thR', 'shR']) d = Math.max(d, Q.angle(a.q[m.idx[r]], b.q[m.idx[r]]));
  return d;
}

/** per-frame yaw of the hip line (right thigh -> left thigh); 0 = facing +Z; unwrapped */
export function pelvisYaw(m, frames) {
  const { idx } = m, yaw = [];
  let prev = 0;
  frames.forEach((f, i) => {
    const hl = V.sub(f.p[idx.thL], f.p[idx.thR]);
    let y = prev;
    if (Math.hypot(hl[0], hl[2]) > 0.4 * V.len(hl)) { y = Math.atan2(-hl[2], hl[0]); if (i) y = prev + wrapPi(y - prev); }
    yaw.push(y); prev = y;
  });
  return yaw;
}

const clamp1 = v => Math.max(-1, Math.min(1, v));
const POLE = 0.02; // |cos rz| below this: rx is undefined (limb points sideways); filled by interpolation

/**
 * Swing-only solve. dirs[i] = unit direction of the limb (child frame -Y axis) expressed in its parent frame.
 * Finds (rx, rz) with  Rx(rx)*Rz(rz) * (0,-1,0) = d,   i.e. d = (sin rz, -cos rz cos rx, -cos rz sin rx).
 * Two branches exist: (rx1, rz1) and (rx1+pi, pi-rz1); a Viterbi pass picks the branch sequence with the least total change,
 * then angles are unwrapped. Where the limb points exactly sideways (cos rz ~ 0) rx is free: interpolated.
 */
export function f1Track(dirs) {
  const N = dirs.length;
  const cand = dirs.map(d => {
    const rz1 = Math.asin(clamp1(d[0])), c = Math.cos(rz1);
    const pole = c < POLE;
    const rx1 = pole ? null : Math.atan2(-d[2], -d[1]);
    return { rz: [rz1, Math.PI - rz1], rx: [rx1, rx1 === null ? null : rx1 + Math.PI] };
  });
  const dist = (a, b) => (a === null || b === null) ? 0 : wrapPi(a - b) ** 2;
  const cost = [[0, 0]], back = [[0, 0]];
  const un = (c, s) => { const x = c.rx[s], z = c.rz[s]; return 0.02 * ((x === null ? 0 : wrapPi(x) ** 2) + wrapPi(z) ** 2); };
  cost[0] = [un(cand[0], 0), un(cand[0], 1)];
  for (let i = 1; i < N; i++) {
    cost[i] = [0, 0]; back[i] = [0, 0];
    for (let t = 0; t < 2; t++) {
      let best = 1e18, bs = 0;
      for (let s = 0; s < 2; s++) {
        const c = cost[i - 1][s] + dist(cand[i].rx[t], cand[i - 1].rx[s]) + wrapPi(cand[i].rz[t] - cand[i - 1].rz[s]) ** 2;
        if (c < best) { best = c; bs = s; }
      }
      cost[i][t] = best + un(cand[i], t); back[i][t] = bs;
    }
  }
  let st = cost[N - 1][0] <= cost[N - 1][1] ? 0 : 1;
  const pick = new Array(N);
  for (let i = N - 1; i >= 0; i--) { pick[i] = st; st = back[i][st]; }
  // unwrap
  const rx = new Array(N).fill(null), rz = new Array(N);
  let pz = null, px = null;
  for (let i = 0; i < N; i++) {
    let z = cand[i].rz[pick[i]], x = cand[i].rx[pick[i]];
    if (pz !== null) z = pz + wrapPi(z - pz);
    pz = z; rz[i] = z;
    if (x !== null) { if (px !== null) x = px + wrapPi(x - px); px = x; rx[i] = x; }
  }
  // fill undefined rx (pole): linear interpolation between defined neighbours, hold at the ends
  const defined = rx.map((v, i) => v !== null ? i : -1).filter(i => i >= 0);
  if (!defined.length) rx.fill(0);
  else for (let i = 0; i < N; i++) {
    if (rx[i] !== null) continue;
    let lo = -1, hi = -1;
    for (const k of defined) { if (k < i) lo = k; else if (k > i && hi < 0) { hi = k; break; } }
    rx[i] = lo < 0 ? rx[hi] : hi < 0 ? rx[lo] : rx[lo] + (rx[hi] - rx[lo]) * (i - lo) / (hi - lo);
  }
  // global shift by multiples of 2*pi so the first frame is in the principal range
  const sx = TAU_ROUND(rx[0]), sz = TAU_ROUND(rz[0]);
  return rx.map((x, i) => [x - sx, rz[i] - sz]);
}
const TAU_ROUND = a => 2 * Math.PI * Math.round(a / (2 * Math.PI));

/** Compute the solved (continuous) tracks for a list of source frames. */
export function solve(m, frames, cfg) {
  const { idx, rest } = m;
  const N = frames.length;
  // pelvis heading = yaw of the hip line (right thigh -> left thigh), unwrapped; removed from everything below
  const yaw = pelvisYaw(m, frames);
  if (cfg.keepHeading) yaw.fill(0);
  const Qh = yaw.map(y => Q.axisAngle([0, 1, 0], -y)); // heading removal rotations
  const D = role => frames.map((f, i) => Q.mul(Qh[i], Q.mul(f.q[idx[role]], Q.conj(rest.q[idx[role]]))));
  const euler = {}, W = {}; // part -> [[rx,ry,rz]...], part -> realised world quats (heading-relative)

  // ---- root swing (pelvis up axis): R = Rx(pitch)*Rz(roll) about the hip pivot (ry = 0). Rx*Rz maps -Y to d = -up.
  const upDirs = D('pelvis').map(q => V.scale(Q.rot(q, [0, 1, 0]), -1));
  const rootTrack = f1Track(upDirs);
  const pitch = rootTrack.map(t => t[0]), roll = rootTrack.map(t => t[1]);
  if (cfg.noRootRotation) { pitch.fill(0); roll.fill(0); }
  W.root = pitch.map((p, i) => eulerToQuat(p, 0, roll[i]));

  // ---- body: chord direction + chest twist (full 3-DOF Euler, continuous)
  const Dc = D('chest');
  const twistGain = cfg.bodyTwistGain, twistClamp = cfg.bodyTwistClamp;
  const bodyWorld = frames.map((f, i) => {
    const hipMid = V.scale(V.add(f.p[idx.thL], f.p[idx.thR]), 0.5);
    const d = Q.rot(Qh[i], V.norm(V.sub(f.p[idx.neck], hipMid)));
    const swing = Q.minRot([0, 1, 0], d);
    const fRef = Q.rot(swing, [0, 0, 1]);
    const fC = Q.rot(Dc[i], [0, 0, 1]);
    const proj = v => V.norm(V.sub(v, V.scale(d, V.dot(v, d))));
    const a = proj(fRef), b = proj(fC);
    let alpha = Math.atan2(V.dot(d, V.cross(a, b)), V.dot(a, b));
    alpha = Math.max(-twistClamp, Math.min(twistClamp, alpha * twistGain));
    return Q.mul(Q.axisAngle(d, alpha), swing);
  });
  euler.body = unwrapEulerSeq(bodyWorld.map((w, i) => Q.mul(Q.conj(W.root[i]), w)));
  W.body = euler.body.map((e, i) => Q.mul(W.root[i], eulerToQuat(e[0], e[1], e[2])));

  // ---- head: full orientation relative to the body
  const Dh = D('head');
  const headWorld = Dh.map(q => (cfg.headGain === 1 ? q : Q.norm(slerpQ(Q.ident(), q, cfg.headGain))));
  euler.head = unwrapEulerSeq(headWorld.map((w, i) => Q.mul(Q.conj(W.body[i]), w)));

  // ---- limbs: pure swing in the realised parent frame (parents first)
  const dirErr = {}, dirsRel = {};
  for (const part of LIMB_ORDER) {
    const par = W[PARENT[part]];
    const dw = dirW(m, frames, part).map((d, i) => Q.rot(Qh[i], d));
    const dirs = dw.map((d, i) => Q.rot(Q.conj(par[i]), d));
    const tr = f1Track(dirs);
    euler[part] = tr.map(t => [t[0], 0, t[1]]);
    W[part] = euler[part].map((e, i) => Q.mul(par[i], eulerToQuat(e[0], 0, e[2])));
    let e = 0;
    dw.forEach((d, i) => { e = Math.max(e, Math.acos(Math.min(1, V.dot(d, Q.rot(W[part][i], DOWN))))); });
    dirErr[part] = e;
    dirsRel[part] = dw;
  }

  // ---- root translation (leg-length fractions), pelvis = hip-joint midpoint
  const ty = [], tx = [], tz = [];
  frames.forEach(f => {
    const hm = V.scale(V.add(f.p[idx.thL], f.p[idx.thR]), 0.5);
    ty.push((hm[1] - m.hipMid0[1]) / m.legLen);
    tx.push((hm[0] - m.hipMid0[0]) / m.legLen);
    tz.push((hm[2] - m.hipMid0[2]) / m.legLen);
  });
  dirsRel.body = bodyWorld.map(q => Q.rot(q, [0, 1, 0]));
  return { euler, pitch, roll, yaw, ty, tx, tz, dirErr, dirsRel };
}

function dirW(m, frames, part) {
  const [b, c] = LIMBS[part];
  return frames.map(f => V.norm(V.sub(f.p[m.idx[c]], f.p[m.idx[b]])));
}

function slerpQ(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; let bb = b;
  if (d < 0) { d = -d; bb = bb.map(x => -x); }
  if (d > 0.9995) return Q.norm([0, 1, 2, 3].map(i => a[i] + (bb[i] - a[i]) * t));
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return [0, 1, 2, 3].map(i => a[i] * wa + bb[i] * wb);
}

/** Weapon-tip trajectory of a hand (source metres, world). tip = wrist + tipLen * (wrist->middle finger direction) */
function tipTrack(m, frames, side, tipLen) {
  const { idx } = m;
  const h = idx['ha' + side], mid = idx['mid' + side];
  return frames.map(f => V.add(f.p[h], V.scale(V.norm(V.sub(f.p[mid], f.p[h])), tipLen)));
}

function attackMeta(m, frames, spec, fps, junctions) {
  const yaw = pelvisYaw(m, frames);
  const sides = spec.hand === 'auto' ? ['L', 'R'] : [spec.hand];
  let best = null;
  for (const side of sides) {
    const tip = tipTrack(m, frames, side, spec.tip);
    // strike-direction speed: tip velocity (heading-relative) projected on forward+down, backward/upward motion (wind-up, recovery) ignored
    const sdir = V.norm(spec.dir === 'forward' ? [0, 0, 1] : [0, -0.6, 1]);
    const rel = tip.map((p, i) => Q.rot(Q.axisAngle([0, 1, 0], -yaw[i]), p));
    const sp = rel.map((p, i) => i === 0 ? 0 : Math.max(0, V.dot(V.sub(p, rel[i - 1]), sdir) * fps));
    const s2 = sp.map((_, i) => (sp[Math.max(0, i - 1)] + sp[i] * 2 + sp[Math.min(sp.length - 1, i + 1)]) / 4); // 3-tap smooth
    let pk = 0; s2.forEach((v, i) => { if (v > s2[pk]) pk = i; });
    if (!best || s2[pk] > best.peak) best = { side, tip, speed: s2, pk, peak: s2[pk] };
  }
  const { tip, speed, pk, peak } = best;
  const qh = yaw.map(y => Q.axisAngle([0, 1, 0], -y));
  const hm = frames.map(f => V.scale(V.add(f.p[m.idx.thL], f.p[m.idx.thR]), 0.5));
  const fwd = tip.map((p, i) => Q.rot(qh[i], V.sub(p, hm[i]))[2]); // forward reach of the tip, heading-relative (metres)
  const recoverAfter = (p) => {
    let rec = frames.length - 1;
    for (let i = p + 1; i < frames.length; i++) if (speed[i] < 0.2 * speed[p]) { rec = i; break; }
    const j = (junctions || []).filter(x => x > p).sort((a, b) => a - b)[0]; // a concatenated recovery segment starts here
    return j !== undefined ? Math.min(rec, j) : rec;
  };
  // contact = first frame of the strike window [peak-1 .. peak+6] whose forward reach is within 4 cm of the window maximum
  const contact = (p) => {
    const lo = Math.max(0, p - 1), hi = Math.min(frames.length - 1, p + 6, recoverAfter(p) + 1);
    let mx = -1e9; for (let i = lo; i <= hi; i++) mx = Math.max(mx, fwd[i]);
    for (let i = lo; i <= hi; i++) if (fwd[i] >= mx - 0.04) return i;
    return p;
  };
  const out = { hand: best.side, hitFrame: contact(pk), peakSpeedFrame: pk, recoverFrame: recoverAfter(pk), peakSpeed: +peak.toFixed(2) };
  if (out.recoverFrame < out.hitFrame) out.recoverFrame = out.hitFrame;
  if (spec.multi) { // several strikes (combo): local maxima above 30% of the global peak, at least 6 frames apart
    const peaks = [];
    for (let i = 1; i < speed.length - 1; i++) if (speed[i] >= speed[i - 1] && speed[i] > speed[i + 1] && speed[i] > 0.3 * peak) {
      if (peaks.length && i - peaks[peaks.length - 1] < 6) { if (speed[i] > speed[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = i; } else peaks.push(i);
    }
    out.hitFrames = peaks.map(contact); out.recoverFrames = peaks.map((p, k) => Math.max(out.hitFrames[k], recoverAfter(p)));
    out.hitFrame = out.hitFrames[0]; out.recoverFrame = out.recoverFrames[0]; out.peakSpeedFrame = peaks[0];
  }
  return out;
}

/** Source skeleton as polylines in OUR voxel space (for the evaluation renderer only): 1 leg length (hip->ankle) = 10 voxels, feet on the floor at rest. */
export function sourceSticks(m, frames) {
  const { idx, rest } = m;
  const sc = 10 / m.legLen, foot = rest.p[idx.ftL][1];
  const T = p => [(p[0]) * sc, (p[1] - foot) * sc, (p[2]) * sc].map(v => +v.toFixed(2));
  return frames.map(f => {
    const P = r => f.p[idx[r]];
    const hm = V.scale(V.add(P('thL'), P('thR')), 0.5);
    const headTop = V.add(P('head'), Q.rot(Q.mul(f.q[idx.head], Q.conj(rest.q[idx.head])), [0, 0.13, 0]));
    return {
      spine: [hm, P('spine1'), P('spine2'), P('chest'), P('neck'), P('head'), headTop].map(T),
      shoulders: [P('uaR'), P('neck'), P('uaL')].map(T),
      pelvis: [P('thR'), P('thL')].map(T),
      armL: [P('uaL'), P('faL'), P('haL'), P('midL')].map(T),
      armR: [P('uaR'), P('faR'), P('haR'), P('midR')].map(T),
      legL: [P('thL'), P('shL'), P('ftL'), P('toL')].map(T),
      legR: [P('thR'), P('shR'), P('ftR'), P('toR')].map(T),
    };
  });
}

const r3 = v => Math.round(v * 1000) / 1000;
const flat = arr => { const o = []; for (const e of arr) o.push(r3(e[0]), r3(e[1]), r3(e[2])); return o; };

/** Retarget one mapped clip. Returns {clip, stats} */
export function retargetClip(m, name, spec, settings, verbose) {
  const fps = settings.fps;
  const srcs = Array.isArray(spec.src) ? spec.src : [spec.src];
  let frames = [], junctions = [];
  for (const s of srcs) {
    const anim = m.g.animations.find(a => a.name === s);
    if (!anim) throw new Error('clip not found: ' + s);
    const fr = sampleSource(m, anim, fps);
    if (frames.length) {
      const dup = poseDistance(m, frames[frames.length - 1], fr[0]) < 0.01; // boundary frame duplicated?
      if (dup) fr.shift();
      junctions.push(frames.length);
    }
    frames = frames.concat(fr);
  }
  let cuts = [];
  if (spec.drop) { // remove frame ranges [a,b) (given in 30 fps frames) of the concatenated list (e.g. a long static hold)
    const kf = fps / 30, ranges = spec.drop.map(([a, b]) => [a * kf, b * kf]);
    const keep = frames.map((_, i) => !ranges.some(([a, b]) => i >= a && i < b));
    const remap = []; let k = 0; keep.forEach((v, i) => { remap[i] = k; if (v) k++; });
    junctions = junctions.map(j => remap[j]);
    cuts = ranges.map(([a]) => remap[a - 1]).filter(v => v !== undefined);
    frames = frames.filter((_, i) => keep[i]);
  }
  let loopGap = null;
  if (spec.loop) {
    loopGap = poseDistance(m, frames[0], frames[frames.length - 1]);
    if (loopGap < 0.02) frames = frames.slice(0, -1); // last == first
  }
  const cfg = { bodyTwistGain: spec.bodyTwistGain ?? settings.bodyTwistGain, bodyTwistClamp: settings.bodyTwistClamp, headGain: spec.headGain ?? settings.headGain ?? 1, noRootRotation: !!spec.noRootRotation };
  const sol = solve(m, frames, cfg);
  const N = frames.length;
  const q = {}; for (const p of PARTS) q[p] = flat(sol.euler[p]);
  const clip = { frames: N, loop: !!spec.loop, meta: {}, root: sol.ty.map(r3), rootPitch: sol.pitch.map(r3), q };
  const maxabs = a => a.reduce((s, v) => Math.max(s, Math.abs(v)), 0);
  if (maxabs(sol.roll) > 0.02) clip.rootRoll = sol.roll.map(r3);
  const yr = Math.max(...sol.yaw) - Math.min(...sol.yaw);
  if (yr > 0.35 && !spec.dropYaw) clip.rootYaw = sol.yaw.map(r3); // significant turning inside the clip
  if (maxabs(sol.tx) > 0.02) clip.rootX = sol.tx.map(r3);
  if (maxabs(sol.tz) > 0.02) clip.rootZ = sol.tz.map(r3);
  clip.meta.durationFrames = N;
  clip.meta.src = srcs.join('+');
  if (spec.attack) Object.assign(clip.meta, attackMeta(m, frames, spec.attack, fps, junctions));
  if (spec.hit != null) clip.meta.hitFrame = spec.hit;
  if (spec.recover != null) clip.meta.recoverFrame = spec.recover;
  if (junctions.length) clip.meta.segments = [0, ...junctions];
  if (cuts.length) clip.meta.cuts = cuts; // frame index just before each removed range (pose jumps slightly across the cut)
  // end-to-end check of the ROUNDED data through our rig FK (heading removed) against the measured source directions
  let qe = 0;
  for (let f = 0; f < N; f++) {
    const pose = sampleClip(clip, f); pose.root.yaw = 0;
    const W = fk(pose);
    for (const part of LIMB_ORDER) qe = Math.max(qe, Math.acos(Math.min(1, V.dot(sol.dirsRel[part][f], Q.rot(W[part].q, DOWN)))));
    qe = Math.max(qe, Math.acos(Math.min(1, V.dot(sol.dirsRel.body[f], Q.rot(W.body.q, [0, 1, 0])))));
  }
  const stats = { quantErrDeg: +(qe * 180 / Math.PI).toFixed(3), loopGap: loopGap == null ? null : +(loopGap * 180 / Math.PI).toFixed(2), dirErrDeg: Math.max(...Object.values(sol.dirErr)) * 180 / Math.PI };
  if (verbose) console.log(name.padEnd(16), 'frames', N, 'dirErr(deg)', stats.dirErrDeg.toFixed(2), clip.meta.hitFrame !== undefined ? `hit ${clip.meta.hitFrame} rec ${clip.meta.recoverFrame}` : '');
  return { clip, stats, sol, frames };
}

export function retargetFile(glbPath, mappingPath, only, verbose, sticks = false, fps = null) {
  const mapping = loadMapping(mappingPath);
  if (fps) mapping.settings = { ...mapping.settings, fps };
  const g = loadGltf(glbPath);
  const m = makeModel(g, mapping);
  const names = new Set(g.animations.map(a => a.name));
  const out = { clips: {}, stats: {}, sticks: {} };
  for (const [name, spec] of Object.entries(mapping.clips)) {
    if (only && !only.includes(name)) continue;
    const srcs = Array.isArray(spec.src) ? spec.src : [spec.src];
    if (!srcs.every(s => names.has(s))) continue; // belongs to the other library
    const r = retargetClip(m, name, spec, mapping.settings, verbose);
    out.clips[name] = r.clip; out.stats[name] = r.stats;
    if (sticks) out.sticks[name] = sourceSticks(m, r.frames);
  }
  out.model = { rig: m.rig.key, legLenSrc: m.legLen, hipMid0: m.hipMid0 };
  return out;
}

// ---------------- CLI ----------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const pos = args.filter(a => !a.startsWith('--'));
  const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
  if (pos.length < 2) { console.error('usage: node tools/anim/retarget.mjs <in.glb> <out.json> [--map mapping.json] [--only a,b] [--verbose] [--sticks sticks.json]'); process.exit(2); }
  const mapPath = opt('map') || path.join(HERE, 'mapping_ual.json');
  const only = opt('only') ? opt('only').split(',') : null;
  const stickOut = opt('sticks');
  const res = retargetFile(path.resolve(pos[0]), mapPath, only, args.includes('--verbose'), !!stickOut);
  fs.writeFileSync(pos[1], JSON.stringify({ rig: 'hum1', fps: 30, parts: PARTS, clips: res.clips, model: res.model }));
  if (stickOut) fs.writeFileSync(stickOut, JSON.stringify(res.sticks));
  console.log(`wrote ${pos[1]}: ${Object.keys(res.clips).length} clips`);
}
