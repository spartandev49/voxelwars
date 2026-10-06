// PropRenderer: draws an arena's static props (trees, walls, towers, temples, ships ...) with THREE.InstancedMesh batches.
//
//  * One batch per (type, stage, variant); each batch owns up to 3 InstancedMeshes (LOD0 full detail, LOD1 2x downsample, LOD2 4x),
//    all sharing the geometry cache and the shared voxel material from instancing.js (vertex colours + GLOW voxels, no skinning).
//  * Per frame (only when the camera moved or a batch changed) every instance is frustum-tested (with a generous shadow margin),
//    assigned to a LOD by distance, and tiny props (bushes, crates ...) are culled beyond the tier's cull distance. Matrices are
//    compacted straight into the instance arrays, no allocation.
//  * Props sit on `arena.cellHeight(x,z)` (the minimum over the footprint for big ones; the model has a buried foundation skirt),
//    ships float on the water plane and bob, cloud islands bob slowly.
//  * Destruction: setStage(id, 0|1|2), remove(id) (collapse to the rubble stage + debris cubes + dust), bindEvents(bus) wires
//    prop_damaged / prop_destroyed / prop_spawned / crater and the crowd reactions. Torches, campfires and fire pits emit CubeFX fire
//    and (at night, on the tiers that allow it) drive a few real point lights.
//  * Spectators ('crowd' props) are rendered as animated skinned instances (VoxSkin, hum_lite-like parts) with procedural idle /
//    cheer / gasp poses that ANIM can replace through setCrowdPose().
//  * Editor API: add(def), removeById(id), clear(), transform(id, {x,z,r,s}), pick(origin, dir), get(id), setArena(arena), setProps(list).

import { getVoxelMaterial, geometryFromMesh } from './instancing.js';
import { VoxSkin, newPose } from './voxskin.js';
import { meshGrid } from '../voxel/mesher.js';
import { VoxelGrid } from '../voxel/grid.js';
import { fxRand } from '../core/rng.js';
import { PROP_CATALOG } from '../content/era_ancient/props/catalog.js';
import { buildProp, debrisColors, variantCount, isStaticProp, hasPropModel, buildSpectator, SPECTATOR_VARIANTS } from '../content/era_ancient/props/models/index.js';

const T = () => window.THREE;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrapVariant = (v, n) => { n = Math.max(1, n | 0); return (((v | 0) % n) + n) % n; };

/** Per-tier presentation parameters. lod = distance multiplier for LOD switches; cull = tiny-prop cull distance (u); lights = point-light pool size. */
export const PROP_TIERS = {
  potato:   { lod: 0.55, cull: 46, lights: 0, fx: 0.45, shadows: false },
  papyrus:  { lod: 0.8, cull: 62, lights: 0, fx: 0.75, shadows: true },
  marble:   { lod: 1.0, cull: 84, lights: 2, fx: 1.0, shadows: true },
  olympian: { lod: 1.3, cull: 110, lights: 4, fx: 1.0, shadows: true },
};
const LOD_NEAR = 26, LOD_FAR = 62;              // u at tier multiplier 1
/** Props that are small enough to vanish at distance. */
const TINY = new Set(['bush', 'wheat', 'reeds', 'bones', 'skull_pile', 'rock_small', 'fire_pit', 'campfire', 'crate', 'barrel', 'log', 'goat_pen', 'cactus', 'torch']);
const NO_SHADOW = new Set(['bones', 'skull_pile', 'wheat', 'reeds', 'fire_pit', 'campfire', 'goat_pen', 'cloud_island']);
/** Props whose features are 1-2 voxels thick: LOD merging keeps a voxel when 2 of 8 children are solid (instead of 3). */
const THIN = new Set(['tree_palm', 'palm', 'tree_dead', 'reeds', 'wheat', 'cactus', 'torch', 'banner_post', 'goat_pen', 'ship', 'tent', 'bones', 'tree_cypress', 'tree_pine', 'tree_olive', 'cloud_island']);
/** Floating props: 'water' sits on the water surface and bobs, 'sky' hovers and bobs slowly. */
const FLOAT = { ship: { kind: 'water', amp: 0.05, w: 1.35 }, cloud_island: { kind: 'sky', amp: 0.2, w: 0.45, lift: 0 } };

