// PaintDoc: the pure model behind the Voxel Painter (spec/editors.md §3). One working grid per hum1 part on its CANONICAL size (parts/_kit.js DIM),
// edited with the painter tools and stored as `bp.paint[part] = diffPaint(edited, generated)` (value 0 untouched, 1 erase, anything else the voxel).
// No DOM, no THREE: runs in Node (tests/editors/soldier/paint.test.mjs).
//
// Every edit goes through PartDoc.op(): the cells it writes are mirrored over the active mirror axes, the 1,500-voxel PAINT_CAP is checked on the
// RESULT (the number of cells that differ from the generated grid), and the change is recorded as a typed-array delta on a per-part UndoStack
// (a drag is one stroke = one undo step).
import { VoxelGrid, F_TEAM, F_GLOW, V } from '../../voxel/grid.js';
import { UndoStack } from '../../core/undo.js';
import { DIM, PART_ORDER, PAINT_CAP, PAINT_ERASE, buildPartGrids, diffPaint } from '../../content/era_ancient/blueprints.js';

export { PAINT_CAP, PAINT_ERASE, PART_ORDER, DIM };

/** The part picker shows these names, never the raw ids (left = the character's left = +X). */
export const PART_NAMES = {
  body: 'Torso', head: 'Head', crest: 'Crest and hair volume', armUL: 'Upper arm (left)', armLL: 'Forearm and hand (left)', armUR: 'Upper arm (right)', armLR: 'Forearm and hand (right)',
  weapon: 'Weapon', offhand: 'Off-hand item', legUL: 'Thigh (left)', legLL: 'Shin and foot (left)', legUR: 'Thigh (right)', legLR: 'Shin and foot (right)', back: 'Back item', cape: 'Cape', cape2: 'Cape tail',
};
export const OPPOSITE = { armUL: 'armUR', armUR: 'armUL', armLL: 'armLR', armLR: 'armLL', legUL: 'legUR', legUR: 'legUL', legLL: 'legLR', legLR: 'legLL' };
/** 24 default swatches (sRGB hex). */
export const SWATCHES = ['#f6d5b8', '#e0ac84', '#a56a45', '#5a341f', '#151210', '#6b4a2a', '#d9d4c4', '#ffffff', '#c8453c', '#ee4b4b', '#ff7a2f', '#ffc93c', '#f2d36b', '#8bc34a', '#2f7a3a', '#1f8f8a', '#6ec6ff', '#3b6cf0', '#2a2f6b', '#6a3fb0', '#ff7eb6', '#b87333', '#8e8e96', '#2e2e34'];
export const MATERIALS = ['normal', 'team', 'glow'];

const FLAG_BITS = { team: F_TEAM, glow: F_GLOW };
/** 0xRRGGBB + material -> voxel value. */
export function voxelOf(rgb, material = 'normal') { return V(rgb, material === 'team' ? F_TEAM : material === 'glow' ? F_GLOW : 0); }
export const hexToRgbInt = (h) => parseInt(String(h).replace('#', ''), 16) & 0xffffff;
export const rgbIntToHex = (n) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');

const clampI = (v, a, b) => (v < a ? a : v > b ? b : v);

export class PartDoc {
  constructor(pid, gen) {
    this.pid = pid; this.gen = gen; this.grid = gen.clone(); this.diff = 0;
    this.undo = new UndoStack(100);
    this.mirror = { x: false, y: false, z: false };
    this.sel = null;                       // {x0,y0,z0,x1,y1,z1} inclusive
    this.stroke = null; this.onChange = null;
    this.symmetric = isSymmetricX(gen);
    this.mirror.x = this.symmetric;
  }
  get size() { return [this.grid.sx, this.grid.sy, this.grid.sz]; }
  inb(x, y, z) { return this.grid.inb(x, y, z); }
  get(x, y, z) { return this.grid.get(x, y, z); }
  count() { return this.grid.count(); }
  idx(x, y, z) { return x + this.grid.sx * (z + this.grid.sz * y); }

  _recount() { let n = 0; const a = this.grid.d, b = this.gen.d; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; this.diff = n; }

