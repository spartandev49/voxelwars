// Arena: the battlefield as pure data (no rendering). Used by the sim, the terrain mesher, the editor and the tests.
//
// Space: x,z world units on the ground plane, y up. One terrain cell = CELL (0.5) world units square and the
// height quantum is HSTEP (0.5) world units, so terrain is made of true 0.5-unit cubes.
// An arena of `size` cells per side spans size*CELL world units, centred on the origin: x in [-W/2, W/2].

export const CELL = 0.5;
export const HSTEP = 0.5;
export const MAX_H = 120;           // max height steps (60 world units)
export const SIZES = { small: 128, medium: 192, large: 256 };

/** Terrain materials. top = [3 colour variants], strata = [subsurface colour, deep colour]. */
export const MATERIALS = [
  { id: 0, key: 'grass', name: 'Grass', top: [0x739a47, 0x6a9141, 0x7ea64f], strata: [0x7d5a38, 0x6e6a66], speed: 1.0, foot: 'grass', flammable: true },
  { id: 1, key: 'dirt', name: 'Dirt', top: [0x9b7448, 0x916b42, 0xa67f52], strata: [0x7c5430, 0x6e6a66], speed: 1.0, foot: 'dirt', flammable: false },
  { id: 2, key: 'sand', name: 'Sand', top: [0xe3c887, 0xdcc07e, 0xeacf92], strata: [0xd1b06a, 0xb89a62], speed: 0.88, foot: 'sand', flammable: false },
  { id: 3, key: 'stone', name: 'Stone', top: [0x8d8d92, 0x84848a, 0x97979c], strata: [0x77777c, 0x66666b], speed: 1.0, foot: 'stone', flammable: false },
  { id: 4, key: 'snow', name: 'Snow', top: [0xf2f6fb, 0xe6edf6, 0xfafcff], strata: [0xdfe8f2, 0x9aa3ad], speed: 0.82, foot: 'snow', flammable: false },
  { id: 5, key: 'mud', name: 'Mud', top: [0x5b4429, 0x523d25, 0x644b2d], strata: [0x4a3822, 0x5a5550], speed: 0.72, foot: 'mud', flammable: false },
  { id: 6, key: 'marble', name: 'Marble', top: [0xeeeae0, 0xe4dfd2, 0xf4f1e8], strata: [0xd6d1c4, 0xbdb8aa], speed: 1.05, foot: 'stone', flammable: false },
  { id: 7, key: 'lava', name: 'Lava', top: [0xff6a1a, 0xff8a2a, 0xe84e10], strata: [0x8c2a0a, 0x3a1a14], speed: 0.6, foot: 'stone', flammable: false, hazard: 'lava' },
  { id: 8, key: 'planks', name: 'Planks', top: [0xa9794a, 0x9d6e42, 0xb4834f], strata: [0x7e5532, 0x6a4628], speed: 1.05, foot: 'wood', flammable: true },
  { id: 9, key: 'brick', name: 'Brick', top: [0xb2603f, 0xa65838, 0xbc6a47], strata: [0x965034, 0x7a4430], speed: 1.0, foot: 'stone', flammable: false },
  { id: 10, key: 'cobble', name: 'Cobblestone', top: [0x9b9892, 0x8f8c86, 0xa5a29b], strata: [0x7d7a74, 0x6a6762], speed: 1.12, foot: 'stone', flammable: false },
  { id: 11, key: 'ash', name: 'Ash', top: [0x4a4546, 0x423e3f, 0x524c4d], strata: [0x363233, 0x2a2728], speed: 0.9, foot: 'dirt', flammable: false },
  { id: 12, key: 'sandstone', name: 'Sandstone', top: [0xd9a864, 0xcf9d5b, 0xe1b270], strata: [0xc08c4c, 0xa87a40], speed: 1.0, foot: 'stone', flammable: false },
  { id: 13, key: 'savanna', name: 'Dry Grass', top: [0xb3a44a, 0xa89a42, 0xbdae54], strata: [0x8a6a38, 0x6e6a66], speed: 1.0, foot: 'grass', flammable: true },
  { id: 14, key: 'moss', name: 'Mossy Stone', top: [0x5f7d4a, 0x57744a, 0x69874f], strata: [0x6a6e60, 0x585c52], speed: 0.95, foot: 'grass', flammable: false },
  { id: 15, key: 'blood', name: 'Crimson Sand', top: [0xb85a3c, 0xae5238, 0xc4644a], strata: [0x9a4a30, 0x7a3a28], speed: 0.9, foot: 'sand', flammable: false },
];
export const MAT = Object.fromEntries(MATERIALS.map((m) => [m.key, m.id]));