// ------------------------------------------------------------------ geometry cache (shared by every PropRenderer)
const GEO = new Map();        // key -> info
/** 2x majority-ish downsample of a voxel grid (average colour of solid children, glow preserved). */
export function downsample2(grid, thin) {
  const sx = (grid.sx + 1) >> 1, sy = (grid.sy + 1) >> 1, sz = (grid.sz + 1) >> 1, g = new VoxelGrid(sx, sy, sz), need = thin ? 2 : 3;
  for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) {
    let n = 0, r = 0, gg = 0, b = 0, glow = false;
    for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const v = grid.get(x * 2 + i, y * 2 + j, z * 2 + k);
      if (v) { n++; r += (v >> 16) & 255; gg += (v >> 8) & 255; b += v & 255; if ((v >>> 24) & 4) glow = true; }
    }
    if (n >= need || (glow && n >= 1)) g.d[g.idx(x, y, z)] = (((glow ? 5 : 1) << 24) | (Math.round(r / n) << 16) | (Math.round(gg / n) << 8) | Math.round(b / n)) >>> 0;
  }
  return g;
}
function lodCountFor(type, voxels) {
  if (voxels < 2400) return 1;
  if (voxels < 9000) return 2;
  return 3;
}
/** Build (and cache) geometries for (type, stage, variant): LOD0..2 plus extents and emitters. */
function geoInfo(type, stage, variant) {
  const key = type + '|' + stage + '|' + variant;
  let info = GEO.get(key);
  if (info) return info;
  const model = buildProp(type, stage, variant);
  const part = model.parts[0], vs = model.voxelSize;
  const voxels = part.grid.count();
  const nl = lodCountFor(type, voxels);
  const geos = [], tris = [];
  let grid = part.grid, size = vs, pivot = part.pivot.slice();
  for (let l = 0; l < nl; l++) {
    if (l > 0) { grid = downsample2(grid, THIN.has(type)); size *= 2; pivot = [pivot[0] / 2, pivot[1] / 2, pivot[2] / 2]; }
    const mesh = meshGrid(grid, { size, pivot });
    geos.push(geometryFromMesh(mesh)); tris.push(mesh.indices.length / 3);
  }
  const b = part.grid.bounds();
  const px = part.pivot[0], pz = part.pivot[2], gy = part.pivot[1];
  const hx = b ? Math.max(px - b.x0, b.x1 + 1 - px) * vs : 0.5, hz = b ? Math.max(pz - b.z0, b.z1 + 1 - pz) * vs : 0.5, hy = b ? (b.y1 + 1 - gy) * vs : 1;
  info = { key, geos, tris, nl, voxels, hx, hz, h: hy, rad: Math.hypot(hx, hz), meta: model.meta, emitters: model.meta.emitters || [] };
  GEO.set(key, info);
  return info;
}
/**
 * Build every geometry an arena's props need (stage 0) without blocking the main thread for long: yields between models.
 * Call before PropRenderer.setArena() on the loading screen; onProgress(0..1).
 */
export async function preloadPropGeometry(props, onProgress) {
  const keys = new Map();
  for (const p of props || []) {
    const t = p.t || p.type; if (!t || !hasPropModel(t)) continue;
    const n = t === 'crowd' ? 0 : variantCount(t), v = n ? wrapVariant(p.v, n) : 0;
    if (t !== 'crowd') keys.set(t + '|' + v, [t, v]);
  }
  let i = 0;
  for (const [t, v] of keys.values()) { geoInfo(t, 0, v); if (onProgress) onProgress(++i / keys.size); await new Promise((r) => setTimeout(r, 0)); }
  return keys.size;
}
/** Free every cached prop geometry (call when leaving the game; renderers re-create what they need). */
export function disposePropGeometry() { for (const i of GEO.values()) for (const g of i.geos) g.dispose(); GEO.clear(); }

// ------------------------------------------------------------------ batches
class Batch {
  constructor(owner, key, type, stage, variant, info) {
    this.owner = owner; this.key = key; this.type = type; this.stage = stage; this.variant = variant; this.info = info;
    this.items = []; this.cap = 0; this.src = new Float32Array(0); this.meshes = []; this.counts = [0, 0, 0]; this.dirty = true;
    this._grow(8);
  }
  _grow(cap) {
    const t = T(), old = this.src, mat = getVoxelMaterial(), o = this.owner;
    this.cap = cap; this.src = new Float32Array(cap * 16); if (old.length) this.src.set(old.subarray(0, Math.min(old.length, this.src.length)));
    for (const m of this.meshes) { o.group.remove(m); m.dispose && m.dispose(); }
    this.meshes = [];
    for (let l = 0; l < this.info.nl; l++) {
      const m = new t.InstancedMesh(this.info.geos[l], mat, cap);
      m.instanceMatrix.setUsage(t.DynamicDrawUsage);
      m.frustumCulled = false; m.count = 0; m.visible = false;
      m.userData.prop = this.type; m.userData.lod = l;
      m.castShadow = o.shadowsOn && !NO_SHADOW.has(this.type) && l < 2;
      m.receiveShadow = o.shadowsOn && !TINY.has(this.type);
      m.name = 'props:' + this.key + ':' + l;
      o.group.add(m);
      this.meshes.push(m);
    }
    this.dirty = true;
  }
  add(item) {
    if (this.items.length >= this.cap) this._grow(this.cap * 2);
    item.batch = this; item.slot = this.items.length; this.items.push(item);
    this.owner._writeMatrix(item); this.dirty = true;
  }
  remove(item) {
    const last = this.items.length - 1, i = item.slot;
    if (i !== last) {
      const mv = this.items[last]; this.items[i] = mv; mv.slot = i;
      this.src.copyWithin(i * 16, last * 16, last * 16 + 16);
    }
    this.items.pop(); item.batch = null; this.dirty = true;
  }
  applyShadowFlags() {
    const o = this.owner;
    for (let l = 0; l < this.meshes.length; l++) { const m = this.meshes[l]; m.castShadow = o.shadowsOn && !NO_SHADOW.has(this.type) && l < 2; m.receiveShadow = o.shadowsOn && !TINY.has(this.type); }
  }
  dispose() { for (const m of this.meshes) { this.owner.group.remove(m); m.dispose && m.dispose(); } this.meshes = []; this.items.length = 0; }
}

