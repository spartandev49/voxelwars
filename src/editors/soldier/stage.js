// SoldierStage: the Workshop's 3D turntable (own small WebGL view; the shared editor host of src/app/editorhost.js can replace it later) and the thumbnail maker.
// Orbit (drag / arrow keys / pinch / wheel), clip player with replay for one-shot clips (attack = the weapon swing preview), a ghost hoplite and a ruler for scale,
// team A / team B tint and a tint map that greys every voxel that does not carry the team colour. Browser only (window.THREE r128, VoxSkin).
import { VoxSkin, newPose } from '../../render/voxskin.js';
import { teamColorsLinear } from '../../render/style.js';
import { lin } from '../../render/engine.js';
import { Animator } from '../../anim/animator.js';
import { ClipLib } from '../../anim/clips.js';
import { ModelDef } from '../../voxel/model.js';
import { VoxelGrid, V, F_TEAM, F_GLOW } from '../../voxel/grid.js';

const T = () => window.THREE;
const WALK_SPEED = { walk: 2.6, run: 5 };

/** A copy of the model where only the team-tinted voxels keep their (team) colour: everything else turns dark grey. Shows what the team colour will touch. */
export function tintMapModel(model) {
  const m = new ModelDef(model.id + '_tintmap', model.voxelSize);
  for (const p of model.parts) {
    const g = new VoxelGrid(p.grid.sx, p.grid.sy, p.grid.sz);
    for (let i = 0; i < g.d.length; i++) {
      const v = p.grid.d[i]; if (!v) continue;
      if (((v >>> 24) & F_TEAM)) g.d[i] = V(0xffffff, F_TEAM);
      else { const r = (v >> 16) & 255, gg = (v >> 8) & 255, b = v & 255, l = Math.round((r * 0.3 + gg * 0.59 + b * 0.11) * 0.35 + 28); g.d[i] = V((l << 16) | (l << 8) | l); }
    }
    m.addPart(p.id, g, { parent: p.parent, origin: p.originVox, pivot: p.pivot, rest: p.rest, shadow: false });
  }
  m.meta = Object.assign({}, model.meta);
  for (const k of Object.keys(model.attach)) m.attach[k] = model.attach[k];
  return m;
}

function makeScene(withRuler) {
  const THREE = T(), scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x7a6a50, 0.85));
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.1); sun.position.set(4, 8, 6); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 0.35); rim.position.set(-5, 3, -6); scene.add(rim);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.05, 0.2, 40), new THREE.MeshLambertMaterial({ color: lin(0x6aa84a) })); plinth.position.y = -0.1; scene.add(plinth);
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.05, 8, 48), new THREE.MeshLambertMaterial({ color: lin(0x14163a) })); rimMesh.rotation.x = Math.PI / 2; rimMesh.position.y = 0.0; scene.add(rimMesh);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.68, 40), new THREE.MeshBasicMaterial({ color: lin(0xffffff), transparent: true, opacity: 0.35 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring);
  let ruler = null;
  if (withRuler) {
    ruler = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: lin(0xffc93c) }), ink = new THREE.MeshBasicMaterial({ color: lin(0x14163a) });
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.6, 0.05), mat); pole.position.y = 1.8; ruler.add(pole);
    for (let i = 0; i <= 7; i++) { const w = i % 2 === 0 ? 0.28 : 0.16; const tk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.05), i % 2 === 0 ? mat : ink); tk.position.set(w / 2, i * 0.5, 0); ruler.add(tk); }
    ruler.position.set(-1.55, 0, 0.2); ruler.visible = false; scene.add(ruler);
  }
  return { scene, ruler };
}
function makeRenderer(canvas, alpha) {
  const THREE = T();
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, preserveDrawingBuffer: !alpha });
  r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; r.shadowMap.enabled = false;
  if (alpha) r.setClearColor(0x000000, 0);
  return r;
}

