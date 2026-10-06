// Clip DSL: keyframes + easing curves + procedural layers, baked to the Clip format at boot (spec.md §7).
//
//   define('strike_thrust', { rig:'hum1', dur:0.72, hit:0.28, recover:0.5, keys: seq([...]), build(c, t, u) {...} })
//   bake(spec) -> Clip      bakeAll() -> every defined clip (registered by anim/boot.js)
//
// Channels (names used in `keys`, in poses and by the build() accessor `c`):
//   'armUR'            rotation  [rx, ry, rz] radians      (euler order Ry*Rx*Rz, spec.md §1)
//   'armUR.t'          translation [x, y, z] in WORLD units (added to the part origin)
//   'armUR.s'          scale [sx, sy, sz] (a single value = uniform)
//   'root.y' ...       root tracks y,x,z (world units, instance root), pitch, roll, yaw (radians; applied about the rig pivot)
//   'aim'              weapon aim track [elevation, azimuth, weight] in the body frame (see animator.js)
//
// Time is in SECONDS in the DSL; the baked clip is 30 fps. Looping clips are sampled periodically (frame N == frame 0).
// Pure module: no THREE, no DOM.

import { HUM1_RIG, describeRig, fk, lowestPoint } from './analysis.js';

export const FPS = 30;
const PI = Math.PI, TAU = Math.PI * 2;

// ------------------------------------------------------------------------------------------------------------------ easing
const bounceOut = (u) => {
  if (u < 1 / 2.75) return 7.5625 * u * u;
  if (u < 2 / 2.75) { u -= 1.5 / 2.75; return 7.5625 * u * u + 0.75; }
  if (u < 2.5 / 2.75) { u -= 2.25 / 2.75; return 7.5625 * u * u + 0.9375; }
  u -= 2.625 / 2.75; return 7.5625 * u * u + 0.984375;
};
export const EASE = {
  lin: (u) => u,
  in2: (u) => u * u, out2: (u) => 1 - (1 - u) * (1 - u), io2: (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)),
  in: (u) => u * u * u, out: (u) => 1 - (1 - u) ** 3, io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - 4 * (1 - u) ** 3),
  in4: (u) => u * u * u * u, out4: (u) => 1 - (1 - u) ** 4,
  smooth: (u) => u * u * u * (u * (u * 6 - 15) + 10),
  sine: (u) => 0.5 - 0.5 * Math.cos(PI * u),
  /** overshoots the target by `s` (default 1.70158 ~ 10%) then settles */
  back: (u, s = 1.70158) => 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2,
  /** anticipation: dips back before going forward */
  backIn: (u, s = 1.70158) => (s + 1) * u * u * u - s * u * u,
  backIO: (u, s = 1.70158) => { const c = s * 1.525; return u < 0.5 ? ((2 * u) ** 2 * ((c + 1) * 2 * u - c)) / 2 : ((2 * u - 2) ** 2 * ((c + 1) * (2 * u - 2) + c) + 2) / 2; },
  /** damped spring settle; (freq cycles per segment, damping) */
  spring: (u, f = 2.2, d = 5) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.exp(-d * u) * Math.cos(TAU * f * u)),
  elastic: (u, p = 0.35) => (u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(2, -10 * u) * Math.sin(((u - p / 4) * TAU) / p) + 1),
  bounce: bounceOut,
  step: (u) => (u >= 1 ? 1 : 0),
};
EASE.overshoot = EASE.back;
EASE.easeOut = EASE.out; EASE.easeIn = EASE.in; EASE.easeInOut = EASE.io;

/** Resolve an easing spec: name | [name, ...params] | function */
export function easeFn(e) {
  if (e === undefined || e === null) return EASE.io;
  if (typeof e === 'function') return e;
  if (Array.isArray(e)) { const f = EASE[e[0]]; if (!f) throw new Error('unknown ease ' + e[0]); const p = e.slice(1); return (u) => f(u, ...p); }
  if (e === 'spline') return EASE.lin;
  const f = EASE[e]; if (!f) throw new Error('unknown ease ' + e);
  return f;
}

