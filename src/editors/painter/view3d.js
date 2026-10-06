// PartView: the Voxel Painter's 3D view of ONE part grid (1 voxel = 1 unit, centred on the origin). Own small WebGL view (window.THREE r128).
// Orbit with right or middle drag (or left drag in orbit mode / with Space held), wheel zoom, two-finger orbit and pinch on touch. Everything else (left button, one finger)
// goes to the tool callbacks as {type, pick, e}: pick comes from pick.js (first solid voxel face, else the back walls of the grid box).
import { meshGrid } from '../../voxel/mesher.js';
import { pickCell } from './pick.js';
import { teamColorsLinear } from '../../render/style.js';
import { DIM } from './paintdoc.js';

const T = () => window.THREE;

export class PartView {
  /** @param {HTMLElement} host  @param {{palette?:()=>string, onTool?:(ev)=>void, label?:string}} o */
  constructor(host, o = {}) {
    const THREE = T();
    this.o = o; this.host = host; this.alive = true; this.ok = false; this.part = null; this.dirty = true; this.w = 0; this.h = 0;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'pt-canvas'; this.canvas.tabIndex = 0; this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', o.label || '3D view of the part. Click a face to paint. Right-drag to orbit, scroll to zoom.');
    host.appendChild(this.canvas);
    try { this.r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { console.warn('painter: no WebGL', e); return; }
    this.ok = true;
    this.r.outputEncoding = THREE.sRGBEncoding; this.r.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
    this.scene.add(new THREE.HemisphereLight(0xdfeaff, 0x8a7a68, 0.9));
    this.sun = new THREE.DirectionalLight(0xfff4e0, 0.95); this.scene.add(this.sun);
    this.group = new THREE.Group(); this.scene.add(this.group);
    this.mesh = null; this.walls = []; this.wallGroup = new THREE.Group(); this.scene.add(this.wallGroup);
    this.box = null; this.pivot = null; this.cursor = null; this.cursorLines = null; this.prevGroup = new THREE.Group(); this.scene.add(this.prevGroup); this.selBox = null; this.mirrorGroup = new THREE.Group(); this.scene.add(this.mirrorGroup);
    this.gizmo = null;
    this.view = { yaw: -0.65, pitch: 0.4, zoom: 1 }; this.orbitMode = false; this.spaceDown = false; this.pointers = new Map(); this.drag = null; this.pinch0 = 0; this.tool = null;
    this._ray = new THREE.Raycaster(); this._v = new THREE.Vector3();
    this._bind();
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { this._resize(); }) : null; if (this.ro) this.ro.observe(host);
    this._resize(); this.raf = requestAnimationFrame(() => this._loop());
  }

