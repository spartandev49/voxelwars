// Doc: a small versioned key/value document over the Store (spec §11: vw.progress, vw.survival, vw.daily, vw.seen), plus the editor drafts.
//   const d = new Doc(store, 'progress', { version, defaults, migrate, validate });
//   d.get(key?, fallback?)  d.set(key, value)  d.remove(key)  d.all()  d.reset()  d.replaceAll(obj)  d.has(key)  d.onChange(fn) -> off  d.flush()
// - Values are JSON: every write is deep-cloned and sanitised (no functions, no NaN/Infinity, no `__proto__`/`constructor`/`prototype` keys, bounded depth/size),
//   every read returns a clone, so callers can never mutate the stored object by accident.
// - Loading migrates older versions (save/migrate.js) and backs the old blob up under `vw.bak.<name>.v<n>` once; a document written by a NEWER build is kept
//   untouched and the Doc turns read-only (`d.status === 'readonly'`) instead of overwriting it; a corrupt blob is backed up and replaced by the defaults.
// - Virtual keys (`d.alias(key, {get, set})`) let `progress.get('survivalBest')` read another document without duplicating state.
// Pure JS: the only browser access is inside save/store.js. A scheduler can be injected (tests); the default is setTimeout.
import { CURRENT, migrate } from './migrate.js';

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 12, MAX_KEYS = 4000, MAX_ARRAY = 5000, MAX_STR = 20000, MAX_BYTES = 1500000;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Deep-clone `v` into plain JSON data. Drops functions/undefined/forbidden keys, turns non-finite numbers into 0, bounds depth and size. Throws RangeError when too big. */
export function sanitize(v, depth = 0, budget = { n: 0 }) {
  if (depth > MAX_DEPTH) throw new RangeError('value is nested too deeply');
  if (++budget.n > 200000) throw new RangeError('value is too large');
  if (v === null || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') return v.length > MAX_STR ? v.slice(0, MAX_STR) : v;
  if (Array.isArray(v)) {
    if (v.length > MAX_ARRAY) throw new RangeError('list is too long');
    const out = []; for (let i = 0; i < v.length; i++) { const x = v[i]; out.push(x === undefined || typeof x === 'function' ? null : sanitize(x, depth + 1, budget)); } return out;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v); if (keys.length > MAX_KEYS) throw new RangeError('object has too many keys');
    const out = {};
    for (const k of keys) { if (FORBIDDEN.has(k)) continue; const x = v[k]; if (x === undefined || typeof x === 'function') continue; out[k] = sanitize(x, depth + 1, budget); }
    return out;
  }
  return null;
}
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const defaultSchedule = (fn, ms) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); };

export class Doc {
  /**
   * @param {object} store save/store.js Store (get/set/remove/getVersioned/getRaw/setRaw)
   * @param {string} name  document name = store key (progress|survival|daily|seen)
   * @param {{version?:number, defaults?:()=>object, validate?:(data:object)=>object, onSide?:(side:object)=>void, debounceMs?:number, schedule?:Function, now?:()=>number}} opts
   */
  constructor(store, name, opts = {}) {
    this.store = store; this.name = name; this.version = opts.version || CURRENT[name] || 1;
    this.defaults = opts.defaults || (() => ({})); this.validate = opts.validate || null; this.onSide = opts.onSide || null;
    this.debounceMs = opts.debounceMs || 0; this.schedule = opts.schedule || defaultSchedule; this.now = opts.now || (() => Date.now());
    this.status = 'ok'; this.info = { migrated: [], backup: null, error: null, from: this.version };
    this.listeners = []; this.aliases = Object.create(null); this._data = null; this._cancel = null; this._dirty = false;
  }

