// Small pure helpers shared by the audio modules (no browser APIs: runs in Node tests).
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const db2lin = (db) => Math.pow(10, db / 20);
export const lin2db = (x) => 20 * Math.log10(Math.max(x, 1e-9));
export const finite = (x, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/** Deterministic PRNG (mulberry32). Audio cosmetics only; never feeds the sim. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash -> uint32 (for per-id synth seeds). */
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/**
 * Shuffle bag: every item is served once per cycle in random order and the first item of a new cycle never equals the
 * last item of the previous one (no immediate repeats, also across refills and item-set changes).
 */
export class ShuffleBag {
  constructor(items, rng = Math.random) {
    this.rng = rng; this.items = []; this.bag = []; this.last = undefined; this.setItems(items || []);
  }
  setItems(items) {
    const same = items.length === this.items.length && items.every((v, i) => v === this.items[i]);
    if (same) return;
    this.items = items.slice();
    this.bag.length = 0;
  }
  _refill() {
    const b = this.bag; b.length = 0;
    for (let i = 0; i < this.items.length; i++) b.push(this.items[i]);
    for (let i = b.length - 1; i > 0; i--) { const j = (this.rng() * (i + 1)) | 0; const t = b[i]; b[i] = b[j]; b[j] = t; }
    // b is consumed from the end: make sure the next served item differs from the last one
    if (b.length > 1 && b[b.length - 1] === this.last) { const j = (this.rng() * (b.length - 1)) | 0; const t = b[b.length - 1]; b[b.length - 1] = b[j]; b[j] = t; }
  }
  next() {
    if (!this.items.length) return undefined;
    if (!this.bag.length) this._refill();
    // an item removed from the set since the last refill is skipped
    let v = this.bag.pop();
    while (v !== undefined && this.items.indexOf(v) < 0) v = this.bag.length ? this.bag.pop() : (this._refill(), this.bag.pop());
    if (v !== undefined && v === this.last && this.items.length > 1) { this._refill(); v = this.bag.pop(); }
    this.last = v;
    return v;
  }
}

/** Equal-power crossfade curves (Float32Array of n points): fade-in sin, fade-out cos. */
export function equalPowerCurve(n, out) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i / (n - 1); c[i] = out ? Math.cos(x * Math.PI * 0.5) : Math.sin(x * Math.PI * 0.5); }
  return c;
}

/** Cooperative yield to the event loop without the 4 ms setTimeout clamp (MessageChannel), falling back to setTimeout(0). */
export function makeYield() {
  if (typeof MessageChannel === 'function') {
    const ch = new MessageChannel(); const q = []; ch.port1.onmessage = () => { const r = q.shift(); if (r) r(); };
    if (ch.port1.unref) ch.port1.unref();
    return () => new Promise((res) => { q.push(res); ch.port2.postMessage(0); });
  }
  return () => new Promise((res) => setTimeout(res, 0));
}
export const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
