// Arena Builder 3D overlays on the EditorHost: the brush cursor that follows the terrain, zone drapes (translucent blue / red), hazard and marker
// markers with icons, the selection ring, the ramp preview line and the prop-renderer sync. Everything is built from instanced cubes and a few
// draped meshes so it matches the voxel look and costs a handful of draw calls. DOM-free except for the tiny canvases behind the icon sprites.

import { CELL, HSTEP } from '../../world/arena.js';
import { lin } from '../../render/engine.js';
import { propInfo } from '../../content/era_ancient/props/catalog.js';
import { HAZARD_BY_ID, boulderHalfLane, MARKER_BY_ID } from './consts.js';

const T = () => window.THREE;
const TAU = Math.PI * 2;
const TEAM_COL = { A: 0x2f63f2, B: 0xf0283c };

/** Instanced cubes with per-instance colour: the building block of every ring and line. */
class Cubes {
  constructor(root, cap, order, name) {
    const t = T();
    this.cap = cap; this.n = 0;
    this.mesh = new t.InstancedMesh(new t.BoxGeometry(1, 1, 1), new t.MeshBasicMaterial({ color: 0xffffff }), cap);
    this.mesh.name = name || 'cubes'; this.mesh.frustumCulled = false; this.mesh.renderOrder = order;
    this.mesh.instanceMatrix.setUsage(t.DynamicDrawUsage);
    this.mesh.setColorAt(0, new t.Color(1, 1, 1));            // allocates the colour attribute at full capacity (it uses mesh.count): do this BEFORE count = 0
    this.mesh.instanceColor.setUsage(t.DynamicDrawUsage);
    this.mesh.count = 0;
    this.m = new t.Matrix4(); this.q = new t.Quaternion(); this.p = new t.Vector3(); this.s = new t.Vector3(); this.axis = new t.Vector3(0, 1, 0);
    this.cols = new Map();
    root.add(this.mesh);
  }
  col(hex) { let c = this.cols.get(hex); if (!c) { c = lin(hex); this.cols.set(hex, c); } return c; }
  clear() { this.n = 0; this.mesh.count = 0; }
  add(x, y, z, sx, sy, sz, ry, hex) {
    if (this.n >= this.cap) return;
    this.q.setFromAxisAngle(this.axis, ry); this.p.set(x, y, z); this.s.set(sx, sy, sz);
    this.m.compose(this.p, this.q, this.s);
    this.mesh.setMatrixAt(this.n, this.m); this.mesh.setColorAt(this.n, this.col(hex)); this.n++;
  }
  flush() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; }
  dispose(root) { root.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.mesh.dispose && this.mesh.dispose(); }
}

