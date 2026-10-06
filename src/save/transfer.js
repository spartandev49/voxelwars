// Export all / Import all (Settings > Data, spec §11, verification P4): the whole device-local save as ONE compact share-style code.
//   const T = createTransfer({ store, docs, stats, settings, collections, defs?, build?, now? });
//   await T.exportAll()  -> 'VW1.save.<base64url(deflate-raw(JSON))>.<crc32>'   versioned (format + each document's own schema version), crc-checked, size-checked
//   await T.importAll(fileOrText) -> { ok, errors[], warnings[], applied[], counts }   NEVER throws; strict validation first, then an all-or-nothing apply
// Strictness: every document is migrated (save/migrate.js) and validated before the first byte is written; one problem anywhere rejects the whole import and
// nothing changes. The apply step snapshots the raw stored strings and rolls every key back if any write is refused (quota). Plain JSON text of the same
// payload is accepted too (hand-written fixtures). Pure JS (File/Blob inputs are read through their `.text()`), reuses save/validate.js and save/share.js.
import { decodeShare } from './share.js';
import { ValidationError, plain, arr, str, num, int } from './validate.js';
import { deflateRaw } from '../core/deflate.js';
import { b64uEncode } from '../core/base64url.js';
import { crc32hex } from '../core/crc32.js';
import { Store, DEFAULT_SETTINGS } from './store.js';
import { createDocs } from './docs.js';
import { migrate, CURRENT } from './migrate.js';
import { normalizeStats } from './stats.js';
import { validateSoldier, validateArmy } from './validate.js';
import { remapArmy } from './tombstones.js';
import { Arena } from '../world/arena.js';

export const SAVE_FORMAT = 1;
export const SAVE_TYPE = 'save';
export const MAX_SAVE_CODE = 6000000;        // characters; localStorage holds ~5 MB, so a bigger code cannot have come from (or fit into) a real save
const MAX_INFLATE = 24 * 1024 * 1024;
const MAX_ITEM_BYTES = 600000;
export const COLLECTION_CAPS = { arenas: 48, soldiers: 24, armies: 24 };
/** Everything an export carries, in write order. Drafts (vw.draft.*) and the Safe-mode flag are scratch state and are not exported. */
export const EXPORT_KEYS = ['settings', 'progress', 'survival', 'daily', 'seen', 'stats', 'arenas', 'soldiers', 'armies'];
const enc = new TextEncoder();

// ------------------------------------------------------------------ strict structure checks
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
function checkTree(v, label, depth = 0, budget = { n: 0 }) {
  if (depth > 16) throw new ValidationError(`${label} is nested too deeply`);
  if (++budget.n > 2000000) throw new ValidationError(`${label} is too large`);
  if (v === null || typeof v === 'boolean') return;
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new ValidationError(`${label} contains a number that is not valid`); return; }
  if (typeof v === 'string') { if (v.length > 70000) throw new ValidationError(`${label} contains text that is too long`); return; }
  if (Array.isArray(v)) { if (v.length > 200000) throw new ValidationError(`${label} contains a list that is too long`); for (let i = 0; i < v.length; i++) checkTree(v[i], label, depth + 1, budget); return; }
  if (typeof v === 'object') {
    for (const k of Object.keys(v)) { if (FORBIDDEN.has(k)) throw new ValidationError(`${label} contains a forbidden key`); checkTree(v[k], label, depth + 1, budget); }
    return;
  }
  throw new ValidationError(`${label} contains something that is not data`);
}
const ID = /^[A-Za-z0-9_\-:.]{1,64}$/;
const ENUMS = { quality: ['potato', 'papyrus', 'marble', 'olympian'], gore: ['red', 'wine', 'confetti', 'off'], corpses: ['stay', 'fade', 'none'], palette: ['classic', 'cvd', 'contrast'] };
const RANGES = { resScale: [0.5, 1], camSens: [0.1, 5], shake: [0, 1], uiScale: [0.8, 1.3] };

