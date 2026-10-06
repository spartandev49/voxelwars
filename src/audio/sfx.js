// SFX bank: decodes embedded core assets (atob -> decodeAudioData, no fetch), lazily fetches + decodes the rest by group under a
// per-tier decoded-PCM ceiling (LRU eviction), retries once, falls back to synth.js (flagged), and serves variants through a
// per-slot shuffle bag. All environment access (decode / fetch / buffer factory / clock) is injected so Node tests can drive it.
import { ShuffleBag, mulberry32 } from './util.js';
import { groupOf, GROUP_ORDER, pcmCeiling } from './manifest.js';
import { renderSynth, RECIPES, SYNTH_SR, LOOP_FAMILIES } from './synth.js';
import { CUES } from './cues.js';

const SYNTH_VARIANTS = 3;
export const bufBytes = (b) => (b ? b.length * b.numberOfChannels * 4 : 0);

function b64ToBuf(b64) {
  const s = (typeof atob === 'function' ? atob : (x) => Buffer.from(x, 'base64').toString('binary'))(b64.replace(/^data:[^,]*,/, ''));
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u.buffer;
}

export class SfxBank {
  /**
   * @param {object} o {catalog, decode(ab)->Promise<AudioBuffer>, makeBuffer(Float32Array, sr)->AudioBuffer, fetch?, core?:{id:base64},
   *   quality?:()=>tier, rng?, yieldFn?, sleep?(ms), urlOf?(entry), concurrency?}
   */
  constructor(o) {
    this.catalog = o.catalog; this.decode = o.decode; this.makeBuffer = o.makeBuffer; this.fetchFn = o.fetch || null;
    this.core = o.core || {}; this.quality = o.quality || (() => 'marble'); this.rng = o.rng || mulberry32(0xa11d10);
    this.yieldFn = o.yieldFn || (() => new Promise((r) => setTimeout(r, 0)));
    this.sleep = o.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.concurrency = o.concurrency || 3;
    this.assets = new Map();            // id -> {e, state:'idle'|'queued'|'loading'|'ready'|'failed', buf, path, bytes, last, err}
    this.slots = new Map();             // "fam#layer" -> {entries, bag, readyKey}
    this.synthBufs = new Map();         // fam -> AudioBuffer[]
    this.synthBags = new Map();
    this.synthUsed = new Set();         // families that have been served from synth
    this.queue = []; this.active = 0; this.decodeChain = Promise.resolve();
    this.decodedBytes = 0; this.evictions = 0; this.budgetSkips = 0; this.tick = 0;
    this.listeners = [];
    this.coreDone = false;
    for (const e of this.catalog.sfx) this.assets.set(e.id, { e, state: 'idle', buf: null, path: '', bytes: 0, last: 0, err: '' });
  }
  onChange(fn) { this.listeners.push(fn); }
  _emit() { for (const f of this.listeners) { try { f(); } catch (e) { /* listener errors never break loading */ } } }
  get ceiling() { return pcmCeiling(this.quality()); }

  // ---------------------------------------------------------------- resolution
  /** entries for a family slot: layer -1 = the family's own picks, >=0 = layer index (layers referencing another family use its picks) */
  slot(fam, layer = -1) {
    const key = fam + '#' + layer;
    let s = this.slots.get(key); if (s) return s;
    const def = CUES[fam]; let picks = def ? def.pick : [];
    if (def && layer >= 0 && def.layers) { const ly = def.layers[layer]; picks = ly.pick || (ly.cue && CUES[ly.cue] ? CUES[ly.cue].pick : []); }
    // `picks` is a union of selectors, or a list of groups tried in order (preferred family-specific assets, then generic fallbacks)
    const groups = picks.length && Array.isArray(picks[0]) ? picks : [picks];
    let entries = [];
    for (const g of groups) { if (!g.length) continue; entries = this.catalog.select(g, 'sfx'); if (entries.length) break; }
    s = { key, entries, bag: new ShuffleBag([], this.rng), readyKey: '' };
    this.slots.set(key, s);
    return s;
  }
  /** Resolve a family: {real:[entry ids], synth:boolean} (used by tests and the coverage doc) */
  resolve(fam) {
    const def = CUES[fam]; if (!def) return null;
    const ids = new Set(); const layers = def.layers && def.layers.length ? def.layers.map((_, i) => i) : [-1];
    for (const li of layers) for (const e of this.slot(fam, li).entries) ids.add(e.id);
    if (!ids.size) for (const e of this.slot(fam, -1).entries) ids.add(e.id);
    return { real: [...ids], synth: !!RECIPES[fam] && ids.size === 0 };
  }