// ------------------------------------------------------------------------------------------------------------------ keyframe evaluation
/**
 * keys: [[t, v0, v1, ..., ease?], ...] sorted by t. n = number of values per key.
 * Writes n values into out. cyc: wrap with `period`.
 */
export function evalKeys(keys, t, n, cyc, period, out) {
  const K = keys.length;
  if (K === 1) { for (let k = 0; k < n; k++) out[k] = keys[0][1 + k]; return out; }
  let i = -1;
  if (cyc) { t = ((t % period) + period) % period; }
  else if (t <= keys[0][0]) { for (let k = 0; k < n; k++) out[k] = keys[0][1 + k]; return out; }
  else if (t >= keys[K - 1][0]) { for (let k = 0; k < n; k++) out[k] = keys[K - 1][1 + k]; return out; }
  // segment index: last key with time <= t
  for (let j = 0; j < K; j++) { if (keys[j][0] <= t) i = j; else break; }
  let a, b, ta, tb;
  if (i < 0) { // cyclic, before the first key: segment from the last key (shifted by -period) to the first
    a = keys[K - 1]; b = keys[0]; ta = a[0] - period; tb = b[0];
  } else if (i === K - 1) { // cyclic, after the last key: wrap to the first key (shifted by +period)
    a = keys[K - 1]; b = keys[0]; ta = a[0]; tb = b[0] + period;
  } else { a = keys[i]; b = keys[i + 1]; ta = a[0]; tb = b[0]; }
  const span = tb - ta;
  const u = span > 1e-9 ? (t - ta) / span : 1;
  const eb = b[1 + n];
  if (eb === 'spline') {
    const ia = keys.indexOf(a), ib = keys.indexOf(b);
    const p0 = neighbour(keys, ia, -1, cyc), p3 = neighbour(keys, ib, +1, cyc);
    for (let k = 0; k < n; k++) {
      const v1 = a[1 + k], v2 = b[1 + k];
      const v0 = p0 ? p0[1 + k] : v1, v3 = p3 ? p3[1 + k] : v2;
      // Catmull-Rom tangents scaled to the segment (uniform parametrisation per segment)
      const m1 = (v2 - v0) * 0.5, m2 = (v3 - v1) * 0.5;
      const u2 = u * u, u3 = u2 * u;
      out[k] = (2 * u3 - 3 * u2 + 1) * v1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * v2 + (u3 - u2) * m2;
    }
    return out;
  }
  const w = easeFn(eb)(u);
  for (let k = 0; k < n; k++) out[k] = a[1 + k] + (b[1 + k] - a[1 + k]) * w;
  return out;
}
function neighbour(keys, i, dir, cyc) {
  const K = keys.length, j = i + dir;
  if (j >= 0 && j < K) return keys[j];
  if (cyc) return keys[(j + K) % K];
  return null;
}

// ------------------------------------------------------------------------------------------------------------------ channels
const ROOT_CH = ['y', 'x', 'z', 'pitch', 'roll', 'yaw'];
/** parse 'armUR' | 'armUR.t' | 'armUR.s' | 'root.y' | 'aim' */
function parseChannel(name) {
  if (name === 'aim') return { kind: 'aim', n: 4 };
  const dot = name.indexOf('.');
  if (dot < 0) return { kind: 'q', part: name, n: 3 };
  const part = name.slice(0, dot), sub = name.slice(dot + 1);
  if (part === 'root') { if (!ROOT_CH.includes(sub)) throw new Error('bad root channel ' + name); return { kind: 'root', ch: sub, n: 1 }; }
  if (sub === 't') return { kind: 't', part, n: 3 };
  if (sub === 's') return { kind: 's', part, n: 3 };
  throw new Error('bad channel ' + name);
}