export class SoldierStage {
  /**
   * @param {HTMLElement} host container (the canvas fills it)
   * @param {{animator?:any, palette?:()=>string, ghost?:()=>({model, scale}|null), reduceMotion?:()=>boolean, label?:string}} o
   */
  constructor(host, o = {}) {
    const THREE = T();
    this.o = o; this.host = host; this.alive = true; this.ok = false;
    this.animator = o.animator || Animator;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'ws-canvas'; this.canvas.tabIndex = 0; this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', o.label || 'Soldier preview. Drag to turn, scroll to zoom, arrow keys to turn.');
    host.appendChild(this.canvas);
    try { this.r = makeRenderer(this.canvas, true); this.ok = true; } catch (e) { console.warn('stage: no WebGL', e); this.alive = true; return; }
    const sc = makeScene(true); this.scene = sc.scene; this.ruler = sc.ruler;
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.view = { yaw: 0.6, pitch: 0.22, zoom: 1 }; this.spin = !(o.reduceMotion && o.reduceMotion()); this.spinOn = true; this.idleT = 0; this.drag = null; this.pointers = new Map(); this.pinch0 = 0;
    this.main = null; this.ghost = null; this.team = 0; this.tintMode = 'off'; this.showGhost = false; this.model = null; this.scaleVec = [1, 1, 1];
    this.state = { clip: 'idle', t: 0, rate: 1, flinch: 0, dir: 0, prev: 'idle', blend: 1 };
    this.extra = { speed: 0, gait: 0, dead: false, t: 0, id: 1, hp: 1, root: { y: 0, x: 0, z: 0, pitch: 0, roll: 0, yaw: 0 } };
    this.gstate = { clip: 'idle', t: 0, rate: 1, flinch: 0, dir: 0, prev: 'idle', blend: 1 }; this.gextra = { speed: 0, gait: 0, dead: false, t: 0, id: 2, hp: 1, root: { y: 0, x: 0, z: 0, pitch: 0, roll: 0, yaw: 0 } };
    this.hold = 0; this.height = 2.9; this.lastT = 0; this.raf = 0; this.w = 0; this.h = 0;
    this._bind();
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this._resize()) : null; if (this.ro) this.ro.observe(host);
    this._resize();
    this._kick();
  }

  // ---------------------------------------------------------------- input
  _bind() {
    const c = this.canvas, v = this.view;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.idleT = 0;
      if (this.pointers.size === 2) { const [a, b] = Array.from(this.pointers.values()); this.pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
      c.classList.add('is-grab');
    });
    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      this.idleT = 0;
      if (this.pointers.size === 1) { v.yaw -= (e.clientX - p.x) * 0.011; v.pitch = Math.max(-0.1, Math.min(1.25, v.pitch + (e.clientY - p.y) * 0.006)); }
      p.x = e.clientX; p.y = e.clientY;
      if (this.pointers.size === 2) { const [a, b] = Array.from(this.pointers.values()); const d = Math.hypot(a.x - b.x, a.y - b.y); if (this.pinch0) v.zoom = Math.max(0.5, Math.min(1.9, v.zoom * (this.pinch0 / Math.max(1, d)))); this.pinch0 = d; }
    });
    const up = (e) => { this.pointers.delete(e.pointerId); if (!this.pointers.size) c.classList.remove('is-grab'); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); v.zoom = Math.max(0.5, Math.min(1.9, v.zoom * Math.exp(e.deltaY * 0.0012))); this.idleT = 0; }, { passive: false });
    c.addEventListener('dblclick', () => this.resetView());
    c.addEventListener('keydown', (e) => {
      const k = e.key; let used = true;
      if (k === 'ArrowLeft') v.yaw += 0.15; else if (k === 'ArrowRight') v.yaw -= 0.15; else if (k === 'ArrowUp') v.pitch = Math.max(-0.1, v.pitch - 0.1); else if (k === 'ArrowDown') v.pitch = Math.min(1.25, v.pitch + 0.1);
      else if (k === '+' || k === '=') v.zoom = Math.max(0.5, v.zoom * 0.9); else if (k === '-' || k === '_') v.zoom = Math.min(1.9, v.zoom * 1.1); else if (k === '0') this.resetView(); else used = false;
      if (used) { e.preventDefault(); e.stopPropagation(); this.idleT = 0; }
    });
  }
  resetView() { Object.assign(this.view, { yaw: 0.6, pitch: 0.22, zoom: 1 }); }
  _resize() {
    if (!this.ok || !this.alive) return;
    const w = Math.max(2, this.host.clientWidth), h = Math.max(2, this.host.clientHeight);
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h; const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.r.setPixelRatio(dpr); this.r.setSize(w, h, false); this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- content
  /** Show a compiled soldier: {model, scale:[x,y,z] (the EFFECTIVE instance scale, height included)}. */
  setSoldier(s) {
    if (!this.ok || !s || !s.model) return;
    this.source = s; this._rebuild();
  }
  _rebuild() {
    const s = this.source; if (!s) return;
    const model = this.tintMode === 'map' ? tintMapModel(s.model) : s.model;
    const skin = new VoxSkin({ scene: this.scene }, model, { capacity: 2, shadow: false });
    if (this.main) { this.main.skin.dispose(); }
    this.main = { skin, pose: newPose(model.parts.length), model };
    this.scaleVec = s.scale || [1, 1, 1];
    this.height = Math.max(1.6, s.model.height() * this.scaleVec[1]);
    this._syncGhost();
  }
  _syncGhost() {
    if (this.ghost) { this.ghost.skin.dispose(); this.ghost = null; }
    if (this.ruler) this.ruler.visible = this.showGhost;
    if (!this.showGhost || !this.o.ghost) return;
    let g = null; try { g = this.o.ghost(); } catch (e) { g = null; }
    if (!g || !g.model) return;
    const skin = new VoxSkin({ scene: this.scene }, g.model, { capacity: 1, shadow: false });
    this.ghost = { skin, pose: newPose(g.model.parts.length), model: g.model, scale: g.scale || [1, 1, 1] };
  }
  setGhost(on) { this.showGhost = !!on; this._syncGhost(); }
  setTeam(t) { this.team = t === 1 ? 1 : 0; }
  setTintMode(m) { if (m === this.tintMode) return; this.tintMode = m; this._rebuild(); }
  setSpin(on) { this.spinOn = !!on; }
  setClip(id) {
    const st = this.state; if (!id || id === st.clip) { st.t = 0; return; }
    st.prev = st.clip; st.clip = id; st.t = 0; st.blend = 0; this.hold = 0; this.gstate.clip = id === 'attack' ? 'idle' : 'idle';
  }
  get clip() { return this.state.clip; }

  // ---------------------------------------------------------------- frame loop
  _kick() { if (!this.raf && this.alive && this.ok) this.raf = requestAnimationFrame((t) => this._loop(t)); }
  _loop(t) {
    this.raf = 0; if (!this.alive) return;
    this.raf = requestAnimationFrame((tt) => this._loop(tt));
    if (document.hidden || !this.canvas.isConnected) return;
    if (t - this.lastT < 28) return;
    const dt = Math.min(0.1, this.lastT ? (t - this.lastT) / 1000 : 0.016); this.lastT = t;
    this._frame(dt);
  }
  _frame(dt) {
    if (!this.main) return;
    this._resize();
    const v = this.view, st = this.state, ex = this.extra, ClipId = st.clip;
    this.idleT += dt;
    if (this.spin && this.spinOn && !this.pointers.size && this.idleT > 2.4) v.yaw += dt * 0.28;
    st.t += dt; if (st.blend < 1) st.blend = Math.min(1, st.blend + dt / 0.14);
    const meta = ClipLib.meta(ClipId, 'hum1'), dur = meta.dur || 1;
    if (!meta.loop && st.t > dur + (ClipId.startsWith('death') ? 1.1 : 0.45)) { st.t = 0; st.prev = ClipId; st.blend = 1; }
    ex.t += dt; ex.speed = WALK_SPEED[ClipId] || 0; ex.gait += ex.speed * dt; ex.dead = ClipId.startsWith('death');
    const r = ex.root; r.y = r.x = r.z = r.pitch = r.roll = r.yaw = 0;
    this.animator.pose(this.main.model, st, ex, this.main.pose);
    const tc = teamColorsLinear(this.o.palette ? this.o.palette() : 'classic')[this.team];
    const sv = this.scaleVec;
    this.main.skin.begin(); this.main.skin.add(0, r.y, 0, 0, sv[0], sv[1], sv[2], this.main.pose, tc, 0, 0, 0, r.pitch, r.roll); this.main.skin.end();
    if (this.ghost) {
      const gs = this.gstate, ge = this.gextra, gr = ge.root; gs.t += dt; ge.t += dt; gr.y = gr.x = gr.z = gr.pitch = gr.roll = gr.yaw = 0;
      this.animator.pose(this.ghost.model, gs, ge, this.ghost.pose);
      const gsv = this.ghost.scale;
      this.ghost.skin.begin(); this.ghost.skin.add(1.35, gr.y, -0.1, -0.5, gsv[0], gsv[1], gsv[2], this.ghost.pose, teamColorsLinear('classic')[1], 0, 1, 0, 0, 0); this.ghost.skin.end();   // stone = 1: the ghost is grey
    }
    const c = this.camera, d = Math.max(5.6, this.height * 2.15) * v.zoom, cy = Math.cos(v.pitch);
    const ty = this.height * 0.5;
    c.position.set(Math.sin(v.yaw) * d * cy, ty + Math.sin(v.pitch) * d, Math.cos(v.yaw) * d * cy);
    c.lookAt(0, ty, 0); c.updateMatrixWorld();
    this.r.render(this.scene, c);
  }
  /** One synchronous frame (screenshots and tests). */
  renderNow(dt = 0.016) { if (this.ok) this._frame(dt); }

  destroy() {
    this.alive = false; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0;
    if (this.ro) this.ro.disconnect();
    if (!this.ok) { this.canvas.remove(); return; }
    if (this.main) this.main.skin.dispose(); if (this.ghost) this.ghost.skin.dispose();
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.r.dispose(); try { this.r.forceContextLoss(); } catch (e) { /* ignore */ }
    this.canvas.remove();
  }
}

