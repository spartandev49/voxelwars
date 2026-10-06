// EditorHost: the 3D host the editors share (Arena Builder: terrain + props + overlays; EDITORS-B reuses it for the Voxel Painter).
// It lives on the ONE Engine/canvas of the app and owns its own TerrainRenderer, PropRenderer and CameraRig. While it is shown it takes
// the canvas over from the game (the game's scene content is hidden, not destroyed, so the title diorama or a paused battle comes back
// untouched) and when it is hidden everything is put back. COORD builds it once in app/main.js and puts it on the context.
//
//   const host = ctx.editorHost;                       // created by createEditorHost({engine, game, settings}) in main.js
//   host.show({arena})        take over the canvas, build terrain + props for `arena`, swap in host.rig as the game's camera rig
//   host.hide()               idempotent; restores the game's camera rig, scene content, environment and projection
//   host.visible              boolean
//   host.engine / host.scene  the shared Engine and its THREE.Scene
//   host.rig                  CameraRig (orbit / topdown); drive it with rig.rotate / rig.zoom / rig.pan / rig.panTo / rig.setMode, limits in rig.limits
//   host.terrain              TerrainRenderer (setArena, markDirty(rect), flush(), raycast, setFog)
//   host.props                PropRenderer (add, removeById, transform, pick, setProps, reground, ...)
//   host.root                 THREE.Group for editor overlays (cursor rings, zone drapes ...). Hidden together with the host.
//   host.setArena(arena)      rebuild terrain, props, camera bounds and environment for a (new) arena
//   host.touchTerrain(rect)   mark a cell rect dirty (renders on the next frame); host.flushTerrain() rebuilds right now
//   host.refreshLiquid()      rebuild the water / lava plane (after the level or the lava flag changed)
//   host.setEnvironment(env)  time of day, weather, fog -> sky, light rig, terrain fog
//   host.setInsets({left, right, top, bottom})   px covered by editor panels: the framed target is centred in the free area
//   host.frame({mode, dist, x, z})               'oblique' | 'top' | 'keep': re-aim the camera (snaps)
//   host.ray(clientX, clientY) -> {o:{x,y,z}, d:{x,y,z}}    pick ray through the current projection
//   host.groundAt(clientX, clientY) -> {x,y,z,cx,cz}|null   terrain hit
//   host.worldToScreen(x, y, z) -> {x, y, ok}               client coordinates of a world point
//   host.onFrame(fn) -> off   fn(dt) runs every frame right before the render (after the rig update)
//   host.thumbnail({w, h, maxChars}) -> jpeg data URL | ''  top-quality overview of the arena rendered from the live canvas
//   host.dispose()
// Contract with the game: while shown, `game.rig` IS host.rig (swapped back on hide), so game.frame() drives the camera and renders.
// Nothing else of the game's is touched; the host never calls game.begin / game.dispose.

import { TerrainRenderer } from '../render/terrain.js';
import { PropRenderer } from '../render/props.js';
import { CameraRig } from '../render/cameras.js';

