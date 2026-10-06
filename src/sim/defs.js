// Normalise raw stat records (STAT_TABLE entries or full UnitDefs) into the shape the sim expects.
import { STAT_TABLE, DEFAULTS } from '../content/era_ancient/stats.js';

// Hidden-class discipline (perf): every def, and every melee/ranged/shield/ai sub-object, is rebuilt with the SAME key order (the union of the keys the
// shipped stat table uses, missing ones explicitly undefined), so property loads in the hot sim loops stay monomorphic instead of walking ten different shapes.
const TOP_KEYS = ['id', 'name', 'faction', 'role', 'custom', 'tags', 'cost', 'hp', 'armor', 'speed', 'mass', 'radius', 'scale', 'height', 'runMul', 'accel', 'turnRate', 'moraleBonus',
  'melee', 'ranged', 'shield', 'abilities', 'ai', 'model', 'text', 'weaponStyle', '_ai'];
const SUB = { melee: ['dmg', 'cd', 'range', 'type', 'style', 'kb', 'cleave', 'ap'], ranged: ['proj', 'dmg', 'cd', 'range', 'type', 'ap', 'speed', 'spread', 'gravity', 'pierceN', 'minRange', 'whileMoving', 'aoe', 'volley', 'crater', 'chain', 'kb'],
  shield: ['arc', 'block', 'proj'], ai: ['style'] };
function ordered(src, keys) {
  const o = {};
  for (let i = 0; i < keys.length; i++) o[keys[i]] = src[keys[i]];
  for (const k of Object.keys(src)) if (!(k in o)) o[k] = src[k];
  return o;
}
function shape(d) {
  for (const k of Object.keys(SUB)) if (d[k]) d[k] = ordered(d[k], SUB[k]);
  return ordered(d, TOP_KEYS);
}

export function normalizeDef(id, raw) {
  const d = Object.assign({}, raw);
  d.id = id;
  d.name = d.name || id;
  d.tags = (d.tags || []).slice();
  d.ai = Object.assign({ style: 'charge' }, d.ai || {});
  d.radius = d.radius !== undefined ? d.radius : DEFAULTS.radius;
  d.mass = d.mass !== undefined ? d.mass : DEFAULTS.mass;
  d.scale = d.scale !== undefined ? d.scale : DEFAULTS.scale;
  d.runMul = d.runMul !== undefined ? d.runMul : DEFAULTS.runMul;
  d.accel = d.accel !== undefined ? d.accel : DEFAULTS.accel;
  d.turnRate = d.turnRate !== undefined ? d.turnRate : DEFAULTS.turnRate;
  d.abilities = d.abilities || [];
  d.armor = d.armor || 0;
  if (d.height === undefined) d.height = d.role === 'monster' || d.tags.includes('large') ? 2.6 : (d.tags.includes('cavalry') ? 3.2 : (d.tags.includes('animal') ? 1.1 : 2.5));
  return shape(d);
}

/** Build the id -> def map used by the sim from the stat table (+ optional extra full defs overriding stat records). */
export function buildSimDefs(extra) {
  const out = Object.create(null);
  for (const id of Object.keys(STAT_TABLE)) out[id] = normalizeDef(id, STAT_TABLE[id]);
  if (extra) for (const k of Object.keys(extra)) out[k] = normalizeDef(k, Object.assign({}, STAT_TABLE[k] || {}, extra[k]));
  return out;
}