// ------------------------------------------------------------------ crowd (animated spectators)
const SPEC = { body: 0, head: 1, armUL: 2, armUR: 3, legUL: 4, legUR: 5 };
class Crowd {
  constructor(owner) {
    this.owner = owner; this.members = []; this.skins = []; this.byVariant = [[], [], [], []];
    this.pose = newPose(6); this.react = null; this.poseFn = null; this.time = 0; this.team = [1, 1, 1];
  }
  setMembers(list) {
    this.members = list;
    this.byVariant = Array.from({ length: SPECTATOR_VARIANTS }, () => []);
    for (const m of list) this.byVariant[m.v % SPECTATOR_VARIANTS].push(m);
    for (let v = 0; v < SPECTATOR_VARIANTS; v++) {
      const n = this.byVariant[v].length;
      if (n && !this.skins[v]) this.skins[v] = new VoxSkin({ scene: this.owner.group }, buildSpectator(v), { capacity: Math.max(8, n + 4), shadow: this.owner.shadowsOn });
    }
    for (const s of this.skins) if (s) s.mesh.visible = false;
  }
  /** kind: 'cheer' | 'gasp'; the wave starts at (x,z) and travels outward at ~55 u/s. */
  trigger(kind, strength, x, z) {
    const now = this.time;
    if (this.react && now - this.react.t0 < this.react.dur * 0.45 && this.react.kind === kind && this.react.strength >= strength) return false;
    this.react = { kind, strength: clamp(strength, 0.2, 1), t0: now, dur: kind === 'gasp' ? 1.5 : 2.6 + strength * 1.6, ox: x || 0, oz: z || 0 };
    return true;
  }
  update(dt) {
    this.time += dt;
    const t = this.time, pose = this.pose, R = this.react;
    if (R && t - R.t0 > R.dur + 1.2) this.react = null;
    for (let v = 0; v < this.byVariant.length; v++) {
      const skin = this.skins[v], list = this.byVariant[v];
      if (!skin) continue;
      skin.begin();
      for (let i = 0; i < list.length; i++) {
        const m = list[i], ph = m.phase;
        for (let k = 0; k < 6; k++) { const o = k * 9; pose[o] = 0; pose[o + 1] = 0; pose[o + 2] = 0; pose[o + 3] = 0; pose[o + 4] = 0; pose[o + 5] = 0; }
        let hop = Math.sin(t * 1.7 + ph) * 0.01;
        const sw = 0.07 * Math.sin(t * 1.3 + ph);
        pose[SPEC.armUL * 9 + 3] = -0.05 + sw; pose[SPEC.armUR * 9 + 3] = -0.05 - sw;
        pose[SPEC.armUL * 9 + 5] = 0.06; pose[SPEC.armUR * 9 + 5] = -0.06;
        pose[SPEC.head * 9 + 4] = 0.22 * Math.sin(t * 0.55 + ph * 1.7);
        let kind = null, k = 0, tt = 0;
        if (R) {
          const d = Math.hypot(m.x - R.ox, m.z - R.oz);
          tt = (t - R.t0 - d * 0.018 - (m.phase % 1) * 0.25) / R.dur;
          if (tt > 0 && tt < 1.3) { kind = R.kind; k = clamp(tt / 0.1, 0, 1) * clamp((1.3 - tt) / 0.35, 0, 1) * R.strength * (0.75 + 0.25 * Math.sin(ph * 3.1)); }
        }
        if (this.poseFn && kind) this.poseFn(pose, kind, k, t, ph, m);
        else if (kind === 'cheer') {
          const flap = Math.sin(t * 13 + ph) * 0.35;
          pose[SPEC.armUL * 9 + 3] += (-2.85 + flap + 0.05) * k; pose[SPEC.armUR * 9 + 3] += (-2.85 - flap + 0.05) * k;
          pose[SPEC.armUL * 9 + 5] += 0.3 * k; pose[SPEC.armUR * 9 + 5] -= 0.3 * k;
          pose[SPEC.head * 9 + 3] = -0.18 * k; pose[SPEC.body * 9 + 3] = -0.05 * k;
          hop += Math.abs(Math.sin(t * 8.5 + ph)) * 0.2 * k;
        } else if (kind === 'gasp') {
          pose[SPEC.armUL * 9 + 3] += -1.9 * k; pose[SPEC.armUR * 9 + 3] += -1.9 * k;
          pose[SPEC.armUL * 9 + 5] += 0.55 * k; pose[SPEC.armUR * 9 + 5] -= 0.55 * k;
          pose[SPEC.body * 9 + 3] = 0.2 * k; pose[SPEC.head * 9 + 3] = -0.25 * k;
          hop += 0.07 * k;
        }
        skin.add(m.x, m.y + hop, m.z, m.rot, m.s, m.s, m.s, pose, this.team, 0, 0, 0);
      }
      skin.end();
    }
  }
  dispose() { for (const s of this.skins) if (s) s.dispose(); this.skins = []; this.members = []; }
}