  // ---------------------------------------------------------------- picking
  /**
   * Choose a decoded buffer for (family, layer). Returns {buf, src:'embedded'|'fetched'|'synth', id, entry?} or null when the
   * real assets are still loading (the caller drops the sound; UI cues use synth meanwhile).
   */
  pick(fam, layer = -1, pendingSynth = false) {
    const s = this.slot(fam, layer);
    const es = s.entries;
    if (es.length) {
      const ready = [];
      for (let i = 0; i < es.length; i++) { const a = this.assets.get(es[i].id); if (a && a.state === 'ready') ready.push(a); }
      if (ready.length) {
        const key = ready.length + ':' + ready[ready.length - 1].e.id;
        if (s.readyKey !== key) { s.readyKey = key; s.bag.setItems(ready); }
        const a = s.bag.next(); a.last = ++this.tick;
        if (ready.length < Math.min(3, es.length)) this.ensure(fam, layer);     // top up variants in the background
        return { buf: a.buf, src: a.path, id: a.e.id, entry: a.e };
      }
      let pending = false;
      for (let i = 0; i < es.length; i++) { const a = this.assets.get(es[i].id); if (a && (a.state === 'idle' || a.state === 'queued' || a.state === 'loading')) { pending = true; break; } }
      if (pending) { this.ensure(fam, layer); if (!pendingSynth) return null; }
    }
    // no real asset (none in the manifest, all failed, or UI cue still loading): synth
    return this._synth(fam);
  }
  _synth(fam) {
    if (!RECIPES[fam]) return null;
    let bufs = this.synthBufs.get(fam);
    if (!bufs) { bufs = []; this.synthBufs.set(fam, bufs); this.synthBags.set(fam, new ShuffleBag([0, 1, 2], this.rng)); }
    const v = this.synthBags.get(fam).next();
    if (!bufs[v]) {
      const data = renderSynth(fam, v, SYNTH_SR); if (!data) return null;
      bufs[v] = this.makeBuffer(data, SYNTH_SR);
    }
    this.synthUsed.add(fam);
    return { buf: bufs[v], src: 'synth', id: 'synth:' + fam + ':' + v, loop: LOOP_FAMILIES.has(fam) };
  }