/** Settings: known keys only, right types, clamped numbers. Unknown keys (from a newer build) are reported as warnings and dropped. */
export function validateSettingsData(d, warn = () => {}) {
  plain(d, 'Settings');
  const out = {};
  for (const k of Object.keys(d)) {
    const def = DEFAULT_SETTINGS[k], v = d[k];
    if (def === undefined) {   // a setting this build does not list (announcerVoice, a newer build's key): keep plain values, drop anything structured
      if (/^[A-Za-z][A-Za-z0-9_.]{0,32}$/.test(k) && (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= 80))) out[k] = typeof v === 'string' ? str(v, 80, 'setting ' + k) : v;
      else warn(`Ignored unknown setting '${k.slice(0, 24)}'`);
      continue;
    }
    if (k === 'vol') { plain(v, 'volume settings'); out.vol = {}; for (const b of Object.keys(DEFAULT_SETTINGS.vol)) out.vol[b] = num(v[b], 0, 1, 'volume ' + b, DEFAULT_SETTINGS.vol[b]); continue; }
    if (k === 'keys') { plain(v, 'key bindings'); const ks = Object.keys(v); if (ks.length > 80) throw new ValidationError('Too many key bindings'); out.keys = {}; for (const a of ks) out.keys[str(a, 32, 'key action')] = str(v[a], 24, 'key code'); continue; }
    if (k === 'seenHints') { plain(v, 'hints'); const ks = Object.keys(v); if (ks.length > 200) throw new ValidationError('Too many hints'); out.seenHints = {}; for (const a of ks) { if (!/^[A-Za-z0-9_]{1,40}$/.test(a)) continue; const x = v[a]; if (x === true || (typeof x === 'number' && Number.isFinite(x))) out.seenHints[a] = x; } continue; }
    if (typeof def === 'boolean') { if (typeof v !== 'boolean') throw new ValidationError(`Setting '${k}' must be on or off`); out[k] = v; continue; }
    if (typeof def === 'number') { const r = RANGES[k] || [-1e6, 1e6]; out[k] = num(v, r[0], r[1], 'setting ' + k); continue; }
    if (typeof def === 'string') { const s = str(v, 40, 'setting ' + k); if (ENUMS[k] && !ENUMS[k].includes(s)) throw new ValidationError(`Setting '${k}' has an unknown value '${s.slice(0, 16)}'`); out[k] = s; continue; }
    if (def && typeof def === 'object') { plain(v, 'setting ' + k); checkTree(v, 'setting ' + k); out[k] = JSON.parse(JSON.stringify(v)); continue; }
  }
  return out;
}