export const WEATHERS = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'sandstorm', 'fog'];

const OBJECTIVES = ['eliminate', 'kill_general', 'hold_hill', 'protect_vip', 'destroy'];

export class Arena {
  constructor(size = 128) {
    this.size = size | 0;
    this.v = 1;
    this.name = 'Untitled Arena';
    this.author = 'You';
    this.desc = '';
    this.seed = 1;
    this.h = new Uint8Array(this.size * this.size);          // height in HSTEP units
    this.m = new Uint8Array(this.size * this.size);          // top material id
    this.water = 0;                                            // water surface height in steps (0 = none)
    this.lava = false;                                         // true = the "water" plane is lava
    this.props = [];                                           // {t, x, z, r (radians), s (scale), v (variant)}
    this.zones = { A: { x: -this.worldSize() * 0.28, z: 0, w: this.worldSize() * 0.22, d: this.worldSize() * 0.7 }, B: { x: this.worldSize() * 0.28, z: 0, w: this.worldSize() * 0.22, d: this.worldSize() * 0.7 } };
    this.env = { time: 11, weather: 'clear', fog: 0.25, theme: 'greek', wind: 0.3, mood: 'auto' };
    this.hazards = [];                                          // {t:'quicksand'|'spikes'|'fire'|'boulders'|'geyser', x, z, r}
    this.biome = 'grass';
    this.objective = 'eliminate';                              // the arena author's default objective (the Quick Battle picker starts on it)
    this.tags = [];                                            // <= 5 short labels the author gave the arena
    this.markers = [];                                          // objective markers {id,type:'hill|exit|vip_start|general_spawn|waypoint',x,z,r}
  }
  worldSize() { return this.size * CELL; }
  half() { return this.size * CELL * 0.5; }
  inCell(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.size && cz < this.size; }
  cellOf(x) { return Math.floor((x + this.half()) / CELL); }
  cx(x) { return Math.floor((x + this.half()) / CELL); }
  cz(z) { return Math.floor((z + this.half()) / CELL); }
  worldX(cx) { return (cx + 0.5) * CELL - this.half(); }
  worldZ(cz) { return (cz + 0.5) * CELL - this.half(); }
  getH(cx, cz) {
    if (cx < 0) cx = 0; else if (cx >= this.size) cx = this.size - 1;
    if (cz < 0) cz = 0; else if (cz >= this.size) cz = this.size - 1;
    return this.h[cx + cz * this.size];
  }
  getM(cx, cz) {
    if (cx < 0) cx = 0; else if (cx >= this.size) cx = this.size - 1;
    if (cz < 0) cz = 0; else if (cz >= this.size) cz = this.size - 1;
    return this.m[cx + cz * this.size];
  }
  setH(cx, cz, v) { if (this.inCell(cx, cz)) this.h[cx + cz * this.size] = Math.max(0, Math.min(MAX_H, Math.round(v))); }
  setM(cx, cz, v) { if (this.inCell(cx, cz)) this.m[cx + cz * this.size] = v; }
  /** Ground height in world units at (x,z): the hard cell height (what a unit stands on). */
  cellHeight(x, z) { return this.getH(this.cx(x), this.cz(z)) * HSTEP; }
  /** Smoothed ground height (bilinear over cell centres). Units glide over steps instead of snapping. */
  heightAt(x, z) {
    const fx = (x + this.half()) / CELL - 0.5, fz = (z + this.half()) / CELL - 0.5;
    const x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
    const a = this.getH(x0, z0), b = this.getH(x0 + 1, z0), c = this.getH(x0, z0 + 1), d = this.getH(x0 + 1, z0 + 1);
    return ((a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz) * HSTEP;
  }
  waterY() { return this.water * HSTEP; }
  isWaterCell(cx, cz) { return this.water > 0 && this.getH(cx, cz) < this.water; }
  /** depth in world units of water at x,z (0 if dry) */
  waterDepth(x, z) { return this.water > 0 ? Math.max(0, this.water * HSTEP - this.heightAt(x, z)) : 0; }
  materialAt(x, z) { return MATERIALS[this.getM(this.cx(x), this.cz(z))]; }

  // ---------- editing primitives (all return the set of dirty cell bounds so the mesher can rebuild chunks) ----------
  /** Apply fn(cx,cz,dist01) over a circular brush; returns dirty rect {x0,z0,x1,z1} in cells. */
  brush(wx, wz, radius, fn) {
    const cr = radius / CELL, ccx = this.cx(wx), ccz = this.cz(wz);
    const x0 = Math.max(0, Math.floor(ccx - cr)), x1 = Math.min(this.size - 1, Math.ceil(ccx + cr));
    const z0 = Math.max(0, Math.floor(ccz - cr)), z1 = Math.min(this.size - 1, Math.ceil(ccz + cr));
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const dx = x - ccx + 0.0, dz = z - ccz + 0.0, dd = Math.sqrt(dx * dx + dz * dz) / cr;
      if (dd <= 1) fn(x, z, dd);
    }
    return { x0, z0, x1, z1 };
  }
  raise(wx, wz, radius, amount) { return this.brush(wx, wz, radius, (x, z, d) => this.setH(x, z, this.getH(x, z) + amount * (1 - d * d))); }
  /** Set height toward target (flatten) with soft edge. */
  flatten(wx, wz, radius, target) { return this.brush(wx, wz, radius, (x, z, d) => this.setH(x, z, Math.round(this.getH(x, z) + (target - this.getH(x, z)) * (1 - d)))); }
  smooth(wx, wz, radius) {
    const snap = this.h.slice();
    return this.brush(wx, wz, radius, (x, z) => {
      let s = 0, n = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = Math.min(this.size - 1, Math.max(0, x + i)), zz = Math.min(this.size - 1, Math.max(0, z + j)); s += snap[xx + zz * this.size]; n++; }
      this.setH(x, z, s / n);
    });
  }
  paint(wx, wz, radius, mat) { return this.brush(wx, wz, radius, (x, z) => this.setM(x, z, mat)); }
  /** Crater from a boulder / meteor: bowl + rim. Returns dirty rect. */
  crater(wx, wz, radius, depthSteps) {
    return this.brush(wx, wz, radius * 1.25, (x, z, d) => {
      const dd = d * 1.25;
      if (dd <= 1) this.setH(x, z, this.getH(x, z) - depthSteps * (1 - dd * dd));
      else this.setH(x, z, this.getH(x, z) + Math.max(0, Math.round(depthSteps * 0.25 * (1.25 - dd) * 4)));
    });
  }

  // ---------- serialisation ----------
  toJSON() {
    return {
      v: this.v, name: this.name, author: this.author, desc: this.desc, seed: this.seed, size: this.size,
      water: this.water, lava: this.lava, biome: this.biome, env: this.env, zones: this.zones, hazards: this.hazards, markers: this.markers, objective: this.objective, tags: this.tags,
      props: this.props.map((p) => [p.t, +p.x.toFixed(2), +p.z.toFixed(2), +(p.r || 0).toFixed(3), +(p.s || 1).toFixed(2), p.v || 0]),
      h: rle(this.h), m: rle(this.m),
    };
  }
  static fromJSON(o) {
    if (!o || typeof o !== 'object') throw new Error('Arena data is not an object');
    const size = o.size | 0;
    if (![64, 96, 128, 160, 192, 224, 256].includes(size)) throw new Error('Unsupported arena size ' + o.size);
    const a = new Arena(size);
    a.name = String(o.name || 'Imported Arena').slice(0, 32);
    a.author = String(o.author || '').slice(0, 24);
    a.desc = String(o.desc || '').slice(0, 200);
    a.seed = o.seed | 0;
    a.water = clampInt(o.water, 0, MAX_H);
    a.lava = !!o.lava;
    a.biome = String(o.biome || 'grass');
    a.env = Object.assign({ time: 11, weather: 'clear', fog: 0.25, theme: 'greek', wind: 0.3, mood: 'auto' }, sanitizeEnv(o.env));
    a.markers = Array.isArray(o.markers) ? o.markers.slice(0, 8).filter((m) => m && typeof m.type === 'string').map((m) => ({ id: String(m.id || m.type).slice(0, 16), type: String(m.type).slice(0, 16), x: +m.x || 0, z: +m.z || 0, r: Math.max(1, Math.min(30, +m.r || 4)) })) : [];
    if (OBJECTIVES.includes(o.objective)) a.objective = o.objective;
    if (Array.isArray(o.tags)) a.tags = o.tags.filter((t) => typeof t === 'string').map((t) => t.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 16)).filter(Boolean).slice(0, 5);
    if (o.zones && o.zones.A && o.zones.B) a.zones = { A: sanitizeZone(o.zones.A, a), B: sanitizeZone(o.zones.B, a) };
    a.hazards = Array.isArray(o.hazards) ? o.hazards.slice(0, 60).filter((h) => h && typeof h.t === 'string').map((h) => ({ t: h.t, x: +h.x || 0, z: +h.z || 0, r: Math.max(1, Math.min(30, +h.r || 4)) })) : [];
    unrle(o.h, a.h, MAX_H); unrle(o.m, a.m, MATERIALS.length - 1);
    a.props = Array.isArray(o.props) ? o.props.slice(0, 1500).filter((p) => Array.isArray(p) && typeof p[0] === 'string').map((p) => ({ t: p[0], x: +p[1] || 0, z: +p[2] || 0, r: +p[3] || 0, s: Math.max(0.3, Math.min(4, +p[4] || 1)), v: p[5] | 0 })) : [];
    return a;
  }
  clone() { return Arena.fromJSON(JSON.parse(JSON.stringify(this.toJSON()))); }
}

