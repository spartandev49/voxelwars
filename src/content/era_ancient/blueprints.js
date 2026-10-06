// Humanoid blueprints (spec.md section 5): compileSoldier() is the ONLY path from data to a hum1 ModelDef.
//
//   compileSoldier(bp, opts) -> { model, scale, grip, reach, height, radius, weaponStyle, twoHanded, warnings, voxels, parts }
//   validateBlueprint(bp, opts) -> { ok, errors[], warnings[], bp }   (bp = normalised deep copy with defaults filled in)
//   defaultBlueprint(), randomBlueprint(rng, opts), applyPaint(bp, grids), PART_REGISTRY
//
// opts: { range?: sim melee range (edge to edge, u), radius?: collision radius, scale?: unit scale, unlocked?: Set of unlock keys (enforces locks),
//         teamTint?: ignored (tint is always baked as F_TEAM voxels) }
// Pure JS: deterministic from bp.id (+ the blueprint contents). No Math.random, no DOM.
import { VoxelGrid, V, T, shade, hexToRGB, rgbToHex } from '../../voxel/grid.js';
import { ModelDef } from '../../voxel/model.js';
import { RNG, hashString, clamp } from '../../core/rng.js';
import { PART_REGISTRY, CATEGORIES, registerParts, getPart, isPartUnlocked, listParts, UNLOCKS } from './parts/_registry.js';
import { DIM, PART_ORDER, METALS, METAL_KEYS, EMBLEM_IDS, newGrid } from './parts/_kit.js';
import { baseGrids } from './parts/_base.js';
// side-effect imports: every core parts module registers itself
import './parts/helms.js';
import './parts/faces.js';
import './parts/hair.js';
import './parts/torsos.js';
import './parts/shoulders.js';
import './parts/legs.js';
import './parts/capes.js';
import './parts/backs.js';
import './parts/weapons_melee.js';
import './parts/weapons_ranged.js';
import './parts/weapons_silly.js';
import './parts/offhands.js';

export { PART_REGISTRY, CATEGORIES, registerParts, getPart, isPartUnlocked, listParts, UNLOCKS, DIM, PART_ORDER, METALS, METAL_KEYS, EMBLEM_IDS };

// ------------------------------------------------------------------------------------------------ constants
export const BODY_TYPES = { slim: [0.92, 1.0, 0.92], average: [1, 1, 1], stocky: [1.12, 0.98, 1.12] };
export const BODY_RADIUS = { slim: 0.5, average: 0.55, stocky: 0.62 };
export const SKIN_TONES = ['#f6d5b8', '#e8be9a', '#e0ac84', '#c68a62', '#a56a45', '#7a4a2e', '#5a341f', '#3b2216', '#6fa84a', '#5a86c8', '#8c8c90', '#d9b23a', '#dfe8f0'];
export const SKIN_NAMES = ['Porcelain', 'Fair', 'Olive', 'Tan', 'Bronzed', 'Brown', 'Deep', 'Ebony', 'Goblin green', 'Smurf blue', 'Stone', 'Gilded', 'Ghost'];
export const HAIR_COLORS = ['#151210', '#2a1a10', '#4a3426', '#6b4a2a', '#9a6a34', '#c9a050', '#d9d4c4', '#a8281c', '#e8e8e8', '#2f4a8a'];
export const EYE_COLORS = ['#222222', '#3a2a1a', '#2a5a8a', '#3a7a4a', '#7a5a2a', '#8a1a1a'];
export const PALETTES = [
  { primary: '#c8453c', secondary: '#f2d36b', trim: '#4a2f1c', cloth: '#e8e2d0' },
  { primary: '#2a5db0', secondary: '#f2d36b', trim: '#2b2f5a', cloth: '#ece8dc' },
  { primary: '#1f8f8a', secondary: '#e8c15a', trim: '#3a2a1a', cloth: '#f0ead8' },
  { primary: '#6a3fb0', secondary: '#f0d57a', trim: '#2a1a4a', cloth: '#ece6f0' },
  { primary: '#2f7a3a', secondary: '#d9a05a', trim: '#3a2a14', cloth: '#e6e2cc' },
  { primary: '#7a2a8a', secondary: '#dcdcdc', trim: '#2a1a30', cloth: '#ece6ee' },
  { primary: '#b3262e', secondary: '#e8c15a', trim: '#3a1a14', cloth: '#f0e8dc' },
  { primary: '#d4a017', secondary: '#ffffff', trim: '#4a3410', cloth: '#f4eedc' },
];
export const PAINT_CAP = 1500;
/** Value stored in a paint RLE for "erase this generated voxel" (0 = untouched, any other value with the solid flag = set). */
export const PAINT_ERASE = 1;
const MAX_REACH = 3.6;
/** how much of a weapon's length projects forward at the moment of contact (thrusts line up with the arm, swings arc down) */
const STYLE_K = { thrust: 1.0, pike: 1.0, slash: 0.78, overhead: 0.72, bash: 0.8, throw: 0.75, cast: 0.75, shoot: 0.8, none: 0.8 };
const ARM_REACH = 0.95;   // shoulder -> hand centre when the arm is extended (u)