/** Normalise keys: values may be a scalar for scale / root channels; sort by time. Returns {name: keyArray} */
function normaliseKeys(keys) {
  const out = {};
  for (const name of Object.keys(keys)) {
    const ch = parseChannel(name);
    const arr = keys[name].map((k) => {
      const t = k[0];
      let vals = [], ease;
      for (let i = 1; i < k.length; i++) { if (typeof k[i] === 'number') vals.push(k[i]); else { ease = k[i]; } }
      if (ch.kind === 's' && vals.length === 1) vals = [vals[0], vals[0], vals[0]];
      if (ch.kind === 'aim' && vals.length === 3) vals.push(0);          // optional 4th value: twist about the weapon axis
      if (vals.length !== ch.n) throw new Error(`channel ${name}: key at ${t} has ${vals.length} values, want ${ch.n}`);
      const o = [t, ...vals]; o.push(ease); return o;
    }).sort((a, b) => a[0] - b[0]);
    out[name] = arr;
  }
  return out;
}

/**
 * seq([[t, pose, ease?], ...]) -> keys object. A pose is {channelName: values}; partial poses are fine (a channel interpolates
 * between the keys it appears in). `root: {y:.., pitch:..}` expands to 'root.y', 'root.pitch'. The ease belongs to the segment
 * ARRIVING at that pose (so ['out'] = decelerate into it, ['back'] = overshoot it, ['in'] = accelerate into it).
 */
export function seq(list) {
  const keys = {};
  for (const item of list) {
    const t = item[0], pose = item[1], ease = item[2];
    for (const name of Object.keys(pose)) {
      if (name === 'root') { for (const c of Object.keys(pose.root)) (keys['root.' + c] ||= []).push([t, pose.root[c], ease]); continue; }
      const v = pose[name];
      (keys[name] ||= []).push([t, ...(Array.isArray(v) ? v : [v]), ease]);
    }
  }
  return keys;
}
/** merge several key sets (later wins on a channel). */
export function mergeKeys(...sets) {
  const out = {};
  for (const s of sets) for (const k of Object.keys(s)) out[k] = s[k].slice();
  return out;
}
/** shift every key time by dt (seconds) */
export function shiftKeys(keys, dt) {
  const out = {};
  for (const k of Object.keys(keys)) out[k] = keys[k].map((e) => { const c = e.slice(); c[0] += dt; return c; });
  return out;
}

// ------------------------------------------------------------------------------------------------------------------ baking
class FrameCtx {
  constructor(spec, N, keys) {
    this.spec = spec; this.N = N; this.keys = keys; this.cyc = !!spec.loop; this.dur = spec.dur;
    this.q = Object.create(null); this.t = Object.create(null); this.s = Object.create(null);
    this.root = Object.create(null); this.aim = null;
    this.f = 0; this.time = 0; this.u = 0;
    this._tmp = [0, 0, 0];
  }
  _arr(map, part, n, fill) {
    let a = map[part];
    if (!a) { a = map[part] = new Float32Array(this.N * n); if (fill !== undefined) a.fill(fill); }
    return a;
  }
  // ---- writers (current frame) ----
  rot(part, rx, ry, rz) { const a = this._arr(this.q, part, 3), o = this.f * 3; a[o] = rx; a[o + 1] = ry; a[o + 2] = rz; return this; }
  addRot(part, rx, ry, rz) { const a = this._arr(this.q, part, 3), o = this.f * 3; a[o] += rx; a[o + 1] += ry; a[o + 2] += rz; return this; }
  pos(part, x, y, z) { const a = this._arr(this.t, part, 3), o = this.f * 3; a[o] = x; a[o + 1] = y; a[o + 2] = z; return this; }
  addPos(part, x, y, z) { const a = this._arr(this.t, part, 3), o = this.f * 3; a[o] += x; a[o + 1] += y; a[o + 2] += z; return this; }
  scl(part, sx, sy = sx, sz = sx) { const a = this._arr(this.s, part, 3, 1), o = this.f * 3; a[o] = sx; a[o + 1] = sy; a[o + 2] = sz; return this; }
  mulScl(part, sx, sy = sx, sz = sx) { const a = this._arr(this.s, part, 3, 1), o = this.f * 3; a[o] *= sx; a[o + 1] *= sy; a[o + 2] *= sz; return this; }
  rootSet(ch, v) { this._arr(this.root, ch, 1)[this.f] = v; return this; }
  rootAdd(ch, v) { this._arr(this.root, ch, 1)[this.f] += v; return this; }
  setAim(e, a, w, tw = 0) { if (!this.aim) this.aim = new Float32Array(this.N * 4); const o = this.f * 4; this.aim[o] = e; this.aim[o + 1] = a; this.aim[o + 2] = w; this.aim[o + 3] = tw; return this; }
  // ---- readers ----
  rotOf(part, k) { const a = this.q[part]; return a ? a[this.f * 3 + k] : 0; }
  /** sample a KEYED channel at another time (follow-through / lag helpers) */
  key(name, t) {
    const ks = this.keys[name]; if (!ks) return null;
    const ch = parseChannel(name);
    return evalKeys(ks, t, ch.n, this.cyc, this.dur, new Array(ch.n));
  }
}