  /** All mirror images of a cell under the active axes (includes the cell itself), without duplicates. */
  mirrored(x, y, z, out) {
    const { sx, sy, sz } = this.grid, m = this.mirror;
    out.length = 0; out.push(x, y, z);
    if (m.x) { const n = out.length; for (let i = 0; i < n; i += 3) out.push(sx - 1 - out[i], out[i + 1], out[i + 2]); }
    if (m.y) { const n = out.length; for (let i = 0; i < n; i += 3) out.push(out[i], sy - 1 - out[i + 1], out[i + 2]); }
    if (m.z) { const n = out.length; for (let i = 0; i < n; i += 3) out.push(out[i], out[i + 1], sz - 1 - out[i + 2]); }
    return out;
  }

  /**
   * Run one edit. `build(put)` calls put(x, y, z, newValue) for every cell it wants to write (newValue 0 erases); mirror images are added here.
   * Returns {ok, changed, reason?, would?}. On a cap violation nothing is written. Inside beginStroke()/endStroke() the changes join the open stroke.
   */
  op(label, build) {
    const g = this.grid, cells = new Map(), tmp = [];
    build((x, y, z, v) => {
      if (!g.inb(x, y, z)) return;
      this.mirrored(x, y, z, tmp);
      for (let i = 0; i < tmp.length; i += 3) if (g.inb(tmp[i], tmp[i + 1], tmp[i + 2])) cells.set(this.idx(tmp[i], tmp[i + 1], tmp[i + 2]), v >>> 0);
    });
    let nd = this.diff; const idx = [], before = [], after = [];
    for (const [i, v] of cells) {
      const old = g.d[i]; if (old === v) continue;
      nd += (v !== this.gen.d[i] ? 1 : 0) - (old !== this.gen.d[i] ? 1 : 0);
      idx.push(i); before.push(old); after.push(v);
    }
    if (!idx.length) return { ok: true, changed: 0 };
    if (nd > PAINT_CAP && nd > this.diff) return { ok: false, changed: 0, reason: 'cap', would: nd };
    for (let k = 0; k < idx.length; k++) g.d[idx[k]] = after[k];
    this.diff = nd;
    this._record(label, idx, before, after);
    if (this.onChange) this.onChange(this);
    return { ok: true, changed: idx.length };
  }
  _record(label, idx, before, after) {
    if (this.stroke) { const s = this.stroke; for (let k = 0; k < idx.length; k++) { const first = s.first.get(idx[k]); if (first === undefined) s.first.set(idx[k], before[k]); s.last.set(idx[k], after[k]); } return; }
    this.undo.push(this._cmd(label, Int32Array.from(idx), Uint32Array.from(before), Uint32Array.from(after)));
  }
  _cmd(label, idx, before, after) {
    const me = this;
    return {
      label,
      do() { me._write(idx, after); },
      undo() { me._write(idx, before); },
    };
  }
  _write(idx, vals) {
    const d = this.grid.d, gd = this.gen.d; let nd = this.diff;
    for (let k = 0; k < idx.length; k++) { const i = idx[k], old = d[i], v = vals[k]; nd += (v !== gd[i] ? 1 : 0) - (old !== gd[i] ? 1 : 0); d[i] = v; }
    this.diff = nd; if (this.onChange) this.onChange(this);
  }
  beginStroke(label) { if (!this.stroke) this.stroke = { label, first: new Map(), last: new Map() }; }
  endStroke() {
    const s = this.stroke; this.stroke = null; if (!s || !s.first.size) return;
    const idx = [], before = [], after = [];
    for (const [i, b] of s.first) { const a = s.last.get(i); if (a !== b) { idx.push(i); before.push(b); after.push(a); } }
    if (idx.length) this.undo.push(this._cmd(s.label, Int32Array.from(idx), Uint32Array.from(before), Uint32Array.from(after)));
  }
  doUndo() { if (this.stroke) this.endStroke(); return this.undo.undo(); }
  doRedo() { return this.undo.redo(); }