// ------------------------------------------------------------------------------------------------------------- icon sprites
function badge(draw, color) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.beginPath(); g.arc(32, 32, 28, 0, TAU); g.fillStyle = '#' + color.toString(16).padStart(6, '0'); g.fill(); g.lineWidth = 5; g.strokeStyle = '#14163a'; g.stroke();
  g.strokeStyle = '#14163a'; g.fillStyle = '#14163a'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g);
  return c;
}
const GLYPHS = {
  hill: (g) => { g.beginPath(); g.moveTo(14, 44); g.lineTo(27, 22); g.lineTo(34, 33); g.lineTo(40, 26); g.lineTo(50, 44); g.closePath(); g.fill(); },
  exit: (g) => { g.strokeRect(21, 16, 16, 32); g.beginPath(); g.moveTo(34, 32); g.lineTo(52, 32); g.moveTo(46, 25); g.lineTo(53, 32); g.lineTo(46, 39); g.stroke(); },
  vip_start: (g) => { g.beginPath(); g.moveTo(14, 44); g.lineTo(14, 22); g.lineTo(24, 33); g.lineTo(32, 18); g.lineTo(40, 33); g.lineTo(50, 22); g.lineTo(50, 44); g.closePath(); g.fill(); },
  general_spawn: (g) => { g.beginPath(); g.moveTo(18, 46); g.lineTo(44, 18); g.moveTo(40, 36); g.lineTo(48, 44); g.moveTo(15, 49); g.lineTo(23, 41); g.stroke(); },
  waypoint: (g) => { g.beginPath(); g.moveTo(22, 50); g.lineTo(22, 15); g.stroke(); g.beginPath(); g.moveTo(22, 16); g.lineTo(48, 22); g.lineTo(22, 32); g.closePath(); g.fill(); },
  quicksand: (g) => { g.beginPath(); for (let y = 22; y <= 44; y += 11) { g.moveTo(14, y); g.bezierCurveTo(24, y - 8, 40, y + 8, 50, y); } g.stroke(); },
  spikes: (g) => { for (let x = 16; x <= 40; x += 12) { g.beginPath(); g.moveTo(x, 46); g.lineTo(x + 6, 20); g.lineTo(x + 12, 46); g.closePath(); g.fill(); } },
  fire: (g) => { g.beginPath(); g.moveTo(32, 12); g.bezierCurveTo(46, 26, 48, 36, 40, 46); g.lineTo(24, 46); g.bezierCurveTo(14, 38, 20, 26, 32, 12); g.closePath(); g.fill(); },
  boulders: (g) => { g.beginPath(); g.arc(34, 34, 12, 0, TAU); g.fill(); g.beginPath(); g.moveTo(12, 24); g.lineTo(20, 24); g.moveTo(10, 34); g.lineTo(18, 34); g.moveTo(12, 44); g.lineTo(20, 44); g.stroke(); },
  geyser: (g) => { g.beginPath(); g.moveTo(32, 50); g.lineTo(32, 20); g.moveTo(24, 26); g.lineTo(32, 16); g.lineTo(40, 26); g.moveTo(20, 40); g.lineTo(20, 32); g.moveTo(44, 40); g.lineTo(44, 32); g.stroke(); },
  lava: (g) => { g.beginPath(); for (let y = 24; y <= 44; y += 10) { g.moveTo(14, y); g.bezierCurveTo(22, y - 7, 28, y + 7, 36, y); g.bezierCurveTo(40, y - 3, 46, y + 3, 50, y); } g.stroke(); },
};
const spriteTex = new Map();
function iconTexture(kind, color) {
  const key = kind + color;
  let tx = spriteTex.get(key);
  if (!tx) { tx = new (T().CanvasTexture)(badge(GLYPHS[kind] || GLYPHS.hill, color)); tx.minFilter = T().LinearFilter; tx.encoding = T().sRGBEncoding; spriteTex.set(key, tx); }
  return tx;
}
function letterTexture(letter, color) {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d');
  g.font = '900 78px "Bungee","Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 12; g.strokeStyle = '#14163a'; g.lineJoin = 'round'; g.strokeText(letter, 48, 52);
  g.fillStyle = '#' + color.toString(16).padStart(6, '0'); g.fillText(letter, 48, 52);
  const tx = new (T().CanvasTexture)(c); tx.minFilter = T().LinearFilter; tx.encoding = T().sRGBEncoding; return tx;
}

export class EditorView {
  /** @param {import('../../app/editorhost.js').EditorHost} host @param {import('./session.js').EditSession} session */
  constructor(host, session) {
    const t = T();
    this.host = host; this.s = session; this.root = new t.Group(); this.root.name = 'arena-builder'; host.root.add(this.root);
    this.cursor = new Cubes(this.root, 320, 30, 'cursor'); this.sel = new Cubes(this.root, 320, 29, 'selection'); this.line = new Cubes(this.root, 420, 28, 'ramp-line');
    this.borders = new Cubes(this.root, 1400, 12, 'zone-borders'); this.rings = new Cubes(this.root, 4600, 14, 'rings');
    this.drapes = { A: null, B: null }; this.labels = { A: null, B: null }; this.sprites = []; this.hazardDrapes = [];
    this.rid = new Map(); this.dirty = { zones: true, hazards: true, markers: true }; this._cool = 0;
    this.active = { zone: 'A', tool: 'raise' }; this.showOverlays = true; this.highlight = new Set(); this.selected = { hazard: null, marker: null };
    this._ghost = null; this._ghostKey = '';
    this.off = session.on((e) => this._onEvent(e));
    this.offFrame = host.onFrame((dt) => this._frame(dt));
    this.syncAllProps();
  }