const T = () => window.THREE;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class EditorHost {
  /** @param {{engine:any, game:any, settings?:any}} o */
  constructor(o) {
    this.engine = o.engine; this.game = o.game; this.settings = o.settings || null;
    this.scene = this.engine.scene;
    this.visible = false; this.arena = null;
    this.terrain = null; this.props = null; this.rig = null; this.root = null;
    this.insets = { left: 0, right: 0, top: 0, bottom: 0 };
    this._frameFns = new Set(); this._hidden = new Set(); this._lights = new Map(); this._own = null; this._render0 = null; this._ownRender = false; this._saved = null; this._origUpdate = null;
    this._onResize = () => this._applyInsets();
    this._v = null; this._ndc = null;
  }

  _ensure() {
    if (this.terrain) return;
    const t = T();
    this.terrain = new TerrainRenderer(this.scene, this.engine.q);
    this.props = new PropRenderer(this.engine, null, { lights: 0 });
    this.rig = new CameraRig(this.engine);
    this.rig.limits.minDist = 3; this.rig.limits.maxDist = 220;
    this.root = new t.Group(); this.root.name = 'editor-overlays'; this.scene.add(this.root);
    // per-frame hook: wrap OUR rig's update so game.frame() (which updates game.rig, i.e. this rig, then renders) also drives the host
    const rig = this.rig, orig = rig.update.bind(rig);
    this._origUpdate = orig;
    rig.update = (dt, alpha) => { orig(dt, alpha); if (this.visible) this._tick(dt); };
    this._v = new t.Vector3();
  }

  /** Take over the canvas. opts: {arena?}. */
  show(opts = {}) {
    this._ensure();
    if (!this.visible) {
      const g = this.game, e = this.engine;
      this._saved = { rig: g.rig, env: Object.assign({}, e.env), paused: g.paused };
      // hide everything the game put in the scene (units, projectiles, FX, its terrain and props); lights keep their place but go dark
      // The game's view re-shows its meshes in game.frame() AFTER the rig update, so the sweep also runs right before every render.
      this._own = new Set([e.sky, e.clouds, e.hemi, e.sun, e.sunTarget, this.root, this.terrain.group, this.props.group]);
      this._hidden.clear(); this._lights.clear();
      this._sweep();
      this._ownRender = Object.prototype.hasOwnProperty.call(e, 'render'); this._render0 = e.render;
      const r0 = e.render; e.render = (...a) => { if (this.visible) this._sweep(); return r0.apply(e, a); };
      if (g.state === 'running' || g.state === 'countdown') g.pause(true);
      g.rig = this.rig;
      this.terrain.group.visible = true; this.props.group.visible = true; this.root.visible = true;
      this.rig.reduceMotion = !!(this.settings && this.settings.get('reduceMotion'));
      window.addEventListener('resize', this._onResize);
      this.visible = true;
    }
    if (opts.arena) this.setArena(opts.arena);
    return this;
  }

  hide() {
    if (!this.visible) return this;
    const g = this.game, e = this.engine, s = this._saved;
    this.visible = false;
    window.removeEventListener('resize', this._onResize);
    if (g.rig === this.rig && s) g.rig = s.rig;
    if (!g.world) this._clearStale();
    if (this._render0) { if (this._ownRender) e.render = this._render0; else delete e.render; this._render0 = null; }
    for (const o of this._hidden) o.visible = true;
    for (const [l, i] of this._lights) l.intensity = i;
    this._hidden.clear(); this._lights.clear(); this._own = null;
    if (e.camera.clearViewOffset) e.camera.clearViewOffset();
    e.camera.updateProjectionMatrix();
    this.terrain.clear(); this.props.clear(); this.terrain.group.visible = false; this.props.group.visible = false; this.root.visible = false;
    if (s) { e.setEnvironment(s.env, null); if (g.terrain && g.terrain.arena) { const ev = e.fogParams; if (ev) g.terrain.setFog(e.fogColor, ev.near, ev.far); } if (s.paused === false && g.paused) g.pause(false); }
    this._frameFns.clear(); this.arena = null; this._saved = null;
    return this;
  }

  /** Hide whatever the game has (re)shown in the scene and keep its lights dark; remembers the originals for hide(). */
  _sweep() {
    const own = this._own; if (!own) return;
    for (const o of this.scene.children) {
      if (own.has(o)) continue;
      if (o.isLight) { if (o.intensity !== 0) { if (!this._lights.has(o)) this._lights.set(o, o.intensity); o.intensity = 0; } continue; }
      if (o.visible) { o.visible = false; this._hidden.add(o); }
    }
  }

  /** The game's battle view keeps the last drawn instances after its world is gone: empty its skins before they become visible again. */
  _clearStale() { try { const sk = this.game.view && this.game.view.skins; if (sk) for (const r of sk.values()) { r.skin.begin(); r.skin.end(); } } catch (e) { /* cosmetic only */ } }

  setArena(arena) {
    this._ensure();
    this.arena = arena;
    this.terrain.setArena(arena);
    this.props.setArena(arena);
    this.rig.setWorld(null); this.rig.setArena(arena);
    this.rig.limits.maxDist = Math.max(120, arena.worldSize() * 1.6);
    this.setEnvironment(arena.env);
    return this;
  }
  touchTerrain(rect) { if (this.terrain && rect) this.terrain.markDirty(rect); }
  flushTerrain() { return this.terrain ? this.terrain.flush() : 0; }
  refreshLiquid() { if (!this.terrain || !this.terrain.arena) return; if (this.terrain.refreshLiquid) this.terrain.refreshLiquid(); else this.terrain._buildLiquid(); this._fogLiquid(); }
  _fogLiquid() { const f = this.engine.fogParams; if (f && this.terrain) this.terrain.setFog(this.engine.fogColor, f.near, f.far); }
  setEnvironment(env) {
    const r = this.engine.setEnvironment(Object.assign({}, env || {}), this.arena);
    if (this.terrain) this.terrain.setFog(r.color, r.near, r.far);
    return r;
  }

  setInsets(ins) { Object.assign(this.insets, ins || {}); this._applyInsets(); }
  _applyInsets() {
    const cam = this.engine.camera, el = this.engine.renderer.domElement;
    if (!this.visible || !cam.setViewOffset) return;
    const W = el.clientWidth || window.innerWidth, H = el.clientHeight || window.innerHeight, i = this.insets;
    const dx = (i.left - i.right) / 2, dy = (i.top - i.bottom) / 2;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { if (cam.view && cam.view.enabled) { cam.clearViewOffset(); cam.updateProjectionMatrix(); } return; }
    const v = cam.view;
    if (v && v.enabled && v.fullWidth === W && v.fullHeight === H && Math.abs(v.offsetX + dx) < 0.01 && Math.abs(v.offsetY + dy) < 0.01) return;
    cam.setViewOffset(W, H, -dx, -dy, W, H);
  }

  /** Re-aim the camera and snap: 'oblique' (default view), 'top' (plan view) or 'keep' (only the distance). */
  frame(o = {}) {
    const a = this.arena, rig = this.rig; if (!a) return;
    const W = a.worldSize(), x = o.x === undefined ? 0 : o.x, z = o.z === undefined ? 0 : o.z;
    rig.tx = x; rig.tz = z; rig.ty = a.heightAt(x, z) + 1;
    const mode = o.mode || 'oblique';
    if (mode === 'top') { rig.setMode('topdown'); rig.pitch = 1.38; rig.yaw = 0; rig.dist = o.dist || W * 1.05; }
    else if (mode === 'oblique') { rig.setMode('orbit'); rig.yaw = -0.7; rig.pitch = 0.62; rig.dist = o.dist || W * 1.5; }
    else if (o.dist) rig.dist = o.dist;
    rig.dist = clamp(rig.dist, rig.limits.minDist, rig.limits.maxDist);
    rig.snap();
    return this;
  }

  // ---------------------------------------------------------------- picking
  ray(clientX, clientY) {
    const t = T(), cam = this.engine.camera, el = this.engine.renderer.domElement, r = el.getBoundingClientRect();
    const nx = ((clientX - r.left) / r.width) * 2 - 1, ny = -((clientY - r.top) / r.height) * 2 + 1;
    const v = this._v || (this._v = new t.Vector3());
    v.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
    return { o: { x: cam.position.x, y: cam.position.y, z: cam.position.z }, d: { x: v.x, y: v.y, z: v.z } };
  }
  groundAt(clientX, clientY) { const r = this.ray(clientX, clientY); return this.terrain ? this.terrain.raycast(r.o, r.d, 600) : null; }
  worldToScreen(x, y, z) {
    const t = T(), cam = this.engine.camera, el = this.engine.renderer.domElement, r = el.getBoundingClientRect();
    const v = this._v || (this._v = new t.Vector3());
    v.set(x, y, z).project(cam);
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, ok: v.z > -1 && v.z < 1 };
  }

  onFrame(fn) { this._frameFns.add(fn); return () => this._frameFns.delete(fn); }
  _tick(dt) {
    this._applyInsets();                       // cheap: the game clears the view offset on canvas-mode changes and resizes
    this.terrain.update(dt);
    this.props.update(dt, this.engine.camera);
    for (const f of this._frameFns) f(dt);
  }
  /** Run one frame by hand (tests / tools that do not use game.frame): rig, host, render. */
  step(dt = 1 / 60) { this.rig.update(dt, 1); this.engine.render(dt); }

  /** Overview JPEG of the arena from the live canvas (<= maxChars characters, default 6,000). '' when the canvas cannot be read. */
  thumbnail(o = {}) {
    const w = o.w || 192, h = o.h || 108, maxChars = o.maxChars || 6000;
    if (!this.visible || !this.arena) return '';
    const rig = this.rig, cam = this.engine.camera;
    const keep = { tx: rig.tx, ty: rig.ty, tz: rig.tz, yaw: rig.yaw, pitch: rig.pitch, dist: rig.dist, mode: rig.mode, sx: rig.sx, sy: rig.sy, sz: rig.sz, syaw: rig.syaw, spitch: rig.spitch, sdist: rig.sdist };
    let url = '';
    try {
      const W = this.arena.worldSize();
      rig.tx = 0; rig.tz = 0; rig.ty = this.arena.heightAt(0, 0) + 1; rig.yaw = -0.75; rig.pitch = 0.78; rig.dist = W * 1.02; rig.snap();
      if (cam.clearViewOffset) cam.clearViewOffset();
      cam.updateProjectionMatrix();
      const vis = this.root.visible; this.root.visible = false;
      rig.update(0, 1); this.engine.render(0);
      const src = this.engine.renderer.domElement, sw = src.width, sh = src.height;
      const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
      const g2 = c2.getContext('2d');
      const sa = sw / sh, ta = w / h; let cw = sw, ch = sh; if (sa > ta) cw = sh * ta; else ch = sw / ta;
      g2.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
      let q = 0.7; url = c2.toDataURL('image/jpeg', q);
      while (url.length > maxChars && q > 0.3) { q -= 0.08; url = c2.toDataURL('image/jpeg', q); }
      if (url.length > maxChars) { const c3 = document.createElement('canvas'); c3.width = Math.round(w * 0.75); c3.height = Math.round(h * 0.75); c3.getContext('2d').drawImage(c2, 0, 0, c3.width, c3.height); url = c3.toDataURL('image/jpeg', 0.5); }
      this.root.visible = vis;
    } catch (e) { url = ''; }
    rig.tx = keep.tx; rig.ty = keep.ty; rig.tz = keep.tz; rig.yaw = keep.yaw; rig.pitch = keep.pitch; rig.dist = keep.dist; rig.mode = keep.mode;
    rig.sx = keep.sx; rig.sy = keep.sy; rig.sz = keep.sz; rig.syaw = keep.syaw; rig.spitch = keep.spitch; rig.sdist = keep.sdist;
    this._applyInsets(); this.root.visible = true;
    return url && url.length <= maxChars * 1.4 ? url : '';
  }

  dispose() {
    this.hide();
    if (this.terrain) { this.terrain.dispose(); this.terrain = null; }
    if (this.props) { this.props.dispose(); this.props = null; }
    if (this.root) { this.scene.remove(this.root); this.root = null; }
    this.rig = null;
  }
}

/** @param {{engine:any, game:any, settings?:any}} o */
export function createEditorHost(o) { return new EditorHost(o); }