// ------------------------------------------------------------------ the renderer
export class PropRenderer {
  /**
   * @param {{scene:any, camera:any, q?:object, qualityKey?:string, env?:object, focus?:any}} engine  the Engine (or anything with scene + camera)
   * @param {import('../world/arena.js').Arena|{props:object[]}|null} arena
   * @param {{fx?:any, crowd?:boolean, lights?:number}} [opts]  fx: the CubeFX pool (not owned here)
   */
  constructor(engine, arena = null, opts = {}) {
    const t = T();
    this.engine = engine; this.scene = engine.scene; this.fx = opts.fx || null;
    this.group = new t.Group(); this.group.name = 'props'; this.scene.add(this.group);
    this.arena = null; this.items = new Map(); this.batches = new Map(); this.nextId = 1;
    this.time = 0; this.tier = PROP_TIERS[engine.qualityKey] || PROP_TIERS.marble; this.tierKey = engine.qualityKey || 'marble';
    this.shadowsOn = !!(this.tier.shadows && (!engine.q || engine.q.shadow > 0));
    this.frustum = new t.Frustum(); this.pv = new t.Matrix4(); this.sph = new t.Sphere();
    this.lastCam = new Float32Array(18); this.camPos = [0, 0, 0]; this.camDirty = true;
    this.emitters = []; this.burning = new Map(); this.floaters = [];
    this.crowd = new Crowd(this); this.crowdEnabled = opts.crowd !== false; this._crowdList = [];
    this.lights = []; this._lightT = 0; this._nLights = opts.lights !== undefined ? opts.lights : this.tier.lights;
    this._makeLights();
    this.unbinders = [];
    this._exc = 0; this._crowdCool = 0; this._lastKill = [0, 0];
    this.visible = { instances: 0, draws: 0, triangles: 0 };
    if (arena) this.setArena(arena);
  }

