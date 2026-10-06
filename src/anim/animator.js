// Animator: PURE (no THREE, no DOM). Poses a ModelDef from sim-chosen clip ids/times (spec.md §7).
//
//   Animator.pose(model, state, extra, out)
//     model  : ModelDef (parts in model order; meta.rig, meta.subrigs, meta.clipMap, meta.species, meta.weaponStyle ...)
//     state  : u.anim = {clip, t, rate, flinch, dir, prev, blend, mount?, rider?}   (the SIM chooses clips and times; we only sample)
//     extra  : optional {root, heading, phase, speed, lod}
//                root    out object {x,y,z,pitch,roll,yaw}: instance root tracks (see applyRoot)
//                heading unit heading (radians), needed for hit-direction flinch and fall direction
//                phase   0..1 per-unit offset added to looping clips (de-synchronises crowds; use idlePhase(unit.id))
//                speed   current ground speed u/s (cape/crest lean); lod 0 full, 1 reduced (no secondary/overlays), 2 pose only
//     out    : Float32Array(parts*9): tx,ty,tz, rx,ry,rz, sx,sy,sz per part (VoxSkin POSE_STRIDE)
//
// What it does: crossfade (state.blend 0..1 between state.prev and state.clip) with shortest-angle blending, looped/one-shot
// sampling with linear interpolation between the 30 fps frames, root tracks, additive hit flinch toward state.dir, weapon aim and
// shield facing by weapon style, idle foot-bob/body-sway, cape/crest follow-through, composed models (mount + rider, chariot, ...)
// where every sub-rig gets its own clip, and graceful fallbacks for missing parts/clips (reported once through Animator.warn).
// Zero allocation per call after the first pose of a model (caches live on the ModelDef and on the state object).
//
// Private fields the animator keeps on `state`: _pc (last seen clip), _lt (last t), _pt (time the previous clip had when we
// switched). If the sim provides `state.pt` (previous clip time at the switch) it is used instead.

import { ClipLib } from './clips.js';

export const POSE_STRIDE = 9;
const PI = Math.PI, TAU = Math.PI * 2, HALF_PI = Math.PI / 2;
const BLEND_S = 0.14;            // nominal crossfade length the sim uses (state.blend advances by dt / 0.14)

// ------------------------------------------------------------------------------------------------------------------ reporting
const warned = new Set();
export const Animator = {
  /** assign a function(msg) to log missing parts/clips (tests do; production stays silent) */
  warn: null,
  /** every distinct warning seen (Diagnostics may read it) */
  warnings: warned,
};
function warnOnce(msg) {
  if (warned.has(msg)) return;
  warned.add(msg);
  if (Animator.warn) Animator.warn(msg);
}

// ------------------------------------------------------------------------------------------------------------------ small math
const wrapPi = (a) => { a = a % TAU; return a > PI ? a - TAU : a < -PI ? a + TAU : a; };
const sstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// scratch (module level: zero allocation)
const _R1 = new Float64Array(9), _R2 = new Float64Array(9), _R3 = new Float64Array(9), _V = new Float64Array(3), _W = new Float64Array(3);
const _rootA = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
const _rootB = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
let _scratch = new Float32Array(48 * POSE_STRIDE);

/** euler (Ry*Rx*Rz, VoxSkin order) -> 3x3 row-major */
function eulerToMat(rx, ry, rz, m) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  m[0] = cy * cz + sy * sx * sz; m[1] = -cy * sz + sy * sx * cz; m[2] = sy * cx;
  m[3] = cx * sz; m[4] = cx * cz; m[5] = -sx;
  m[6] = -sy * cz + cy * sx * sz; m[7] = sy * sz + cy * sx * cz; m[8] = cy * cx;
}
function mulMat(a, b, o) { // o = a*b (o must not alias)
  o[0] = a[0] * b[0] + a[1] * b[3] + a[2] * b[6]; o[1] = a[0] * b[1] + a[1] * b[4] + a[2] * b[7]; o[2] = a[0] * b[2] + a[1] * b[5] + a[2] * b[8];
  o[3] = a[3] * b[0] + a[4] * b[3] + a[5] * b[6]; o[4] = a[3] * b[1] + a[4] * b[4] + a[5] * b[7]; o[5] = a[3] * b[2] + a[4] * b[5] + a[5] * b[8];
  o[6] = a[6] * b[0] + a[7] * b[3] + a[8] * b[6]; o[7] = a[6] * b[1] + a[7] * b[4] + a[8] * b[7]; o[8] = a[6] * b[2] + a[7] * b[5] + a[8] * b[8];
}
/** rotation matrix -> euler (Ry*Rx*Rz) into out[0..2] = rx, ry, rz */
function matToEuler(m, out) {
  const s = -m[5];
  out[0] = Math.asin(s > 1 ? 1 : s < -1 ? -1 : s);
  if (Math.abs(m[5]) < 0.99999) { out[1] = Math.atan2(m[2], m[8]); out[2] = Math.atan2(m[3], m[4]); }
  else { out[1] = Math.atan2(-m[6], m[0]); out[2] = 0; }
}
/** shortest-arc rotation taking unit vector a to unit vector b -> matrix */
function arcMat(ax, ay, az, bx, by, bz, m) {
  const vx = ay * bz - az * by, vy = az * bx - ax * bz, vz = ax * by - ay * bx;
  const c = ax * bx + ay * by + az * bz;
  if (c < -0.99999) { // opposite: rotate PI about any axis perpendicular to a
    let px, py, pz;
    if (Math.abs(ax) < 0.9) { px = 0; py = -az; pz = ay; } else { px = az; py = 0; pz = -ax; }
    const l = Math.hypot(px, py, pz) || 1; px /= l; py /= l; pz /= l;
    m[0] = 2 * px * px - 1; m[1] = 2 * px * py; m[2] = 2 * px * pz;
    m[3] = 2 * py * px; m[4] = 2 * py * py - 1; m[5] = 2 * py * pz;
    m[6] = 2 * pz * px; m[7] = 2 * pz * py; m[8] = 2 * pz * pz - 1;
    return;
  }
  const k = 1 / (1 + c);
  m[0] = 1 - (vy * vy + vz * vz) * k; m[1] = -vz + vx * vy * k; m[2] = vy + vx * vz * k;
  m[3] = vz + vx * vy * k; m[4] = 1 - (vx * vx + vz * vz) * k; m[5] = -vx + vy * vz * k;
  m[6] = -vy + vx * vz * k; m[7] = vx + vy * vz * k; m[8] = 1 - (vx * vx + vy * vy) * k;
}

