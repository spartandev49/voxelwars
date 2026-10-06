// Strict validators for anything that arrives from outside (share codes, files, localStorage). They clamp or reject with plain-English
// messages and never trust ids, numbers or strings. No prototype keys, no NaN/Infinity, no unbounded lengths.
import { validateBlueprint } from '../content/era_ancient/blueprints.js';
import { hashString } from '../core/rng.js';
import { STAT_KEYS, STAT_CAPS, STAT_POINTS, MAX_ABILITIES, ABILITY_PRESETS, AI_STYLES, NAME_MAX, QUOTE_MAX, HEIGHT_MIN, HEIGHT_MAX, RADIUS_MIN, RADIUS_MAX, PITCH_MIN, PITCH_MAX, abilityReason, weaponStyleOf } from '../content/era_ancient/custom.js';
import { defaultQuotes } from '../content/era_ancient/custom_text.js';
export class ValidationError extends Error { constructor(msg) { super(msg); this.name = 'ValidationError'; } }
const bad = (m) => { throw new ValidationError(m); };
const CTRL = new RegExp('[\\u0000-\\u001f\\u007f\\u2028\\u2029]', 'g');

export function str(v, max, label = 'text', fallback = '') {
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'string') bad(`${label} must be text`);
  // strip control characters; keep it a plain string (rendering always uses textContent)
  const s = v.replace(CTRL, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) : s;
}
export function num(v, min, max, label = 'number', fallback) {
  if (v === undefined || v === null) { if (fallback !== undefined) return fallback; bad(`${label} is missing`); }
  const n = Number(v); if (!Number.isFinite(n)) bad(`${label} is not a valid number`);
  return n < min ? min : n > max ? max : n;
}
export function int(v, min, max, label, fallback) { return Math.round(num(v, min, max, label, fallback)); }
export function plain(o, label = 'data') { if (o === null || typeof o !== 'object' || Array.isArray(o)) bad(`${label} must be an object`); for (const k of Object.keys(o)) if (k === '__proto__' || k === 'constructor' || k === 'prototype') bad(`${label} contains a forbidden key`); return o; }
export function arr(v, max, label = 'list') { if (!Array.isArray(v)) bad(`${label} must be a list`); if (v.length > max) bad(`${label} is too long (${v.length} > ${max})`); return v; }
export function hexColor(v, label = 'colour', fallback = '#888888') { if (v === undefined || v === null) return fallback; if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) bad(`${label} must look like #c8453c`); return v.toLowerCase(); }

// ------------------------------------------------------------------------------------------------ CustomSoldier (spec §5.1, decisions D13/R2.4; owner EDITORS-B)
const SOLDIER_ID = /^cs_[a-z0-9_]{1,28}$/;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const hasForbidden = (o) => { for (const k of Object.keys(o)) if (FORBIDDEN.has(k)) return true; return false; };
const isObject = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const cleanLine = (s) => s.replace(CTRL, ' ').replace(/\s+/g, ' ').trim();

/**
 * Non-throwing soldier check that collects EVERY problem (the Workshop shows them with fix-it text) -> {ok, soldier, errors[], warnings[]}.
 * Rules: name 1-40 characters, seven stats (integers, each within its cap, total <= 100), at most 2 abilities that are known and legal for the weapon,
 * height 0.9-1.2, radius (optional) 0.3-0.7, catchphrase and last words <= 40 characters, pitch 0.7-1.4, the blueprint through validateBlueprint
 * (unknown ids get a "Did you mean" hint; `ctx.unlocked` (a Set of campaign unlock keys) enforces part availability), paint grids on the canonical sizes.
 * The weapon lives only in blueprint.main; a legacy top-level `weapon` is adopted when the blueprint has none. cost is never read from the file.
 * ctx: {unlocked?, abilities?: Set of known ability ids}
 */