/** Evaluate keyed channels into the frame context at time t. */
function applyKeys(c, keys, t) {
  const tmp = c._tmp;
  for (const name of Object.keys(keys)) {
    const ch = parseChannel(name), ks = keys[name];
    evalKeys(ks, t, ch.n, c.cyc, c.dur, tmp);
    switch (ch.kind) {
      case 'q': c.rot(ch.part, tmp[0], tmp[1], tmp[2]); break;
      case 't': c.pos(ch.part, tmp[0], tmp[1], tmp[2]); break;
      case 's': c.scl(ch.part, tmp[0], tmp[1], tmp[2]); break;
      case 'root': c.rootSet(ch.ch, tmp[0]); break;
      case 'aim': c.setAim(tmp[0], tmp[1], tmp[2], tmp[3]); break;
      default: break;
    }
  }
}

const EPS = 1e-5;
function nonTrivial(arr, n, ident) {
  for (let i = 0; i < arr.length; i++) if (Math.abs(arr[i] - (ident === undefined ? 0 : ident)) > EPS) return true;
  return false;
}

/** Bake a clip spec to the Clip format. */
export function bake(spec) {
  if (!spec.id) throw new Error('clip spec without id');
  const loop = !!spec.loop;
  const N = Math.max(2, Math.round(spec.dur * FPS));
  const keys = spec.keys ? normaliseKeys(spec.keys) : {};
  const c = new FrameCtx(spec, N, keys);
  for (let f = 0; f < N; f++) {
    c.f = f;
    const t = (!loop && f === N - 1) ? spec.dur : f / FPS;
    c.time = t; c.u = t / spec.dur;
    applyKeys(c, keys, t);
    if (spec.build) spec.build(c, t, c.u, f);
  }
  const clip = { id: spec.id, rig: spec.rig || 'hum1', fps: FPS, frames: N, loop, q: {}, meta: {} };
  for (const p of Object.keys(c.q)) if (nonTrivial(c.q[p], 3, 0)) clip.q[p] = c.q[p];
  for (const p of Object.keys(c.t)) if (nonTrivial(c.t[p], 3, 0)) (clip.t ||= {})[p] = c.t[p];
  for (const p of Object.keys(c.s)) if (nonTrivial(c.s[p], 3, 1)) (clip.s ||= {})[p] = c.s[p];
  for (const ch of Object.keys(c.root)) if (nonTrivial(c.root[ch], 1, 0)) (clip.root ||= {})[ch] = c.root[ch];
  if (c.aim) clip.aim = c.aim;
  if (spec.floor) applyFloor(clip, spec.floor);
  const m = clip.meta;
  if (spec.hit !== undefined) m.hitFrame = Math.max(0, Math.min(N - 1, Math.round(spec.hit * FPS)));
  if (spec.recover !== undefined) m.recoverFrame = Math.max(0, Math.min(N - 1, Math.round(spec.recover * FPS)));
  if (spec.speedRef !== undefined) m.speedRef = spec.speedRef;
  if (spec.fx) m.fx = spec.fx.map((e) => ({ frame: Math.round(e[0] * FPS), cue: e[1] }));
  if (spec.meta) Object.assign(m, spec.meta);
  return clip;
}