// ------------------------------------------------------------------ the transfer object
export function createTransfer(o) {
  const { store, docs, stats, settings, collections = {} } = o;
  const now = o.now || (() => Date.now());
  const warnList = [];

  function collect() {
    if (docs && docs.flush) docs.flush();
    if (stats && stats.flush) stats.flush();
    if (settings && settings.flush) settings.flush();
    const keys = {};
    for (const k of EXPORT_KEYS) { const env = store.getVersioned(k); if (env) keys[k] = { v: env.v, data: env.data }; }
    return keys;
  }

  async function exportAll() {
    const payload = { f: SAVE_FORMAT, app: 'voxelwars', build: String(o.build || 'dev').slice(0, 40), at: now(), keys: collect() };
    const json = JSON.stringify(payload);
    if (json.length > MAX_SAVE_CODE * 3) throw new Error(`Your save is too big to export (${json.length.toLocaleString('en-US')} characters of data). Delete some arenas or soldiers and try again.`);
    const packed = await deflateRaw(enc.encode(json));
    const code = `VW1.${SAVE_TYPE}.${b64uEncode(packed)}.${crc32hex(packed)}`;
    if (code.length > MAX_SAVE_CODE) throw new Error(`Your save is too big to export as one code (${code.length.toLocaleString('en-US')} characters, the limit is ${MAX_SAVE_CODE.toLocaleString('en-US')}). Delete some arenas or soldiers and try again.`);
    return code;
  }

  async function readInput(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input === 'object') {
      if (typeof input.size === 'number' && input.size > MAX_SAVE_CODE * 1.2) throw new ValidationError('That file is too large to be a VOXELWARS save');
      if (typeof input.text === 'function') return await input.text();
      if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) { if (input.byteLength > MAX_SAVE_CODE * 1.2) throw new ValidationError('That file is too large to be a VOXELWARS save'); return new TextDecoder('utf-8', { fatal: false }).decode(input); }
    }
    throw new ValidationError('Choose a VOXELWARS save file or paste its text');
  }

  /** text -> payload object (framing + crc + inflate + JSON parse); throws ValidationError. */
  async function parse(text) {
    const t = String(text).trim();
    if (!t) throw new ValidationError('There is nothing to import: the text is empty');
    if (t.length > MAX_SAVE_CODE * 1.2) throw new ValidationError('That text is too long to be a VOXELWARS save');
    if (t[0] === '{') { try { return JSON.parse(t); } catch (e) { throw new ValidationError('That looks like JSON, but it is damaged'); } }
    const { json } = await decodeShare(t, { maxLen: MAX_SAVE_CODE * 1.2, types: [SAVE_TYPE], maxInflate: MAX_INFLATE });
    return json;
  }

  function validateCollection(name, data, ctx) {
    arr(data, COLLECTION_CAPS[name], name);
    const seen = new Set(); const out = [];
    data.forEach((item, i) => {
      const label = `${name} #${i + 1}`;
      plain(item, label); checkTree(item, label);
      const id = str(item.id, 64, label + ' id'); if (!id || !ID.test(id)) throw new ValidationError(`${label} has no valid id`);
      if (seen.has(id)) throw new ValidationError(`${label} repeats the id '${id.slice(0, 20)}'`); seen.add(id);
      if (JSON.stringify(item).length > MAX_ITEM_BYTES) throw new ValidationError(`${label} is too large (${Math.round(JSON.stringify(item).length / 1000)} KB)`);
      let x = item;
      if (name === 'arenas') {
        const a = isArenaJson(item) ? item : isArenaJson(item.data) ? item.data : isArenaJson(item.arena) ? item.arena : null;
        if (a) { try { Arena.fromJSON(a); } catch (e) { throw new ValidationError(`${label} ('${String(item.name || id).slice(0, 24)}') is not a valid arena: ${e.message}`); } }
      } else if (name === 'soldiers') {
        if (item.blueprint && item.stats) { try { validateSoldier(item, { abilities: ctx.abilities }); } catch (e) { throw new ValidationError(`${label} ('${String(item.name || id).slice(0, 24)}') is not a valid soldier: ${e.message}`); } }
      } else if (name === 'armies') {
        const recs = Array.isArray(item.records) ? item : (item.army && Array.isArray(item.army.records) ? item.army : null);
        if (recs) {
          let army = recs; if (ctx.defs) army = remapArmy(recs, ctx.defs).army;
          try { validateArmy(army, ctx.defs ? { defs: ctx.defs } : {}); } catch (e) { throw new ValidationError(`${label} ('${String(item.name || id).slice(0, 24)}') is not a valid army: ${e.message}`); }
          x = recs === item ? Object.assign({}, item, { records: army.records }) : Object.assign({}, item, { army: Object.assign({}, item.army, { records: army.records }) });
        }
      }
      out.push(x);
    });
    return out;
  }
  const isArenaJson = (a) => !!a && typeof a === 'object' && !Array.isArray(a) && a.size !== undefined && a.h !== undefined && a.props !== undefined;

  /** Validate every part; returns { writes: [{key, env}], counts, warnings } or throws ValidationError (nothing has been written). */
  function stage(payload) {
    const warnings = [];
    plain(payload, 'The save file');
    if (payload.f === undefined || payload.f === null) throw new ValidationError('That is not a VOXELWARS save (no format marker)');
    const f = int(payload.f, 0, 1e6, 'format');
    if (f > SAVE_FORMAT) throw new ValidationError(`This save was made by a newer version of the game (format ${f}). Update the game and try again.`);
    if (f < 1) throw new ValidationError('That is not a VOXELWARS save');
    if (payload.app !== undefined && payload.app !== 'voxelwars') throw new ValidationError('That save belongs to a different game');
    plain(payload.keys, 'The save contents');
    const names = Object.keys(payload.keys);
    if (!names.length) throw new ValidationError('That save is empty');
    for (const n of names) if (!EXPORT_KEYS.includes(n)) throw new ValidationError(`The save contains a part this game does not know ('${n.slice(0, 20)}')`);
    const writes = []; const counts = {}; const sides = {};
    const scratch = new Store(null); const sdocs = createDocs(scratch);
    for (const name of EXPORT_KEYS) {
      if (!(name in payload.keys)) continue;
      const env = payload.keys[name];
      plain(env, name); if (!('data' in env)) throw new ValidationError(`${name} has no data`);
      const v = int(env.v, 1, 1000, name + ' version');
      checkTree(env.data, name);
      if (name === 'settings') { writes.push({ key: name, env: { v: 1, data: validateSettingsData(env.data, (m) => warnings.push(m)) } }); counts[name] = Object.keys(env.data).length; continue; }
      if (name === 'stats') { plain(env.data, 'stats'); writes.push({ key: name, env: { v: CURRENT.stats, data: Object.assign({ v: 1 }, normalizeStats(env.data)) } }); counts[name] = Object.keys(env.data).length; continue; }
      if (name in COLLECTION_CAPS) { const list = validateCollection(name, env.data, { defs: o.defs, abilities: o.abilities }); writes.push({ key: name, env: { v, data: list } }); counts[name] = list.length; continue; }
      // versioned documents: migrate, then load through the real Doc (defaults + shape guards) in a scratch store
      const r = migrate(name, { v, data: env.data });
      if (!r.ok) throw new ValidationError(r.error);
      if (r.future) throw new ValidationError(`${name} was saved by a newer version of the game (v${r.v}). Update the game and try again.`);
      plain(r.data, name);
      const d = sdocs[name]; d.replaceAll(r.data);
      if (d.info.error) throw new ValidationError(`${name} is not valid: ${d.info.error}`);
      writes.push({ key: name, env: { v: d.version, data: d.all() } }); counts[name] = Object.keys(d.all()).length;
      for (const k of Object.keys(r.side || {})) sides[k] = Object.assign(sides[k] || {}, r.side[k]);
    }
    // values a migration moved into a sibling document: merged into the staged sibling, or into the live one after the apply when the save has none
    const late = {};
    for (const k of Object.keys(sides)) {
      const w = writes.find((x) => x.key === k);
      if (w && sdocs[k]) { sdocs[k].mergeBetter(sides[k]); w.env.data = sdocs[k].all(); } else { late[k] = sides[k]; warnings.push(`Merged ${Object.keys(sides[k]).join(', ')} into ${k}`); }
    }
    return { writes, counts, warnings, late };
  }

  /** Snapshot -> write all -> verify; roll everything back when a write is refused. Returns an error string or null. */
  function apply(writes) {
    const before = writes.map((w) => [w.key, store.getRaw(w.key)]);
    const rollback = () => { for (const [k, raw] of before) { try { store.setRaw(k, raw); } catch (e) { /* best effort */ } } };
    try {
      for (const w of writes) {
        const raw = JSON.stringify(w.env);
        const ok = store.setRaw(w.key, raw);
        if (ok === false && store.status() === 'full') { rollback(); return 'There is not enough storage space for that save. Nothing was changed.'; }
        if (store.getRaw(w.key) !== raw) { rollback(); return 'The browser would not store that save. Nothing was changed.'; }
      }
    } catch (e) { rollback(); return 'Saving failed (' + String(e && e.message).slice(0, 80) + '). Nothing was changed.'; }
    return null;
  }

  async function importAll(input) {
    const res = { ok: false, errors: [], warnings: [], applied: [], counts: {} };
    try {
      const text = await readInput(input);
      const payload = await parse(text);
      const st = stage(payload);
      res.warnings = st.warnings;
      const err = apply(st.writes);
      if (err) { res.errors.push(err); return res; }
      // live objects pick the new data up
      try {
        if (docs && docs.reloadAll) docs.reloadAll();
        const s = st.writes.find((w) => w.key === 'stats'); if (s && stats && stats.load) stats.load(s.env.data);
        if (docs) for (const k of Object.keys(st.late || {})) if (docs[k] && docs[k].mergeBetter) docs[k].mergeBetter(st.late[k]);
        const se = st.writes.find((w) => w.key === 'settings');
        if (se && settings && settings.set) for (const k of Object.keys(se.env.data)) settings.set(k, se.env.data[k]);
      } catch (e) { res.warnings.push('Imported, but some screens may need a reload to show it'); }
      res.ok = true; res.applied = st.writes.map((w) => w.key); res.counts = st.counts;
      return res;
    } catch (e) {
      res.errors.push(e instanceof ValidationError ? e.message : 'That could not be imported (' + String(e && e.message || e).slice(0, 80) + ')');
      return res;
    }
  }

  return { exportAll, importAll, EXPORT_KEYS };
}
