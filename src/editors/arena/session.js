// EditSession: the document model of the Arena Builder (pure; no DOM, no THREE). Wraps an Arena, owns the undo stack (core/undo.js, 100 steps,
// delta-compressed) and exposes every edit as an undoable operation: brush strokes, stamps, ramps, props, hazards, markers, zones, water,
// environment, objective, size, generate. Observers (the 3D view, the validator panel, the autosave) subscribe with on(fn) and receive events:
//   {kind:'terrain', rect}  {kind:'props', added, removed, changed}  {kind:'hazards'|'markers'|'zones'|'water'|'env'|'meta'|'objective'}
//   {kind:'all'} (the whole document was replaced)   {kind:'history'} (undo/redo availability changed)
// Everything an edit changes is recorded as a command, so undoing the whole stack restores the exact start state (hash-equal, tested).

import { Arena, SIZES, CELL, HSTEP, MAX_H, MAT, WEATHERS } from '../../world/arena.js';
import { generateArena } from '../../world/gen.js';
import { UndoStack } from '../../core/undo.js';
import { propInfo } from '../../content/era_ancient/props/catalog.js';
import { LIMITS, BRUSH, HAZARD_BY_ID, MARKER_BY_ID, OBJECTIVE_BY_ID, STAMPS, THEMES, MOODS, SYMMETRY } from './consts.js';
import { CellRecorder, Stroke, applyStamp } from './strokes.js';
import { carveRamp } from './paths.js';
import { clamp, lerp, symWorld, unionRect } from './geom.js';

const clone = (v) => (v === null || v === undefined ? v : JSON.parse(JSON.stringify(v)));
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const round3 = (v) => Math.round(v * 1000) / 1000;
const round2 = (v) => Math.round(v * 100) / 100;      // props serialise with 2 decimals (Arena.toJSON): keep exactly what survives a save

/** FNV-1a over the whole document (terrain, materials, props, zones, hazards, markers, env, water, meta). Used by the undo / symmetry tests. */
export function hashArena(a) {
  let h = 2166136261 >>> 0;
  const mix = (b) => { h ^= b & 255; h = Math.imul(h, 16777619) >>> 0; };
  const mixStr = (s) => { for (let i = 0; i < s.length; i++) { mix(s.charCodeAt(i)); mix(s.charCodeAt(i) >> 8); } };
  mix(a.size); mix(a.size >> 8);
  for (let i = 0; i < a.h.length; i++) mix(a.h[i]);
  for (let i = 0; i < a.m.length; i++) mix(a.m[i]);
  mixStr(JSON.stringify([a.props.map((p) => [p.t, +p.x.toFixed(3), +p.z.toFixed(3), +(p.r || 0).toFixed(3), +(p.s || 1).toFixed(3), p.v | 0]), a.zones, a.hazards, a.markers, a.env, a.water, a.lava, a.biome]));
  return h >>> 0;
}

// ---------------------------------------------------------------------------------------------------------------- commands
function cmdCells(sess, label, d) {
  const a = sess.arena;
  const apply = (hs, ms) => { const idx = d.idx; for (let k = 0; k < idx.length; k++) { a.h[idx[k]] = hs[k]; a.m[idx[k]] = ms[k]; } sess._changed({ kind: 'terrain', rect: d.rect }); };
  return { label, do: () => apply(d.h1, d.m1), undo: () => apply(d.h0, d.m0) };
}
function composite(label, cmds) {
  return { label, do() { for (const c of cmds) c.do(); }, undo() { for (let i = cmds.length - 1; i >= 0; i--) cmds[i].undo(); } };
}
/** Generic value command with merge support (slider drags and gestures coalesce into one step). */
function cmdSet(sess, o) {
  const gesture = sess._gesture, t0 = now();
  const cmd = {
    label: o.label, key: o.key, gesture, t: t0, after: o.after,
    do() { o.apply(cmd.after); },
    undo() { o.apply(o.before); },
    merge(next) {
      if (next.key !== cmd.key) return false;
      const ok = (gesture || next.gesture) ? gesture === next.gesture : (next.t - cmd.t < 700);
      if (ok) { cmd.after = next.after; cmd.t = next.t; }
      return ok;
    },
  };
  return cmd;
}
const LIST_EVENT = { props: 'props', hazards: 'hazards', markers: 'markers' };

