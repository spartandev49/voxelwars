// Persistence: localStorage with try/catch, in-memory fallback, per-key byte accounting and quota detection.
// All values are stored as {v, data} JSON under the 'vw.' prefix. Status: 'ok' | 'memory' (storage blocked) | 'full' (quota hit).
const PREFIX = 'vw.';
export class Store {
  constructor(backend) {
    this.mem = new Map(); this.backend = backend === undefined ? Store.detect() : backend; this._status = this.backend ? 'ok' : 'memory';
    this.listeners = [];
  }
  static detect() { try { const ls = window.localStorage; const k = '__vw_probe__'; ls.setItem(k, '1'); ls.removeItem(k); return ls; } catch (e) { return null; } }
  status() { return this._status; }
  onStatus(fn) { this.listeners.push(fn); }
  _set(status) { if (status !== this._status) { this._status = status; for (const f of this.listeners) f(status); } }
  get(key, fallback = null, version = 1) {
    const k = PREFIX + key;
    try {
      let raw = null;
      if (this.backend) raw = this.backend.getItem(k); else raw = this.mem.has(k) ? this.mem.get(k) : null;
      if (raw === null) return fallback;
      const o = JSON.parse(raw);
      if (!o || typeof o !== 'object' || !('data' in o)) return fallback;
      return o.data;
    } catch (e) { return fallback; }
  }
  set(key, data, version = 1) {
    const k = PREFIX + key; const raw = JSON.stringify({ v: version, data });
    this.mem.set(k, raw);
    if (!this.backend) { this._set('memory'); return false; }
    try { this.backend.setItem(k, raw); if (this._status === 'full') this._set('ok'); return true; }
    catch (e) { this._set(/quota/i.test(String(e && (e.name || e.message))) ? 'full' : 'memory'); return false; }
  }
  remove(key) { const k = PREFIX + key; this.mem.delete(k); try { if (this.backend) this.backend.removeItem(k); } catch (e) { /* ignore */ } }
  bytes() { let n = 0; try { const src = this.backend; if (src) { for (let i = 0; i < src.length; i++) { const k = src.key(i); if (k && k.startsWith(PREFIX)) n += k.length + (src.getItem(k) || '').length; } } else for (const [k, v] of this.mem) n += k.length + v.length; } catch (e) { /* ignore */ } return n * 2; }
  keys() { const out = []; try { if (this.backend) for (let i = 0; i < this.backend.length; i++) { const k = this.backend.key(i); if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length)); } else for (const k of this.mem.keys()) out.push(k.slice(PREFIX.length)); } catch (e) { /* ignore */ } return out; }
}

export const DEFAULT_SETTINGS = {
  quality: 'marble', autoScale: true, resScale: 1, shadows: true, bloom: true, clouds: true, fpsCounter: false,
  gore: 'red', corpses: 'stay', camSens: 1, edgeScroll: false, autoPauseBlur: true,
  vol: { master: 0.8, music: 0.6, sfx: 0.9, ui: 0.8, announcer: 0.9 }, muted: false, tts: false, subtitles: true,
  reduceMotion: false, shake: 1, flashLimiter: false, uiScale: 1, palette: 'classic', highContrastUI: false,
  keys: {}, beacon: true, seenHints: {}, cinematicStart: false,
};

export class Settings {
  constructor(store) { this.store = store; this.data = Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {}) || {}); this.data.vol = Object.assign({}, DEFAULT_SETTINGS.vol, this.data.vol || {}); this.fns = []; this._t = 0; }
  get(key) { return key.split('.').reduce((o, k) => (o ? o[k] : undefined), this.data); }
  set(key, value) {
    const parts = key.split('.'); let o = this.data; for (let i = 0; i < parts.length - 1; i++) { if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = value;
    clearTimeout(this._t); this._t = setTimeout(() => this.store.set('settings', this.data), 150);
    for (const f of this.fns) f(key, value);
  }
  all() { return this.data; }
  on(fn) { this.fns.push(fn); return () => { const i = this.fns.indexOf(fn); if (i >= 0) this.fns.splice(i, 1); }; }
  flush() { this.store.set('settings', this.data); }
}

/** Keyed collection (arenas, soldiers, armies): list/get/put/remove with a size cap. */
export class Collection {
  constructor(store, key, cap = 48) { this.store = store; this.key = key; this.cap = cap; }
  list() { return this.store.get(this.key, []) || []; }
  get(id) { return this.list().find((x) => x.id === id) || null; }
  put(item) { const l = this.list().filter((x) => x.id !== item.id); l.unshift(item); if (l.length > this.cap) l.length = this.cap; return this.store.set(this.key, l); }
  remove(id) { return this.store.set(this.key, this.list().filter((x) => x.id !== id)); }
}