// ------------------------------------------------------------------------------------------------------------------ clip classes
// class drives idle overlays and weapon aim: idle | ready | move | strike | shoot | down | other
function classOf(id) {
  if (id === 'idle' || id === 'ride_idle' || id === 'sleep' || id === 'sit' || id.endsWith('_idle')) return 'idle';
  if (id === 'idle_combat' || id === 'block_hold' || id === 'crew_idle') return 'ready';
  if (id === 'walk' || id === 'run' || id === 'trot' || id === 'gallop' || id === 'rout' || id === 'sprint' || id.indexOf('walk') >= 0 || id.indexOf('gallop') >= 0 || id.indexOf('trot') >= 0 || id.indexOf('run') >= 0 || id === 'ride_trot' || id === 'ride_gallop') return 'move';
  if (id.startsWith('strike_') || id === 'kick' || id === 'ride_strike' || id === 'launch') return 'strike';
  if (id === 'shoot_bow' || id === 'ride_shoot' || id === 'throw' || id === 'cast' || id === 'crew_shoot') return 'shoot';
  if (id.startsWith('death') || id === 'getup' || id === 'stagger' || id === 'stun' || id === 'tumble' || id === 'flail' || id === 'knockdown') return 'down';
  return 'other';
}
const CL_IDLE = 1, CL_READY = 2, CL_MOVE = 3, CL_STRIKE = 4, CL_SHOOT = 5, CL_DOWN = 6, CL_OTHER = 7;
const CLASS_CODE = { idle: CL_IDLE, ready: CL_READY, move: CL_MOVE, strike: CL_STRIKE, shoot: CL_SHOOT, down: CL_DOWN, other: CL_OTHER };

// ------------------------------------------------------------------------------------------------------------------ clip fallbacks
const FALLBACK = {
  idle_combat: ['idle'], block_hold: ['idle_combat', 'idle'], block_hit: ['hit_front', 'idle_combat'], hit_front: ['idle_combat'], hit_back: ['hit_front', 'idle_combat'],
  walk: ['idle'], run: ['walk'], trot: ['walk'], gallop: ['trot', 'run'], rout: ['run', 'walk'], cower: ['idle'], sleep: ['cower', 'idle'],
  stagger: ['hit_front', 'idle_combat'], stun: ['dizzy', 'idle'], dizzy: ['stun', 'idle'], cheer: ['idle'], taunt: ['idle_combat'], sit: ['idle'],
  death_front: ['death_back'], death_spin: ['death_back'], getup: ['idle'], flail: ['stagger'], tumble: ['death_spin', 'flail'],
  kick: ['strike_thrust', 'strike_slash_1'], shoot_bow: ['throw', 'strike_thrust'], throw: ['strike_slash_1'], cast: ['taunt', 'idle_combat'],
  ride_idle: ['idle'], ride_strike: ['strike_thrust', 'idle_combat'], ride_shoot: ['shoot_bow', 'idle'], ride_gallop: ['ride_idle'], ride_trot: ['ride_idle'],
  strike_slash_1: ['strike_thrust', 'idle_combat'], strike_slash_2: ['strike_slash_1', 'strike_thrust'], strike_overhead: ['strike_slash_1', 'strike_thrust'],
  strike_thrust: ['strike_slash_1'], strike_bash: ['strike_thrust', 'strike_slash_1'], strike_bite: ['strike_headbutt', 'strike_gore'], strike_gore: ['strike_headbutt', 'strike_bite'],
  strike_headbutt: ['strike_gore', 'strike_bite'], strike_stomp: ['strike_gore'], strike_ram: ['strike_headbutt', 'strike_gore'], strike_peck: ['strike_bite'],
  launch: ['throw'], reload: ['idle'], flap: ['idle'], tantrum: ['flap', 'idle'], reveal: ['idle'], trumpet: ['idle'], rear: ['idle'],
  crew_idle: ['idle'], crew_shoot: ['shoot_bow', 'ride_shoot'], crew_crank: ['crew_idle'], crew_push: ['crew_idle'], crew_react: ['crew_idle'],
};