  // ---------------------------------------------------------------- events
  _onEvent(e) {
    switch (e.kind) {
      case 'terrain': this.host.touchTerrain(e.rect); this.dirty.zones = this.dirty.hazards = this.dirty.markers = true; { const q = this._regroundRect; this._regroundRect = q ? { x0: Math.min(q.x0, e.rect.x0), z0: Math.min(q.z0, e.rect.z0), x1: Math.max(q.x1, e.rect.x1), z1: Math.max(q.z1, e.rect.z1) } : e.rect; } break;
      case 'props': this._syncProps(e); break;
      case 'zones': this.dirty.zones = true; break;
      case 'hazards': this.dirty.hazards = true; break;
      case 'markers': this.dirty.markers = true; break;
      case 'water': this.host.refreshLiquid(); this.dirty.zones = true; break;
      case 'env': this.host.setEnvironment(this.s.arena.env); break;
      case 'all': this.reload(); break;
      default: break;
    }
  }
  /** The whole arena object changed (new document, resize, generate). */
  reload() {
    const a = this.s.arena;
    this.host.setArena(a);
    this.rid.clear(); a.props.forEach((p, i) => this.rid.set(p, i + 1));
    this.dirty.zones = this.dirty.hazards = this.dirty.markers = true;
    this.host.rig.setArena(a);
  }
  syncAllProps() { const a = this.s.arena; this.host.props.setArena(a); this.rid.clear(); a.props.forEach((p, i) => this.rid.set(p, i + 1)); this._ghost = null; this._ghostKey = ''; }
  _syncProps(e) {
    const pr = this.host.props;
    for (const p of e.removed || []) { const id = this.rid.get(p); if (id) pr.removeById(id); this.rid.delete(p); }
    for (const p of e.added || []) { const id = pr.add({ t: p.t, x: p.x, z: p.z, r: p.r, s: p.s, v: p.v }); if (id) this.rid.set(p, id); }
    for (const p of e.changed || []) { const id = this.rid.get(p); if (id) pr.transform(id, { x: p.x, z: p.z, r: p.r, s: p.s, v: p.v }); }
  }
  /** A prop was edited live (drag): keep its model on the cursor without waiting for the undo command. */
  touchProp(p) { const id = this.rid.get(p); if (id) this.host.props.transform(id, { x: p.x, z: p.z, r: p.r, s: p.s, v: p.v }); }

  // ---------------------------------------------------------------- per frame
  _frame(dt) {
    this._cool -= dt;
    if (this._cool > 0) return;
    let did = false;
    if (this._regroundRect) {
      const r = this._regroundRect, a = this.s.arena; this._regroundRect = null;
      const cx = (r.x0 + r.x1 + 1) / 2 * CELL - a.half(), cz = (r.z0 + r.z1 + 1) / 2 * CELL - a.half(), rad = Math.hypot(r.x1 - r.x0 + 1, r.z1 - r.z0 + 1) / 2 * CELL + 2;
      this.host.flushTerrain(); this.host.props.reground(cx, cz, rad); did = true;
    }
    if (this.dirty.zones) { this.dirty.zones = false; this._buildZones(); did = true; }
    if (this.dirty.hazards || this.dirty.markers) { this.dirty.hazards = this.dirty.markers = false; this._buildHazardsMarkers(); did = true; }
    if (did) this._cool = 0.1;
  }

