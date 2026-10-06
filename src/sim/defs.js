// Normalise raw stat records (STAT_TABLE entries or full UnitDefs) into the shape the sim expects.
import { STAT_TABLE, DEFAULTS } from '../content/era_ancient/stats.js';

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
  return d;
}

/** Build the id -> def map used by the sim from the stat table (+ optional extra full defs overriding stat records). */
export function buildSimDefs(extra) {
  const out = Object.create(null);
  for (const id of Object.keys(STAT_TABLE)) out[id] = normalizeDef(id, STAT_TABLE[id]);
  if (extra) for (const k of Object.keys(extra)) out[k] = normalizeDef(k, Object.assign({}, STAT_TABLE[k] || {}, extra[k]));
  return out;
}