// ------------------------------------------------------------------------------------------------------------------ registry
const DEFS = new Map();
/** define(id, spec) registers a clip definition; `from` copies another definition and overrides fields. */
export function define(id, spec) {
  if (DEFS.has(id + '|' + (spec.rig || 'hum1'))) throw new Error('duplicate clip definition ' + id);
  const s = Object.assign({ id }, spec);
  DEFS.set(id + '|' + (s.rig || 'hum1'), s);
  return s;
}
export function definedClips() { return Array.from(DEFS.values()); }
export function clearDefinitions() { DEFS.clear(); }
/** bake every defined clip */
export function bakeAll() { return definedClips().map(bake); }

// ------------------------------------------------------------------------------------------------------------------ clip transforms
const SWAP = (id) => id.replace(/L$/, '\u0001').replace(/R$/, 'L').replace(/\u0001$/, 'R');
/** mirror a clip left <-> right (part ids ending in L/R, FL/FR/BL/BR; ry/rz/x/roll/yaw flip sign) */
export function mirrorClip(clip, newId) {
  const out = { id: newId || clip.id, rig: clip.rig, fps: clip.fps, frames: clip.frames, loop: clip.loop, q: {}, meta: Object.assign({}, clip.meta) };
  const N = clip.frames;
  for (const p of Object.keys(clip.q)) {
    const a = clip.q[p], b = new Float32Array(a.length);
    for (let i = 0; i < N; i++) { b[i * 3] = a[i * 3]; b[i * 3 + 1] = -a[i * 3 + 1]; b[i * 3 + 2] = -a[i * 3 + 2]; }
    out.q[SWAP(p)] = b;
  }
  if (clip.t) { out.t = {}; for (const p of Object.keys(clip.t)) { const a = clip.t[p], b = new Float32Array(a.length); for (let i = 0; i < N; i++) { b[i * 3] = -a[i * 3]; b[i * 3 + 1] = a[i * 3 + 1]; b[i * 3 + 2] = a[i * 3 + 2]; } out.t[SWAP(p)] = b; } }
  if (clip.s) { out.s = {}; for (const p of Object.keys(clip.s)) out.s[SWAP(p)] = clip.s[p].slice(); }
  if (clip.root) { out.root = {}; for (const k of Object.keys(clip.root)) { const a = clip.root[k].slice(); if (k === 'x' || k === 'roll' || k === 'yaw') for (let i = 0; i < a.length; i++) a[i] = -a[i]; out.root[k] = a; } }
  if (clip.aim) { out.aim = clip.aim.slice(); for (let i = 0; i < N; i++) { out.aim[i * 4 + 1] = -out.aim[i * 4 + 1]; out.aim[i * 4 + 3] = -out.aim[i * 4 + 3]; } }
  return out;
}

/** read channel values of a baked clip at fractional frame f (linear, clamped or wrapped) into out[0..n) */
function sampleArr(a, n, N, loop, f, out) {
  let i0, i1, w;
  if (loop) { f = ((f % N) + N) % N; i0 = Math.floor(f); i1 = (i0 + 1) % N; w = f - i0; }
  else { f = Math.max(0, Math.min(N - 1, f)); i0 = Math.floor(f); i1 = Math.min(N - 1, i0 + 1); w = f - i0; }
  for (let k = 0; k < n; k++) out[k] = a[i0 * n + k] + (a[i1 * n + k] - a[i0 * n + k]) * w;
  return out;
}