// ------------------------------------------------------------------------------------------------------------------ per-model info (cached on the ModelDef)
const TOP_NAMES = ['body', 'frame', 'chassis'];
function buildInfo(model) {
  const meta = model.meta || {};
  const parts = model.parts, P = parts.length;
  const subs = (meta.subrigs && meta.subrigs.length) ? meta.subrigs : [{ prefix: '', rig: meta.rig || 'hum1', parts: parts.map((p) => p.id), kind: '' }];
  const baseRig = subs[0].rig || meta.rig || 'hum1';
  const info = { P, ver: -1, rig: baseRig, groups: [], clipMap: meta.clipMap || null, species: meta.species || '', style: '', composed: subs.length > 1, pivot: [0, 0, 0] };
  for (let gi = 0; gi < subs.length; gi++) {
    const sr = subs[gi], prefix = sr.prefix || '', rig = sr.rig || 'hum1';
    const idx = [], ids = [];
    for (const pid of sr.parts) { const p = model.byId[pid]; if (!p) continue; idx.push(p.index); ids.push(prefix ? pid.slice(prefix.length) : pid); }
    const g = {
      gi, prefix, rig, clipRig: rig === 'hum_lite' ? 'hum1' : rig, n: idx.length, idx: Int16Array.from(idx), ids,
      role: 'base', top: [], local: Object.create(null), cache: Object.create(null), binds: new Map(),
      // humanoid slots (local part index or -1)
      body: -1, head: -1, armUL: -1, armLL: -1, armUR: -1, armLR: -1, legUL: -1, legLL: -1, legUR: -1, legLR: -1, weapon: -1, offhand: -1, crest: -1, cape: -1, cape2: -1, back: -1,
      wheels: [], hum: rig === 'hum1' || rig === 'hum_lite',
    };
    ids.forEach((id, j) => { g.local[id] = j; });
    for (const k of ['body', 'head', 'armUL', 'armLL', 'armUR', 'armLR', 'legUL', 'legLL', 'legUR', 'legLR', 'weapon', 'offhand', 'crest', 'cape', 'cape2', 'back']) { const j = g.local[k]; g[k] = j === undefined ? -1 : j; }
    // role
    if (gi === 0) g.role = (subs.length > 1 && /^quad/.test(rig)) ? 'mount' : 'base';
    else if (/^quad/.test(rig)) g.role = 'mount';
    else if (g.hum) g.role = prefix === 'r_' ? 'rider' : prefix === 'd_' ? 'driver' : prefix === 'a_' ? 'archer' : 'crew';
    else g.role = 'part';
    // top-level parts (parent outside the group)
    const inGroup = new Set(sr.parts);
    for (let j = 0; j < idx.length; j++) { const par = parts[idx[j]].parent; if (!par || !inGroup.has(par)) g.top.push(j); }
    // wheels (bespoke rigs): axle along X, radius from the part's own voxel bounds
    for (let j = 0; j < ids.length; j++) {
      if (/^wheel/.test(ids[j])) {
        const p = parts[idx[j]], b = p.grid.bounds();
        const r = b ? Math.max(b.y1 - b.y0 + 1, b.z1 - b.z0 + 1) * model.voxelSize * 0.5 : 0.5;
        g.wheels.push({ j, r });
      }
    }
    info.groups.push(g);
  }
  // pivot for root rotations = origin of the base group's body/frame part (world units)
  const g0 = info.groups[0];
  let pj = g0.top.length ? g0.top[0] : 0;
  for (const nme of TOP_NAMES) { const j = g0.local[nme]; if (j !== undefined) { pj = j; break; } }
  const pp = parts[g0.idx[pj]];
  if (pp) { info.pivot = [pp.origin[0], pp.origin[1], pp.origin[2]]; }
  if (meta.pivotY !== undefined) info.pivot[1] = meta.pivotY;
  // weapon style (hum1 groups): meta.weaponStyle or a heuristic from the weapon part's shape
  for (const g of info.groups) {
    if (g.weapon < 0 && g.offhand < 0) continue;
    if (g.weapon >= 0) {
      const p = parts[g.idx[g.weapon]];
      // weapon axis in the weapon's own frame after its rest rotation: R_rest * (0,1,0)
      eulerToMat(p.rest[0], p.rest[1], p.rest[2], _R1);
      g.wRestAxis = [_R1[1], _R1[4], _R1[7]];
      g.wRest = Float64Array.from(_R1);
      if (!info.style) info.style = (g.gi === 0 || !info.style) ? (meta.weaponStyle || guessStyle(p, model)) : info.style;
    }
    if (g.offhand >= 0) {
      const p = parts[g.idx[g.offhand]];
      eulerToMat(p.rest[0], p.rest[1], p.rest[2], _R1);
      g.oRestNormal = [_R1[2], _R1[5], _R1[8]];  // R_rest * (0,0,1)
    }
  }
  if (!info.style) info.style = meta.weaponStyle || 'none';
  if (meta.weaponStyle) info.style = meta.weaponStyle;
  info.styleCode = STYLE_CODE[info.style] || 0;
  return info;
}
function guessStyle(p, model) {
  const b = p.grid.bounds();
  if (!b) return 'none';
  const h = b.y1 - b.y0 + 1, w = Math.max(b.x1 - b.x0 + 1, b.z1 - b.z0 + 1);
  if (h >= 30 && w <= 5) return 'thrust';       // long thin shaft: spear/pike
  if (h >= 26 && w >= 6) return 'shoot';        // tall + wide limbs: a bow
  if (h >= 14) return 'slash';
  return 'bash';
}
const STYLE_CODE = { none: 0, slash: 1, thrust: 2, pike: 2, overhead: 3, bash: 4, shoot: 5, throw: 6, cast: 7 };

function infoOf(model) {
  let info = model.__anim;
  if (info === undefined || info.model !== model) { info = buildInfo(model); info.model = model; model.__anim = info; }
  if (info.ver !== ClipLib.version) {
    info.ver = ClipLib.version;
    for (const g of info.groups) { g.cache = Object.create(null); g.binds.clear(); }
  }
  return info;
}
/** drop cached per-model data (tests that swap clip libraries) */
Animator.invalidate = (model) => { if (model) model.__anim = undefined; };
Animator.info = infoOf;

// ------------------------------------------------------------------------------------------------------------------ clip resolution + binding
function resolveClip(info, g, id) {
  const c = g.cache[id];
  if (c !== undefined) return c;
  let found = null;
  const tryId = (cid) => {
    let cand;
    if (info.clipMap && info.clipMap[cid] !== undefined) { cand = ClipLib.getQualified(info.clipMap[cid], g.clipRig); if (cand) return cand; }
    if (info.species) { cand = ClipLib.getQualified(info.species + '_' + cid, g.clipRig); if (cand) return cand; }
    return ClipLib.getQualified(cid, g.clipRig);
  };
  found = tryId(id);
  if (!found) {
    const chain = FALLBACK[id];
    if (chain) for (let i = 0; i < chain.length && !found; i++) found = tryId(chain[i]);
    if (!found) found = tryId('idle');
    warnOnce(`missing clip '${id}' for rig ${g.clipRig}${found ? ' (using ' + found.id + ')' : ' (nothing to fall back on)'}`);
  }
  g.cache[id] = found || 0;
  return found || 0;
}
function bindOf(g, clip) {
  let b = g.binds.get(clip);
  if (b) return b;
  const n = g.n;
  b = { q: new Array(n).fill(null), t: new Array(n).fill(null), s: new Array(n).fill(null), cls: CLASS_CODE[clip.meta && clip.meta.cls ? clip.meta.cls : classOf(clip.id)] || CL_OTHER };
  for (const p of Object.keys(clip.q)) { const j = g.local[p]; if (j === undefined) { if (g.rig !== 'hum_lite') warnOnce(`clip '${clip.id}' animates part '${p}' which model group '${g.prefix}${g.rig}' does not have (ignored)`); } else b.q[j] = clip.q[p]; }
  if (clip.t) for (const p of Object.keys(clip.t)) { const j = g.local[p]; if (j !== undefined) b.t[j] = clip.t[p]; }
  if (clip.s) for (const p of Object.keys(clip.s)) { const j = g.local[p]; if (j !== undefined) b.s[j] = clip.s[p]; }
  g.binds.set(clip, b);
  return b;
}