  // ------------------------------------------------------------------ loading
  _load() {
    if (this._data) return this._data;
    const env = this.store.getVersioned(this.name);
    const fresh = () => { const d = sanitize(this.defaults()); return d; };
    let data = null;
    if (!env) data = fresh();
    else {
      this.info.from = env.v;
      const r = migrate(this.name, env);
      if (r.future) { this.status = 'readonly'; this.info.error = `${this.name} was saved by a newer version of the game (v${r.v}); it is kept as is.`; data = isObj(r.data) ? this._safe(r.data) : fresh(); }
      else if (!r.ok) { this.info.error = r.error; this._backup(env.v, 'failed'); data = fresh(); }
      else {
        data = isObj(r.data) ? this._safe(r.data) : null;
        if (!data) { this.info.error = `${this.name} was not an object`; this._backup(env.v, 'corrupt'); data = fresh(); }
        else if (r.steps.length) {
          this.info.migrated = r.steps; this._backup(env.v, 'v' + env.v);
          this._data = data; this._persistNow();
          if (this.onSide && r.side && Object.keys(r.side).length) { try { this.onSide(r.side); } catch (e) { /* sibling merge is best effort */ } }
        }
      }
    }
    // missing top-level keys fall back to the defaults (a partial v2 blob stays usable)
    if (data) { const df = fresh(); for (const k of Object.keys(df)) if (data[k] === undefined) data[k] = df[k]; }
    this._data = data;
    return data;
  }
  _safe(d) { try { const o = sanitize(d); return this.validate ? this.validate(o) : o; } catch (e) { this.info.error = String(e && e.message); return null; } }
  _backup(v, tag) {
    try { const raw = this.store.getRaw(this.name); if (raw === null) return; const key = `bak.${this.name}.${tag}`; if (this.store.getRaw(key) === null) { this.store.setRaw(key, raw); this.info.backup = 'vw.' + key; } } catch (e) { /* backup is best effort */ }
  }
  /** Reload from storage (after an import wrote the raw keys). */
  reload() { this._data = null; this.status = 'ok'; this.info = { migrated: [], backup: null, error: null, from: this.version }; this._load(); this._emit('*', undefined); }

  // ------------------------------------------------------------------ reads
  /** key undefined -> a clone of the whole document. Missing key -> fallback (undefined by default). */
  get(key, fallback) {
    if (key === undefined) return clone(this._load());
    const a = this.aliases[key]; if (a) { const v = a.get(); return v === undefined ? fallback : v; }
    const d = this._load(); const v = Object.prototype.hasOwnProperty.call(d, key) ? d[key] : undefined;
    return v === undefined ? fallback : clone(v);
  }
  has(key) { const a = this.aliases[key]; if (a) return a.get() !== undefined; return Object.prototype.hasOwnProperty.call(this._load(), key); }
  all() { return clone(this._load()); }
  keys() { return Object.keys(this._load()); }
  /** A virtual key: reads/writes another place (e.g. progress 'survival' -> the survival document). */
  alias(key, handlers) { this.aliases[key] = handlers; return this; }

