// Prop palette thumbnails: a small software render of each catalog model (cabinet projection of its voxel grid with top / side shading),
// built one prop per idle slice and cached. No WebGL, no extra context: it only reads the pure model builders (content/.../props/models).

import { buildProp, hasPropModel } from '../../content/era_ancient/props/models/index.js';

const SHIFT_X = 0.42, SHIFT_Y = 0.26;

/** Render a prop model to a canvas of at most `size` px on its long side. */
export function renderPropThumb(type, size = 64, variant = 0) {
  const model = buildProp(type, 0, variant), part = model.parts[0], g = part.grid;
  const { sx, sy, sz } = g;
  const W = Math.ceil(sx + SHIFT_X * sz) + 2, H = Math.ceil(sy + SHIFT_Y * sz) + 2;
  const buf = new Uint32Array(W * H);
  const solid = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz && g.d[x + sx * (z + sz * y)] !== 0;
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) {
    const v = g.d[x + sx * (z + sz * y)]; if (!v) continue;
    let r = (v >> 16) & 255, gg = (v >> 8) & 255, b = v & 255;
    const top = !solid(x, y + 1, z), right = !solid(x + 1, y, z), front = !solid(x, y, z + 1);
    let f = 0.82;
    if (top) f = 1.12; else if (front) f = 1.0; else if (right) f = 0.9;
    if (((v >>> 24) & 4) !== 0) f = 1.25;
    r = Math.min(255, r * f); gg = Math.min(255, gg * f); b = Math.min(255, b * f);
    const px = Math.floor(x + SHIFT_X * z) + 1, py = H - 2 - Math.floor(y + SHIFT_Y * z);
    const c = (255 << 24) | (b << 16) | (gg << 8) | r;
    buf[px + py * W] = c >>> 0;
    if (px + 1 < W) buf[px + 1 + py * W] = buf[px + 1 + py * W] || (c >>> 0);        // fill the cabinet shear gaps
    if (py > 0 && buf[px + (py - 1) * W] === 0) buf[px + (py - 1) * W] = c >>> 0;
  }
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sg = src.getContext('2d'), img = sg.createImageData(W, H); new Uint32Array(img.data.buffer).set(buf); sg.putImageData(img, 0, 0);
  const k = Math.min(size / W, size / H), w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
  const out = document.createElement('canvas'); out.width = size; out.height = size;
  const og = out.getContext('2d'); og.imageSmoothingEnabled = true; og.imageSmoothingQuality = 'high';
  og.drawImage(src, 0, 0, W, H, Math.round((size - w) / 2), size - h - 2, w, h);
  return out;
}

/** Lazy thumbnail cache. get(type) returns a canvas once built (null before); onReady fires per built type. */
export class PropThumbs {
  constructor(size = 64) { this.size = size; this.cache = new Map(); this.queue = []; this.busy = false; this.listeners = new Set(); this.dead = false; }
  get(type) {
    if (this.cache.has(type)) return this.cache.get(type);
    if (!this.queue.includes(type) && hasPropModel(type)) { this.queue.push(type); this._pump(); }
    return null;
  }
  /** Queue many types (the visible palette) so they build in order. */
  prefetch(types) { for (const t of types) if (!this.cache.has(t) && !this.queue.includes(t) && hasPropModel(t)) this.queue.push(t); this._pump(); }
  onReady(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _pump() {
    if (this.busy || this.dead || !this.queue.length) return;
    this.busy = true;
    const run = () => {
      if (this.dead) return;
      const t = this.queue.shift();
      try { const c = renderPropThumb(t, this.size); this.cache.set(t, c); for (const f of this.listeners) f(t, c); } catch (e) { this.cache.set(t, null); }
      this.busy = false; if (this.queue.length) setTimeout(() => this._pump(), 4);
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 120 }); else setTimeout(run, 8);
  }
  dispose() { this.dead = true; this.queue.length = 0; this.listeners.clear(); this.cache.clear(); }
}