// frame position scratch
let _i0 = 0, _i1 = 0, _fa = 0;
function frameAt(clip, t, phaseOff) {
  const N = clip.frames;
  let f = t * clip.fps;
  if (clip.loop) { f += phaseOff * N; f = f - Math.floor(f / N) * N; _i0 = f | 0; _i1 = _i0 + 1 >= N ? 0 : _i0 + 1; _fa = f - _i0; }
  else { if (f < 0) f = 0; if (f >= N - 1) { _i0 = N - 1; _i1 = N - 1; _fa = 0; } else { _i0 = f | 0; _i1 = _i0 + 1; _fa = f - _i0; } }
}

/** write the group's parts for `clip` at time t into buf (rot/trans/scale), absolute (not additive). Returns the class code. */
function sampleInto(g, clip, bind, t, phaseOff, buf, rootOut) {
  frameAt(clip, t, phaseOff);
  const i0 = _i0, i1 = _i1, a = _fa, b = 1 - a, idx = g.idx, n = g.n, bq = bind.q, bt = bind.t, bs = bind.s;
  const o3 = i0 * 3, p3 = i1 * 3;
  for (let j = 0; j < n; j++) {
    const o = idx[j] * 9;
    const q = bq[j];
    if (q !== null) { buf[o + 3] = q[o3] * b + q[p3] * a; buf[o + 4] = q[o3 + 1] * b + q[p3 + 1] * a; buf[o + 5] = q[o3 + 2] * b + q[p3 + 2] * a; }
    else { buf[o + 3] = 0; buf[o + 4] = 0; buf[o + 5] = 0; }
    const tr = bt[j];
    if (tr !== null) { buf[o] = tr[o3] * b + tr[p3] * a; buf[o + 1] = tr[o3 + 1] * b + tr[p3 + 1] * a; buf[o + 2] = tr[o3 + 2] * b + tr[p3 + 2] * a; }
    else { buf[o] = 0; buf[o + 1] = 0; buf[o + 2] = 0; }
    const s = bs[j];
    if (s !== null) { buf[o + 6] = s[o3] * b + s[p3] * a; buf[o + 7] = s[o3 + 1] * b + s[p3 + 1] * a; buf[o + 8] = s[o3 + 2] * b + s[p3 + 2] * a; }
    else { buf[o + 6] = 1; buf[o + 7] = 1; buf[o + 8] = 1; }
  }
  const r = clip.root;
  if (r !== undefined) {
    const ry = r.y, rx = r.x, rz = r.z, rp = r.pitch, rr = r.roll, rw = r.yaw;
    rootOut.y = ry ? ry[i0] * b + ry[i1] * a : 0; rootOut.x = rx ? rx[i0] * b + rx[i1] * a : 0; rootOut.z = rz ? rz[i0] * b + rz[i1] * a : 0;
    rootOut.pitch = rp ? rp[i0] * b + rp[i1] * a : 0; rootOut.roll = rr ? rr[i0] * b + rr[i1] * a : 0; rootOut.yaw = rw ? rw[i0] * b + rw[i1] * a : 0;
  } else { rootOut.y = 0; rootOut.x = 0; rootOut.z = 0; rootOut.pitch = 0; rootOut.roll = 0; rootOut.yaw = 0; }
  return bind.cls;
}
// aim sampling: writes _aimE/_aimA/_aimW (clip.aim track or table lookup)
let _aimE = 0, _aimA = 0, _aimW = 0;
function sampleAim(clip, t, phaseOff) {
  const aim = clip.aim;
  if (aim === undefined) return false;
  frameAt(clip, t, phaseOff);
  const b = 1 - _fa, a = _fa, o = _i0 * 3, p = _i1 * 3;
  _aimE = aim[o] * b + aim[p] * a; _aimA = aim[o + 1] * b + aim[p + 1] * a; _aimW = aim[o + 2] * b + aim[p + 2] * a;
  return true;
}

// ------------------------------------------------------------------------------------------------------------------ weapon style tables
// [elevation (rad above the horizontal, + up), azimuth (+ left), weight 0..1] in the BODY frame, per clip class.
// weight 0 = the weapon simply follows the forearm (its rest rotation from the model); 1 = aim exactly at the target direction.
const AIM = {
  //          idle                ready               move                strike (default when the clip has no aim track)  shoot               down  other
  thrust: { 1: [1.30, -0.05, 1], 2: [0.55, 0.08, 1], 3: [0.95, -0.02, 1], 4: [0.12, 0.0, 1], 5: [0.30, 0.0, 1], 6: [0, 0, 0], 7: [0.9, 0, 1] },
  slash:  { 1: [-0.85, 0.15, 0.85], 2: [0.35, 0.15, 0.7], 3: [-0.15, 0.1, 0.8], 4: [0, 0, 0], 5: [0, 0, 0], 6: [0, 0, 0], 7: [-0.5, 0.1, 0.7] },
  overhead: { 1: [0.9, 0.1, 0.8], 2: [1.0, 0.1, 0.8], 3: [0.7, 0.1, 0.8], 4: [0, 0, 0], 5: [0, 0, 0], 6: [0, 0, 0], 7: [0.9, 0.1, 0.8] },
  bash:   { 1: [-0.6, 0.1, 0.8], 2: [0.5, 0.1, 0.7], 3: [-0.2, 0.1, 0.7], 4: [0, 0, 0], 5: [0, 0, 0], 6: [0, 0, 0], 7: [-0.3, 0.1, 0.7] },
  shoot:  { 1: [1.45, 0.0, 1], 2: [1.35, 0.0, 1], 3: [1.35, 0.0, 1], 4: [1.2, 0.0, 0.8], 5: [1.5, 0.0, 1], 6: [0, 0, 0], 7: [1.4, 0, 1] },
  throw:  { 1: [1.1, 0.0, 0.8], 2: [1.0, 0.0, 0.8], 3: [0.9, 0.0, 0.8], 4: [0, 0, 0], 5: [0, 0, 0], 6: [0, 0, 0], 7: [1.0, 0, 0.8] },
  cast:   { 1: [1.45, 0.0, 1], 2: [1.35, 0.0, 1], 3: [1.3, 0.0, 1], 4: [0, 0, 0], 5: [0.9, 0, 0.6], 6: [0, 0, 0], 7: [1.4, 0, 1] },
};
AIM.pike = AIM.thrust;
const STYLE_NAMES = ['none', 'slash', 'thrust', 'overhead', 'bash', 'shoot', 'throw', 'cast'];