export class BlueprintError extends Error {
  constructor(errors) { super('Invalid blueprint: ' + errors.join(' ')); this.errors = errors; }
}

// ------------------------------------------------------------------------------------------------ validation / normalisation
const SLOTS = [
  // [group, key, category, default, label]
  ['head', 'helm', 'helms', 'none', 'Helm'], ['head', 'hair', 'hair', 'short', 'Hair style'], ['head', 'face', 'faces', 'none', 'Face'],
  ['torso', 'armor', 'armors', 'none', 'Body armour'], ['torso', 'tunic', 'tunics', 'tunic', 'Tunic'],
  ['legs', 'armor', 'legs', 'bare', 'Leg armour'], ['legs', 'skirt', 'skirts', 'none', 'Skirt'],
  [null, 'shoulders', 'shoulders', 'none', 'Shoulders'], [null, 'cape', 'capes', 'none', 'Cape'], [null, 'back', 'backs', 'none', 'Back item'],
  [null, 'main', 'mains', 'none', 'Main hand'], [null, 'off', 'offs', 'none', 'Off hand'],
];
const COLOR_KEYS = [['primary', '#c8453c'], ['secondary', '#f2d36b'], ['trim', '#4a2f1c'], ['cloth', '#e8e2d0']];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const KNOWN_TOP = new Set(['v', 'id', 'name', 'body', 'head', 'torso', 'legs', 'shoulders', 'cape', 'back', 'main', 'off', 'colors', 'emblem', 'paint']);

function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
function suggest(cat, id) {
  let best = null, bd = 99;
  for (const k of Object.keys(PART_REGISTRY[cat])) { const d = lev(String(id), k); if (d < bd) { bd = d; best = k; } }
  return best && bd <= Math.max(2, Math.floor(String(id).length / 3)) ? ` Did you mean '${best}'?` : '';
}
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

function validatePaint(paint, errors) {
  if (paint === undefined || paint === null) return {};
  if (!isObj(paint)) { errors.push('paint must be an object of part id -> RLE.'); return {}; }
  const out = {};
  for (const pid of Object.keys(paint)) {
    const d = DIM[pid], r = paint[pid];
    if (!d) { errors.push(`paint: '${pid}' is not a part of the soldier (try ${PART_ORDER.slice(0, 6).join(', ')} ...).`); continue; }
    if (!isObj(r) || !Array.isArray(r.rle)) { errors.push(`paint.${pid}: expected {sx,sy,sz,rle:[...]}.`); continue; }
    if (r.sx !== d.size[0] || r.sy !== d.size[1] || r.sz !== d.size[2]) { errors.push(`paint.${pid}: grid must be ${d.size.join('x')} (got ${r.sx}x${r.sy}x${r.sz}).`); continue; }
    if (r.rle.length % 2 !== 0 || r.rle.length > 2 * d.size[0] * d.size[1] * d.size[2]) { errors.push(`paint.${pid}: malformed run-length data.`); continue; }
    const total = d.size[0] * d.size[1] * d.size[2];
    let cells = 0, painted = 0, bad = false;
    for (let i = 0; i < r.rle.length; i += 2) {
      const n = r.rle[i], v = r.rle[i + 1];
      if (!Number.isInteger(n) || n < 1 || n > 65535 || !Number.isInteger(v) || v < 0 || v > 0xffffffff) { bad = true; break; }
      cells += n; if (v) painted += n;
    }
    if (bad || cells > total) { errors.push(`paint.${pid}: run-length data is corrupt.`); continue; }
    if (painted > PAINT_CAP) { errors.push(`paint.${pid}: ${painted} painted voxels is over the limit of ${PAINT_CAP} per part.`); continue; }
    out[pid] = { sx: r.sx, sy: r.sy, sz: r.sz, rle: r.rle.slice() };
  }
  return out;
}

