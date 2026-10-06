// Arena documents: serialisation, share codes and the strict import path of the Arena Builder (pure + async; no DOM).
// A "doc" is Arena.toJSON() plus the builder's extra fields {objective, tags}. The share code is VW1.arena.<deflate+base64url>.<crc32>
// (save/share.js). All three import channels (pasted code, .vwarena file text, library item) go through importArena(): one validator,
// plain-English errors, hostile input (NaN, Infinity, huge counts, control characters, unknown ids) clamped or rejected.

import { Arena } from '../../world/arena.js';
import { encodeShare, decodeShare, importShare, sizeClass, MAX_CODE } from '../../save/share.js';
import { ValidationError } from '../../save/validate.js';
import { PROP_CATALOG } from '../../content/era_ancient/props/catalog.js';
import { LIMITS, HAZARD_BY_ID, MARKER_BY_ID, OBJECTIVE_BY_ID } from './consts.js';

export { ValidationError, MAX_CODE, sizeClass };
export const PROP_TYPES = new Set(Object.keys(PROP_CATALOG));
const CTRL = new RegExp('[\\u0000-\\u001f\\u007f\\u2028\\u2029]', 'g');
const clean = (s, max) => String(s === undefined || s === null ? '' : s).replace(CTRL, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Arena + builder extras -> plain JSON-able object. */
export function toDoc(arena, meta = {}) {
  const d = arena.toJSON();
  d.objective = OBJECTIVE_BY_ID[meta.objective] ? meta.objective : 'eliminate';
  d.tags = (meta.tags || []).slice(0, LIMITS.tagsMax);
  return d;
}
/** Read the builder extras from a raw doc (Arena.fromJSON ignores them). */
export function readMeta(json) {
  const o = json && typeof json === 'object' ? json : {};
  const objective = OBJECTIVE_BY_ID[o.objective] ? o.objective : 'eliminate';
  const tags = Array.isArray(o.tags) ? o.tags.filter((t) => typeof t === 'string').map((t) => clean(t, LIMITS.tagMax)).filter(Boolean).slice(0, LIMITS.tagsMax) : [];
  return { objective, tags };
}

/** Make an imported arena safe: finite coordinates inside the bounds, known ids, clean strings. Returns plain-English notes of what was changed. */
export function sanitizeArena(a, rawCounts = {}) {
  const notes = [], half = a.half();
  a.name = clean(a.name, LIMITS.nameMax) || 'Imported Arena'; a.author = clean(a.author, LIMITS.authorMax); a.desc = clean(a.desc, LIMITS.descMax);
  const fin = (v) => typeof v === 'number' && Number.isFinite(v);
  const before = a.props.length;
  a.props = a.props.filter((p) => fin(p.x) && fin(p.z) && fin(p.r) && fin(p.s));
  let moved = 0;
  for (const p of a.props) { const x = Math.max(-half + 0.5, Math.min(half - 0.5, p.x)), z = Math.max(-half + 0.5, Math.min(half - 0.5, p.z)); if (x !== p.x || z !== p.z) { p.x = x; p.z = z; moved++; } p.v = (p.v | 0) & 3; }
  if (before !== a.props.length) notes.push(`${before - a.props.length} props with broken positions were dropped.`);
  if (moved) notes.push(`${moved} props outside the arena were moved back inside.`);
  for (const h of a.hazards) { if (!HAZARD_BY_ID[h.t]) throw new ValidationError(`Unknown hazard '${clean(h.t, 20)}' (the code may come from a newer game version)`); h.x = fin(h.x) ? Math.max(-half, Math.min(half, h.x)) : 0; h.z = fin(h.z) ? Math.max(-half, Math.min(half, h.z)) : 0; h.r = fin(h.r) ? Math.max(1, Math.min(30, h.r)) : 4; }
  for (const m of a.markers) { if (!MARKER_BY_ID[m.type]) throw new ValidationError(`Unknown marker type '${clean(m.type, 20)}' (the code may come from a newer game version)`); m.id = clean(m.id, 16) || m.type; m.x = fin(m.x) ? Math.max(-half, Math.min(half, m.x)) : 0; m.z = fin(m.z) ? Math.max(-half, Math.min(half, m.z)) : 0; m.r = fin(m.r) ? Math.max(1, Math.min(30, m.r)) : 4; }
  for (const k of ['A', 'B']) { const z = a.zones[k]; for (const f of ['x', 'z', 'w', 'd']) if (!fin(z[f])) z[f] = f === 'w' ? 10 : f === 'd' ? 30 : 0; }
  if (rawCounts.props > LIMITS.props) notes.push(`This arena had ${rawCounts.props.toLocaleString('en-US')} props; only the first ${LIMITS.props.toLocaleString('en-US')} were kept.`);
  if (rawCounts.hazards > LIMITS.hazards) notes.push(`This arena had ${rawCounts.hazards} hazards; only the first ${LIMITS.hazards} were kept.`);
  if (rawCounts.markers > LIMITS.markers) notes.push(`This arena had ${rawCounts.markers} markers; only the first ${LIMITS.markers} were kept.`);
  return notes;
}

/** Build an Arena from a raw doc (used by drafts and library items). Throws ValidationError. */
export function fromDoc(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new ValidationError('That is not an arena');
  let a;
  try { a = Arena.fromJSON(json); } catch (e) { throw new ValidationError('The arena data is not valid: ' + (e && e.message ? e.message : 'unreadable')); }
  const counts = { props: Array.isArray(json.props) ? json.props.length : 0, hazards: Array.isArray(json.hazards) ? json.hazards.length : 0, markers: Array.isArray(json.markers) ? json.markers.length : 0 };
  for (const p of a.props) if (!PROP_TYPES.has(p.t)) throw new ValidationError(`Unknown prop '${clean(p.t, 24)}' (the code may come from a newer game version)`);
  const notes = sanitizeArena(a, counts);
  return Object.assign({ arena: a, notes }, readMeta(json));
}

/** Encode the arena as a share code. `tooLong` is true above 38,000 characters (then only the file is offered). */
export async function exportArena(arena, meta) { return encodeShare('arena', toDoc(arena, meta)); }

/** Decode + validate a pasted code or file text. Resolves {arena, objective, tags, notes, length, cls}; rejects with ValidationError. */
export async function importArena(text) {
  const t = typeof text === 'string' ? text : '';
  const { value } = await importShare(t, 'arena', { propTypes: PROP_TYPES });
  let meta = { objective: 'eliminate', tags: [] }, raw = null;
  try { const dec = await decodeShare(t); raw = dec.json; meta = readMeta(dec.json); } catch (e) { /* importShare already validated it */ }
  const counts = raw ? { props: Array.isArray(raw.props) ? raw.props.length : 0, hazards: Array.isArray(raw.hazards) ? raw.hazards.length : 0, markers: Array.isArray(raw.markers) ? raw.markers.length : 0 } : {};
  const notes = sanitizeArena(value, counts);
  const len = t.replace(/\s+/g, '').length;
  return { arena: value, objective: meta.objective, tags: meta.tags, notes, length: len, cls: sizeClass(len) };
}