// ------------------------------------------------------------------------------------------------------------------ derived sub-rig clips
const MOUNT_OF = { // state.clip -> clip for a mount / animal sub-rig
  idle: 'idle', idle_combat: 'idle', block_hold: 'idle', sit: 'idle', cheer: 'idle', taunt: 'idle', cast: 'idle', throw: 'idle', shoot_bow: 'idle', launch: 'idle',
  walk: 'walk', run: 'gallop', trot: 'trot', gallop: 'gallop', rout: 'gallop', rear: 'rear',
  strike_thrust: 'idle', strike_slash_1: 'idle', strike_slash_2: 'idle', strike_overhead: 'idle', strike_bash: 'idle', ride_strike: 'idle', ride_shoot: 'idle', kick: 'idle',
  death_back: 'death_back', death_front: 'death_front', death_spin: 'death_spin', stagger: 'stagger', stun: 'idle', dizzy: 'idle', cower: 'idle', getup: 'idle',
  hit_front: 'idle', hit_back: 'idle', block_hit: 'idle', flail: 'stagger', tumble: 'death_spin',
};
const RIDER_OF = { // state.clip -> clip for a rider on a quad1 mount
  idle: 'ride_idle', idle_combat: 'ride_idle', block_hold: 'ride_idle', sit: 'ride_idle', walk: 'ride_idle', run: 'ride_gallop', trot: 'ride_trot', gallop: 'ride_gallop', rout: 'ride_gallop',
  strike_thrust: 'ride_strike', strike_slash_1: 'ride_strike', strike_slash_2: 'ride_strike', strike_overhead: 'ride_strike', strike_bash: 'ride_strike', kick: 'ride_strike', ride_strike: 'ride_strike',
  shoot_bow: 'ride_shoot', throw: 'ride_shoot', cast: 'ride_shoot', ride_shoot: 'ride_shoot', launch: 'ride_shoot',
  death_back: 'ride_death', death_front: 'ride_death', death_spin: 'ride_death', stagger: 'ride_idle', stun: 'ride_idle', dizzy: 'ride_idle', cower: 'ride_idle', cheer: 'ride_idle', taunt: 'ride_idle',
};
const CREW_OF = { // crew of siege / chariot / howdah (hum1 / hum_lite sub-rigs)
  idle: 'crew_idle', idle_combat: 'crew_idle', walk: 'crew_push', run: 'crew_push', trot: 'crew_idle', gallop: 'crew_idle',
  launch: 'crew_react', reload: 'crew_crank', shoot_bow: 'crew_shoot', throw: 'crew_shoot', strike_ram: 'crew_idle',
  death_back: 'crew_idle', death_front: 'crew_idle', death_spin: 'crew_idle',
};
function subClip(info, g, state) {
  // explicit overrides from the sim
  if (g.role === 'mount') {
    if (state.mount) return state.mount;
    return MOUNT_OF[state.clip] || state.clip;
  }
  if (g.role === 'rider') {
    if (state.rider) return state.rider;
    return RIDER_OF[state.clip] || 'ride_idle';
  }
  if (g.role === 'driver' || g.role === 'archer' || g.role === 'crew') {
    if (state.crew) return state.crew;
    if (state.rider && g.role !== 'crew') return state.rider;
    const base = CREW_OF[state.clip] || 'crew_idle';
    if (g.role === 'driver' && (base === 'crew_shoot' || base === 'crew_crank')) return 'crew_idle';
    return base;
  }
  return state.clip;
}
// where a composed model's base group is a mount, the base clip is the derived mount clip
function baseClipId(info, g, state) {
  if (g.role === 'mount' && info.composed) return state.mount || MOUNT_OF[state.clip] || state.clip;
  return state.clip;
}

// ------------------------------------------------------------------------------------------------------------------ the pose function
function resetOut(out, P) {
  for (let i = 0, o = 0; i < P; i++, o += 9) {
    out[o] = 0; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 0; out[o + 4] = 0; out[o + 5] = 0; out[o + 6] = 1; out[o + 7] = 1; out[o + 8] = 1;
  }
}

/**
 * Pose `model` into `out`. Returns the (shared) root track object when extra.root was not supplied.
 */
Animator.pose = function pose(model, state, extra, out) {
  const info = infoOf(model);
  const P = info.P;
  resetOut(out, P);
  const root = (extra !== undefined && extra !== null && extra.root) ? extra.root : _rootA;
  root.x = 0; root.y = 0; root.z = 0; root.pitch = 0; root.roll = 0; root.yaw = 0;
  const lod = extra && extra.lod ? extra.lod : 0;
  const phase = extra && extra.phase ? extra.phase : 0;
  const speed = extra && extra.speed ? extra.speed : 0;
  const heading = extra && extra.heading !== undefined ? extra.heading : NaN;

  // ---- previous-clip bookkeeping (see header) ----
  const blend = state.blend === undefined ? 1 : state.blend;
  let prevT = 0;
  if (state._pc !== state.clip) {
    if (state._pc !== undefined && state.prev === state._pc && state._lt !== undefined) state._pt = state._lt; else state._pt = 0;
    state._pc = state.clip;
  }
  state._lt = state.t;
  const blending = blend < 1 && state.prev !== undefined && state.prev !== state.clip;
  if (blending) prevT = (typeof state.pt === 'number' ? state.pt : state._pt) + blend * BLEND_S;
  const w = blending ? sstep(blend) : 1;
  const t = state.t < 0 ? 0 : state.t;
  const frozen = state.rate === 0;

  const groups = info.groups;
  let clsCur = CL_OTHER, clsPrev = CL_OTHER, curClip0 = null, prevClip0 = null;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const isBase = gi === 0;
    const cid = info.composed ? (isBase ? baseClipId(info, g, state) : subClip(info, g, state)) : state.clip;
    const clipA = resolveClip(info, g, cid);
    if (clipA === 0) continue;
    const bindA = bindOf(g, clipA);
    // per-group root tracks go to _R (base group: the instance root; riders: onto their top-level parts)
    const rA = isBase ? root : _rootB;
    const cls = sampleInto(g, clipA, bindA, t, phase, out, rA);
    let rootW = 1;
    let clsP = cls, clipP = null;
    if (blending) {
      const pid = info.composed ? (isBase ? (g.role === 'mount' ? (state.prev && MOUNT_OF[state.prev]) || state.prev : state.prev) : prevSubClip(info, g, state)) : state.prev;
      clipP = resolveClip(info, g, pid);
      if (clipP !== 0) {
        if (_scratch.length < P * 9) _scratch = new Float32Array(P * 9);
        const bindP = bindOf(g, clipP);
        const rB = _rootB === rA ? _rootC : _rootB;
        clsP = sampleInto(g, clipP, bindP, prevT, phase, _scratch, rB);
        blendGroup(g, out, _scratch, w);
        rA.x = rB.x + (rA.x - rB.x) * w; rA.y = rB.y + (rA.y - rB.y) * w; rA.z = rB.z + (rA.z - rB.z) * w;
        rA.pitch = rB.pitch + wrapPi(rA.pitch - rB.pitch) * w; rA.roll = rB.roll + wrapPi(rA.roll - rB.roll) * w; rA.yaw = rB.yaw + wrapPi(rA.yaw - rB.yaw) * w;
      } else clipP = null;
    }
    if (isBase) { clsCur = cls; clsPrev = clsP; curClip0 = clipA; prevClip0 = clipP; }
    else applyRiderRoot(g, out, rA);
    if (g.wheels.length) applyWheels(model, g, clipA, t, phase, out);
    // humanoid overlays
    if (g.hum && lod < 2) humanoidOverlay(info, g, state, out, clipA, clipP, cls, clsP, w, t, phase, speed, heading, frozen, lod, isBase, root, prevT);
  }
  if (lod < 2) rootFinish(info, state, root, curClip0, heading, t);
  return root;
};
const _rootC = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 };
function prevSubClip(info, g, state) {
  const fake = _fakeState; fake.clip = state.prev; fake.mount = undefined; fake.rider = undefined; fake.crew = undefined;
  return subClip(info, g, fake);
}
const _fakeState = { clip: '', mount: undefined, rider: undefined, crew: undefined };