  // ---------------------------------------------------------------- brushes
  _brush(x, y, z, size, fn) {
    const lo = -Math.floor((size - 1) / 2), hi = lo + size - 1;
    for (let dy = lo; dy <= hi; dy++) for (let dz = lo; dz <= hi; dz++) for (let dx = lo; dx <= hi; dx++) fn(x + dx, y + dy, z + dz);
  }
  /** Add voxels (the pencil): sets `value` on the brush cells. */
  pencil(x, y, z, value, size = 1) { return this.op('Pencil', (put) => this._brush(x, y, z, size, (a, b, c) => put(a, b, c, value))); }
  eraser(x, y, z, size = 1) { return this.op('Eraser', (put) => this._brush(x, y, z, size, (a, b, c) => { if (this.grid.get(a, b, c)) put(a, b, c, 0); })); }
  /** Recolour only the voxels that exist (keeps the shape). */
  recolor(x, y, z, value, size = 1) { return this.op('Paint', (put) => this._brush(x, y, z, size, (a, b, c) => { if (this.grid.get(a, b, c)) put(a, b, c, value); })); }
  /** Set (on) or clear (off) the team-tint or glow flag on existing voxels, keeping their colour. */
  flag(x, y, z, which, on, size = 1) {
    const bit = FLAG_BITS[which] << 24 >>> 0;
    return this.op(which === 'team' ? 'Team tint' : 'Glow', (put) => this._brush(x, y, z, size, (a, b, c) => {
      const v = this.grid.get(a, b, c); if (!v) return;
      const nv = on ? ((v & ~((F_TEAM | F_GLOW) << 24)) | bit) : (v & ~bit);
      put(a, b, c, nv >>> 0);
    }));
  }
  /** Flood fill: recolour the connected voxels that share the seed's value. mode '3d' (6-neighbour; needs a solid seed) or 'layer' (4-neighbour inside the plane axis=layer; an empty seed fills the hole). */
  fill(x, y, z, value, mode = '3d', axis = 'y') {
    const g = this.grid; if (!g.inb(x, y, z)) return { ok: true, changed: 0 };
    const target = g.get(x, y, z);
    if (!target && mode === '3d') return { ok: false, changed: 0, reason: 'empty-seed' };
    if (target === (value >>> 0)) return { ok: true, changed: 0 };
    const seen = new Set(), q = [[x, y, z]]; seen.add(this.idx(x, y, z));
    const dirs = mode === '3d' ? [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
      : axis === 'x' ? [[0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] : axis === 'y' ? [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] : [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
    for (let h = 0; h < q.length; h++) {
      const [cx, cy, cz] = q[h];
      for (const [dx, dy, dz] of dirs) {
        const nx = cx + dx, ny = cy + dy, nz = cz + dz; if (!g.inb(nx, ny, nz)) continue;
        const i = this.idx(nx, ny, nz); if (seen.has(i) || g.d[i] !== target) continue;
        seen.add(i); q.push([nx, ny, nz]);
      }
    }
    return this.op('Fill', (put) => { for (const c of q) put(c[0], c[1], c[2], value); });
  }
  /** A 3D line of brush cells from a to b. */
  line(a, b, value, size = 1) {
    return this.op('Line', (put) => { for (const c of lineCells(a, b)) this._brush(c[0], c[1], c[2], size, (x, y, z) => put(x, y, z, value)); });
  }
  /** Box between two corners (inclusive); hollow keeps only the shell. */
  box(a, b, value, hollow = false) {
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]), z0 = Math.min(a[2], b[2]), z1 = Math.max(a[2], b[2]);
    return this.op('Box', (put) => {
      for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        if (hollow && x > x0 && x < x1 && y > y0 && y < y1 && z > z0 && z < z1) continue;
        put(x, y, z, value);
      }
    });
  }
  /** The value at a cell (the eyedropper). */
  pick(x, y, z) { return this.grid.inb(x, y, z) ? this.grid.get(x, y, z) : 0; }