  // ---------------------------------------------------------------- setup
  setFx(fx) { this.fx = fx; }
  setQuality(key) {
    this.tierKey = key; this.tier = PROP_TIERS[key] || PROP_TIERS.marble;
    this.shadowsOn = !!(this.tier.shadows && (!this.engine.q || this.engine.q.shadow > 0));
    for (const b of this.batches.values()) b.applyShadowFlags();
    this._nLights = this.tier.lights; this._makeLights(); this.camDirty = true;
  }
  _makeLights() {
    const t = T();
    for (const l of this.lights) { this.scene.remove(l); }
    this.lights = [];
    for (let i = 0; i < this._nLights; i++) { const l = new t.PointLight(0xffa24a, 0, 15, 1.6); l.castShadow = false; l.userData.target = 0; this.scene.add(l); this.lights.push(l); }
  }
  /** Replace everything with an arena's props (ids are 1-based list indices, matching sim/world.js) and its spectators. */
  setArena(arena) {
    this.clear();
    this.arena = arena;
    const list = arena && arena.props ? arena.props : [];
    for (let i = 0; i < list.length; i++) this._addItem(Object.assign({ id: i + 1 }, list[i]), true);
    this.nextId = list.length + 1;
    this._finishCrowd();
    this.camDirty = true;
  }
  /** Replace the props with a plain list [{t,x,z,r,s,v}] keeping the current arena for ground heights. */
  setProps(list) {
    const a = this.arena; this.clear(); this.arena = a;
    for (let i = 0; i < list.length; i++) this._addItem(Object.assign({ id: i + 1 }, list[i]), true);
    this.nextId = list.length + 1; this._finishCrowd(); this.camDirty = true;
  }
  clear() {
    for (const b of this.batches.values()) b.dispose();
    this.batches.clear(); this.items.clear(); this.emitters.length = 0; this.floaters.length = 0; this.burning.clear();
    this.crowd.dispose(); this.crowd = new Crowd(this); this._crowdList = [];
    this.nextId = 1; this.camDirty = true;
    this.visible.instances = 0; this.visible.draws = 0; this.visible.triangles = 0;
  }
  /** Build every geometry the current items need, yielding between models (for loading screens). */
  async prewarm(onProgress) {
    const keys = new Set();
    for (const it of this.items.values()) keys.add(it.type + '|' + this._effStage(it.type, it.stage) + '|' + it.v);
    const arr = [...keys]; let i = 0;
    for (const k of arr) {
      const [type, stage, v] = k.split('|'); if (hasPropModel(type)) geoInfo(type, +stage, +v);
      if (onProgress) onProgress(++i / arr.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // ---------------------------------------------------------------- items
  _effStage(type, stage) { return isStaticProp(type) ? 0 : clamp(stage | 0, 0, 2); }
  _norm(def) {
    const type = def.t || def.type, cat = PROP_CATALOG[type];
    return {
      id: def.id, type, x: +def.x || 0, z: +def.z || 0, rot: +(def.r !== undefined ? def.r : def.rot) || 0, s: clamp(+def.s || 1, 0.3, 4),
      v: wrapVariant(def.v, type === 'crowd' ? SPECTATOR_VARIANTS : variantCount(type)),
      stage: def.stage | 0, y: def.y, cat,
    };
  }
  _addItem(def, bulk) {
    const it = this._norm(def);
    if (!it.type || !PROP_CATALOG[it.type] || !hasPropModel(it.type)) return 0;      // unknown ids (hostile imports) are skipped
    if (def.id === undefined || def.id === null || this.items.has(def.id)) it.id = this.nextId; else it.id = def.id;
    if (it.id >= this.nextId) this.nextId = it.id + 1;
    it.dead = false; it.flash = 0; it.phase = fxRand.next() * TAU; it.em = null; it.etimer = 0; it.batch = null; it.slot = -1;
    it.y0 = it.y; it.y = this._groundY(it);
    it.baseY = it.y;
    this.items.set(it.id, it);
    if (it.type === 'crowd' && this.crowdEnabled) { this._crowdList.push(it); if (!bulk) this._finishCrowd(); return it.id; }
    this._place(it);
    return it.id;
  }
  _groundY(it) {
    if (it.y0 !== undefined && it.y0 !== null && !Number.isNaN(+it.y0)) return +it.y0;
    const a = this.arena; if (!a || !a.cellHeight) return 0;
    // seat the model on the LOWEST ground under its footprint (never floats; the uphill side is buried, models carry a foundation skirt)
    const r = clamp((it.cat && it.cat.r > 0 ? it.cat.r : 0.4) * it.s * 0.9, 0.3, 3.2);
    let y = a.cellHeight(it.x, it.z);
    y = Math.min(y, a.cellHeight(it.x + r, it.z), a.cellHeight(it.x - r, it.z), a.cellHeight(it.x, it.z + r), a.cellHeight(it.x, it.z - r));
    const fl = FLOAT[it.type];
    if (fl && fl.kind === 'water' && a.water > 0) y = Math.max(y, a.waterY() - 0.06);
    return y;
  }
  _place(it) {
    const stage = this._effStage(it.type, it.stage), key = it.type + '|' + stage + '|' + it.v;
    let b = this.batches.get(key);
    if (!b) { b = new Batch(this, key, it.type, stage, it.v, geoInfo(it.type, stage, it.v)); this.batches.set(key, b); }
    const info = b.info;
    it.rad = Math.hypot(info.rad, info.h * 0.5) * it.s; it.cy = info.h * 0.5 * it.s; it.tiny = TINY.has(it.type);
    it.margin = 4 + info.h * it.s * 1.6;
    b.add(it);
    // fire emitters (torches, campfires) exist only on intact stages
    this._setEmitters(it, stage === 0 ? info.emitters : null);
    const fl = FLOAT[it.type];
    if (fl && !this.floaters.includes(it)) this.floaters.push(it);
  }
  _setEmitters(it, list) {
    const had = it.em && it.em.length;
    if (!list || !list.length) { it.em = null; if (had) { const i = this.emitters.indexOf(it); if (i >= 0) this.emitters.splice(i, 1); } return; }
    const c = Math.cos(it.rot), s = Math.sin(it.rot);
    it.em = list.map((e) => ({ kind: e.kind, x: it.x + (e.x * c + e.z * s) * it.s, y: it.y + e.y * it.s, z: it.z + (-e.x * s + e.z * c) * it.s }));
    if (!had) this.emitters.push(it);
  }
  _writeMatrix(it) {
    const b = it.batch; if (!b) return;
    const c = Math.cos(it.rot) * it.s, s = Math.sin(it.rot) * it.s, o = it.slot * 16, m = b.src;
    m[o] = c; m[o + 1] = 0; m[o + 2] = -s; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = it.s; m[o + 6] = 0; m[o + 7] = 0;
    m[o + 8] = s; m[o + 9] = 0; m[o + 10] = c; m[o + 11] = 0; m[o + 12] = it.x; m[o + 13] = it.y; m[o + 14] = it.z; m[o + 15] = 1;
  }
  _finishCrowd() {
    const list = this._crowdList || [];
    const members = list.map((it) => ({ id: it.id, x: it.x, y: it.y, z: it.z, rot: it.rot, s: it.s, v: it.v, phase: it.phase }));
    this.crowd.setMembers(members);
  }

  /** Editor: add a prop and render it now. def = {t, x, z, r?, s?, v?, id?, stage?, y?}. Returns its id (0 when the type is unknown). */
  add(def) { return this._addItem(def, false); }
  /** Editor: remove a prop with no rubble and no effects. */
  removeById(id) {
    const it = this.items.get(id); if (!it) return false;
    if (it.batch) it.batch.remove(it);
    this._setEmitters(it, null);
    const f = this.floaters.indexOf(it); if (f >= 0) this.floaters.splice(f, 1);
    this.burning.delete(id); this.items.delete(id);
    if (it.type === 'crowd') { const i = this._crowdList.indexOf(it); if (i >= 0) { this._crowdList.splice(i, 1); this._finishCrowd(); } }
    this.camDirty = true; return true;
  }
  get(id) { const it = this.items.get(id); return it ? { id: it.id, type: it.type, x: it.x, y: it.y, z: it.z, rot: it.rot, s: it.s, v: it.v, stage: it.stage, dead: it.dead } : null; }
  get count() { return this.items.size; }
  /** Editor: move/rotate/scale/re-variant a prop (partial). */
  transform(id, o) {
    const it = this.items.get(id); if (!it) return false;
    if (o.x !== undefined) it.x = o.x; if (o.z !== undefined) it.z = o.z;
    if (o.r !== undefined) it.rot = o.r; if (o.s !== undefined) it.s = clamp(o.s, 0.3, 4);
    const nv = o.v !== undefined ? wrapVariant(o.v, it.type === 'crowd' ? SPECTATOR_VARIANTS : variantCount(it.type)) : it.v;
    if (o.x !== undefined || o.z !== undefined || o.s !== undefined) { it.y0 = undefined; it.y = it.baseY = this._groundY(it); }
    if (it.type === 'crowd') { it.v = nv; this._finishCrowd(); return true; }
    if (nv !== it.v || o.s !== undefined) { it.v = nv; this.setStage(id, it.stage, true); } else { this._writeMatrix(it); if (it.batch) it.batch.dirty = true; this._setEmitters(it, it.em ? it.batch.info.emitters : null); }
    return true;
  }
  /** Re-seat props on the (possibly deformed) terrain inside a world circle, e.g. after a crater. */
  reground(x, z, r) {
    const a = this.arena; if (!a) return;
    for (const it of this.items.values()) {
      if (it.type === 'crowd' || (it.x - x) ** 2 + (it.z - z) ** 2 > (r + 1.5) ** 2) continue;
      it.y0 = undefined; const ny = this._groundY(it);
      if (Math.abs(ny - it.baseY) > 1e-4) { it.baseY = it.y = ny; this._writeMatrix(it); if (it.batch) it.batch.dirty = true; if (it.em) this._setEmitters(it, it.batch.info.emitters); }
    }
  }
  /** Switch a prop between intact (0), cracked (1) and rubble (2) models. */
  setStage(id, stage, force) {
    const it = this.items.get(id); if (!it || it.type === 'crowd') return false;
    stage = clamp(stage | 0, 0, 2);
    if (!force && stage === it.stage) return true;
    const was = this._effStage(it.type, it.stage), now = this._effStage(it.type, stage);
    it.stage = stage;
    if (was === now && it.batch && !force) return true;
    if (it.batch) it.batch.remove(it);
    this._place(it); this.camDirty = true; return true;
  }
  /**
   * Destroy a prop: collapse to the rubble stage (indestructible types are simply removed), burst debris cubes sampled from its
   * palette and puff dust. opts.debris=false suppresses the CubeFX burst (when the app already spawns it).
   */
  remove(id, opts) {
    const it = this.items.get(id); if (!it) return false;
    const o = opts || {}, fx = this.fx;
    if (it.type === 'crowd') return this.removeById(id);
    if (fx && o.debris !== false) {
      const cols = debrisColors(it.type), h = (it.cat ? it.cat.h : 2) * it.s, r = Math.max(0.5, (it.cat ? it.cat.r : 0.5) * it.s);
      const n = Math.round(clamp(30 + r * h * 3.2, 30, 80) * (this.tier.fx >= 1 ? 1 : 0.6));
      fx.rubble(it.x, it.y + h * 0.15, it.z, cols, n, r * 1.6 + 0.8);
      fx.dust(it.x, it.y + 0.2, it.z, Math.round(10 * this.tier.fx) + 2, 0xcdbb94, 2.4);
    }
    it.dead = true; this.burning.delete(id);
    if (isStaticProp(it.type)) return this.removeById(id);
    this.setStage(id, 2); return true;
  }
  setBurning(id, on) { const it = this.items.get(id); if (!it) return; if (on) this.burning.set(id, it); else this.burning.delete(id); }
  /** Editor/hover: nearest prop hit by a ray (origin/dir plain {x,y,z}); props are tested as vertical cylinders. Returns {id,t} or null. */
  pick(o, d, maxDist = 400) {
    let best = null, bt = maxDist;
    const hl = Math.hypot(d.x, d.z);
    for (const it of this.items.values()) {
      const cat = it.cat, r = Math.max(0.45, (cat ? cat.r : 0.5) * it.s, it.type === 'crowd' || !it.batch ? 0.5 : it.batch.info.rad * it.s * 0.55), h = Math.max(0.6, (it.batch ? it.batch.info.h : 2) * it.s);
      let t0, t1;
      if (hl < 1e-6) { if ((o.x - it.x) ** 2 + (o.z - it.z) ** 2 > r * r) continue; t0 = (it.y - o.y) / d.y; t1 = (it.y + h - o.y) / d.y; }
      else {
        const ox = o.x - it.x, oz = o.z - it.z, a = hl * hl, b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r, disc = b * b - 4 * a * c;
        if (disc < 0) continue;
        const sq = Math.sqrt(disc); t0 = (-b - sq) / (2 * a); t1 = (-b + sq) / (2 * a);
      }
      if (t1 < 0) continue;
      // clip against the y slab
      let lo = Math.min(t0, t1), hi = Math.max(t0, t1);
      if (Math.abs(d.y) > 1e-9) { const ya = (it.y - o.y) / d.y, yb = (it.y + h - o.y) / d.y; lo = Math.max(lo, Math.min(ya, yb)); hi = Math.min(hi, Math.max(ya, yb)); }
      else if (o.y < it.y || o.y > it.y + h) continue;
      if (hi < Math.max(lo, 0)) continue;
      const t = Math.max(lo, 0);
      if (t < bt) { bt = t; best = it; }
    }
    return best ? { id: best.id, t: bt } : null;
  }

  // ---------------------------------------------------------------- events
  /** Wire a world.events bus: prop damage/destruction/spawn, craters, and crowd reactions. */
  bindEvents(bus) {
    this.unbindEvents();
    const u = this.unbinders;
    u.push(bus.on('prop_damaged', (e) => {
      this.setStage(e.id, e.hpFrac < 0.6 ? 1 : 0);
      const fx = this.fx, it = this.items.get(e.id);
      if (fx && it) { const h = (it.cat ? it.cat.h : 1) * it.s, cols = debrisColors(it.type); fx.debrisBurst(e.x, e.y + h * 0.4, e.z, cols, 4, 0.5, 0.12); fx.dust(e.x, e.y + h * 0.3, e.z, 2, 0xcdbb94, 1.2); }
    }));
    u.push(bus.on('prop_destroyed', (e) => this.remove(e.id)));
    u.push(bus.on('prop_spawned', (e) => { this.add({ id: e.id, t: e.type, x: e.x, z: e.z }); }));
    u.push(bus.on('crater', (e) => this.reground(e.x, e.z, e.r * 1.4)));
    u.push(bus.on('unit_kill', (e) => { this._exc = Math.min(1.6, this._exc + 0.3); this._lastKill[0] = e.x; this._lastKill[1] = e.z; }));
    u.push(bus.on('first_blood', () => { this._exc = Math.min(1.6, this._exc + 0.7); }));
    u.push(bus.on('kill_streak', () => { this._exc = Math.min(1.6, this._exc + 0.6); }));
    u.push(bus.on('crowd_roar', (e) => this.crowdReact('cheer', (e && e.strength) || 0.9, e && e.x, e && e.z)));
    u.push(bus.on('hero_down', () => this.crowdReact('gasp', 1, this._lastKill[0], this._lastKill[1])));
    u.push(bus.on('battle_end', () => this.crowdReact('cheer', 1, 0, 0)));
  }
  unbindEvents() { for (const f of this.unbinders) if (f) f(); this.unbinders.length = 0; }
  /** Make the spectators cheer or gasp (rate-limited by the caller or by the excitement meter fed from unit_kill). */
  crowdReact(kind, strength = 1, x = 0, z = 0) { return this.crowd.trigger(kind, strength, x, z); }
  /** Replace the procedural spectator poses: fn(pose Float32Array(6*9), kind, k 0..1, time, phase, member). ANIM may supply clip sampling. */
  setCrowdPose(fn) { this.crowd.poseFn = fn || null; }
  setCrowdEnabled(on) { this.crowdEnabled = !!on; }

  // ---------------------------------------------------------------- per frame
  update(dt, camera) {
    dt = Math.min(Math.max(dt, 0), 0.1);
    this.time += dt;
    const cam = camera || this.engine.camera;
    // excitement meter -> crowd cheer waves
    if (this._exc > 0) {
      this._exc = Math.max(0, this._exc - dt * 0.55); this._crowdCool -= dt;
      if (this._exc > 0.55 && this._crowdCool <= 0 && this.crowd.members.length) { this.crowd.trigger('cheer', Math.min(1, this._exc), this._lastKill[0], this._lastKill[1]); this._crowdCool = 2.2; }
    }
    // bobbing floaters (ships on the water, cloud islands)
    for (let i = 0; i < this.floaters.length; i++) {
      const it = this.floaters[i], fl = FLOAT[it.type]; if (!it.batch) continue;
      it.y = it.baseY + Math.sin(this.time * fl.w + it.phase) * fl.amp; this._writeMatrix(it); it.batch.dirty = true;
    }
    this._cull(cam);
    this._emit(dt, cam);
    if (this.crowdEnabled && this.crowd.members.length) this.crowd.update(dt);
    if (this.lights.length) this._updateLights(dt, cam);
  }
  _cull(cam) {
    if (!cam) return;
    cam.updateMatrixWorld();
    const e = cam.matrixWorld.elements, pe = cam.projectionMatrix.elements, L = this.lastCam;
    let moved = this.camDirty;
    if (!moved) for (let i = 0; i < 16; i++) if (Math.abs(e[i] - L[i]) > 2e-4) { moved = true; break; }
    if (!moved && (Math.abs(pe[0] - L[16]) > 1e-5 || Math.abs(pe[5] - L[17]) > 1e-5)) moved = true;
    let any = false;
    for (const b of this.batches.values()) if (b.dirty) { any = true; break; }
    if (!moved && !any) return;
    for (let i = 0; i < 16; i++) L[i] = e[i]; L[16] = pe[0]; L[17] = pe[5];
    this.camDirty = false;
    this.pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse.copy(cam.matrixWorld).invert());
    this.frustum.setFromProjectionMatrix(this.pv);
    const cx = e[12], cy = e[13], cz = e[14], k = this.tier.lod, n2 = (LOD_NEAR * k) ** 2, f2 = (LOD_FAR * k) ** 2, c2 = this.tier.cull ** 2, sph = this.sph, fr = this.frustum;
    let inst = 0, draws = 0, tris = 0;
    for (const b of this.batches.values()) {
      const cnt = b.counts; cnt[0] = cnt[1] = cnt[2] = 0;
      const nl = b.info.nl, items = b.items, src = b.src, m0 = b.meshes[0].instanceMatrix.array;
      const arrs = [m0, nl > 1 ? b.meshes[1].instanceMatrix.array : null, nl > 2 ? b.meshes[2].instanceMatrix.array : null];
      for (let i = 0; i < items.length; i++) {
        const it = items[i], dx = it.x - cx, dz = it.z - cz, dy = it.y + it.cy - cy, d2 = dx * dx + dz * dz + dy * dy;
        if (it.tiny && d2 > c2) continue;
        sph.center.set(it.x, it.y + it.cy, it.z); sph.radius = it.rad + it.margin;
        if (!fr.intersectsSphere(sph)) continue;
        let l = d2 < n2 ? 0 : d2 < f2 ? 1 : 2; if (l >= nl) l = nl - 1;
        const a = arrs[l], o = cnt[l]++ * 16, s = i * 16;
        for (let q = 0; q < 16; q++) a[o + q] = src[s + q];
      }
      for (let l = 0; l < nl; l++) {
        const m = b.meshes[l], c = cnt[l];
        m.count = c; m.visible = c > 0;
        if (c) { m.instanceMatrix.updateRange.offset = 0; m.instanceMatrix.updateRange.count = c * 16; m.instanceMatrix.needsUpdate = true; inst += c; draws++; tris += c * b.info.tris[l]; }
      }
      b.dirty = false;
    }
    this.visible.instances = inst; this.visible.draws = draws; this.visible.triangles = tris;
  }
  _emit(dt, cam) {
    const fx = this.fx; if (!fx) return;
    const e = cam ? cam.matrixWorld.elements : null, cx = e ? e[12] : 0, cy = e ? e[13] : 0, cz = e ? e[14] : 0;
    const maxD2 = (this.tier.cull * 0.85) ** 2, rate = this.tier.fx;
    for (let i = 0; i < this.emitters.length; i++) {
      const it = this.emitters[i]; if (!it.em) continue;
      if ((it.x - cx) ** 2 + (it.z - cz) ** 2 + (it.y - cy) ** 2 > maxD2) continue;
      it.etimer -= dt;
      if (it.etimer > 0) continue;
      for (let k = 0; k < it.em.length; k++) {
        const em = it.em[k];
        if (em.kind === 'fire') { fx.fire(em.x, em.y, em.z, fxRand.next() < 0.5 ? 1 : 2); if (fxRand.next() < 0.07 * rate) fx.smoke(em.x, em.y + 0.5, em.z, 1, 0x9096a3); if (fxRand.next() < 0.1 * rate) fx.sparks(em.x, em.y + 0.1, em.z, 1, 0xffb02a, 1.6); }
        else if (em.kind === 'smoke') { if (fxRand.next() < 0.6 * rate) fx.smoke(em.x, em.y, em.z, 1, 0x666a74); }
        else if (em.kind === 'ember') { if (fxRand.next() < 0.5 * rate) fx.sparks(em.x, em.y, em.z, 1, 0xff8a2a, 1.4); }
      }
      it.etimer = (0.1 + fxRand.next() * 0.08) / Math.max(0.3, rate);
    }
    // burning props: flames licking up the model and smoke
    if (this.burning.size) for (const it of this.burning.values()) {
      if (!it.batch || (it.x - cx) ** 2 + (it.z - cz) ** 2 > maxD2) continue;
      it.etimer -= dt; if (it.etimer > 0) continue;
      const h = (it.cat ? it.cat.h : 1) * it.s, r = Math.max(0.3, (it.cat ? it.cat.r : 0.5) * it.s);
      fx.fire(it.x + (fxRand.next() - 0.5) * r * 1.4, it.y + h * (0.2 + fxRand.next() * 0.7), it.z + (fxRand.next() - 0.5) * r * 1.4, 2);
      if (fxRand.next() < 0.5) fx.smoke(it.x, it.y + h, it.z, 1, 0x666a76);
      it.etimer = 0.09 / Math.max(0.4, rate);
    }
  }
  _night() {
    const t = this.engine.env ? this.engine.env.time : 12;
    const sm = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
    return t >= 12 ? sm(17, 19.5, t) : 1 - sm(4.5, 7, t);
  }
  _updateLights(dt, cam) {
    const night = this._night(), L = this.lights;
    this._lightT -= dt;
    if (this._lightT <= 0 && this.emitters.length) {
      this._lightT = 0.3;
      const f = this.engine.focus, fx0 = f ? f.x : (cam ? cam.position.x : 0), fz0 = f ? f.z : (cam ? cam.position.z : 0);
      const cand = [];
      for (const it of this.emitters) if (it.em && it.em[0].kind === 'fire') cand.push([(it.x - fx0) ** 2 + (it.z - fz0) ** 2, it]);
      cand.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < L.length; i++) { const c = cand[i]; L[i].userData.it = c && c[0] < 55 * 55 ? c[1] : null; }
    }
    for (let i = 0; i < L.length; i++) {
      const l = L[i], it = l.userData.it, want = it && it.em ? (0.5 + 1.7 * night) * (0.88 + 0.12 * Math.sin(this.time * 17 + i * 3) + 0.06 * Math.sin(this.time * 31 + i)) : 0;
      l.intensity += (want - l.intensity) * Math.min(1, dt * 6);
      if (it && it.em) l.position.set(it.em[0].x, it.em[0].y + 0.25, it.em[0].z);
      l.distance = 9 + 6 * night;
    }
  }

  // ---------------------------------------------------------------- diagnostics / teardown
  /** Counts for diagnostics and the draw-call budget check (R2): batches, draw calls this frame, visible instances/triangles. */
  stats() {
    let meshes = 0; for (const b of this.batches.values()) meshes += b.meshes.length;
    return { items: this.items.size, batches: this.batches.size, meshes, drawCalls: this.visible.draws + this.crowd.skins.filter((s) => s && s.mesh.visible).length, instances: this.visible.instances, triangles: this.visible.triangles, crowd: this.crowd.members.length, emitters: this.emitters.length, lights: this.lights.length };
  }
  dispose() {
    this.unbindEvents(); this.clear();
    for (const l of this.lights) this.scene.remove(l);
    this.lights = []; this.scene.remove(this.group);
  }
}