/** out = lerp(prev, out, w) over a group's parts, rotation by shortest angle */
function blendGroup(g, out, prev, w) {
  const idx = g.idx, n = g.n, iw = 1 - w;
  for (let j = 0; j < n; j++) {
    const o = idx[j] * 9;
    out[o] = prev[o] * iw + out[o] * w; out[o + 1] = prev[o + 1] * iw + out[o + 1] * w; out[o + 2] = prev[o + 2] * iw + out[o + 2] * w;
    for (let k = 3; k < 6; k++) {
      const a = prev[o + k]; let d = out[o + k] - a;
      if (d > PI) d -= TAU; else if (d < -PI) d += TAU;
      out[o + k] = a + d * w;
    }
    out[o + 6] = prev[o + 6] * iw + out[o + 6] * w; out[o + 7] = prev[o + 7] * iw + out[o + 7] * w; out[o + 8] = prev[o + 8] * iw + out[o + 8] * w;
  }
}
/** rider/sub-rig root tracks: translation onto the top-level parts, pitch/roll/yaw added to their rotation */
function applyRiderRoot(g, out, r) {
  if (r.x === 0 && r.y === 0 && r.z === 0 && r.pitch === 0 && r.roll === 0 && r.yaw === 0) return;
  for (let k = 0; k < g.top.length; k++) {
    const o = g.idx[g.top[k]] * 9;
    out[o] += r.x; out[o + 1] += r.y; out[o + 2] += r.z; out[o + 3] += r.pitch; out[o + 4] += r.yaw; out[o + 5] += r.roll;
  }
}
/** wheels roll with ground distance: angle = distance / radius, distance = t * speedRef (t is already rate-scaled by the sim) */
function applyWheels(model, g, clip, t, phase, out) {
  const m = clip.meta;
  if (!m || m.wheelSpeed === undefined) return;
  const dist = (t + (clip.loop ? phase * clip.frames / clip.fps : 0)) * m.wheelSpeed;
  for (let k = 0; k < g.wheels.length; k++) {
    const wh = g.wheels[k];
    out[g.idx[wh.j] * 9 + 3] += dist / wh.r;
  }
}