export function checkSoldier(o, ctx = {}) {
  const errors = [], warnings = [];
  const fail = (m) => { errors.push(m); };
  if (!isObject(o)) { fail('A soldier must be an object.'); return { ok: false, soldier: null, errors, warnings }; }
  if (hasForbidden(o)) { fail('This soldier contains a forbidden key.'); return { ok: false, soldier: null, errors, warnings }; }
  if (o.v !== undefined && o.v !== 1) fail(`This soldier is from a newer game version (v${String(o.v).slice(0, 6)}); this game reads version 1.`);
  // name
  let name = '';
  if (typeof o.name !== 'string') fail('The soldier needs a name (1-40 characters).');
  else { name = cleanLine(o.name); if (!name) fail('The soldier needs a name (1-40 characters).'); else if (name.length > NAME_MAX) fail(`The name is ${name.length} characters; the limit is ${NAME_MAX}.`); }
  // stats
  const stats = Object.create(null); let sum = 0;
  const st = o.stats === undefined || o.stats === null ? {} : o.stats;
  if (!isObject(st) || hasForbidden(st)) fail('The stats must be an object of seven numbers.');
  else for (const k of STAT_KEYS) {
    const raw = st[k];
    if (raw === undefined || raw === null) { stats[k] = 0; continue; }
    if (typeof raw !== 'number' || !Number.isFinite(raw)) { fail(`Stat '${k}' is not a valid number.`); stats[k] = 0; continue; }
    let v = Math.round(raw);
    if (v < 0) { warnings.push(`Stat '${k}' cannot be negative; it was raised to 0.`); v = 0; }
    if (v > STAT_CAPS[k]) { warnings.push(`Stat '${k}' is capped at ${STAT_CAPS[k]} (the file said ${v}).`); v = STAT_CAPS[k]; }
    stats[k] = v; sum += v;
  }
  if (sum > STAT_POINTS) fail(`Stat points add up to ${sum}; the limit is ${STAT_POINTS}.`);
  // blueprint
  let bp = null;
  if (o.blueprint === undefined || o.blueprint === null) fail('The soldier has no appearance (blueprint).');
  else if (!isObject(o.blueprint) || hasForbidden(o.blueprint)) fail('The soldier appearance (blueprint) must be an object.');
  else {
    const raw = Object.assign({}, o.blueprint);
    if (raw.v === undefined) raw.v = 1;
    if (raw.id === undefined) raw.id = typeof o.id === 'string' && /^[a-z][a-z0-9_]{0,31}$/.test(o.id) ? o.id : 'cs_look';
    if (raw.name === undefined && name) raw.name = name.slice(0, NAME_MAX);
    if (raw.main === undefined && typeof o.weapon === 'string') raw.main = o.weapon;            // pre-D13 files kept the weapon beside the blueprint
    let bad = false;
    for (const g of ['paint', 'body', 'head', 'torso', 'legs', 'colors']) if (isObject(raw[g]) && hasForbidden(raw[g])) bad = true;
    let vb = null;
    if (bad) fail('The appearance contains a forbidden key.');
    else { try { vb = validateBlueprint(raw, ctx.unlocked !== undefined ? { unlocked: ctx.unlocked } : {}); } catch (e) { fail('The appearance (blueprint) could not be read: its paint layer looks damaged.'); } }
    if (vb) { if (!vb.ok) for (const m of vb.errors) fail(m); else { bp = vb.bp; for (const m of vb.warnings) warnings.push(m); } }
  }
  // abilities
  const abilities = [];
  if (o.abilities !== undefined && o.abilities !== null) {
    if (!Array.isArray(o.abilities)) fail('The abilities must be a list.');
    else {
      if (o.abilities.length > MAX_ABILITIES) fail(`A soldier can carry at most ${MAX_ABILITIES} abilities (this one has ${o.abilities.length}).`);
      for (const a of o.abilities.slice(0, MAX_ABILITIES)) {
        if (typeof a !== 'string') { fail('An ability id must be text.'); continue; }
        const known = ctx.abilities ? ctx.abilities.has(a) : Object.prototype.hasOwnProperty.call(ABILITY_PRESETS, a);
        if (!known || !Object.prototype.hasOwnProperty.call(ABILITY_PRESETS, a)) { fail(`Unknown ability '${a.slice(0, 24)}' (the code may come from a newer game version).`); continue; }
        if (abilities.indexOf(a) >= 0) { fail(`The ability '${a}' is listed twice.`); continue; }
        if (bp) { const why = abilityReason(a, bp); if (why) { fail(why); continue; } }
        abilities.push(a);
      }
    }
  }
  // behaviour
  let ai = typeof o.ai === 'string' && AI_STYLES.indexOf(o.ai) >= 0 ? o.ai : '';
  if (o.ai !== undefined && o.ai !== null && !ai) warnings.push(`AI style '${String(o.ai).slice(0, 16)}' is not one of ${AI_STYLES.join(', ')}; the default was used.`);
  if (!ai) ai = bp && weaponStyleOf(bp) === 'shoot' || bp && weaponStyleOf(bp) === 'throw' ? 'skirmish' : 'charge';
  // body numbers
  let height = 1, radius;
  if (o.height !== undefined && o.height !== null) {
    if (typeof o.height !== 'number' || !Number.isFinite(o.height)) fail('The height is not a valid number.');
    else { height = Math.min(HEIGHT_MAX, Math.max(HEIGHT_MIN, o.height)); if (height !== o.height) warnings.push(`Height is limited to ${HEIGHT_MIN}-${HEIGHT_MAX}; it was set to ${height.toFixed(2)}.`); }
  }
  if (o.radius !== undefined && o.radius !== null) {
    if (typeof o.radius !== 'number' || !Number.isFinite(o.radius)) fail('The collider radius is not a valid number.');
    else { radius = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, o.radius)); if (radius !== o.radius) warnings.push(`Collider radius is limited to ${RADIUS_MIN}-${RADIUS_MAX}; it was set to ${radius.toFixed(2)}.`); }
  }
  // personality
  const tx = o.text === undefined || o.text === null ? {} : o.text;
  const text = { catch: '', deaths: [], pitch: 1 };
  if (!isObject(tx) || hasForbidden(tx)) fail('The personality (text) must be an object.');
  else {
    if (tx.catch !== undefined && tx.catch !== null) { if (typeof tx.catch !== 'string') fail('The catchphrase must be text.'); else { text.catch = cleanLine(tx.catch); if (text.catch.length > QUOTE_MAX) { warnings.push(`The catchphrase was cut to ${QUOTE_MAX} characters.`); text.catch = text.catch.slice(0, QUOTE_MAX); } } }
    if (tx.deaths !== undefined && tx.deaths !== null) {
      if (!Array.isArray(tx.deaths)) fail('The last words must be a list.');
      else {
        if (tx.deaths.length > 3) warnings.push('Only the first three last words are kept.');
        for (const d of tx.deaths.slice(0, 3)) { if (typeof d !== 'string') { fail('A last word must be text.'); continue; } let q = cleanLine(d); if (q.length > QUOTE_MAX) { warnings.push(`A last word was cut to ${QUOTE_MAX} characters.`); q = q.slice(0, QUOTE_MAX); } if (q) text.deaths.push(q); }
      }
    }
    if (tx.pitch !== undefined && tx.pitch !== null) {
      if (typeof tx.pitch !== 'number' || !Number.isFinite(tx.pitch)) fail('The voice pitch is not a valid number.');
      else { text.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, tx.pitch)); }
    }
  }
  // id (deterministic fallback: no randomness in save/)
  let id = typeof o.id === 'string' && SOLDIER_ID.test(o.id) ? o.id : '';
  if (!id) { if (o.id !== undefined && o.id !== null) warnings.push('The soldier id was not valid, so a new one was made.'); id = 'cs_' + hashString(name + '|' + JSON.stringify(bp || 0)).toString(36).slice(0, 8); }
  if (errors.length) return { ok: false, soldier: null, errors, warnings };
  const dq = defaultQuotes(id);
  if (!text.catch) text.catch = dq.catch;
  for (const q of dq.deaths) if (text.deaths.length < 3 && text.deaths.indexOf(q) < 0) text.deaths.push(q);
  while (text.deaths.length < 3) text.deaths.push(dq.deaths[text.deaths.length % dq.deaths.length]);
  bp.name = name;
  const soldier = Object.create(null);
  soldier.v = 1; soldier.id = id; soldier.name = name; soldier.blueprint = bp; soldier.stats = stats; soldier.abilities = abilities; soldier.ai = ai; soldier.height = height;
  if (radius !== undefined) soldier.radius = radius;
  soldier.text = text;
  return { ok: true, soldier, errors, warnings };
}