/** Operation log over one of the arena lists (props, hazards, markers): live apply + exact undo (original indices restored). */
class ListLog {
  constructor(sess, name) { this.s = sess; this.name = name; this.ops = []; }
  get list() { return this.s.arena[this.name]; }
  add(item) { this.list.push(item); this.ops.push({ t: 'add', item }); this._emit({ added: [item] }); return item; }
  remove(item) {
    const l = this.list, i = l.indexOf(item);
    if (i < 0) return false;
    l.splice(i, 1); this.ops.push({ t: 'rem', item, index: i }); this._emit({ removed: [item] }); return true;
  }
  /** Change fields of an item; the first patch of an item records its "before". */
  patch(item, after) {
    let op = null;
    for (let k = this.ops.length - 1; k >= 0; k--) if (this.ops[k].t === 'set' && this.ops[k].item === item) { op = this.ops[k]; break; }
    if (!op) { op = { t: 'set', item, before: {}, after: {} }; this.ops.push(op); }
    for (const key of Object.keys(after)) { if (!(key in op.before)) op.before[key] = item[key]; op.after[key] = after[key]; item[key] = after[key]; }
    this._emit({ changed: [item] });
  }
  _emit(d) { this.s._changed(Object.assign({ kind: LIST_EVENT[this.name], added: [], removed: [], changed: [] }, d)); }
  toCmd(label) {
    if (!this.ops.length) return null;
    const log = this, ops = this.ops.slice();
    return {
      label,
      do() {
        const ev = { added: [], removed: [], changed: [] };
        for (const op of ops) {
          if (op.t === 'add') { log.list.push(op.item); ev.added.push(op.item); }
          else if (op.t === 'rem') { const i = log.list.indexOf(op.item); if (i >= 0) log.list.splice(i, 1); ev.removed.push(op.item); }
          else { Object.assign(op.item, op.after); ev.changed.push(op.item); }
        }
        log._emit(ev);
      },
      undo() {
        const ev = { added: [], removed: [], changed: [] };
        for (let k = ops.length - 1; k >= 0; k--) {
          const op = ops[k];
          if (op.t === 'add') { const i = log.list.indexOf(op.item); if (i >= 0) log.list.splice(i, 1); ev.removed.push(op.item); }
          else if (op.t === 'rem') { log.list.splice(Math.min(op.index, log.list.length), 0, op.item); ev.added.push(op.item); }
          else { Object.assign(op.item, op.before); ev.changed.push(op.item); }
        }
        log._emit(ev);
      },
    };
  }
}

// ---------------------------------------------------------------------------------------------------------------- snapshots
// Snapshots keep the IDENTITY of prop / hazard / marker objects (their fields are stored beside them): the list commands recorded earlier
// refer to those objects, so undoing a resize or a generate must hand the very same objects back.
function snapshotOf(a) {
  const keep = (list) => list.map((o) => [o, Object.assign({}, o)]);
  return { size: a.size, h: a.h.slice(), m: a.m.slice(), props: keep(a.props), hazards: keep(a.hazards), markers: keep(a.markers), zones: clone(a.zones), water: a.water, lava: a.lava, biome: a.biome, env: clone(a.env), seed: a.seed };
}
function restoreSnapshot(a, s) {
  const back = (list) => list.map(([o, f]) => Object.assign(o, f));
  a.size = s.size; a.h = s.h.slice(); a.m = s.m.slice(); a.props = back(s.props); a.hazards = back(s.hazards); a.markers = back(s.markers); a.zones = clone(s.zones);
  a.water = s.water; a.lava = s.lava; a.biome = s.biome; a.env = clone(s.env); a.seed = s.seed;
}