// ------------------------------------------------------------------------------------------------------------------ humanoid overlay pass
const CAPE_K = 0.5;
function humanoidOverlay(info, g, state, out, clipA, clipP, cls, clsP, w, t, phase, speed, heading, frozen, lod, isBase, root, prevT) {
  const idx = g.idx;
  const tt = frozen ? 0 : t + phase * 3.1;
  const sp = speed > 0 ? speed : 0;
  // --- idle sway / foot-bob / breathing: weight by how "idle" the blended pose is ---
  if (lod < 1 && g.role !== 'rider' && !frozen) {
    const wi = w * ((cls === CL_IDLE || cls === CL_READY) ? 1 : 0) + (1 - w) * ((clsP === CL_IDLE || clsP === CL_READY) ? 1 : 0);
    if (wi > 0.01 && g.body >= 0) {
      const ph = (t + phase * 7.7) * 1.9;
      const sway = Math.sin(ph), sway2 = Math.sin(ph * 0.5 + 1.3), br = Math.sin(ph * 1.7 + 0.4);
      const a = wi * (cls === CL_READY ? 0.7 : 1);
      const ob = (idx[g.body] * 9);
      out[ob + 4] += sway2 * 0.035 * a; out[ob + 5] += sway * 0.018 * a; out[ob + 3] += br * 0.012 * a; out[ob + 1] += br * 0.0035 * a;
      if (g.head >= 0) { const oh = (idx[g.head] * 9); out[oh + 4] -= sway2 * 0.05 * a; out[oh + 3] += br * 0.01 * a; out[oh + 5] -= sway * 0.02 * a; }
      if (g.legUL >= 0 && g.legUR >= 0) { const l = Math.sin(ph * 0.5); out[(idx[g.legUL] * 9) + 3] += l * 0.018 * a; out[(idx[g.legUR] * 9) + 3] -= l * 0.018 * a; out[(idx[g.legUL] * 9) + 1] += Math.max(0, l) * 0.004 * a; out[(idx[g.legUR] * 9) + 1] += Math.max(0, -l) * 0.004 * a; }
      if (isBase) { root.x += sway2 * 0.012 * a; }
    }
  }
  // --- additive hit flinch ---
  const fl = state.flinch;
  if (fl > 0.002 && lod < 1 && !frozen) {
    const k = g.role === 'rider' ? 0.5 : 1;
    let px = 0, pz = -1;
    if (heading === heading && state.dir === state.dir) { const rel = state.dir - heading; px = Math.sin(rel); pz = Math.cos(rel); }
    const f = fl > 1 ? 1 : fl;
    const e = f * f * (3 - 2 * f) * k;
    if (g.body >= 0) { const ob = (idx[g.body] * 9); out[ob + 3] += 0.38 * e * pz; out[ob + 5] -= 0.28 * e * px; out[ob + 4] += 0.18 * e * px * pz; }
    if (g.head >= 0) { const oh = (idx[g.head] * 9); out[oh + 3] -= 0.30 * e * pz; out[oh + 5] += 0.22 * e * px; }
    if (g.armUL >= 0) { const oa = (idx[g.armUL] * 9); out[oa + 3] += 0.65 * e * pz - 0.25 * e; out[oa + 5] += 0.40 * e; }
    if (g.armUR >= 0) { const oa = (idx[g.armUR] * 9); out[oa + 3] += 0.65 * e * pz - 0.25 * e; out[oa + 5] -= 0.40 * e; }
    if (g.armLL >= 0) out[(idx[g.armLL] * 9) + 3] -= 0.35 * e;
    if (g.armLR >= 0) out[(idx[g.armLR] * 9) + 3] -= 0.35 * e;
    if (g.legUL >= 0) out[(idx[g.legUL] * 9) + 3] += 0.22 * e * pz - 0.10 * e;
    if (g.legUR >= 0) out[(idx[g.legUR] * 9) + 3] += 0.22 * e * pz + 0.12 * e;
    if (g.legLL >= 0) out[(idx[g.legLL] * 9) + 3] += 0.35 * e;
    if (g.legLR >= 0) out[(idx[g.legLR] * 9) + 3] += 0.25 * e;
    if (isBase) { root.y -= 0.07 * e; root.x += 0.05 * e * px; root.z += 0.05 * e * pz; }
  }
  if (lod >= 1) { aimPass(info, g, state, out, clipA, clipP, cls, clsP, w, t, phase, prevT); return; }
  // --- secondary motion: crest plume + cape follow-through ---
  if (g.crest >= 0 || g.cape >= 0) {
    const sk = sp > 6 ? 6 : sp, lean = sk * 0.11, fl2 = Math.sin(tt * 6.2) * 0.07;
    if (g.crest >= 0) { const oc = (idx[g.crest] * 9); out[oc + 3] += -0.10 - lean * 0.55 + Math.sin(tt * 4.4 + 1) * (0.05 + sk * 0.012) + (g.head >= 0 ? -out[(idx[g.head] * 9) + 3] * 0.35 : 0); out[oc + 5] += Math.sin(tt * 3.1) * 0.04; }
    if (g.cape >= 0) {
      const oc = (idx[g.cape] * 9), bodyPitch = g.body >= 0 ? out[(idx[g.body] * 9) + 3] : 0;
      out[oc + 3] += 0.10 + lean * CAPE_K + fl2 * 0.6 - bodyPitch * 0.8; out[oc + 5] += Math.sin(tt * 2.3 + 2) * 0.05;
    }
    if (g.cape2 >= 0) { const oc = (idx[g.cape2] * 9); out[oc + 3] += 0.14 + lean * 0.35 + Math.sin(tt * 6.2 - 0.9) * 0.1; out[oc + 5] += Math.sin(tt * 2.3 + 1) * 0.06; }
  }
  aimPass(info, g, state, out, clipA, clipP, cls, clsP, w, t, phase, prevT);
}

/** weapon aim + shield facing (hum1 groups). All in the body frame. */
function aimPass(info, g, state, out, clipA, clipP, cls, clsP, w, t, phase, prevT) {
  if (g.weapon < 0 && g.offhand < 0) return;
  if (g.body < 0) return;
  const style = info.style;
  const idx = g.idx;
  if (g.weapon >= 0 && g.armUR >= 0 && g.armLR >= 0 && style !== 'none') {
    const tab = AIM[style];
    if (tab) {
      // current + previous aim parameters, blended by w
      let e, a, wt;
      if (clipA.aim !== undefined && sampleAim(clipA, t, phase)) { e = _aimE; a = _aimA; wt = _aimW; }
      else { const r = tab[cls] || tab[CL_OTHER]; e = r[0]; a = r[1]; wt = r[2]; }
      if (w < 1 && clipP) {
        let e2, a2, w2;
        if (clipP.aim !== undefined && sampleAim(clipP, prevT, phase)) { e2 = _aimE; a2 = _aimA; w2 = _aimW; }
        else { const r = tab[clsP] || tab[CL_OTHER]; e2 = r[0]; a2 = r[1]; w2 = r[2]; }
        e = e2 + (e - e2) * w; a = a2 + (a - a2) * w; wt = w2 + (wt - w2) * w;
      }
      const oUR = idx[g.armUR] * 9, oLR = idx[g.armLR] * 9, oW = idx[g.weapon] * 9;
      // chain rotation body-frame: R_UR * R_LR
      eulerToMat(out[oUR + 3], out[oUR + 4], out[oUR + 5], _R1);
      eulerToMat(out[oLR + 3], out[oLR + 4], out[oLR + 5], _R2);
      mulMat(_R1, _R2, _R3);                      // R_c (body frame)
      // follow direction: R_c * a0 (a0 = weapon axis after its rest rotation)
      const a0 = g.wRestAxis;
      const fx = _R3[0] * a0[0] + _R3[1] * a0[1] + _R3[2] * a0[2], fy = _R3[3] * a0[0] + _R3[4] * a0[1] + _R3[5] * a0[2], fz = _R3[6] * a0[0] + _R3[7] * a0[1] + _R3[8] * a0[2];
      if (wt > 0.001) {
        const ce = Math.cos(e), dx = Math.sin(a) * ce, dy = Math.sin(e), dz = Math.cos(a) * ce;
        let tx = fx + (dx - fx) * wt, ty = fy + (dy - fy) * wt, tz = fz + (dz - fz) * wt;
        const l = Math.hypot(tx, ty, tz) || 1; tx /= l; ty /= l; tz /= l;
        // into the forearm frame: R_c^T * t
        const vx = _R3[0] * tx + _R3[3] * ty + _R3[6] * tz, vy = _R3[1] * tx + _R3[4] * ty + _R3[7] * tz, vz = _R3[2] * tx + _R3[5] * ty + _R3[8] * tz;
        arcMat(a0[0], a0[1], a0[2], vx, vy, vz, _R1);       // pose rotation of the weapon part (maps rest axis -> wanted axis)
        matToEuler(_R1, _V);
        out[oW + 3] = _V[0]; out[oW + 4] = _V[1]; out[oW + 5] = _V[2];
      }
    }
  }
  // shield: keep its face toward the front when the arm lifts. Blend weight by class.
  if (g.offhand >= 0 && g.armUL >= 0 && g.armLL >= 0) {
    const oUL = idx[g.armUL] * 9, oLL = idx[g.armLL] * 9, oO = idx[g.offhand] * 9;
    const up = out[oUL + 3] + out[oLL + 3];       // total forward raise (negative = raised)
    if (up < -0.25 || up > 0.5) {
      const wt = (cls === CL_READY || cls === CL_STRIKE || cls === CL_SHOOT) ? 0.95 : 0.7;
      eulerToMat(out[oUL + 3], out[oUL + 4], out[oUL + 5], _R1);
      eulerToMat(out[oLL + 3], out[oLL + 4], out[oLL + 5], _R2);
      mulMat(_R1, _R2, _R3);
      const n0 = g.oRestNormal;
      // follow normal = R_c * n0 ; wanted normal = lerp(follow, body +Z, wt)
      const fx = _R3[0] * n0[0] + _R3[1] * n0[1] + _R3[2] * n0[2], fy = _R3[3] * n0[0] + _R3[4] * n0[1] + _R3[5] * n0[2], fz = _R3[6] * n0[0] + _R3[7] * n0[1] + _R3[8] * n0[2];
      let tx = fx + (0 - fx) * wt, ty = fy + (0 - fy) * wt, tz = fz + (1 - fz) * wt;
      const l = Math.hypot(tx, ty, tz) || 1; tx /= l; ty /= l; tz /= l;
      const vx = _R3[0] * tx + _R3[3] * ty + _R3[6] * tz, vy = _R3[1] * tx + _R3[4] * ty + _R3[7] * tz, vz = _R3[2] * tx + _R3[5] * ty + _R3[8] * tz;
      arcMat(n0[0], n0[1], n0[2], vx, vy, vz, _R1);
      matToEuler(_R1, _V);
      out[oO + 3] = _V[0]; out[oO + 4] = _V[1]; out[oO + 5] = _V[2];
    }
  }
}