/** CustomSoldier (spec §5.1) strict form: throws ValidationError with the first problem (plus a count of the rest). Returns the validated soldier. */
export function validateSoldier(o, ctx = {}) {
  const r = checkSoldier(o, ctx);
  if (!r.ok) throw new ValidationError(r.errors[0] + (r.errors.length > 1 ? ` (and ${r.errors.length - 1} more problem${r.errors.length > 2 ? 's' : ''})` : ''));
  Object.defineProperty(r.soldier, 'warnings', { value: r.warnings, enumerable: false });
  return r.soldier;
}

/** Army placements: [{team, defId, positions:[[x,z]...], heading, order}] */
export function validateArmy(o, ctx = {}) {
  plain(o, 'Army');
  const recs = arr(o.records || [], 400, 'army records'); let total = 0;
  const out = { v: 1, name: str(o.name, 32, 'name', 'Army'), records: [] };
  for (const r of recs) {
    plain(r, 'army record');
    const defId = str(r.defId, 40, 'unit id'); if (ctx.defs && !ctx.defs[defId] && !(r.custom)) bad(`Unknown unit '${defId}' (the code may come from a newer game version)`);
    const pos = arr(r.positions, 64, 'positions').map((p) => { arr(p, 2, 'position'); return [num(p[0], -200, 200, 'x'), num(p[1], -200, 200, 'z')]; });
    total += pos.length; if (total > 800) bad('That army has too many soldiers');
    out.records.push({ team: int(r.team, 0, 1, 'team'), defId, positions: pos, heading: num(r.heading, -7, 7, 'heading', 0), order: ['advance', 'hold', 'retreat', 'flank', 'skirmish'].includes(r.order) ? r.order : 'advance' });
  }
  return out;
}