  // ------------------------------------------------------------------ writes
  _writable() { return this.status !== 'readonly'; }
  set(key, value) {
    if (typeof key !== 'string' || !key || FORBIDDEN.has(key)) return false;
    const a = this.aliases[key]; if (a) { if (!a.set) return false; a.set(value); this._emit(key, value); return true; }
    if (!this._writable()) return false;
    if (value === undefined) return this.remove(key);
    let v; try { v = sanitize(value); } catch (e) { this.info.error = String(e && e.message); return false; }
    const d = this._load(); d[key] = v;
    if (this.validate) { try { this._data = this.validate(d); } catch (e) { this.info.error = String(e && e.message); delete d[key]; return false; } }
    this._touch(); this._emit(key, v); return true;
  }
  remove(key) {
    if (!this._writable() || typeof key !== 'string') return false;
    const d = this._load(); if (!Object.prototype.hasOwnProperty.call(d, key)) return true;
    delete d[key]; this._touch(); this._emit(key, undefined); return true;
  }
  /** Replace the whole document (used by aliases and import). */
  replaceAll(obj) {
    if (!this._writable()) return false;
    let d; try { d = sanitize(isObj(obj) ? obj : {}); if (this.validate) d = this.validate(d); } catch (e) { this.info.error = String(e && e.message); return false; }
    const df = sanitize(this.defaults()); for (const k of Object.keys(df)) if (d[k] === undefined) d[k] = df[k];
    this._data = d; this._touch(); this._emit('*', undefined); return true;
  }
  /** Back to the defaults (Settings > Reset progress). Clears a read-only flag too: the player asked for a clean slate. */
  reset() { this.status = 'ok'; this._data = sanitize(this.defaults()); this._touch(true); this._emit('*', undefined); return true; }
  /** Fill keys that are missing or at their default (side effects of a sibling's migration). Never lowers a number. */
  mergeBetter(patch) {
    if (!this._writable() || !isObj(patch)) return false;
    const d = this._load(); let changed = false;
    for (const k of Object.keys(patch)) {
      if (FORBIDDEN.has(k)) continue; const cur = d[k], nv = patch[k];
      if (typeof nv === 'number') { if (!(typeof cur === 'number') || cur < nv) { d[k] = nv; changed = true; } }
      else if (typeof nv === 'string') { if (!cur || (typeof cur === 'string' && cur < nv)) { d[k] = nv; changed = true; } }
      else if (cur === undefined) { d[k] = sanitize(nv); changed = true; }
    }
    if (changed) { this._touch(); this._emit('*', undefined); }
    return changed;
  }

  // ------------------------------------------------------------------ persistence + events
  _touch(now) { this._dirty = true; if (now || !this.debounceMs) { this._persistNow(); return; } if (this._cancel) this._cancel(); this._cancel = this.schedule(() => { this._cancel = null; this._persistNow(); }, this.debounceMs); }
  _persistNow() {
    if (this._cancel) { this._cancel(); this._cancel = null; }
    if (!this._data) return true;
    let size = 0; try { size = JSON.stringify(this._data).length; } catch (e) { size = Infinity; }
    if (size > MAX_BYTES) { this.info.error = 'document too large to save'; return false; }
    const ok = this.store.set(this.name, this._data, this.version); this._dirty = false; return ok;
  }
  flush() { if (this._dirty || this._cancel) return this._persistNow(); return true; }
  onChange(fn) { this.listeners.push(fn); return () => { const i = this.listeners.indexOf(fn); if (i >= 0) this.listeners.splice(i, 1); }; }
  _emit(key, value) { for (const f of this.listeners.slice()) { try { f(key, value); } catch (e) { /* listener errors never break a save */ } } }
}

// ------------------------------------------------------------------ the standard documents
const PROGRESS_DEFAULTS = () => ({ stars: {}, achievements: {}, codex: { locked: [], seen: {} }, unlockedMutators: [], titles: [], parts: [] });
const SURVIVAL_DEFAULTS = () => ({ best: 0, bestWave: 0, board: [] });
const DAILY_DEFAULTS = () => ({ last: '', streak: 0, history: [] });
const SEEN_DEFAULTS = () => ({});

/**
 * The four documents wired together. `progress` exposes the siblings the UI reads through it:
 *   progress.get('survival') / set('survival', v)  ->  the survival document        progress.get('daily') / set('daily', v)  ->  the daily document
 *   progress.get('survivalBest')  ->  survival.best                                  progress.get('dailyLast')  ->  daily.last
 * Migrations that move a value into a sibling (progress v1 survivalBest/dailyLast) are merged into it when the sibling has nothing better.
 */