/** Resample an arena to a new cell size: bilinear (box-filtered when shrinking) heights, nearest materials, everything else scaled with the map. */
export function resampleArena(src, n2) {
  const n = src.size, f = n2 / n, out = new Arena(n2);
  out.name = src.name; out.author = src.author; out.desc = src.desc; out.seed = src.seed; out.biome = src.biome; out.water = src.water; out.lava = src.lava; out.env = clone(src.env);
  const sample = (u, v) => {
    const x0 = Math.floor(u), z0 = Math.floor(v), tx = u - x0, tz = v - z0;
    const g = (x, z) => src.h[clamp(x, 0, n - 1) + clamp(z, 0, n - 1) * n];
    return (g(x0, z0) * (1 - tx) + g(x0 + 1, z0) * tx) * (1 - tz) + (g(x0, z0 + 1) * (1 - tx) + g(x0 + 1, z0 + 1) * tx) * tz;
  };
  for (let z = 0; z < n2; z++) for (let x = 0; x < n2; x++) {
    const u = (x + 0.5) / f - 0.5, v = (z + 0.5) / f - 0.5;
    let hv;
    if (f < 1) { const d = 0.25 / f; hv = (sample(u - d, v - d) + sample(u + d, v - d) + sample(u - d, v + d) + sample(u + d, v + d)) / 4; }
    else hv = sample(u, v);
    out.h[x + z * n2] = clamp(Math.round(hv), 0, MAX_H);
    out.m[x + z * n2] = src.m[clamp(Math.floor((x + 0.5) / f), 0, n - 1) + clamp(Math.floor((z + 0.5) / f), 0, n - 1) * n];
  }
  const W2 = n2 * CELL;
  const zone = (zn) => (zn ? { x: zn.x * f, z: zn.z * f, w: Math.min(W2, zn.w * f), d: Math.min(W2, zn.d * f) } : null);
  out.zones = { A: zone(src.zones.A), B: zone(src.zones.B) };
  out.hazards = src.hazards.map((h) => Object.assign({}, h, { x: round3(h.x * f), z: round3(h.z * f) }));
  out.markers = src.markers.map((m) => Object.assign({}, m, { x: round3(m.x * f), z: round3(m.z * f) }));
  const lim = W2 / 2 - 0.5;
  out.props = src.props.map((p) => Object.assign({}, p, { x: round3(p.x * f), z: round3(p.z * f) })).filter((p) => Math.abs(p.x) <= lim && Math.abs(p.z) <= lim);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- session
export class EditSession {
  /** @param {Arena} arena  @param {{objective?:string, tags?:string[], id?:string|null}} [meta] */
  constructor(arena, meta = {}) {
    this.arena = arena;
    this.objective = OBJECTIVE_BY_ID[meta.objective] ? meta.objective : 'eliminate';
    this.tags = Array.isArray(meta.tags) ? meta.tags.slice(0, LIMITS.tagsMax) : [];
    this.id = meta.id || null;                 // library id once saved
    this.symmetry = 'off';
    this.undo = new UndoStack(LIMITS.undo);
    this.listeners = new Set();
    this.rev = 0; this.savedRev = 0;
    this._gesture = 0; this._gestureSeq = 0;
    this.undo.onChange(() => this._emit({ kind: 'history' }));
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(evt) { for (const f of this.listeners) f(evt); }
  _changed(evt) { this.rev++; this._emit(evt); }
  get dirty() { return this.rev !== this.savedRev; }
  markSaved() { this.savedRev = this.rev; this._emit({ kind: 'meta', saved: true }); }
  setSymmetry(mode) { this.symmetry = SYMMETRY.includes(mode) ? mode : 'off'; this._emit({ kind: 'symmetry' }); }

  /** Open / close a gesture: every set-style edit inside it (zone drag, slider drag) merges into one undo step. */
  beginGesture() { this._gesture = ++this._gestureSeq; return this._gesture; }
  endGesture() { this._gesture = 0; }

  /** Transaction: collects terrain deltas and list operations into ONE undo step. */
  tx(label) {
    const sess = this, logs = new Map(); let rec = null;
    return {
      get rec() { return rec || (rec = new CellRecorder(sess.arena)); },
      log(name) { let l = logs.get(name); if (!l) { l = new ListLog(sess, name); logs.set(name, l); } return l; },
      commit() {
        const cmds = []; let rect = null;
        if (rec) { const d = rec.finish(); if (d) { cmds.push(cmdCells(sess, label, d)); rect = d.rect; } }
        for (const l of logs.values()) { const c = l.toCmd(label); if (c) cmds.push(c); }
        if (!cmds.length) return null;
        const cmd = cmds.length === 1 ? cmds[0] : composite(label, cmds);
        sess.undo.push(cmd);
        if (rect) sess._changed({ kind: 'terrain', rect, done: true });
        return cmd;
      },
    };
  }

  // ------------------------------------------------------------------------------------------------ terrain
  /** Start a brush stroke ('raise' | 'smooth' | 'flatten' | 'paint' | 'noise'). dab(wx, wz, lower) applies live; end() records ONE undo step. */
  beginStroke(tool, opts) {
    const sess = this, stroke = new Stroke(this.arena, tool, Object.assign({}, opts, { symmetry: this.symmetry }));
    const label = { raise: 'Sculpt', smooth: 'Smooth', flatten: 'Flatten', paint: 'Paint', noise: 'Noise' }[tool] || 'Brush';
    return {
      stroke,
      dab(wx, wz, lower) { const r = stroke.dab(wx, wz, lower); if (r) sess._changed({ kind: 'terrain', rect: r, live: true }); return r; },
      end() { const d = stroke.end(); if (d) { sess.undo.push(cmdCells(sess, label, d)); sess._changed({ kind: 'terrain', rect: d.rect, done: true }); } return d; },
    };
  }
  stamp(kind, wx, wz, o) {
    if (!STAMPS.includes(kind)) return null;
    const t = this.tx('Stamp ' + kind), rect = applyStamp(this.arena, t.rec, kind, wx, wz, Object.assign({ symmetry: this.symmetry }, o));
    const cmd = t.commit();
    return cmd ? rect : null;
  }
  /** Cut a ramp / road along a polyline [{x, z}]. Clears the props in its way. Returns {rect, removed} or null. */
  ramp(line, o) {
    const t = this.tx('Ramp'), sym = this.symmetry, lines = [line];
    if (sym !== 'off') lines.push(line.map((p) => { const c = symWorld(sym, p.x, p.z, 0)[0]; return { x: c.x, z: c.z }; }));
    let rect = null; const blockers = new Set();
    for (const ln of lines) {
      const r = carveRamp(this.arena, t.rec, ln, o);
      if (!r) continue;
      rect = unionRect(rect, r.rect); for (const p of r.blockers) blockers.add(p);
    }
    const log = t.log('props'); for (const p of blockers) log.remove(p);
    const cmd = t.commit();
    return cmd ? { rect, removed: blockers.size } : null;
  }

  // ------------------------------------------------------------------------------------------------ props
  _normProp(d) {
    const info = propInfo(d.t); if (!info) return null;
    const lim = this.arena.half() - 0.5, sc = info.scale || [0.7, 1.6];
    return {
      t: d.t, x: round2(clamp(d.x, -lim, lim)), z: round2(clamp(d.z, -lim, lim)), r: round3(d.r || 0),
      s: round2(clamp(d.s || 1, Math.min(sc[0], 0.3), Math.max(sc[1], 4))), v: (d.v | 0) & 3,
    };
  }
  /** Begin a prop stroke (scatter brush, erase brush, drag). The returned object applies live; end() records one undo step. */
  beginPropStroke(label = 'Props') {
    const sess = this, t = this.tx(label), log = t.log('props');
    return {
      /** Add props (with symmetric copies). Returns the objects actually added (the 1,500 limit truncates). */
      add(defs, o = {}) {
        const out = [];
        for (const d of defs) {
          const variants = [d];
          if (o.sym !== false) for (const c of symWorld(sess.symmetry, d.x, d.z, d.r || 0)) if (Math.hypot(c.x - d.x, c.z - d.z) > 0.25) variants.push(Object.assign({}, d, c));
          for (const w of variants) {
            if (sess.arena.props.length >= LIMITS.props) return out;
            const p = sess._normProp(w); if (!p) continue;
            log.add(p); out.push(p);
          }
        }
        return out;
      },
      remove(items) { let n = 0; for (const p of items) if (log.remove(p)) n++; return n; },
      /** Change fields of one prop (move, rotate, scale, variant). */
      patch(p, after) { log.patch(p, after); },
      end() { return t.commit(); },
    };
  }
  addProp(d, o) { const ps = this.beginPropStroke('Place ' + d.t); const out = ps.add([d], o); ps.end(); return out; }
  removeProps(items, label = 'Delete props') { const ps = this.beginPropStroke(label); const n = ps.remove(items); ps.end(); return n; }
  /** Props within radius (u) of a point, optionally filtered by a predicate. */
  propsNear(x, z, r, pred) { const out = []; const r2 = r * r; for (const p of this.arena.props) if ((p.x - x) ** 2 + (p.z - z) ** 2 <= r2 && (!pred || pred(p))) out.push(p); return out; }

  // ------------------------------------------------------------------------------------------------ hazards and markers
  addHazard(d) {
    const kind = HAZARD_BY_ID[d.t]; if (!kind) return null;
    if (this.arena.hazards.length >= LIMITS.hazards) return null;
    const lim = this.arena.half(), r = clamp(d.r || kind.r, 1, 30);
    const h = { t: d.t, x: round3(clamp(d.x, -lim, lim)), z: round3(clamp(d.z, -lim, lim)), r: round3(r) };
    const t = this.tx('Place ' + d.t);
    t.log('hazards').add(h);
    if (d.t === 'lava') this._paintDisc(t.rec, h, MAT.lava);
    t.commit();
    return h;
  }
  _paintDisc(rec, h, mat) {
    const a = this.arena, n = a.size, rc = h.r / CELL, u = (h.x + a.half()) / CELL, v = (h.z + a.half()) / CELL;
    for (let z = Math.max(0, Math.floor(v - rc - 1)); z <= Math.min(n - 1, Math.ceil(v + rc + 1)); z++) for (let x = Math.max(0, Math.floor(u - rc - 1)); x <= Math.min(n - 1, Math.ceil(u + rc + 1)); x++) {
      if (Math.hypot(x + 0.5 - u, z + 0.5 - v) <= rc && a.m[x + z * n] !== mat) rec.setM(x + z * n, mat);
    }
  }
  removeHazards(items) {
    const t = this.tx('Delete hazard'), log = t.log('hazards');
    for (const h of items) { if (!log.remove(h)) continue; if (h.t === 'lava') this._repaintLava(t.rec, h); }
    return t.commit();
  }
  /** Removing a lava pool turns its lava cells back into dirt (the pool painted them). */
  _repaintLava(rec, h) {
    const a = this.arena, n = a.size, rc = h.r / CELL, u = (h.x + a.half()) / CELL, v = (h.z + a.half()) / CELL;
    for (let z = Math.max(0, Math.floor(v - rc - 1)); z <= Math.min(n - 1, Math.ceil(v + rc + 1)); z++) for (let x = Math.max(0, Math.floor(u - rc - 1)); x <= Math.min(n - 1, Math.ceil(u + rc + 1)); x++) {
      if (Math.hypot(x + 0.5 - u, z + 0.5 - v) <= rc && a.m[x + z * n] === MAT.lava) rec.setM(x + z * n, MAT.dirt);
    }
  }
  /** Move / resize hazards; call between beginGesture() and endGesture() for drags. */
  patchHazard(h, after) { const t = this.tx('Move hazard'); t.log('hazards').patch(h, after); return t.commit(); }

  markerId(type) {
    if (type !== 'waypoint') return type;
    const used = new Set(this.arena.markers.map((m) => m.id));
    for (let i = 1; i < 99; i++) if (!used.has('wp' + i)) return 'wp' + i;
    return 'wp99';
  }
  addMarker(d) {
    const kind = MARKER_BY_ID[d.type]; if (!kind) return null;
    if (this.arena.markers.length >= LIMITS.markers) return null;
    // one of each unique type: placing a second hill / exit / vip_start / general_spawn moves the existing one instead
    if (d.type !== 'waypoint') { const ex = this.arena.markers.find((m) => m.type === d.type); if (ex) { this.patchMarker(ex, { x: d.x, z: d.z }); return ex; } }
    const lim = this.arena.half();
    const m = { id: this.markerId(d.type), type: d.type, x: round3(clamp(d.x, -lim, lim)), z: round3(clamp(d.z, -lim, lim)), r: round3(clamp(d.r || kind.r, 1, 30)) };
    const t = this.tx('Place marker'); t.log('markers').add(m); t.commit();
    return m;
  }
  removeMarkers(items) { const t = this.tx('Delete marker'), log = t.log('markers'); for (const m of items) log.remove(m); return t.commit(); }
  patchMarker(m, after) { const t = this.tx('Move marker'); t.log('markers').patch(m, after); return t.commit(); }

  // ------------------------------------------------------------------------------------------------ zones, water, environment, objective
  /** Set a zone rect {x, z, w, d} (null removes it). Merges inside a gesture. */
  setZone(key, rect) {
    const a = this.arena, before = clone(a.zones[key]);
    const after = rect ? { x: round3(rect.x), z: round3(rect.z), w: round3(Math.max(LIMITS.zoneMin, rect.w)), d: round3(Math.max(LIMITS.zoneMin, rect.d)) } : null;
    const apply = (v) => { a.zones[key] = clone(v); this._changed({ kind: 'zones' }); };
    this.undo.exec(cmdSet(this, { label: 'Zone ' + key, key: 'zone.' + key, before, after, apply }));
    return a.zones[key];
  }
  setWater(level, lava) {
    const a = this.arena, before = { water: a.water, lava: a.lava };
    const after = { water: clamp(Math.round(level === undefined ? a.water : level), 0, MAX_H), lava: lava === undefined ? a.lava : !!lava };
    if (before.water === after.water && before.lava === after.lava) return;
    const apply = (v) => { a.water = v.water; a.lava = v.lava; this._changed({ kind: 'water' }); };
    this.undo.exec(cmdSet(this, { label: after.lava ? 'Lava level' : 'Water level', key: 'water', before, after, apply }));
  }
  /** Environment fields: time (0-24), weather, fog (0-1), wind (0-1), theme, mood. */
  setEnv(patch) {
    const a = this.arena, after = {};
    if (patch.time !== undefined) after.time = clamp(+patch.time || 0, 0, 24);
    if (patch.weather !== undefined && WEATHERS.includes(patch.weather)) after.weather = patch.weather;
    if (patch.fog !== undefined) after.fog = clamp(+patch.fog || 0, 0, 1);
    if (patch.wind !== undefined) after.wind = clamp(+patch.wind || 0, 0, 1);
    if (patch.theme !== undefined && THEMES.includes(patch.theme)) after.theme = patch.theme;
    if (patch.mood !== undefined && MOODS.includes(patch.mood)) after.mood = patch.mood;
    const keys = Object.keys(after); if (!keys.length) return;
    const before = {}; for (const k of keys) before[k] = a.env[k];
    if (keys.every((k) => before[k] === after[k])) return;
    const apply = (v) => { Object.assign(a.env, v); this._changed({ kind: 'env' }); };
    this.undo.exec(cmdSet(this, { label: 'Environment', key: 'env.' + keys.sort().join(','), before, after, apply }));
  }
  setObjective(id) {
    if (!OBJECTIVE_BY_ID[id] || id === this.objective) return;
    const before = this.objective, apply = (v) => { this.objective = v; this._changed({ kind: 'objective' }); };
    this.undo.exec(cmdSet(this, { label: 'Objective', key: 'objective', before, after: id, apply }));
  }

  // ------------------------------------------------------------------------------------------------ meta (text fields: not part of the undo history)
  setName(s) { this.arena.name = String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, LIMITS.nameMax); this._changed({ kind: 'meta' }); }
  setAuthor(s) { this.arena.author = String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, LIMITS.authorMax); this._changed({ kind: 'meta' }); }
  setDesc(s) { this.arena.desc = String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, LIMITS.descMax); this._changed({ kind: 'meta' }); }
  setTags(list) {
    const seen = new Set(), out = [];
    for (const t of list || []) { const s = String(t).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, LIMITS.tagMax); if (s && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); } }
    this.tags = out.slice(0, LIMITS.tagsMax); this._changed({ kind: 'meta' });
  }

  // ------------------------------------------------------------------------------------------------ whole-document operations
  /** Replace everything with `next` (a snapshot-based undoable operation, e.g. resize or generate). */
  _replaceUndoable(label, mutate) {
    const a = this.arena, before = snapshotOf(a);
    mutate();
    const after = snapshotOf(a);
    const apply = (s) => { restoreSnapshot(a, s); this._changed({ kind: 'all' }); };
    const cmd = { label, do: () => apply(after), undo: () => apply(before) };
    this.undo.push(cmd);
    this._changed({ kind: 'all' });
    return cmd;
  }
  /** Resize to 'small' | 'medium' | 'large' (128 / 192 / 256 cells). Resamples the map. */
  resize(sizeClass) {
    const n2 = typeof sizeClass === 'number' ? sizeClass : SIZES[sizeClass];
    if (!n2 || n2 === this.arena.size) return false;
    this._replaceUndoable('Resize', () => { const out = resampleArena(this.arena, n2); restoreSnapshot(this.arena, snapshotOf(out)); });
    return true;
  }
  /** Apply a recipe to the current size. parts: 'terrain' | 'props' | 'both'. */
  generate(recipe, seed, parts = 'both') {
    const a = this.arena, g = generateArena(recipe, a.size, seed >>> 0);
    this._replaceUndoable('Generate ' + recipe, () => {
      if (parts === 'terrain' || parts === 'both') { a.h = g.h.slice(); a.m = g.m.slice(); a.water = g.water; a.lava = g.lava; a.biome = g.biome; }
      if (parts === 'props' || parts === 'both') { a.props = g.props.map((p) => Object.assign({}, p)); a.hazards = clone(g.hazards); a.markers = clone(g.markers || []); }
      if (parts === 'both') { a.zones = clone(g.zones); a.env = Object.assign({}, a.env, clone(g.env)); a.seed = g.seed; }
    });
    return g;
  }
  /** Load a different document (New / Open / template). Not undoable: the history starts afresh. */
  load(arena, meta = {}) {
    this.arena = arena;
    this.objective = OBJECTIVE_BY_ID[meta.objective] ? meta.objective : 'eliminate';
    this.tags = Array.isArray(meta.tags) ? meta.tags.slice(0, LIMITS.tagsMax) : [];
    this.id = meta.id || null;
    this.undo.clear();
    this._changed({ kind: 'all' });
    this.savedRev = this.rev;
    this._emit({ kind: 'meta', saved: true });
  }
}

/** A brand-new arena from a recipe. size: 'small' | 'medium' | 'large' | cells. */
export function newArenaFrom(recipe, size, seed, name) {
  const a = generateArena(recipe, size, seed >>> 0);
  a.name = String(name || a.name).slice(0, LIMITS.nameMax); a.author = 'You'; a.desc = '';
  return a;
}
export { clamp, lerp, BRUSH };