function clampInt(v, a, b) { v = v | 0; return v < a ? a : v > b ? b : v; }
function sanitizeEnv(e) {
  e = e || {};
  const out = {};
  if (typeof e.time === 'number') out.time = Math.max(0, Math.min(24, e.time));
  if (WEATHERS.includes(e.weather)) out.weather = e.weather;
  if (typeof e.fog === 'number') out.fog = Math.max(0, Math.min(1, e.fog));
  if (typeof e.theme === 'string') out.theme = e.theme.slice(0, 16);
  if (typeof e.wind === 'number') out.wind = Math.max(0, Math.min(1, e.wind));
  if (typeof e.mood === 'string') out.mood = e.mood.slice(0, 16);
  return out;
}
function sanitizeZone(z, a) {
  const W = a.worldSize();
  return { x: Math.max(-W / 2, Math.min(W / 2, +z.x || 0)), z: Math.max(-W / 2, Math.min(W / 2, +z.z || 0)), w: Math.max(2, Math.min(W, +z.w || 10)), d: Math.max(2, Math.min(W, +z.d || 30)) };
}
function rle(arr) {
  const out = []; let i = 0;
  while (i < arr.length) { const v = arr[i]; let n = 1; while (i + n < arr.length && arr[i + n] === v && n < 65535) n++; out.push(n, v); i += n; }
  return out;
}
function unrle(data, target, max) {
  if (!Array.isArray(data)) throw new Error('Arena layer missing');
  let p = 0;
  for (let i = 0; i + 1 < data.length; i += 2) {
    const n = data[i] | 0, v = Math.max(0, Math.min(max, data[i + 1] | 0));
    for (let k = 0; k < n && p < target.length; k++) target[p++] = v;
  }
  if (p !== target.length) throw new Error('Arena layer has the wrong length');
}