/** Validate + normalise. Never throws. `bp` in the result is a fresh object with all defaults filled in (null when hopeless). */
export function validateBlueprint(raw, opts = {}) {
  const errors = [], warnings = [];
  if (!isObj(raw)) return { ok: false, errors: ['A soldier blueprint must be an object.'], warnings, bp: null };
  const bp = { v: 1, id: '', name: '', body: {}, head: {}, torso: {}, legs: {}, shoulders: 'none', cape: 'none', back: 'none', main: 'none', off: 'none', colors: {}, emblem: 'none', paint: {} };
  if (raw.v !== 1) errors.push(`Unsupported blueprint version ${JSON.stringify(raw.v)} (this game reads version 1).`);
  if (typeof raw.id !== 'string' || !/^[a-z][a-z0-9_]{0,31}$/.test(raw.id)) errors.push('Blueprint id must be lower_snake_case (letters, digits, underscore), 1-32 characters, starting with a letter.');
  else bp.id = raw.id;
  if (raw.name === undefined) bp.name = bp.id;
  else if (typeof raw.name !== 'string' || raw.name.length < 1 || raw.name.length > 40) errors.push('Name must be 1-40 characters.');
  else bp.name = raw.name;
  for (const k of Object.keys(raw)) if (!KNOWN_TOP.has(k)) warnings.push(`Ignored unknown field '${k}'.`);

  for (const g of ['body', 'head', 'torso', 'legs', 'colors']) if (raw[g] !== undefined && !isObj(raw[g])) errors.push(`'${g}' must be an object.`);
  const rb = isObj(raw.body) ? raw.body : {};
  if (rb.type === undefined) bp.body.type = 'average';
  else if (!BODY_TYPES[rb.type]) errors.push(`Body type '${rb.type}' is not one of slim, average, stocky.`);
  else bp.body.type = rb.type;
  for (const [k, def] of [['skin', '#e0ac84'], ['hair', '#4a3426']]) {
    if (rb[k] === undefined) bp.body[k] = def; else if (typeof rb[k] !== 'string' || !HEX_RE.test(rb[k])) errors.push(`body.${k} must be a #rrggbb colour.`); else bp.body[k] = rb[k].toLowerCase();
  }
  const rh = isObj(raw.head) ? raw.head : {};
  if (rh.eyes === undefined) bp.head.eyes = '#222222'; else if (typeof rh.eyes !== 'string' || !HEX_RE.test(rh.eyes)) errors.push('head.eyes must be a #rrggbb colour.'); else bp.head.eyes = rh.eyes.toLowerCase();

  for (const [grp, key, cat, def, label] of SLOTS) {
    const src = grp ? (isObj(raw[grp]) ? raw[grp] : {}) : raw;
    const dst = grp ? bp[grp] : bp;
    const val = src[key];
    const path = grp ? `${grp}.${key}` : key;
    if (val === undefined) { dst[key] = def; continue; }
    if (typeof val !== 'string') { errors.push(`${label} (${path}) must be a part id string.`); continue; }
    const e = PART_REGISTRY[cat][val];
    if (!e) { errors.push(`${label} '${String(val).slice(0, 40)}' is not a known ${CATEGORIES[cat].label.toLowerCase()} part.${suggest(cat, val)}`); continue; }
    if (opts.unlocked !== undefined && !isPartUnlocked(e, opts.unlocked)) { errors.push(`${label} '${e.name}' is locked. ${e.unlock.hint}`); continue; }
    dst[key] = val;
  }
  const rc = isObj(raw.colors) ? raw.colors : {};
  for (const [k, def] of COLOR_KEYS) {
    if (rc[k] === undefined) bp.colors[k] = def; else if (typeof rc[k] !== 'string' || !HEX_RE.test(rc[k])) errors.push(`colors.${k} must be a #rrggbb colour.`); else bp.colors[k] = rc[k].toLowerCase();
  }
  if (rc.metal === undefined) bp.colors.metal = 'bronze'; else if (METAL_KEYS.indexOf(rc.metal) < 0) errors.push(`Metal '${String(rc.metal).slice(0, 20)}' is not one of ${METAL_KEYS.join(', ')}.`); else bp.colors.metal = rc.metal;
  if (raw.emblem !== undefined) { if (EMBLEM_IDS.indexOf(raw.emblem) < 0) errors.push(`Emblem '${String(raw.emblem).slice(0, 20)}' is not one of ${EMBLEM_IDS.join(', ')}.`); else bp.emblem = raw.emblem; }
  bp.paint = validatePaint(raw.paint, errors);

  // combination rules (warnings only: the compiler resolves them)
  const mainE = PART_REGISTRY.mains[bp.main];
  if (mainE && mainE.meta.twoHanded && bp.off !== 'none') warnings.push(`'${mainE.name}' needs both hands: the off-hand item is dropped.`);
  return { ok: errors.length === 0, errors, warnings, bp: errors.length ? null : bp };
}

