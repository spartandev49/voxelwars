// Share codes: VW1.<type>.<base64url(deflate-raw(JSON))>.<crc32> ; also .vwarena/.vwsoldier/.vwarmy file text (same string).
// Types: arena | soldier | army. Size classes S <= 1.8k, M <= 8k, L <= 38k characters (chat-safe); bigger needs a file.
import { crc32hex } from '../core/crc32.js';
import { b64uEncode, b64uDecode } from '../core/base64url.js';
import { deflateRaw, inflateRaw } from '../core/deflate.js';
import { ValidationError, validateSoldier, validateArmy, plain } from './validate.js';
import { Arena } from '../world/arena.js';

export const MAGIC = 'VW1';
export const MAX_CODE = 38000;
export const TYPES = ['arena', 'soldier', 'army'];
const enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: false });

export function sizeClass(len) { return len <= 1800 ? 'S' : len <= 8000 ? 'M' : len <= MAX_CODE ? 'L' : 'XL'; }

// ------------------------------------------------------------------------------------------------ soldier payload (owner EDITORS-B)
// A soldier travels as its CustomSoldier JSON (spec §5.1) with the paint layers palette-indexed: bp.paint[part] = {sx, sy, sz, pal:[voxel values], run:[n, k, ...]}
// where k 0 = untouched, 1 = erase the generated voxel, k >= 2 = pal[k-2]. Each run is the same (count, value) pair of the RLE form, so the round trip is exact.
// The plain {sx, sy, sz, rle} form is still accepted on import. Only the schema fields are exported (no thumbnails, no cost: nothing is trusted from a file).
const SOLDIER_KEYS = ['v', 'id', 'name', 'blueprint', 'stats', 'abilities', 'ai', 'height', 'radius', 'text'];
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
function packRle(r) {
  if (!isObj(r) || !Array.isArray(r.rle) || r.rle.length % 2) return r;
  const pal = [], idx = new Map(), run = [];
  for (let i = 0; i < r.rle.length; i += 2) {
    const v = r.rle[i + 1]; let k;
    if (v === 0) k = 0; else if (v === 1) k = 1; else { k = idx.get(v); if (k === undefined) { pal.push(v); k = pal.length + 1; idx.set(v, k); } }
    run.push(r.rle[i], k);
  }
  return { sx: r.sx, sy: r.sy, sz: r.sz, pal, run };
}
function unpackRle(r, label) {
  if (!isObj(r) || r.run === undefined) return r;
  if (!Array.isArray(r.run) || !Array.isArray(r.pal) || r.run.length % 2 || r.run.length > 4096 * 2 || r.pal.length > 4096) throw new ValidationError(`The paint data for '${label}' is damaged.`);
  const rle = [];
  for (let i = 0; i < r.run.length; i += 2) {
    const n = r.run[i], k = r.run[i + 1];
    if (!Number.isInteger(k) || k < 0 || k >= r.pal.length + 2) throw new ValidationError(`The paint data for '${label}' is damaged.`);
    rle.push(n, k === 0 ? 0 : k === 1 ? 1 : r.pal[k - 2]);
  }
  return { sx: r.sx, sy: r.sy, sz: r.sz, rle };
}
/** CustomSoldier -> the JSON object a share code carries. */
export function packSoldier(cs) {
  const o = {};
  if (!isObj(cs)) return cs;
  for (const k of SOLDIER_KEYS) if (cs[k] !== undefined) o[k] = cs[k];
  if (isObj(o.blueprint)) {
    const bp = Object.assign({}, o.blueprint);
    if (isObj(bp.paint)) { const paint = {}; for (const pid of Object.keys(bp.paint)) paint[pid] = packRle(bp.paint[pid]); bp.paint = paint; }
    o.blueprint = bp;
  }
  return o;
}
/** The JSON of a share code -> a CustomSoldier-shaped object (still to be validated). Throws ValidationError on damaged paint. */
export function unpackSoldier(json) {
  if (!isObj(json) || !isObj(json.blueprint) || !isObj(json.blueprint.paint)) return json;
  const bp = Object.assign({}, json.blueprint), paint = Object.create(null);
  for (const pid of Object.keys(bp.paint)) paint[pid] = unpackRle(bp.paint[pid], String(pid).slice(0, 12));
  bp.paint = paint;
  return Object.assign({}, json, { blueprint: bp });
}