  // ---------------------------------------------------------------- selection (box) operations
  select(a, b) {
    const g = this.grid;
    this.sel = { x0: clampI(Math.min(a[0], b[0]), 0, g.sx - 1), x1: clampI(Math.max(a[0], b[0]), 0, g.sx - 1), y0: clampI(Math.min(a[1], b[1]), 0, g.sy - 1), y1: clampI(Math.max(a[1], b[1]), 0, g.sy - 1), z0: clampI(Math.min(a[2], b[2]), 0, g.sz - 1), z1: clampI(Math.max(a[2], b[2]), 0, g.sz - 1) };
    return this.sel;
  }
  clearSelection() { this.sel = null; }
  _selCells() {
    const s = this.sel, out = []; if (!s) return out;
    for (let y = s.y0; y <= s.y1; y++) for (let z = s.z0; z <= s.z1; z++) for (let x = s.x0; x <= s.x1; x++) { const v = this.grid.get(x, y, z); if (v) out.push([x, y, z, v]); }
    return out;
  }
  deleteSelection() { if (!this.sel) return { ok: true, changed: 0 }; const cells = this._selCells(); return this.op('Delete selection', (put) => { for (const c of cells) put(c[0], c[1], c[2], 0); }); }
  fillSelection(value) { const s = this.sel; if (!s) return { ok: true, changed: 0 }; return this.op('Fill selection', (put) => { for (let y = s.y0; y <= s.y1; y++) for (let z = s.z0; z <= s.z1; z++) for (let x = s.x0; x <= s.x1; x++) put(x, y, z, value); }); }
  /** Move the selected voxels by (dx,dy,dz); voxels pushed outside the grid are dropped. The selection box follows. Mirrors are NOT applied to moves. */
  moveSelection(dx, dy, dz) {
    const s = this.sel; if (!s) return { ok: true, changed: 0 };
    const cells = this._selCells(), saved = Object.assign({}, this.mirror); this.mirror = { x: false, y: false, z: false };
    const r = this.op('Move selection', (put) => { for (const c of cells) put(c[0], c[1], c[2], 0); for (const c of cells) put(c[0] + dx, c[1] + dy, c[2] + dz, c[3]); });
    this.mirror = saved;
    if (r.ok) { const g = this.grid; this.sel = { x0: clampI(s.x0 + dx, 0, g.sx - 1), x1: clampI(s.x1 + dx, 0, g.sx - 1), y0: clampI(s.y0 + dy, 0, g.sy - 1), y1: clampI(s.y1 + dy, 0, g.sy - 1), z0: clampI(s.z0 + dz, 0, g.sz - 1), z1: clampI(s.z1 + dz, 0, g.sz - 1) }; }
    return r;
  }
  /** Mirror the selection contents over its own centre along an axis ('x' | 'y' | 'z'). */
  flipSelection(axis) {
    const s = this.sel; if (!s) return { ok: true, changed: 0 };
    const cells = this._selCells(), saved = Object.assign({}, this.mirror); this.mirror = { x: false, y: false, z: false };
    const r = this.op('Flip selection', (put) => {
      for (const c of cells) put(c[0], c[1], c[2], 0);
      for (const c of cells) put(axis === 'x' ? s.x0 + s.x1 - c[0] : c[0], axis === 'y' ? s.y0 + s.y1 - c[1] : c[1], axis === 'z' ? s.z0 + s.z1 - c[2] : c[2], c[3]);
    });
    this.mirror = saved; return r;
  }
  /** Rotate the selection 90 degrees about Y inside its own x/z footprint (the footprint must be square; otherwise it is rotated about its centre and clipped to the grid). */
  rotateSelection() {
    const s = this.sel; if (!s) return { ok: true, changed: 0 };
    const cells = this._selCells(), saved = Object.assign({}, this.mirror); this.mirror = { x: false, y: false, z: false };
    const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
    const r = this.op('Rotate selection', (put) => {
      for (const c of cells) put(c[0], c[1], c[2], 0);
      for (const c of cells) { const rx = c[0] - cx, rz = c[2] - cz; put(Math.round(cx - rz), c[1], Math.round(cz + rx), c[3]); }
    });
    this.mirror = saved; return r;
  }