export function defaultBlueprint() {
  return {
    v: 1, id: 'recruit', name: 'Recruit',
    body: { type: 'average', skin: '#e0ac84', hair: '#4a3426' },
    head: { helm: 'corinthian', hair: 'short', face: 'stubble', eyes: '#222222' },
    torso: { armor: 'none', tunic: 'chiton' },
    legs: { armor: 'greaves_bronze', skirt: 'none' },
    shoulders: 'none', cape: 'none', back: 'none', main: 'dory', off: 'hoplon',
    colors: { primary: '#c8453c', secondary: '#f2d36b', trim: '#4a2f1c', metal: 'bronze', cloth: '#e8e2d0' },
    emblem: 'lambda', paint: {},
  };
}

/** A random LEGAL blueprint (always compiles). opts.unlocked: Set of unlock keys whose parts may be used (default none: no locked parts). */
export function randomBlueprint(rng, opts = {}) {
  const pick = (cat) => {
    const ids = Object.keys(PART_REGISTRY[cat]).filter((id) => isPartUnlocked(PART_REGISTRY[cat][id], opts.unlocked));
    return ids[Math.floor(rng.next() * ids.length)];
  };
  const pal = PALETTES[Math.floor(rng.next() * PALETTES.length)];
  const main = pick('mains'), mainE = PART_REGISTRY.mains[main];
  const off = mainE.meta.twoHanded ? 'none' : pick('offs');
  const id = 'cs_' + Math.floor(rng.next() * 0xffffff).toString(36).padStart(5, '0');
  return {
    v: 1, id, name: opts.name || 'Random Recruit',
    body: { type: ['slim', 'average', 'stocky'][Math.floor(rng.next() * 3)], skin: SKIN_TONES[Math.floor(rng.next() * SKIN_TONES.length)], hair: HAIR_COLORS[Math.floor(rng.next() * HAIR_COLORS.length)] },
    head: { helm: pick('helms'), hair: pick('hair'), face: pick('faces'), eyes: EYE_COLORS[Math.floor(rng.next() * EYE_COLORS.length)] },
    torso: { armor: pick('armors'), tunic: pick('tunics') },
    legs: { armor: pick('legs'), skirt: pick('skirts') },
    shoulders: pick('shoulders'), cape: pick('capes'), back: pick('backs'), main, off,
    colors: { primary: pal.primary, secondary: pal.secondary, trim: pal.trim, metal: METAL_KEYS[Math.floor(rng.next() * METAL_KEYS.length)], cloth: pal.cloth },
    emblem: EMBLEM_IDS[Math.floor(rng.next() * EMBLEM_IDS.length)], paint: {},
  };
}

// ------------------------------------------------------------------------------------------------ painting
/** Apply a paint override layer onto canonical grids in place. paint = bp.paint ({partId: RLE}); RLE value 0 = untouched, PAINT_ERASE = erase, else voxel. */
export function applyPaint(bp, grids) {
  const paint = bp && bp.paint ? bp.paint : {};
  let applied = 0;
  for (const pid of Object.keys(paint)) {
    const g = grids[pid], d = DIM[pid]; if (!d) continue;
    const r = paint[pid];
    if (!g) { grids[pid] = newGrid(pid); }
    const gg = grids[pid];
    let p = 0;
    for (let i = 0; i < r.rle.length; i += 2) {
      const n = r.rle[i], v = r.rle[i + 1] >>> 0;
      if (v) for (let k = 0; k < n && p + k < gg.d.length; k++) { gg.d[p + k] = v === PAINT_ERASE ? 0 : v; applied++; }
      p += n;
    }
  }
  return applied;
}
/** Painter helper: diff an edited grid against the generated one into a paint RLE (or null when identical). */
export function diffPaint(edited, generated) {
  const o = new VoxelGrid(edited.sx, edited.sy, edited.sz);
  let n = 0;
  for (let i = 0; i < edited.d.length; i++) {
    const a = edited.d[i], b = generated ? generated.d[i] : 0;
    if (a === b) continue;
    o.d[i] = a ? a : PAINT_ERASE; n++;
  }
  return n ? o.toRLE() : null;
}