/** Resample a clip through a time map: map = [[srcSeconds, dstSeconds], ...] monotonic, starting [0,0]. Result length = last dst time. */
export function timeWarp(clip, map, opts = {}) {
  const fps = clip.fps, dstDur = map[map.length - 1][1];
  const N = Math.max(2, Math.round(dstDur * fps));
  const src = (td) => { // dst time -> src time
    for (let i = 0; i < map.length - 1; i++) {
      const [s0, d0] = map[i], [s1, d1] = map[i + 1];
      if (td <= d1 || i === map.length - 2) { const w = d1 > d0 ? Math.max(0, Math.min(1, (td - d0) / (d1 - d0))) : 1; return s0 + (s1 - s0) * w; }
    }
    return 0;
  };
  const out = { id: opts.id || clip.id, rig: clip.rig, fps, frames: N, loop: opts.loop !== undefined ? opts.loop : clip.loop, q: {}, meta: Object.assign({}, clip.meta) };
  const tmp = [0, 0, 0];
  const mapFrame = (frameSrc) => { // src frame -> dst frame (inverse of src())
    const ts = frameSrc / fps;
    for (let i = 0; i < map.length - 1; i++) {
      const [s0, d0] = map[i], [s1, d1] = map[i + 1];
      if (ts <= s1 || i === map.length - 2) { const w = s1 > s0 ? Math.max(0, Math.min(1, (ts - s0) / (s1 - s0))) : 1; return (d0 + (d1 - d0) * w) * fps; }
    }
    return 0;
  };
  const channels = [['q', 3], ['t', 3], ['s', 3]];
  for (const [key, n] of channels) {
    if (!clip[key]) continue; out[key] = {};
    for (const p of Object.keys(clip[key])) {
      const a = clip[key][p], b = new Float32Array(N * n);
      for (let f = 0; f < N; f++) { const ts = src(f / fps) * fps; sampleArr(a, n, clip.frames, clip.loop, ts, tmp); for (let k = 0; k < n; k++) b[f * n + k] = tmp[k]; }
      out[key][p] = b;
    }
  }
  if (clip.root) { out.root = {}; for (const k of Object.keys(clip.root)) { const a = clip.root[k], b = new Float32Array(N); for (let f = 0; f < N; f++) { sampleArr(a, 1, clip.frames, clip.loop, src(f / fps) * fps, tmp); b[f] = tmp[0]; } out.root[k] = b; } }
  if (clip.aim) { out.aim = new Float32Array(N * 4); const t4 = [0, 0, 0, 0]; for (let f = 0; f < N; f++) { sampleArr(clip.aim, 4, clip.frames, clip.loop, src(f / fps) * fps, t4); for (let k = 0; k < 4; k++) out.aim[f * 4 + k] = t4[k]; } }
  const m = out.meta;
  for (const k of ['hitFrame', 'recoverFrame']) if (m[k] !== undefined) m[k] = Math.max(0, Math.min(N - 1, Math.round(mapFrame(m[k]))));
  if (Array.isArray(m.hitFrames)) m.hitFrames = m.hitFrames.map((x) => Math.round(mapFrame(x)));
  if (Array.isArray(m.recoverFrames)) m.recoverFrames = m.recoverFrames.map((x) => Math.round(mapFrame(x)));
  return out;
}
/** Uniform retime to a new duration in seconds */
export function retimeTo(clip, dur, opts) { return timeWarp(clip, [[0, 0], [clip.frames / clip.fps, dur]], opts); }

/** Cut [t0, t1] (seconds) out of a clip */
export function subclip(clip, t0, t1, opts = {}) {
  const d = t1 - t0, N = Math.max(2, Math.round(d * clip.fps));
  const c = timeWarp(clip, [[t0, 0], [t1, d]], opts);
  c.frames = N; // timeWarp already sized by dst duration
  return c;
}

/** Linear blend of two clips of equal length (w=0 -> a, w=1 -> b). Rotations use shortest-angle blending. */
export function blendClips(a, b, w, opts = {}) {
  const N = a.frames, out = { id: opts.id || a.id, rig: a.rig, fps: a.fps, frames: N, loop: a.loop, q: {}, meta: Object.assign({}, a.meta) };
  const parts = new Set([...Object.keys(a.q), ...Object.keys(b.q)]);
  for (const p of parts) {
    const qa = a.q[p], qb = b.q[p], o = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) { const x = qa ? qa[i] : 0; let y = qb ? qb[i] : 0; let d = y - x; if (d > PI) d -= TAU; else if (d < -PI) d += TAU; o[i] = x + d * w; }
    out.q[p] = o;
  }
  return out;
}

