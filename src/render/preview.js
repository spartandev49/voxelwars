// PreviewService: small offscreen renders for turntables (Codex, placement hover, Workshop) and arena thumbnails (carousel, library).
// One extra WebGLRenderer renders everything into a shared offscreen canvas; each consumer gets a plain 2D canvas (drawImage blit).
// Models render through VoxSkin in their own tiny scene. Capped at 30 fps and paused while the tab is hidden.

import { VoxSkin, newPose } from './voxskin.js';
import { teamColorsLinear } from './style.js';
import { TerrainRenderer } from './terrain.js';
import { lin } from './engine.js';

const T = () => window.THREE;

export class PreviewService {
  /** @param {{modelFor:(def,unit)=>{model,scale?}, animator:any, getArena?:(data)=>any, palette?:()=>string}} o */
  constructor(o) {
    this.o = o; this.items = new Set(); this.raf = 0; this.lastT = 0; this.ok = false;
    this.cache = new Map();   // arena thumbnail cache (key -> dataURL)
    try { this._init(); this.ok = true; } catch (e) { console.warn('preview service unavailable', e); }
  }
  _init() {
    const THREE = T();
    this.canvas = document.createElement('canvas'); this.canvas.width = 320; this.canvas.height = 320;
    this.r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.r.outputEncoding = THREE.sRGBEncoding; this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.0; this.r.setClearColor(0x000000, 0);
    this.r.shadowMap.enabled = false;
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
    this.sceneTpl = null;
  }
  _newScene(bg) {
    const THREE = T(), s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xdfeaff, 0x7a6a50, 0.85));
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.1); sun.position.set(4, 8, 6); s.add(sun);
    if (bg !== undefined) s.background = lin(bg);
    return s;
  }

  /**
   * Turntable in `container`. spec: {unitId|def, blueprint, model (ModelDef), clip, size (css px), interactive, team (0|1), yaw}
   * returns {setClip, setModel, setBlueprint, setTeam, destroy}
   */
  turntable(container, spec = {}) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // fill the container when it has a size (the Codex stage is wider than tall); else a square of spec.size css px
    let cw = spec.size || 220, ch = spec.size || 220;
    const fit = spec.fit !== false;                                    // fill the container (CSS 100%); pixel size follows the container once it is laid out
    if (fit && container.clientWidth > 40 && container.clientHeight > 40) { cw = container.clientWidth; ch = container.clientHeight; }
    const view = document.createElement('canvas'); view.width = Math.max(32, Math.min(1400, Math.round(cw * dpr))); view.height = Math.max(32, Math.min(1400, Math.round(ch * dpr)));
    view.style.cssText = (fit ? 'width:100%;height:100%;' : `width:${cw}px;height:${ch}px;`) + `max-width:100%;touch-action:none;cursor:${spec.interactive === false ? 'default' : 'grab'};display:block`;
    view.setAttribute('role', 'img'); view.setAttribute('aria-label', spec.label || 'Unit preview');
    container.appendChild(view);
    const item = { view, ctx: view.getContext('2d'), scene: this._newScene(), skin: null, model: null, pose: null, yaw: spec.yaw !== undefined ? spec.yaw : 0.6, spin: spec.interactive === false ? 0.5 : 0.35, clip: spec.clip || 'idle', t: 0, team: spec.team || 0, dist: 1, height: 3, wide: 1.5, scale: [1, 1, 1], extra: { speed: 0, gait: 0, dead: false, t: 0, id: 1, hp: 1, root: { y: 0, x: 0, z: 0, pitch: 0, roll: 0, yaw: 0 } }, state: { clip: spec.clip || 'idle', t: 0, rate: 1, flinch: 0, dir: 0, prev: 'idle', blend: 1 }, size: view.width, drag: null, destroyed: false, ground: null, defScale: 1, fit };
    if (fit && typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => { const w = container.clientWidth, h = container.clientHeight; if (w > 40 && h > 40) { view.width = Math.max(32, Math.min(1400, Math.round(w * dpr))); view.height = Math.max(32, Math.min(1400, Math.round(h * dpr))); } }); ro.observe(container); item.ro = ro; }
    const THREE = T();
    // ground disc
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.18, 24), new THREE.MeshLambertMaterial({ color: lin(0x6aa84a) })); disc.position.y = -0.09; item.scene.add(disc); item.ground = disc;
    const setModel = (mm, defScale) => {
      if (item.skin) { item.skin.dispose(); item.skin = null; }
      if (!mm || !mm.model) return;
      item.model = mm.model; item.scale = mm.scale || [1, 1, 1]; item.defScale = defScale || 1;
      item.skin = new VoxSkin({ scene: item.scene }, mm.model, { capacity: 4, shadow: false });
      item.pose = newPose(mm.model.parts.length);
      item.height = Math.max(1.2, mm.model.height() * item.scale[1] * item.defScale);
      item.wide = Math.max(item.height * 0.55, 1.5);
    };
    const setUnit = (idOrDef) => { const def = typeof idOrDef === 'string' ? this.o.defs[idOrDef] : idOrDef; if (!def) return; setModel(this.o.modelFor(def, null), def.scale); };
    if (spec.model) setModel({ model: spec.model }); else if (spec.unitId) setUnit(spec.unitId); else if (spec.def) setUnit(spec.def); else if (spec.blueprint && this.o.compile) { try { const c = this.o.compile(spec.blueprint, { teamTint: true }); setModel({ model: c.model, scale: c.scale }); } catch (e) { console.warn(e); } }
    if (spec.interactive !== false) {
      view.addEventListener('pointerdown', (e) => { item.drag = { x: e.clientX }; view.setPointerCapture(e.pointerId); view.style.cursor = 'grabbing'; });
      view.addEventListener('pointermove', (e) => { if (item.drag) { item.yaw -= (e.clientX - item.drag.x) * 0.012; item.drag.x = e.clientX; item.spin = 0; } });
      const up = () => { item.drag = null; view.style.cursor = 'grab'; }; view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    }
    this.items.add(item); this._kick();
    return {
      canvas: view,
      setClip: (c) => { item.clip = c; item.state.prev = item.state.clip; item.state.clip = c; item.state.t = 0; item.state.blend = 0; },
      setUnit, setModel: (m) => setModel({ model: m }),
      setBlueprint: (bp) => { if (this.o.compile) { try { const c = this.o.compile(bp, { teamTint: true }); setModel({ model: c.model, scale: c.scale }); } catch (e) { console.warn(e); } } },
      setTeam: (t) => { item.team = t; }, setYaw: (y) => { item.yaw = y; item.spin = 0; },
      destroy: () => { item.destroyed = true; if (item.ro) item.ro.disconnect(); this.items.delete(item); if (item.skin) item.skin.dispose(); item.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); view.remove(); },
    };
  }
  _kick() { if (!this.raf && this.ok) this.raf = requestAnimationFrame((t) => this._loop(t)); }
  _loop(t) {
    this.raf = 0; if (!this.items.size) return;
    this.raf = requestAnimationFrame((tt) => this._loop(tt));
    if (document.hidden) return;
    const dt = Math.min(0.1, (t - (this.lastT || t)) / 1000); if (t - this.lastT < 30) return; this.lastT = t;
    for (const it of this.items) if (it.view.isConnected) this._renderItem(it, dt);
  }
  _renderItem(it, dt) {
    if (!it.skin) return;
    const r = this.r, pw = it.view.width, ph = it.view.height; if (this.canvas.width !== pw || this.canvas.height !== ph) { r.setSize(pw, ph, false); }
    it.yaw += it.spin * dt; it.state.t += dt; if (it.state.blend < 1) it.state.blend = Math.min(1, it.state.blend + dt / 0.14);
    const ex = it.extra; ex.t += dt; ex.speed = it.clip === 'walk' ? 2.6 : it.clip === 'run' ? 5 : 0; ex.gait += ex.speed * dt; ex.dead = it.clip.startsWith('death'); ex.root.y = ex.root.x = ex.root.z = ex.root.pitch = ex.root.roll = ex.root.yaw = 0;
    this.o.animator.pose(it.model, it.state, ex, it.pose);
    const looping = /idle|walk|run|cheer|block_hold|sit|stun|gallop|trot/.test(it.clip);
    if (!looping && it.state.t > 2.4) { it.state.t = 0; }
    const tc = teamColorsLinear(this.o.palette ? this.o.palette() : 'classic')[it.team === 1 ? 1 : 0];
    it.skin.begin(); const s = it.defScale;
    it.skin.add(0, ex.root.y, 0, 0, it.scale[0] * s, it.scale[1] * s, it.scale[2] * s, it.pose, tc, 0, 0, 0, ex.root.pitch, ex.root.roll); it.skin.end();
    // orbit camera around the unit; the distance fits the model's height AND width into this view's aspect
    const c = this.camera, aspect = pw / ph, th = Math.tan(c.fov * Math.PI / 360), hgt = it.height * 0.5, d = Math.max(hgt / th, (it.wide * 0.72) / (th * Math.min(1, aspect)), 2.2) * 1.28, h = it.height * 0.5;   /* 1.28: margin for horns/crests/perspective (QA round 1: Minotaur cropped) */
    c.aspect = aspect; c.updateProjectionMatrix();
    c.position.set(Math.sin(it.yaw) * d, h + d * 0.16, Math.cos(it.yaw) * d); c.lookAt(0, h, 0); c.updateMatrixWorld();
    it.ground.scale.setScalar(Math.max(0.8, it.height / 3));
    r.render(it.scene, c);
    it.ctx.clearRect(0, 0, pw, ph); it.ctx.drawImage(this.canvas, 0, 0, pw, ph);
  }

  /** Arena thumbnail as a JPEG data URL (<= ~6 KB at 192x108). arenaObj = Arena instance. */
  arenaThumb(arenaObj, key, w = 192, h = 108) {
    if (!this.ok) return null;
    const ck = key || (arenaObj.name + arenaObj.seed + arenaObj.size); if (this.cache.has(ck)) return this.cache.get(ck);
    const THREE = T(), scene = this._newScene(0xaed3f0);
    const tr = new TerrainRenderer(scene); tr.setArena(arenaObj);
    // props as simple coloured posts (the full PropRenderer is too heavy for thumbnails)
    const cam = new THREE.PerspectiveCamera(40, w / h, 1, 600); const W = arenaObj.worldSize();
    cam.position.set(-W * 0.62, W * 0.72, W * 0.7); cam.lookAt(0, arenaObj.heightAt(0, 0), 0); cam.updateMatrixWorld();
    scene.fog = new THREE.Fog(lin(0xaed3f0), W * 0.9, W * 2.2);
    const r = this.r; r.setSize(w, h, false); r.setClearColor(lin(0xaed3f0), 1);
    r.render(scene, cam);
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; c2.getContext('2d').drawImage(this.canvas, 0, 0, w, h);
    let q = 0.62, url = c2.toDataURL('image/jpeg', q); while (url.length > 8200 && q > 0.3) { q -= 0.08; url = c2.toDataURL('image/jpeg', q); }
    tr.dispose(); r.setClearColor(0x000000, 0); this.cache.set(ck, url);
    this.canvas.width = 320; this.canvas.height = 320;
    return url;
  }
  dispose() { for (const it of Array.from(this.items)) { it.destroyed = true; } this.items.clear(); if (this.r) this.r.dispose(); }
}