export function createDocs(store, o = {}) {
  const common = { debounceMs: o.debounceMs || 0, schedule: o.schedule, now: o.now };
  const docs = {};
  const side = (patch) => { for (const k of Object.keys(patch || {})) { const t = docs[k]; if (t) t.mergeBetter(patch[k]); } };
  docs.survival = new Doc(store, 'survival', Object.assign({ defaults: SURVIVAL_DEFAULTS, validate: validateSurvival }, common));
  docs.daily = new Doc(store, 'daily', Object.assign({ defaults: DAILY_DEFAULTS, validate: validateDaily }, common));
  docs.seen = new Doc(store, 'seen', Object.assign({ defaults: SEEN_DEFAULTS }, common));
  docs.progress = new Doc(store, 'progress', Object.assign({ defaults: PROGRESS_DEFAULTS, validate: validateProgress, onSide: side }, common));
  docs.progress.alias('survival', { get: () => docs.survival.all(), set: (v) => docs.survival.replaceAll(v) })
    .alias('daily', { get: () => docs.daily.all(), set: (v) => docs.daily.replaceAll(v) })
    .alias('survivalBest', { get: () => docs.survival.get('best', 0), set: (v) => docs.survival.set('best', Math.max(0, Math.floor(+v) || 0)) })
    .alias('dailyLast', { get: () => { const l = docs.daily.get('last', ''); return l || null; }, set: (v) => docs.daily.set('last', typeof v === 'string' ? v : '') });
  // siblings load lazily: a progress v1 blob must be migrated (and its side effects merged) as soon as anything is read
  docs.loadAll = () => { for (const n of ['survival', 'daily', 'seen', 'progress']) docs[n]._load(); return docs; };
  docs.flush = () => { for (const n of ['progress', 'survival', 'daily', 'seen']) docs[n].flush(); };
  docs.reloadAll = () => { for (const n of ['survival', 'daily', 'seen', 'progress']) docs[n].reload(); };
  return docs;
}

// light shape guards (the stored data is trusted less than code: a hand-edited or imported blob must not crash a screen)
function validateProgress(d) {
  if (!isObj(d.stars)) d.stars = {}; if (!isObj(d.achievements)) d.achievements = {};
  if (!isObj(d.codex)) d.codex = { locked: [], seen: {} }; else { if (!Array.isArray(d.codex.locked)) d.codex.locked = []; if (!isObj(d.codex.seen)) d.codex.seen = {}; }
  for (const k of ['unlockedMutators', 'titles', 'parts']) if (!Array.isArray(d[k])) d[k] = [];
  for (const k of Object.keys(d.stars)) { const n = Math.round(+d.stars[k]); d.stars[k] = n >= 0 && n <= 3 ? n : Math.max(0, Math.min(3, n || 0)); }
  return d;
}
function validateSurvival(d) {
  d.best = Math.max(0, Math.floor(+d.best) || 0); d.bestWave = Math.max(0, Math.floor(+d.bestWave) || 0);
  if (!Array.isArray(d.board)) d.board = []; d.board = d.board.filter(isObj).slice(0, 5);
  return d;
}
function validateDaily(d) {
  if (typeof d.last !== 'string') d.last = ''; d.streak = Math.max(0, Math.floor(+d.streak) || 0);
  if (!Array.isArray(d.history)) d.history = []; d.history = d.history.filter(isObj).slice(0, 14);
  return d;
}

// ------------------------------------------------------------------ editor drafts (vw.draft.<editor>)
export const DRAFT_EDITORS = ['arena', 'soldier', 'painter'];
const DRAFT_MAX = 1500000;
/** {load() -> data|null, save(data) -> bool, clear(), meta() -> {at}|null} over `vw.draft.<editor>`. Autosave every 20 s is the editor's job (spec/editors.md §0). */
export function createDraft(store, editor, now = () => Date.now()) {
  if (!DRAFT_EDITORS.includes(editor)) throw new Error('Unknown editor ' + String(editor).slice(0, 16));
  const key = 'draft.' + editor;
  return {
    key,
    load() { const o = store.get(key, null); return o && typeof o === 'object' && o.data !== undefined && o.data !== null ? clone(o.data) : null; },
    meta() { const o = store.get(key, null); return o && typeof o === 'object' && typeof o.at === 'number' ? { at: o.at } : null; },
    save(data) {
      let d; try { d = sanitize(data); } catch (e) { return false; }
      if (JSON.stringify(d).length > DRAFT_MAX) return false;
      return store.set(key, { at: now(), data: d });
    },
    clear() { store.remove(key); },
  };
}