/** Scale the rotation of selected parts (default all) about their frame-0 value by k (stride / swing amplitude control). */
export function scaleAmp(clip, k, parts) {
  const out = Object.assign({}, clip, { q: {}, meta: Object.assign({}, clip.meta) });
  for (const p of Object.keys(clip.q)) {
    if (parts && !parts.includes(p)) { out.q[p] = clip.q[p]; continue; }
    const a = clip.q[p], b = new Float32Array(a.length), r0 = [a[0], a[1], a[2]];
    for (let i = 0; i < a.length; i++) b[i] = r0[i % 3] + (a[i] - r0[i % 3]) * k;
    out.q[p] = b;
  }
  return out;
}

/** Play clip a then clip b, crossfading `blendFrames` frames at the joint. */
export function concat(a, b, blendFrames = 3, opts = {}) {
  const N = a.frames + b.frames - blendFrames, out = { id: opts.id || a.id, rig: a.rig, fps: a.fps, frames: N, loop: !!opts.loop, q: {}, meta: Object.assign({}, a.meta) };
  const parts = new Set([...Object.keys(a.q), ...Object.keys(b.q)]);
  for (const p of parts) {
    const qa = a.q[p], qb = b.q[p], o = new Float32Array(N * 3);
    for (let f = 0; f < N; f++) {
      for (let k = 0; k < 3; k++) {
        const fa = f < a.frames ? (qa ? qa[f * 3 + k] : 0) : null;
        const fb = f >= a.frames - blendFrames ? (qb ? qb[(f - (a.frames - blendFrames)) * 3 + k] : 0) : null;
        if (fa !== null && fb !== null) { const w = (f - (a.frames - blendFrames) + 1) / (blendFrames + 1); let d = fb - fa; if (d > PI) d -= TAU; else if (d < -PI) d += TAU; o[f * 3 + k] = fa + d * w; }
        else o[f * 3 + k] = fa !== null ? fa : fb;
      }
    }
    out.q[p] = o;
  }
  if (a.root || b.root) {
    out.root = {};
    for (const ch of new Set([...Object.keys(a.root || {}), ...Object.keys(b.root || {})])) {
      const ra = a.root && a.root[ch], rb = b.root && b.root[ch], o = new Float32Array(N);
      for (let f = 0; f < N; f++) {
        const fa = f < a.frames ? (ra ? ra[f] : 0) : null, fb = f >= a.frames - blendFrames ? (rb ? rb[f - (a.frames - blendFrames)] : 0) : null;
        o[f] = fa !== null && fb !== null ? fa + (fb - fa) * ((f - (a.frames - blendFrames) + 1) / (blendFrames + 1)) : (fa !== null ? fa : fb);
      }
      out.root[ch] = o;
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------------------ authoring helpers
/**
 * anticipation / strike / overshoot / follow-through as a key list for ONE channel value (scalar or array).
 *   rest -> anticipation (pull back) -> contact (fast, accelerating) -> overshoot -> settle to rest
 * times: {t0, tAnt, tHit, tOver, tEnd}; values: {rest, ant, hit, over}; returns [[t, ...v, ease], ...]
 */
export function swing(tm, v) {
  const A = (x) => (Array.isArray(x) ? x : [x]);
  return [
    [tm.t0, ...A(v.rest)],
    [tm.tAnt, ...A(v.ant), 'io'],
    [tm.tHit, ...A(v.hit), 'in'],
    [tm.tOver, ...A(v.over), 'out'],
    [tm.tEnd, ...A(v.rest !== undefined ? v.rest : v.hit), 'io'],
  ];
}
/** sine wave helper for loops: amplitude a, cycles per clip c, phase p (0..1) at normalised time u */
export const wave = (u, c = 1, p = 0) => Math.sin((u * c + p) * TAU);
/** cosine twin */
export const waveC = (u, c = 1, p = 0) => Math.cos((u * c + p) * TAU);
/** a smooth 0..1..0 bump centred at tc with half-width w (seconds) */
export const bump = (t, tc, w) => { const x = (t - tc) / w; return Math.abs(x) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(PI * x); };
/** clamp / lerp / smoothstep helpers for build() functions */
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, w) => a + (b - a) * w;
export const smoothstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

// ------------------------------------------------------------------------------------------------------------------ ground contact fit
/**
 * Keep a hum1 clip on the ground: raise root.y per frame so that no part box goes below y = 0 (floor:true), and with {snapFrom: seconds}
 * also lower the body to rest exactly on the ground in the given windows (lying poses; {snap: [[t0, t1], ...]}). Uses the canonical hum1
 * part boxes (spec §4.1).
 */
export function applyFloor(clip, opt) {
  const desc = describeRig(HUM1_RIG);
  const P = desc.P, N = clip.frames, pose = new Float32Array(P * 9), W = new Float64Array(P * 12);
  const root = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
  const ry = clip.root && clip.root.y ? clip.root.y : ((clip.root = clip.root || {}).y = new Float32Array(N));
  const snap = opt && opt.snap ? opt.snap.map((w) => [Math.round(w[0] * FPS), Math.round(w[1] * FPS)]) : [];
  const inSnap = (f) => snap.some((w) => f >= w[0] && f <= w[1]);
  const pv = [0, 1, 0];
  for (let f = 0; f < N; f++) {
    for (let p = 0; p < P; p++) {
      const id = desc.ids[p], o = p * 9;
      const q = clip.q[id], tt = clip.t && clip.t[id], ss = clip.s && clip.s[id];
      pose[o] = tt ? tt[f * 3] : 0; pose[o + 1] = tt ? tt[f * 3 + 1] : 0; pose[o + 2] = tt ? tt[f * 3 + 2] : 0;
      pose[o + 3] = q ? q[f * 3] : 0; pose[o + 4] = q ? q[f * 3 + 1] : 0; pose[o + 5] = q ? q[f * 3 + 2] : 0;
      pose[o + 6] = ss ? ss[f * 3] : 1; pose[o + 7] = ss ? ss[f * 3 + 1] : 1; pose[o + 8] = ss ? ss[f * 3 + 2] : 1;
    }
    fk(desc, pose, W);
    const r = clip.root || {};
    root.pitch = r.pitch ? r.pitch[f] : 0; root.roll = r.roll ? r.roll[f] : 0; root.yaw = r.yaw ? r.yaw[f] : 0;
    // root offset = authored offset + pivot compensation (rotation about the hip), as the animator applies it
    const cx = Math.cos(root.pitch), sx = Math.sin(root.pitch), cy = Math.cos(root.yaw), sy = Math.sin(root.yaw), cz = Math.cos(root.roll), sz = Math.sin(root.roll);
    const m10 = cx * sz, m11 = cx * cz, m12 = -sx, m00 = cy * cz + sy * sx * sz, m01 = -cy * sz + sy * sx * cz, m02 = sy * cx, m20 = -sy * cz + cy * sx * sz, m21 = sy * sz + cy * sx * cz, m22 = cy * cx;
    root.x = (r.x ? r.x[f] : 0) + pv[0] - (m00 * pv[0] + m01 * pv[1] + m02 * pv[2]);
    root.y = (r.y ? r.y[f] : 0) + pv[1] - (m10 * pv[0] + m11 * pv[1] + m12 * pv[2]);
    root.z = (r.z ? r.z[f] : 0) + pv[2] - (m20 * pv[0] + m21 * pv[1] + m22 * pv[2]);
    const lo = lowestPoint(desc, W, root);
    if (lo < 0 || inSnap(f)) ry[f] += -lo;
  }
  clip.meta.floorFit = true;
}