  // ---------------------------------------------------------------- shape helpers
  _y(x, z) { return this.s.arena.cellHeight(x, z); }
  /** Ring of cubes hugging the terrain. cube = {len, h, w}; returns nothing. */
  ring(set, x, z, r, hex, o = {}) {
    const len = o.len || 0.5, h = o.h || 0.14, w = o.w || 0.24, lift = o.lift === undefined ? 0.14 : o.lift;
    const n = Math.max(16, Math.min(o.max || 160, Math.round(TAU * r / (len * 1.05))));
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU, px = x + Math.cos(th) * r, pz = z + Math.sin(th) * r;
      set.add(px, this._y(px, pz) + lift + h / 2, pz, len, h, w, -(th + Math.PI / 2), hex);
    }
  }
  rect(set, x0, z0, x1, z1, hex, o = {}) {
    const len = o.len || 0.55, h = o.h || 0.14, w = o.w || 0.24, lift = o.lift === undefined ? 0.14 : o.lift;
    const edge = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / (len * 1.4))), ang = Math.atan2(bz - az, bx - ax);
      for (let i = 0; i <= n; i++) { const px = ax + (bx - ax) * i / n, pz = az + (bz - az) * i / n; set.add(px, this._y(px, pz) + lift + h / 2, pz, len, h, w, -ang, hex); }
    };
    edge(x0, z0, x1, z0); edge(x1, z0, x1, z1); edge(x1, z1, x0, z1); edge(x0, z1, x0, z0);
  }
  /** Line of cubes between two points. */
  segment(set, ax, az, bx, bz, hex, o = {}) {
    const len = o.len || 0.6, h = o.h || 0.16, w = o.w || 0.3, lift = o.lift === undefined ? 0.16 : o.lift, L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
    const n = Math.max(1, Math.round(L / (o.gap || len * 1.3)));
    for (let i = 0; i <= n; i++) { const px = ax + (bx - ax) * i / n, pz = az + (bz - az) * i / n; set.add(px, this._y(px, pz) + lift + h / 2, pz, len, h, w, -ang, hex); }
  }

  // ---------------------------------------------------------------- cursor / selection / ramp line
  /** p: null | {kind:'circle'|'square'|'cross'|'rot', x, z, r, color, rot, len} */
  setCursor(p) {
    const c = this.cursor; c.clear();
    if (p) {
      if (p.kind === 'square') this.rect(c, p.x - p.r, p.z - p.r, p.x + p.r, p.z + p.r, p.color, { len: 0.5 });
      else if (p.kind === 'rot') {
        this.ring(c, p.x, p.z, p.r, p.color, { len: 0.5 });
        const dx = Math.sin(p.rot), dz = Math.cos(p.rot);
        this.segment(c, p.x - dx * p.r, p.z - dz * p.r, p.x + dx * p.r, p.z + dz * p.r, p.color, { len: 0.4, gap: 1.0 });
      } else if (p.kind !== 'cross') this.ring(c, p.x, p.z, p.r, p.color, { len: 0.5 });
      // centre pin
      c.add(p.x, this._y(p.x, p.z) + 0.34, p.z, 0.26, 0.5, 0.26, 0, 0xffffff);
    }
    c.flush();
  }
  setSelection(p) {
    const c = this.sel; c.clear();
    if (p) { this.ring(c, p.x, p.z, p.r, 0xffc93c, { len: 0.7, h: 0.22, w: 0.34, lift: 0.18 }); this.ring(c, p.x, p.z, Math.max(0.4, p.r - 0.35), 0xffffff, { len: 0.3, h: 0.1, w: 0.14, lift: 0.18, max: 90 }); }
    c.flush();
  }
  setLine(a, b, width, hex) {
    const c = this.line; c.clear();
    if (a) {
      this.ring(c, a.x, a.z, Math.max(0.8, (width || 4) / 2), hex || 0xffc93c, { len: 0.45, max: 80 });
      if (b) {
        this.segment(c, a.x, a.z, b.x, b.z, hex || 0xffc93c, { len: 0.5, gap: 0.9 });
        this.ring(c, b.x, b.z, Math.max(0.8, (width || 4) / 2), hex || 0xffc93c, { len: 0.45, max: 80 });
      }
    }
    c.flush();
  }

  // ---------------------------------------------------------------- zones
  _drape(zn, hex, opacity) {
    const t = T(), a = this.s.arena, n = a.size, half = a.half();
    const x0 = Math.max(0, a.cx(zn.x - zn.w / 2)), x1 = Math.min(n - 1, a.cx(zn.x + zn.w / 2)), z0 = Math.max(0, a.cz(zn.z - zn.d / 2)), z1 = Math.min(n - 1, a.cz(zn.z + zn.d / 2));
    const cells = Math.max(0, (x1 - x0 + 1) * (z1 - z0 + 1));
    if (!cells || cells > 22000) return null;
    const pos = new Float32Array(cells * 12), idx = new Uint32Array(cells * 6);
    let c = 0;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const y = a.h[x + z * n] * HSTEP + 0.07, wx = x * CELL - half, wz = z * CELL - half, o = c * 12, v = c * 4;
      pos[o] = wx; pos[o + 1] = y; pos[o + 2] = wz; pos[o + 3] = wx; pos[o + 4] = y; pos[o + 5] = wz + CELL; pos[o + 6] = wx + CELL; pos[o + 7] = y; pos[o + 8] = wz + CELL; pos[o + 9] = wx + CELL; pos[o + 10] = y; pos[o + 11] = wz;
      const i = c * 6; idx[i] = v; idx[i + 1] = v + 1; idx[i + 2] = v + 2; idx[i + 3] = v; idx[i + 4] = v + 2; idx[i + 5] = v + 3; c++;
    }
    const g = new t.BufferGeometry(); g.setAttribute('position', new t.BufferAttribute(pos, 3)); g.setIndex(new t.BufferAttribute(idx, 1));
    const m = new t.Mesh(g, new t.MeshBasicMaterial({ color: lin(hex), transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.renderOrder = 6; m.frustumCulled = false;
    return m;
  }
  _buildZones() {
    const a = this.s.arena, vis = this.showOverlays;
    for (const k of ['A', 'B']) {
      const old = this.drapes[k]; if (old) { this.root.remove(old); old.geometry.dispose(); old.material.dispose(); this.drapes[k] = null; }
      const lab = this.labels[k]; if (lab) { this.root.remove(lab); lab.material.map.dispose(); lab.material.dispose(); this.labels[k] = null; }
    }
    const b = this.borders; b.clear();
    for (const k of ['A', 'B']) {
      const zn = a.zones[k]; if (!zn || !vis) continue;
      const active = this.active.zone === k && this.active.tool === 'zones', hex = TEAM_COL[k];
      const d = this._drape(zn, hex, active ? 0.5 : 0.4); if (d) { this.root.add(d); this.drapes[k] = d; }
      this.rect(b, zn.x - zn.w / 2, zn.z - zn.d / 2, zn.x + zn.w / 2, zn.z + zn.d / 2, hex, { len: active ? 1.0 : 0.8, h: active ? 0.34 : 0.26, w: active ? 0.5 : 0.4, lift: 0.1 });
      const t = T(); const sp = new t.Sprite(new t.SpriteMaterial({ map: letterTexture(k, hex), depthTest: false, transparent: true }));
      const top = this._y(zn.x, zn.z); sp.position.set(zn.x, top + 3.2, zn.z); sp.scale.set(4.6, 4.6, 1); sp.renderOrder = 31; this.root.add(sp); this.labels[k] = sp;
    }
    b.flush();
  }
  setActiveZone(k, tool) { this.active.zone = k; this.active.tool = tool; this.dirty.zones = true; }
  setOverlays(on) { this.showOverlays = !!on; this.dirty.zones = this.dirty.hazards = this.dirty.markers = true; }
  setTool(tool) { this.active.tool = tool; this.dirty.zones = true; }

  // ---------------------------------------------------------------- hazards and markers
  _buildHazardsMarkers() {
    const a = this.s.arena, r = this.rings; r.clear();
    for (const sp of this.sprites) { this.root.remove(sp); sp.material.dispose(); } this.sprites.length = 0;
    for (const d of this.hazardDrapes) { this.root.remove(d); d.geometry.dispose(); d.material.dispose(); } this.hazardDrapes.length = 0;
    if (!this.showOverlays) { r.flush(); return; }
    const t = T();
    for (const h of a.hazards) {
      const kind = HAZARD_BY_ID[h.t]; if (!kind) continue;
      const sel = this.selected.hazard === h;
      this.ring(r, h.x, h.z, h.r, sel ? 0xffffff : kind.color, { len: sel ? 0.7 : 0.55, h: 0.16, w: sel ? 0.34 : 0.26, max: 64 });
      if (h.t === 'boulders') { const L = boulderHalfLane(h.r), w = h.r * 0.6; this.segment(r, h.x - w, h.z - L, h.x - w, h.z + L, kind.color, { gap: 1.6, len: 0.5 }); this.segment(r, h.x + w, h.z - L, h.x + w, h.z + L, kind.color, { gap: 1.6, len: 0.5 }); }
      if (h.r <= 7 && h.t !== 'boulders') { const d = this._drape({ x: h.x, z: h.z, w: h.r * 2, d: h.r * 2 }, kind.color, 0.2); if (d) { this.root.add(d); this.hazardDrapes.push(d); } }
      const sp = new t.Sprite(new t.SpriteMaterial({ map: iconTexture(h.t, kind.color), transparent: true })); sp.position.set(h.x, this._y(h.x, h.z) + 1.9, h.z); sp.scale.set(1.7, 1.7, 1); sp.renderOrder = 25; this.root.add(sp); this.sprites.push(sp);
    }
    for (const m of a.markers) {
      const kind = MARKER_BY_ID[m.type]; if (!kind) continue;
      const sel = this.selected.marker === m, hot = this.highlight.has(m.type);
      this.ring(r, m.x, m.z, m.r, sel ? 0xffffff : kind.color, { len: 0.7, h: 0.2, w: 0.34, max: 80 });
      if (hot) this.ring(r, m.x, m.z, m.r + 0.7, 0xffffff, { len: 0.35, h: 0.12, w: 0.2, max: 70 });
      const y = this._y(m.x, m.z); r.add(m.x, y + 1.2, m.z, 0.26, 2.4, 0.26, 0, kind.color);
      const sp = new t.Sprite(new t.SpriteMaterial({ map: iconTexture(m.type, kind.color), transparent: true, depthTest: false })); sp.position.set(m.x, y + 3.2, m.z); sp.scale.set(2.4, 2.4, 1); sp.renderOrder = 32; this.root.add(sp); this.sprites.push(sp);
    }
    r.flush();
  }
  setSelected(sel) { this.selected.hazard = sel.hazard || null; this.selected.marker = sel.marker || null; this.dirty.hazards = true; }
  setHighlight(types) { this.highlight = new Set(types || []); this.dirty.markers = true; }

  // ---------------------------------------------------------------- prop ghost (the real model follows the cursor)
  setGhost(def) {
    const pr = this.host.props;
    if (!def) { if (this._ghost) { pr.removeById(this._ghost); this._ghost = null; this._ghostKey = ''; } return; }
    const key = def.t + '|' + def.v;
    if (this._ghost && key !== this._ghostKey) { pr.removeById(this._ghost); this._ghost = null; }
    if (!this._ghost) { this._ghost = pr.add({ t: def.t, x: def.x, z: def.z, r: def.r, s: def.s, v: def.v }); this._ghostKey = key; }
    else pr.transform(this._ghost, { x: def.x, z: def.z, r: def.r, s: def.s });
  }
  propGhostId() { return this._ghost; }
  /** Footprint radius (u) of a prop def for rings. */
  footprint(def) { const info = propInfo(def.t); return Math.max(0.7, ((info && info.r) || 0.5) * (def.s || 1) + 0.3); }

  dispose() {
    if (this.off) this.off(); if (this.offFrame) this.offFrame();
    this.setGhost(null);
    for (const k of ['A', 'B']) { const d = this.drapes[k]; if (d) { d.geometry.dispose(); d.material.dispose(); } const l = this.labels[k]; if (l) { l.material.map.dispose(); l.material.dispose(); } }
    for (const sp of this.sprites) sp.material.dispose();
    for (const d of this.hazardDrapes) { d.geometry.dispose(); d.material.dispose(); }
    for (const c of [this.cursor, this.sel, this.line, this.borders, this.rings]) c.dispose(this.root);
    if (this.root.parent) this.root.parent.remove(this.root);
  }
}