/** @returns {Promise<{code:string, length:number, cls:string, tooLong:boolean}>} */
export async function encodeShare(type, data) {
  if (!TYPES.includes(type)) throw new ValidationError('Unknown share type ' + type);
  const json = JSON.stringify(type === 'arena' && data instanceof Arena ? data.toJSON() : type === 'soldier' ? packSoldier(data) : data);
  const raw = enc.encode(json);
  const packed = await deflateRaw(raw);
  const body = b64uEncode(packed);
  const code = `${MAGIC}.${type}.${body}.${crc32hex(packed)}`;
  return { code, length: code.length, cls: sizeClass(code.length), tooLong: code.length > MAX_CODE };
}

/** Parse + verify only (no schema). Returns {type, json}. Throws ValidationError with plain-English messages. */
export async function decodeShare(text, { maxLen = 400000, types = TYPES, maxInflate = 8 * 1024 * 1024 } = {}) {
  if (typeof text !== 'string') throw new ValidationError('That is not a code');
  const t = text.replace(/\s+/g, '');
  if (t.length > maxLen) throw new ValidationError(`That code is too long (${t.length.toLocaleString()} characters)`);
  const parts = t.split('.');
  if (parts.length !== 4) throw new ValidationError('That does not look like a VOXELWARS code (expected VW1.type.data.check)');
  if (parts[0] !== MAGIC) throw new ValidationError(`Unsupported code version '${parts[0].slice(0, 8)}'. It may come from a newer game version.`);
  const type = parts[1]; if (!types.includes(type)) throw new ValidationError(`Unknown code type '${type.slice(0, 12)}'`);
  let packed;
  try { packed = b64uDecode(parts[2]); } catch (e) { throw new ValidationError('The code is damaged (bad characters)'); }
  if (crc32hex(packed) !== parts[3].toLowerCase()) throw new ValidationError('The code is damaged (check value does not match). Was it cut off when copied?');
  let raw;
  try { raw = await inflateRaw(packed, maxInflate); } catch (e) { throw new ValidationError(String(e.message || '').startsWith('Payload') ? 'That code expands to something enormous; refusing to open it' : 'The code is damaged (cannot be unpacked)'); }
  let json;
  try { json = JSON.parse(dec.decode(raw)); } catch (e) { throw new ValidationError('The code unpacked, but its contents are not valid'); }
  return { type, json };
}

/** Full import: decode, verify, schema-validate. ctx supplies content knowledge (defs, abilities, validateBlueprint, propTypes). */
export async function importShare(text, expectType, ctx = {}) {
  const { type, json } = await decodeShare(text);
  if (expectType && type !== expectType) throw new ValidationError(`This code is for ${article(type)} ${type}, but you are importing ${article(expectType)} ${expectType}`);
  plain(json, 'Code data');
  if (type === 'arena') {
    try { const a = Arena.fromJSON(json); if (ctx.propTypes) for (const p of a.props) if (!ctx.propTypes.has(p.t)) throw new ValidationError(`Unknown prop '${String(p.t).slice(0, 24)}' (the code may come from a newer game version)`); return { type, value: a }; }
    catch (e) { if (e instanceof ValidationError) throw e; throw new ValidationError('The arena in this code is not valid: ' + e.message); }
  }
  if (type === 'soldier') return { type, value: validateSoldier(unpackSoldier(json), ctx) };
  return { type, value: validateArmy(json, ctx) };
}
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