  // ---------------------------------------------------------------- content
  setPart(part) {
    this.part = part; const g = part.grid, THREE = T();
    this.size = [g.sx, g.sy, g.sz]; this.off = [-g.sx / 2, -g.sy / 2, -g.sz / 2];
    this.group.position.set(this.off[0], this.off[1], this.off[2]);
    this._buildFrame(); this.rebuild(); this.frame();
  }
  frame() { this.view.zoom = 1; this.dist = Math.max(this.size[0], this.size[1], this.size[2]) * 2.2 + 6; this.dirty = true; }
  _buildFrame() {
    const THREE = T(), [sx, sy, sz] = this.size;
    for (const o of this.walls) { this.wallGroup.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose(); }
    this.walls.length = 0;
    const mat = () => new THREE.LineBasicMaterial({ color: 0xb9c2e0, transparent: true, opacity: 0.2, depthWrite: false });
    const mk = (axis, side) => {
      const pts = [], c = side ? this.size[axis] : 0, [a, b] = [0, 1, 2].filter((i) => i !== axis);
      for (let i = 0; i <= this.size[a]; i++) { const p0 = [0, 0, 0], p1 = [0, 0, 0]; p0[axis] = p1[axis] = c; p0[a] = p1[a] = i; p0[b] = 0; p1[b] = this.size[b]; pts.push(...p0, ...p1); }
      for (let j = 0; j <= this.size[b]; j++) { const p0 = [0, 0, 0], p1 = [0, 0, 0]; p0[axis] = p1[axis] = c; p0[b] = p1[b] = j; p0[a] = 0; p1[a] = this.size[a]; pts.push(...p0, ...p1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const mesh = new THREE.LineSegments(geo, mat()); mesh.position.set(this.off[0], this.off[1], this.off[2]); this.wallGroup.add(mesh); this.walls.push({ axis, side, mesh });
    };
    for (let a = 0; a < 3; a++) { mk(a, 0); mk(a, 1); }
    if (this.box) { this.scene.remove(this.box); this.box.geometry.dispose(); this.box.material.dispose(); }
    this.box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz)), new THREE.LineBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.8 })); this.scene.add(this.box);
    // pivot marker + a front arrow (+Z) + the left marker (+X)
    if (this.pivot) { this.scene.remove(this.pivot); this.pivot.geometry.dispose(); this.pivot.material.dispose(); }
    const pv = this.part && DIM[this.part.pid] ? DIM[this.part.pid].pivot : null;
    this.pivot = new THREE.Mesh(new THREE.OctahedronGeometry(0.36), new THREE.MeshBasicMaterial({ color: 0xff7eb6 })); this.scene.add(this.pivot); this.pivot.visible = !!pv;
    if (pv) this.pivot.position.set(pv[0] + this.off[0], pv[1] + this.off[1], pv[2] + this.off[2]);
    if (this.gizmo) { this.scene.remove(this.gizmo); this.gizmo.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    this.gizmo = new THREE.Group();
    const arrow = (dir, color, len) => { const g = new THREE.Group(); const line = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, len), new THREE.MeshBasicMaterial({ color })); line.position.z = len / 2; const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 10), new THREE.MeshBasicMaterial({ color })); tip.rotation.x = Math.PI / 2; tip.position.z = len + 0.4; g.add(line, tip); g.lookAt(...dir); return g; };
    const front = arrow([0, 0, 1], 0x6ec6ff, 2.2); front.position.set(0, -sy / 2 - 0.2, sz / 2 + 1.2); this.gizmo.add(front);
    const left = arrow([1, 0, 0], 0xff7eb6, 1.6); left.position.set(sx / 2 + 1.2, -sy / 2 - 0.2, 0); this.gizmo.add(left);
    this.scene.add(this.gizmo);
    // selection / cursor / mirror planes
    if (this.selBox) { this.scene.remove(this.selBox); this.selBox.geometry.dispose(); this.selBox.material.dispose(); this.selBox = null; }
    if (!this.cursor) {
      this.cursor = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })); this.cursor.visible = false; this.scene.add(this.cursor);
      this.cursorLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)), new THREE.LineBasicMaterial({ color: 0xffffff })); this.cursorLines.visible = false; this.scene.add(this.cursorLines);
    }
    this.setMirror(this.part ? this.part.mirror : { x: false, y: false, z: false });
  }
  /** Remesh the grid after edits (cheap: at most 3,888 cells). */
  rebuild() {
    if (!this.ok || !this.part) return;
    const THREE = T(), g = this.part.grid;
    const m = meshGrid(g, { size: 1, pivot: [0, 0, 0], jitter: 0.03 });
    const tc = teamColorsLinear(this.o.palette ? this.o.palette() : 'classic')[0], col = m.colors;
    for (let i = 0; i < m.vertexCount; i++) { const f = m.flags[i]; if (f === 1) { col[i * 3] *= tc[0]; col[i * 3 + 1] *= tc[1]; col[i * 3 + 2] *= tc[2]; } else if (f === 2) { col[i * 3] = Math.min(1.4, col[i * 3] * 1.45 + 0.1); col[i * 3 + 1] = Math.min(1.4, col[i * 3 + 1] * 1.45 + 0.1); col[i * 3 + 2] = Math.min(1.4, col[i * 3 + 2] * 1.45 + 0.1); } }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(new THREE.BufferAttribute(m.indices, 1));
    if (this.mesh) { this.group.remove(this.mesh); this.mesh.geometry.dispose(); }
    else this.meshMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.mesh = new THREE.Mesh(geo, this.meshMat); this.group.add(this.mesh); this.dirty = true;
  }
  /** Hover overlay: cell [x,y,z] (grid coordinates) or null; `color` hex; `erase` draws it as a removal marker. */
  setCursor(cell, o = {}) {
    if (!this.ok) return;
    if (!cell) { this.cursor.visible = this.cursorLines.visible = false; this.dirty = true; return; }
    const s = o.size || 1, c = o.erase ? 0xff5d5d : (o.color !== undefined ? o.color : 0xffffff);
    const p = [cell[0] + this.off[0] + 0.5, cell[1] + this.off[1] + 0.5, cell[2] + this.off[2] + 0.5];
    this.cursor.position.set(...p); this.cursorLines.position.set(...p); this.cursor.scale.setScalar(s); this.cursorLines.scale.setScalar(s);
    this.cursor.material.color.setHex(c); this.cursorLines.material.color.setHex(o.erase ? 0xff5d5d : 0xffffff); this.cursor.visible = this.cursorLines.visible = true; this.dirty = true;
  }
  /** Ghost voxels for line / box previews (at most 700 cubes; more would only slow the preview down). */
  setPreview(cells, color = 0xffffff, erase = false) {
    if (!this.ok) return; const THREE = T();
    while (this.prevGroup.children.length) { const c = this.prevGroup.children.pop(); c.geometry.dispose(); c.material.dispose(); }
    if (cells && cells.length) {
      const geo = new THREE.BoxGeometry(1.01, 1.01, 1.01), mat = new THREE.MeshBasicMaterial({ color: erase ? 0xff5d5d : color, transparent: true, opacity: 0.45, depthWrite: false });
      const im = new THREE.InstancedMesh(geo, mat, Math.min(cells.length, 700)); const mtx = new THREE.Matrix4();
      for (let i = 0; i < im.count; i++) { mtx.makeTranslation(cells[i][0] + this.off[0] + 0.5, cells[i][1] + this.off[1] + 0.5, cells[i][2] + this.off[2] + 0.5); im.setMatrixAt(i, mtx); }
      this.prevGroup.add(im);
    }
    this.dirty = true;
  }
  setSelection(sel) {
    if (!this.ok) return; const THREE = T();
    if (this.selBox) { this.scene.remove(this.selBox); this.selBox.geometry.dispose(); this.selBox.material.dispose(); this.selBox = null; }
    if (sel) {
      const w = sel.x1 - sel.x0 + 1, hh = sel.y1 - sel.y0 + 1, d = sel.z1 - sel.z0 + 1;
      this.selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.08, hh + 0.08, d + 0.08)), new THREE.LineBasicMaterial({ color: 0xffe27a }));
      this.selBox.position.set(sel.x0 + w / 2 + this.off[0], sel.y0 + hh / 2 + this.off[1], sel.z0 + d / 2 + this.off[2]); this.scene.add(this.selBox);
    }
    this.dirty = true;
  }
  setMirror(m) {
    if (!this.ok) return; const THREE = T();
    while (this.mirrorGroup.children.length) { const c = this.mirrorGroup.children.pop(); c.geometry.dispose(); c.material.dispose(); }
    const [sx, sy, sz] = this.size, mk = (w, hh, rx, ry, color) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); p.rotation.set(rx, ry, 0); this.mirrorGroup.add(p); return p; };
    if (m && m.x) mk(sz, sy, 0, Math.PI / 2, 0xff7eb6);
    if (m && m.y) mk(sx, sz, Math.PI / 2, 0, 0x8bc34a);
    if (m && m.z) mk(sx, sy, 0, 0, 0x6ec6ff);
    this.dirty = true;
  }
  setOrbitMode(on) { this.orbitMode = !!on; this.canvas.style.cursor = on ? 'grab' : 'crosshair'; }

  // ---------------------------------------------------------------- picking
  /** Pick ray through client coordinates, in GRID space. */
  ray(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(), x = ((clientX - r.left) / r.width) * 2 - 1, y = -((clientY - r.top) / r.height) * 2 + 1;
    this.camera.updateMatrixWorld(); const v = this._v.set(x, y, 0.5).unproject(this.camera); const o = this.camera.position;
    const d = [v.x - o.x, v.y - o.y, v.z - o.z], l = Math.hypot(d[0], d[1], d[2]);
    const ro = [o.x - this.off[0], o.y - this.off[1], o.z - this.off[2]];
    return { ro, rd: [d[0] / l, d[1] / l, d[2] / l], cam: ro };
  }
  pickAt(clientX, clientY) { if (!this.part) return { kind: null }; const r = this.ray(clientX, clientY); return pickCell(this.part.grid, r.ro, r.rd, r.cam); }

  // ---------------------------------------------------------------- input
  _bind() {
    const c = this.canvas, v = this.view;
    c.style.touchAction = 'none'; c.style.cursor = 'crosshair';
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.pointerType });
      if (this.pointers.size === 2) { const [a, b] = Array.from(this.pointers.values()); this.pinch0 = Math.hypot(a.x - b.x, a.y - b.y); this.drag = { mode: 'orbit' }; if (this.tool) this.o.onTool({ type: 'cancel' }); return; }
      const orbit = e.button === 2 || e.button === 1 || this.orbitMode || this.spaceDown;
      if (orbit) { this.drag = { mode: 'orbit', id: e.pointerId }; c.style.cursor = 'grabbing'; e.preventDefault(); return; }
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.drag = { mode: 'tool', id: e.pointerId }; this.tool = true; c.focus({ preventScroll: true });
      if (this.o.onTool) this.o.onTool({ type: 'down', pick: this.pickAt(e.clientX, e.clientY), e });
    });
    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (p && this.drag && this.drag.mode === 'orbit') {
        if (this.pointers.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = Array.from(this.pointers.values()); const d = Math.hypot(a.x - b.x, a.y - b.y); if (this.pinch0) v.zoom = Math.max(0.35, Math.min(3, v.zoom * (this.pinch0 / Math.max(1, d)))); this.pinch0 = d; this.dirty = true; return; }
        v.yaw -= (e.clientX - p.x) * 0.009; v.pitch = Math.max(-1.45, Math.min(1.45, v.pitch + (e.clientY - p.y) * 0.007)); p.x = e.clientX; p.y = e.clientY; this.dirty = true; return;
      }
      if (p) { p.x = e.clientX; p.y = e.clientY; }
      if (this.o.onTool) this.o.onTool({ type: 'move', pick: this.pickAt(e.clientX, e.clientY), e, down: !!(this.drag && this.drag.mode === 'tool') });
    });
    const up = (e) => {
      this.pointers.delete(e.pointerId); c.style.cursor = this.orbitMode ? 'grab' : 'crosshair';
      if (this.drag && this.drag.mode === 'tool' && this.o.onTool) this.o.onTool({ type: 'up', pick: this.pickAt(e.clientX, e.clientY), e });
      if (!this.pointers.size) { this.drag = null; this.tool = false; this.pinch0 = 0; }
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); if (this.drag && this.drag.mode === 'tool' && this.o.onTool) this.o.onTool({ type: 'cancel' }); this.drag = null; this.tool = false; });
    c.addEventListener('pointerleave', () => { if (!this.drag && this.o.onTool) this.o.onTool({ type: 'leave' }); });
    c.addEventListener('wheel', (e) => { e.preventDefault(); v.zoom = Math.max(0.35, Math.min(3, v.zoom * Math.exp(e.deltaY * 0.0012))); this.dirty = true; }, { passive: false });
    c.addEventListener('dblclick', (e) => { if (e.altKey) { v.yaw = -0.65; v.pitch = 0.4; v.zoom = 1; this.dirty = true; } });
  }
  orbit(dyaw, dpitch) { this.view.yaw += dyaw; this.view.pitch = Math.max(-1.45, Math.min(1.45, this.view.pitch + dpitch)); this.dirty = true; }
  zoomBy(k) { this.view.zoom = Math.max(0.35, Math.min(3, this.view.zoom * k)); this.dirty = true; }
  resetView() { Object.assign(this.view, { yaw: -0.65, pitch: 0.4, zoom: 1 }); this.dirty = true; }

  // ---------------------------------------------------------------- frame
  _resize() {
    if (!this.ok || !this.alive) return; const w = Math.max(2, this.host.clientWidth), h = Math.max(2, this.host.clientHeight);
    if (w === this.w && h === this.h) return; this.w = w; this.h = h;
    this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.r.setSize(w, h, false); this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.dirty = true;
  }
  _loop() {
    if (!this.alive) return; this.raf = requestAnimationFrame(() => this._loop());
    if (document.hidden || !this.canvas.isConnected) return;
    this._resize(); if (this.dirty) { this.dirty = false; this.render(); }
  }
  render() {
    if (!this.ok || !this.part) return;
    const v = this.view, d = (this.dist || 30) * v.zoom, cy = Math.cos(v.pitch), c = this.camera;
    c.position.set(Math.sin(v.yaw) * d * cy, Math.sin(v.pitch) * d, Math.cos(v.yaw) * d * cy); c.lookAt(0, 0, 0); c.updateMatrixWorld();
    this.sun.position.set(c.position.x * 0.6 + 6, c.position.y * 0.6 + 12, c.position.z * 0.6 + 4);
    // the three walls behind the grid (as seen from the camera) show their grid lines
    for (const w of this.walls) { const cam = [c.position.x, c.position.y, c.position.z][w.axis]; w.mesh.visible = (w.side === 0) === (cam > 0); }
    this.r.render(this.scene, c);
  }
  /** Immediate frame (tests / screenshots). */
  renderNow() { this._resize(); this.render(); }
  destroy() {
    this.alive = false; if (this.raf) cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect();
    if (!this.ok) { this.canvas.remove(); return; }
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.r.dispose(); try { this.r.forceContextLoss(); } catch (e) { /* ignore */ } this.canvas.remove();
  }
}