/** Renders small JPEG thumbnails (library cards) with its own offscreen renderer; call destroy() when the screen closes. */
export class ThumbMaker {
  constructor(o = {}) {
    this.o = o; this.animator = o.animator || Animator; this.ok = false; this.size = o.size || 112;
    try {
      this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = this.size;
      this.r = makeRenderer(this.canvas, false); this.r.setPixelRatio(1); this.r.setSize(this.size, this.size, false); this.r.setClearColor(0x2a2f6b, 1);
      const THREE = T(); const sc = makeScene(false); this.scene = sc.scene; this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100); this.ok = true;
    } catch (e) { this.ok = false; }
    this.state = { clip: 'idle', t: 0.4, rate: 1, flinch: 0, dir: 0, prev: 'idle', blend: 1 };
    this.extra = { speed: 0, gait: 0, dead: false, t: 0, id: 3, hp: 1, root: { y: 0, x: 0, z: 0, pitch: 0, roll: 0, yaw: 0 } };
  }
  /** @returns {string} a JPEG data URL (<= ~6 KB) or '' when WebGL is unavailable */
  render(model, scale, team = 0) {
    if (!this.ok) return '';
    const skin = new VoxSkin({ scene: this.scene }, model, { capacity: 1, shadow: false });
    try {
      const pose = newPose(model.parts.length), ex = this.extra, r = ex.root; r.y = r.x = r.z = r.pitch = r.roll = r.yaw = 0;
      this.state._pc = undefined; this.animator.pose(model, this.state, ex, pose);
      const tc = teamColorsLinear(this.o.palette ? this.o.palette() : 'classic')[team];
      skin.begin(); skin.add(0, r.y, 0, 0, scale[0], scale[1], scale[2], pose, tc); skin.end();
      const h = Math.max(1.6, model.height() * scale[1]), d = Math.max(6.2, h * 2.5);
      this.camera.position.set(Math.sin(0.65) * d, h * 0.62, Math.cos(0.65) * d); this.camera.lookAt(0, h * 0.48, 0); this.camera.updateMatrixWorld();
      this.r.render(this.scene, this.camera);
      let q = 0.72, url = this.canvas.toDataURL('image/jpeg', q); while (url.length > 8200 && q > 0.3) { q -= 0.08; url = this.canvas.toDataURL('image/jpeg', q); }
      return url;
    } finally { skin.dispose(); }
  }
  destroy() { if (!this.ok) return; this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); this.r.dispose(); try { this.r.forceContextLoss(); } catch (e) { /* ignore */ } this.ok = false; }
}