// ------------------------------------------------------------------------------------------------------------------ root finishing (flinch lean, fall direction, hip-pivot compensation)
function rootFinish(info, state, root, clip, heading, t) {
  // fall direction: death clips fall along `meta.fall` (local angle); turn the body so that the fall points along state.dir
  if (clip && clip.meta && clip.meta.fall !== undefined && heading === heading && state.dir === state.dir && state.dir !== 0) {
    const fallAng = clip.meta.fall;
    const rel = wrapPi(state.dir - heading);
    const want = wrapPi(rel - fallAng);
    const k = sstep(t / (clip.meta.fallBlend || 0.35));
    // limit the turn so that a nearly-forward kill does not spin the corpse more than ~100 degrees
    root.yaw += (want > 1.75 ? 1.75 : want < -1.75 ? -1.75 : want) * k;
  }
  const fl = state.flinch;
  if (fl > 0.002 && !(state.rate === 0)) {
    let px = 0, pz = -1;
    if (heading === heading && state.dir === state.dir) { const rel = state.dir - heading; px = Math.sin(rel); pz = Math.cos(rel); }
    const e = (fl > 1 ? 1 : fl);
    root.pitch += 0.06 * e * pz; root.roll -= 0.05 * e * px;
  }
  // rotations about the rig pivot: fold the compensating translation into the offsets
  if (root.pitch !== 0 || root.roll !== 0 || root.yaw !== 0) {
    const pv = info.pivot;
    eulerToMat(root.pitch, root.yaw, root.roll, _R1);
    // eulerToMat takes (rx, ry, rz) = (pitch, yaw, roll)
    const rx = _R1[0] * pv[0] + _R1[1] * pv[1] + _R1[2] * pv[2], ry = _R1[3] * pv[0] + _R1[4] * pv[1] + _R1[5] * pv[2], rz = _R1[6] * pv[0] + _R1[7] * pv[1] + _R1[8] * pv[2];
    root.x += pv[0] - rx; root.y += pv[1] - ry; root.z += pv[2] - rz;
  }
}

// ------------------------------------------------------------------------------------------------------------------ public helpers
/**
 * Apply the root tracks to a unit's world transform. root.x/y/z are model-space offsets (already compensated so that
 * pitch/roll/yaw rotate about the hip pivot); they are rotated by the unit heading and scaled by the instance scale.
 * out4 = [worldX, worldY, worldZ, heading + root.yaw]; pass pitch/roll straight to VoxSkin.add.
 */
Animator.applyRoot = function applyRoot(root, x, y, z, h, scale, out4) {
  const c = Math.cos(h), s = Math.sin(h), k = scale === undefined ? 1 : scale;
  out4[0] = x + (root.x * c + root.z * s) * k;
  out4[1] = y + root.y * k;
  out4[2] = z + (-root.x * s + root.z * c) * k;
  out4[3] = h + root.yaw;
  return out4;
};
/** stable per-unit phase in [0,1) from the unit id */
Animator.idlePhase = function idlePhase(id) {
  let h = (id | 0) * 2654435761 >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
/** animation LOD tier from squared camera distance: 0 full, 1 reduced, 2 pose only, 3 skip (caller keeps last pose) */
Animator.lodTier = function lodTier(d2, near2 = 38 * 38) {
  if (d2 < near2) return 0;
  if (d2 < near2 * 2.6) return 1;
  if (d2 < near2 * 7) return 2;
  return 3;
};
/** identity pose */
Animator.rest = function rest(model, out) { resetOut(out, model.parts.length); return out; };
/** which weapon style the animator derived for a model (diagnostics) */
Animator.styleOf = function styleOf(model) { return infoOf(model).style; };
/** how many sub-rig groups the model has */
Animator.groupsOf = function groupsOf(model) { return infoOf(model).groups.length; };
/** clip id the animator will play for each sub-rig of a composed model for a given state clip */
Animator.subClips = function subClips(model, stateClip) {
  const info = infoOf(model), res = [], st = { clip: stateClip };
  for (let gi = 0; gi < info.groups.length; gi++) { const g = info.groups[gi]; res.push(gi === 0 ? baseClipId(info, g, st) : subClip(info, g, st)); }
  return res;
};
Animator.classOf = classOf;
export { STYLE_NAMES, classOf };