  // ---------------------------------------------------------------- loading
  /** queue the assets of a family slot with top priority */
  ensure(fam, layer = -1) { for (const e of this.slot(fam, layer).entries) this._enqueue(e.id, 0); this._pump(); }
  /** queue every asset in the given groups (ui, combat, voice, siege, misc) at group priority */
  warm(groups) {
    for (const g of groups) { const pr = 1 + GROUP_ORDER.indexOf(g); for (const a of this.assets.values()) if (groupOf(a.e) === g) this._enqueue(a.e.id, pr); }
    this._pump();
  }
  _enqueue(id, pr) {
    const a = this.assets.get(id); if (!a) return;
    if (a.state === 'idle') { a.state = 'queued'; this.queue.push({ id, pr }); }
    else if (a.state === 'queued') { const q = this.queue.find((x) => x.id === id); if (q && pr < q.pr) q.pr = pr; }
    else return;
    this.queue.sort((x, y) => x.pr - y.pr);
  }
  _pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const q = this.queue.shift(); const a = this.assets.get(q.id);
      if (!a || a.state !== 'queued') continue;
      a.state = 'loading'; this.active++;
      this._load(a).catch((e) => { a.state = 'failed'; a.err = String(e && e.message || e); }).then(() => { this.active--; this._emit(); this._pump(); });
    }
  }
  async _load(a) {
    let ab = null;
    const embedded = this.core[a.e.id];
    if (embedded) { try { ab = b64ToBuf(embedded); a.path = 'embedded'; } catch (e) { ab = null; } }
    if (!ab) {
      if (!this.fetchFn) throw new Error('no fetch');
      for (let attempt = 0; attempt < 2 && !ab; attempt++) {
        try {
          const r = await this.fetchFn(a.e.url);
          if (!r.ok) throw new Error('http ' + r.status);
          ab = await r.arrayBuffer(); a.path = 'fetched';
        } catch (err) { a.err = String(err && err.message || err); if (attempt === 0) await this.sleep(350); }
      }
      if (!ab) { a.state = 'failed'; return; }
    }
    await this._decode(a, ab);
  }
  _decode(a, ab) {
    // decode strictly one at a time with a yield between jobs, so the main thread stays responsive during large batches
    const job = this.decodeChain.then(async () => {
      await this.yieldFn();
      let buf;
      try { buf = await this.decode(ab); } catch (e) { a.state = 'failed'; a.err = 'decode: ' + String(e && e.message || e); return; }
      const bytes = bufBytes(buf);
      if (!this._reserve(bytes, a)) { a.state = 'idle'; a.err = 'budget'; this.budgetSkips++; return; }
      a.buf = buf; a.bytes = bytes; a.state = 'ready'; a.last = ++this.tick; this.decodedBytes += bytes;
    });
    this.decodeChain = job.catch(() => {});
    return job;
  }
  /** make room for `bytes` under the tier ceiling by evicting least-recently-used non-core assets */
  _reserve(bytes, exceptAsset) {
    const cap = this.ceiling;
    if (this.decodedBytes + bytes <= cap) return true;
    const cand = [];
    for (const x of this.assets.values()) if (x.state === 'ready' && x !== exceptAsset && !this.core[x.e.id]) cand.push(x);
    cand.sort((p, q) => p.last - q.last);
    for (const x of cand) {
      this.decodedBytes -= x.bytes; x.buf = null; x.bytes = 0; x.state = 'idle'; this.evictions++;
      if (this.decodedBytes + bytes <= cap) return true;
    }
    return this.decodedBytes + bytes <= cap;
  }
  /** decode every embedded core asset (called before the first gesture, with an OfflineAudioContext decoder) */
  async loadCore() {
    const ids = this.catalog.sfx.filter((e) => this.core[e.id]).map((e) => e.id);
    const jobs = [];
    for (const id of ids) { const a = this.assets.get(id); if (a && a.state === 'idle') { a.state = 'loading'; jobs.push(this._load(a).catch((e) => { a.state = 'failed'; a.err = String(e && e.message || e); })); } }
    await Promise.all(jobs); this.coreDone = true; this._emit();
  }
  /** wait until nothing is queued or loading (tests, mix render) */
  async idle() { while (this.active > 0 || this.queue.length) await new Promise((r) => setTimeout(r, 5)); await this.decodeChain; }

  // ---------------------------------------------------------------- stats
  stats() {
    let embedded = 0, fetched = 0, failed = 0, ready = 0, loading = 0, idle = 0;
    for (const a of this.assets.values()) {
      if (a.state === 'ready') { ready++; if (a.path === 'embedded') embedded++; else fetched++; }
      else if (a.state === 'failed') failed++;
      else if (a.state === 'loading' || a.state === 'queued') loading++;
      else idle++;
    }
    return { embedded, fetched, synth: this.synthUsed.size, failed, ready, loading, idle, total: this.assets.size, decodedBytes: this.decodedBytes, ceiling: this.ceiling, evictions: this.evictions, budgetSkips: this.budgetSkips };
  }
  /** per-asset load path for Diagnostics: {id: 'embedded'|'fetched'|'failed'|'pending'} plus families served by synth */
  paths() {
    const o = {};
    for (const a of this.assets.values()) { if (a.state === 'ready') o[a.e.id] = a.path; else if (a.state === 'failed') o[a.e.id] = 'failed'; }
    for (const f of this.synthUsed) o['synth:' + f] = 'synth';
    return o;
  }
  /** evict least-recently-used assets until decoded PCM fits the (possibly lowered) tier ceiling */
  enforce() { this._reserve(0, null); }
}