// ------------------------------------------------------------------------------------------------ compile
function makeCtx(bp, opts) {
  const hx = hexToRGB;
  const cloth = hx(bp.colors.cloth);
  const ctx = {
    bp, id: bp.id, opts,
    c: { skin: hx(bp.body.skin), hair: hx(bp.body.hair), eyes: hx(bp.head.eyes), primary: hx(bp.colors.primary), secondary: hx(bp.colors.secondary), trim: hx(bp.colors.trim), cloth },
    metalKey: bp.colors.metal, m: METALS[bp.colors.metal],
    emblem: bp.emblem, bodyType: bp.body.type,
    rng: null, len: 0, back: 0,
    /** team-tinted voxel from the cloth colour shaded by f (light bases: the renderer multiplies by the team colour) */
    t(f = 1) { return T(shade(cloth, f)); },
    /** metal voxel from the 5-step ramp (0 dark .. 4 highlight) */
    mt(i) { return V(this.m[i]); },
  };
  return ctx;
}
export { makeCtx };

const asMap = (entry, out) => {
  if (out instanceof VoxelGrid) return { [CATEGORIES[entry.category].target]: out };
  return out;
};
const stamp = (G, map) => {
  for (const pid of Object.keys(map)) {
    const g = map[pid]; if (!g) continue;
    const d = DIM[pid]; if (!d) throw new Error(`part builder returned unknown part '${pid}'`);
    if (g.sx !== d.size[0] || g.sy !== d.size[1] || g.sz !== d.size[2]) throw new Error(`part '${pid}' grid is ${g.sx}x${g.sy}x${g.sz}, canonical is ${d.size.join('x')}`);
    if (!G[pid]) G[pid] = newGrid(pid);
    G[pid].stamp(g, 0, 0, 0, true);
  }
};
function runLayer(G, ctx, cat, id, base) {
  const e = PART_REGISTRY[cat][id]; if (!e || id === 'none' && !e.build) return null;
  const saveM = ctx.m, saveK = ctx.metalKey;
  if (e.meta.metal) { ctx.m = METALS[e.meta.metal]; ctx.metalKey = e.meta.metal; }
  ctx.rng = base.fork(cat + ':' + id);
  const out = e.build(ctx);
  ctx.m = saveM; ctx.metalKey = saveK;
  if (out) stamp(G, asMap(e, out));
  return e;
}