  // ---------------------------------------------------------------- whole-part operations
  /** Back to the generated voxels (undoable). */
  reset() { return this._replace('Reset to generated', this.gen); }
  /** Erase everything (fails when erasing would need more than PAINT_CAP markers). */
  clear() { const e = new VoxelGrid(this.grid.sx, this.grid.sy, this.grid.sz); return this._replace('Clear part', e); }
  /** Replace the whole grid with `src` (same size), as one undoable operation with the cap check (never mirrored). */
  _replace(label, src) {
    const g = this.grid, saved = Object.assign({}, this.mirror); this.mirror = { x: false, y: false, z: false };
    const r = this.op(label, (put) => { const d = g.d, area = g.sx * g.sz; for (let i = 0; i < d.length; i++) if (d[i] !== src.d[i]) { const y = Math.floor(i / area), rem = i - y * area, z = Math.floor(rem / g.sx), x = rem - z * g.sx; put(x, y, z, src.d[i]); } });
    this.mirror = saved; return r;
  }
  /** Copy another part's working grid mirrored left-right into this one (arms and legs: the opposite limb). */
  pasteFlipped(srcGrid) {
    const g = this.grid; if (srcGrid.sx !== g.sx || srcGrid.sy !== g.sy || srcGrid.sz !== g.sz) return { ok: false, changed: 0, reason: 'size' };
    const saved = Object.assign({}, this.mirror); this.mirror = { x: false, y: false, z: false };
    const r = this.op('Copy from the other side', (put) => { for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) put(x, y, z, srcGrid.get(g.sx - 1 - x, y, z)); });
    this.mirror = saved; return r;
  }
  /** The RLE override layer of this part (or null when nothing differs from the generated voxels). */
  toRLE() { return this.diff ? diffPaint(this.grid, this.gen) : null; }
  loadRLE(r) {
    this.grid = this.gen.clone();
    if (r && Array.isArray(r.rle)) { let p = 0; const d = this.grid.d; for (let i = 0; i < r.rle.length; i += 2) { const n = r.rle[i], v = r.rle[i + 1] >>> 0; if (v) for (let k = 0; k < n && p + k < d.length; k++) d[p + k] = v === PAINT_ERASE ? 0 : v; p += n; } }
    this._recount(); this.undo.clear(); this.stroke = null; this.sel = null;
  }
}

/** 3D Bresenham between two cells (inclusive). */
export function lineCells(a, b) {
  const out = [], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], n = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz), 1);
  let last = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = [Math.round(a[0] + dx * t), Math.round(a[1] + dy * t), Math.round(a[2] + dz * t)], k = c.join(',');
    if (k !== last) { out.push(c); last = k; }
  }
  return out;
}

/** True when the grid's SOLIDITY is left-right symmetric about its centre plane (>= 92% of the solid cells have a solid mirror image): X mirroring then defaults on. */
export function isSymmetricX(g) {
  let solid = 0, match = 0;
  for (let y = 0; y < g.sy; y++) for (let z = 0; z < g.sz; z++) for (let x = 0; x < g.sx; x++) { if (!g.d[x + g.sx * (z + g.sz * y)]) continue; solid++; if (g.d[(g.sx - 1 - x) + g.sx * (z + g.sz * y)]) match++; }
  return solid === 0 ? true : match / solid >= 0.92;
}

/** The whole soldier's paint: one PartDoc per hum1 part, built from the GENERATED (unpainted) grids of a validated blueprint. */
export class PaintDoc {
  /**
   * @param bp a blueprint (validated here); its paint layers are loaded as the starting edits.
   * @param opts the SAME compile options the battle uses ({range, radius, scale} of the derived def, see custom.js compileOptsOf): the weapon-length rule trims the
   *   generated weapon grid with them, so the paint diff must be taken against that trimmed grid. {unlocked} enforces campaign locks.
   */
  constructor(bp, opts = {}) {
    const raw = Object.assign({}, bp); const paint = raw.paint || {}; raw.paint = {};
    const built = buildPartGrids(raw, { unlocked: opts.unlocked, range: opts.range, radius: opts.radius, scale: opts.scale });
    this.bp = built.bp; this.parts = {};
    for (const pid of PART_ORDER) { const p = new PartDoc(pid, built.grids[pid]); this.parts[pid] = p; if (paint[pid]) { p.loadRLE(paint[pid]); } }
  }
  part(pid) { return this.parts[pid]; }
  /** Total painted voxels over all parts. */
  total() { let n = 0; for (const pid of PART_ORDER) n += this.parts[pid].diff; return n; }
  /** `bp.paint` for the soldier: only the parts that differ from their generated voxels. */
  toPaint() {
    const out = {};
    for (const pid of PART_ORDER) { const r = this.parts[pid].toRLE(); if (r) out[pid] = r; }
    return out;
  }
  /** The blueprint with the current paint layers (a fresh copy). */
  toBlueprint() { return Object.assign(JSON.parse(JSON.stringify(Object.assign({}, this.bp, { paint: {} }))), { paint: this.toPaint() }); }
  /** Copy part `pid` onto its opposite limb (flipped left-right). Returns the result of the edit on the target part, or null for parts without an opposite. */
  copyToOpposite(pid) { const o = OPPOSITE[pid]; if (!o) return null; return this.parts[o].pasteFlipped(this.parts[pid].grid); }
}
