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

/** @returns {Promise<{code:string, length:number, cls:string, tooLong:boolean}>} */
export async function encodeShare(type, data) {
  if (!TYPES.includes(type)) throw new ValidationError('Unknown share type ' + type);
  const json = JSON.stringify(type === 'arena' && data instanceof Arena ? data.toJSON() : data);
  const raw = enc.encode(json);
  const packed = await deflateRaw(raw);
  const body = b64uEncode(packed);
  const code = `${MAGIC}.${type}.${body}.${crc32hex(packed)}`;
  return { code, length: code.length, cls: sizeClass(code.length), tooLong: code.length > MAX_CODE };
}

/** Parse + verify only (no schema). Returns {type, json}. Throws ValidationError with plain-English messages. */
export async function decodeShare(text, { maxLen = 400000 } = {}) {
  if (typeof text !== 'string') throw new ValidationError('That is not a code');
  const t = text.replace(/\s+/g, '');
  if (t.length > maxLen) throw new ValidationError(`That code is too long (${t.length.toLocaleString()} characters)`);
  const parts = t.split('.');
  if (parts.length !== 4) throw new ValidationError('That does not look like a VOXELWARS code (expected VW1.type.data.check)');
  if (parts[0] !== MAGIC) throw new ValidationError(`Unsupported code version '${parts[0].slice(0, 8)}'. It may come from a newer game version.`);
  const type = parts[1]; if (!TYPES.includes(type)) throw new ValidationError(`Unknown code type '${type.slice(0, 12)}'`);
  let packed;
  try { packed = b64uDecode(parts[2]); } catch (e) { throw new ValidationError('The code is damaged (bad characters)'); }
  if (crc32hex(packed) !== parts[3].toLowerCase()) throw new ValidationError('The code is damaged (check value does not match). Was it cut off when copied?');
  let raw;
  try { raw = await inflateRaw(packed, 8 * 1024 * 1024); } catch (e) { throw new ValidationError(String(e.message || '').startsWith('Payload') ? 'That code expands to something enormous; refusing to open it' : 'The code is damaged (cannot be unpacked)'); }
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
  if (type === 'soldier') return { type, value: validateSoldier(json, ctx) };
  return { type, value: validateArmy(json, ctx) };
}
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