/** Build the canonical (unpainted unless paint=true) grids for a validated blueprint. Returns {grids, ctx, weapon:{entry,len}, helm, warnings}. */
export function buildPartGrids(bpIn, opts = {}) {
  const v = validateBlueprint(bpIn, { unlocked: opts.unlocked });
  if (!v.ok) throw new BlueprintError(v.errors);
  const bp = v.bp, warnings = v.warnings.slice();
  const ctx = makeCtx(bp, opts);
  const base = new RNG(hashString(bp.id));
  const helmE = PART_REGISTRY.helms[bp.head.helm];
  ctx.noEyes = !!helmE.meta.noEyes;
  const G = baseGrids(ctx);
  for (const k of PART_ORDER) if (!G[k]) G[k] = newGrid(k);
  const hairMode = helmE.meta.hair || 'none';
  const mainE = PART_REGISTRY.mains[bp.main];
  // layer order: legs, skirt, tunic, armour, shoulders, face, hair, cape, back, helm, weapon, offhand
  runLayer(G, ctx, 'legs', bp.legs.armor, base);
  runLayer(G, ctx, 'skirts', bp.legs.skirt, base);
  runLayer(G, ctx, 'tunics', bp.torso.tunic, base);
  runLayer(G, ctx, 'armors', bp.torso.armor, base);
  runLayer(G, ctx, 'shoulders', bp.shoulders, base);
  runLayer(G, ctx, 'faces', bp.head.face, base);
  if (hairMode !== 'none') runLayer(G, ctx, 'hair', bp.head.hair, base);
  runLayer(G, ctx, 'capes', bp.cape, base);
  runLayer(G, ctx, 'backs', bp.back, base);
  runLayer(G, ctx, 'helms', bp.head.helm, base);
  // weapon: length clamp (spec 4.1 weapon length rule)
  const style = mainE.meta.style || 'none';
  const nat = mainE.meta.len || 0;
  let len = nat;
  if (nat && style !== 'shoot' && !mainE.meta.noClamp) {
    const radius = opts.radius ?? BODY_RADIUS[bp.body.type];
    let maxD = MAX_REACH;
    if (opts.range != null) maxD = Math.min(maxD, opts.range + radius + 0.3);
    maxD /= (opts.scale || 1);
    const K = STYLE_K[style] ?? 0.8;
    const maxLen = Math.floor((maxD - ARM_REACH) / (0.1 * K) + 1e-6);
    len = clamp(Math.min(nat, maxLen), mainE.meta.minLen ?? 6, nat);
  }
  ctx.len = len; ctx.back = mainE.meta.back ?? 8;
  if (bp.main !== 'none') runLayer(G, ctx, 'mains', bp.main, base);
  let offId = bp.off;
  if (mainE.meta.twoHanded && offId !== 'none') { warnings.push(`'${mainE.name}' needs both hands: the off-hand item was dropped.`); offId = 'none'; }
  if (offId !== 'none') runLayer(G, ctx, 'offs', offId, base);
  return { grids: G, ctx, bp, warnings, weapon: { entry: mainE, len, natural: nat, style }, offId };
}

// ---- rest-pose geometry (world units, root-relative) -----------------------------------------------------------------------
function rotMat(rx, ry, rz) {   // Ry*Rx*Rz, row-major 3x3
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx, cx * sz, cx * cz, -sx, -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx];
}
const mmul = (a, b) => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8]];
/** world (root-relative) transform of every part: {R:[9], t:[3]} by part id. pose = optional Float32Array (9 floats per part, VoxSkin layout), else the static rest pose. */
export function restTransforms(model, pose) {
  const out = {};
  for (const p of model.parts) {
    const par = p.parent ? out[p.parent] : null;
    let Rl = rotMat(p.rest[0], p.rest[1], p.rest[2]);
    const o = p.origin.slice();
    if (pose) { const q = p.index * 9; Rl = mmul(rotMat(pose[q + 3], pose[q + 4], pose[q + 5]), Rl); o[0] += pose[q]; o[1] += pose[q + 1]; o[2] += pose[q + 2]; }
    const R = par ? mmul(par.R, Rl) : Rl;
    const t = par ? [par.R[0] * o[0] + par.R[1] * o[1] + par.R[2] * o[2] + par.t[0], par.R[3] * o[0] + par.R[4] * o[1] + par.R[5] * o[2] + par.t[1], par.R[6] * o[0] + par.R[7] * o[1] + par.R[8] * o[2] + par.t[2]] : o;
    out[p.id] = { R, t };
  }
  return out;
}
/** Rest-pose world AABB (u) of the solid voxels of the selected parts (all voxel corners, rotation included). */
export function restBounds(model, filter) {
  const T3 = restTransforms(model), s = model.voxelSize;
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of model.parts) {
    if (filter && !filter(p.id)) continue;
    const { R, t } = T3[p.id], g = p.grid, pv = p.pivot;
    for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) {
      if (!g.d[x + g.sx * (z + g.sz * y)]) continue;
      for (let c = 0; c < 8; c++) {
        const lx = (x + (c & 1) - pv[0]) * s, ly = (y + ((c >> 1) & 1) - pv[1]) * s, lz = (z + ((c >> 2) & 1) - pv[2]) * s;
        const wx = R[0] * lx + R[1] * ly + R[2] * lz + t[0], wy = R[3] * lx + R[4] * ly + R[5] * lz + t[1], wz = R[6] * lx + R[7] * ly + R[8] * lz + t[2];
        if (wx < mn[0]) mn[0] = wx; if (wy < mn[1]) mn[1] = wy; if (wz < mn[2]) mn[2] = wz;
        if (wx > mx[0]) mx[0] = wx; if (wy > mx[1]) mx[1] = wy; if (wz > mx[2]) mx[2] = wz;
      }
    }
  }
  return { min: mn, max: mx };
}

