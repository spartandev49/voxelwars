// Strict validators for anything that arrives from outside (share codes, files, localStorage). They clamp or reject with plain-English
// messages and never trust ids, numbers or strings. No prototype keys, no NaN/Infinity, no unbounded lengths.
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

/** CustomSoldier (spec §5.1). `known` = {parts?:{...}, abilities:Set} for id checks; blueprint is validated by UNITS-LIB's validateBlueprint when provided. */
export function validateSoldier(o, ctx = {}) {
  plain(o, 'Soldier');
  const out = Object.create(null);
  out.v = 1; out.id = str(o.id, 24, 'id', 'cs_' + Math.random().toString(36).slice(2, 8)).replace(/[^a-zA-Z0-9_]/g, '_') || 'cs_x';
  out.name = str(o.name, 24, 'name') || bad('The soldier needs a name'); 
  const st = plain(o.stats || {}, 'stats'); out.stats = Object.create(null); let sum = 0;
  const caps = { hp: 30, damage: 30, speed: 20, armor: 20, morale: 10 };
  for (const k of Object.keys(caps)) { out.stats[k] = int(st[k], 0, caps[k], 'stat ' + k, 0); sum += out.stats[k]; }
  if (sum > 100) bad(`Stat points add up to ${sum}; the limit is 100`);
  out.weapon = str(o.weapon, 32, 'weapon', 'gladius');
  out.abilities = arr(o.abilities || [], 2, 'abilities').map((a) => { const s = str(a, 32, 'ability'); if (ctx.abilities && !ctx.abilities.has(s)) bad(`Unknown ability '${s}' (the code may come from a newer game version)`); return s; });
  out.ai = ['charge', 'hold', 'skirmish', 'flank', 'guard', 'support'].includes(o.ai) ? o.ai : 'charge';
  const t = plain(o.text || {}, 'text'); out.text = { catch: str(t.catch, 40, 'catchphrase'), deaths: arr(t.deaths || [], 3, 'last words').map((d) => str(d, 40, 'last words')), pitch: num(t.pitch, 0.7, 1.4, 'pitch', 1) };
  if (o.blueprint === undefined || o.blueprint === null) bad('The soldier has no appearance (blueprint)');
  out.blueprint = ctx.validateBlueprint ? ctx.validateBlueprint(o.blueprint) : plain(o.blueprint, 'blueprint');
  return out;
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