/** Compile a blueprint to a ModelDef + sim/render metadata. Throws BlueprintError on an invalid blueprint. */
export function compileSoldier(bpIn, opts = {}) {
  const b = buildPartGrids(bpIn, opts);
  const { grids, bp, ctx, weapon } = b;
  applyPaint(bp, grids);
  const mainE = weapon.entry;
  const model = new ModelDef(bp.id, 0.1);
  model.meta = { rig: 'hum1', kind: 'humanoid', blueprint: bp.id, bodyType: bp.body.type };
  const has = {};
  let restW = (mainE.meta.rest || [0, 0, 0]).slice();
  for (const id of PART_ORDER) {
    const g = grids[id], d = DIM[id];
    const required = id === 'body' || id === 'head' || id.startsWith('arm') || id.startsWith('leg');
    if (!required && (!g || g.count() === 0)) continue;
    if (id === 'weapon' || id === 'offhand') { if (!g || g.count() === 0) continue; }
    if (d.parent && !has[d.parent]) continue;
    model.addPart(id, g, { parent: d.parent && has[d.parent] ? d.parent : null, origin: d.origin, pivot: d.pivot, rest: id === 'weapon' ? restW : (id === 'offhand' ? ((PART_REGISTRY.offs[b.offId].meta.rest) || [0, 0, 0]) : [0, 0, 0]), shadow: id !== 'cape2' && id !== 'back' ? true : true });
    has[id] = true;
  }
  // keep the weapon above the floor at rest: tilt it toward horizontal until its lowest corner clears y = 0
  if (has.weapon) {
    const wp = model.byId.weapon;
    for (let i = 0; i < 40; i++) {
      const bb = restBounds(model, (pid) => pid === 'weapon');
      if (bb.min[1] >= -1e-6) break;
      restW[0] += restW[0] > Math.PI / 2 ? -0.05 : 0.05;
      wp.rest = restW.slice();
    }
  }
  // attach points (voxel coordinates inside the named part grid)
  const hb = grids.head.bounds(), cb = has.crest ? grids.crest.bounds() : null;
  if (has.weapon) { model.addAttach('grip_main', 'weapon', [4, 10, 4]); model.addAttach('muzzle', 'weapon', [4, 10 + weapon.len, 4]); }
  else { model.addAttach('grip_main', 'armLR', [1, 1, 1]); model.addAttach('muzzle', 'armLR', [1, 0, 3]); }
  model.addAttach('grip_off', has.offhand ? 'offhand' : 'armLL', has.offhand ? [8, 8, 3] : [1, 1, 1]);
  model.addAttach('eyes', 'head', [5, 3.5, 8]);
  if (cb) model.addAttach('head_top', 'crest', [5, cb.y1 + 1, 6]); else model.addAttach('head_top', 'head', [5, Math.max(6, hb ? hb.y1 + 1 : 6), 5]);
  model.addAttach('body_center', 'body', [5, 4.5, 2.5]);
  model.addAttach('feet', 'legLL', [2, 0, 2]);
  // metrics
  const style = weapon.style;
  const K = STYLE_K[style] ?? 0.8;
  const reach = bp.main === 'none' ? 0.6 : (style === 'shoot' ? 1.2 : ARM_REACH + weapon.len * 0.1 * K);
  const hh = restBounds(model, (pid) => pid === 'legUL' || pid === 'legLL' || pid === 'legUR' || pid === 'legLR' || pid === 'body' || pid === 'head' || pid === 'crest');
  const sc = BODY_TYPES[bp.body.type];
  const radius = clamp(opts.radius !== undefined ? opts.radius : BODY_RADIUS[bp.body.type], 0.3, 0.7);
  return {
    model, scale: sc.slice(), grip: mainE.meta.grip ? mainE.meta.grip.slice() : [4, 10, 4], reach, height: hh.max[1] * sc[1], radius,
    weaponStyle: style, twoHanded: !!mainE.meta.twoHanded, weaponLen: weapon.len, warnings: b.warnings, voxels: model.voxelCount(), parts: model.parts.length,
  };
}

/** Convenience for the content layer: compile with the numbers from a (sim) UnitDef so the weapon length rule uses the real range. */
export function compileForDef(bp, def, extra = {}) {
  const range = def && def.melee ? def.melee.range : (def && def.range);
  return compileSoldier(bp, Object.assign({ range, radius: def && def.radius, scale: def && def.scale }, extra));
}
