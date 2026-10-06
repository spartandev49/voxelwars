// Input: pointer (mouse + touch), wheel, keyboard. Context-aware per spec/ui.md §6 (rebindable subset in settings.keys).
// Pointer lock is never required: drag-look is the default; touch has one-finger orbit/tap and two-finger pan+pinch.

export const DEFAULT_KEYS = {
  pan_left: 'KeyA', pan_right: 'KeyD', pan_up: 'KeyW', pan_down: 'KeyS', rot_left: 'KeyQ', rot_right: 'KeyE', tilt_up: 'KeyZ', tilt_down: 'KeyX',
  pause: 'Space', slower: 'BracketLeft', faster: 'BracketRight', follow: 'KeyF', topdown: 'KeyT', cinematic: 'KeyC', photo: 'KeyP', minimap: 'KeyM', hide_hud: 'Tab', help: 'KeyH',
  power_1: 'Digit1', power_2: 'Digit2', power_3: 'Digit3', power_4: 'Digit4', power_5: 'Digit5', power_6: 'Digit6', order_advance: 'KeyO', order_hold: 'KeyL', command: 'Enter',
  erase: 'Delete', brush: 'KeyB', rematch: 'KeyR', killcam: 'KeyK', tweak: 'KeyT',
};
const EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/;

export class Input {
  constructor({ canvas, game, settings, nav, hud }) {
    this.c = canvas; this.game = game; this.settings = settings; this.nav = nav; this.hud = hud || null;
    this.down = new Set(); this.pointers = new Map(); this.drag = null; this.pinch = null;
    this.rig = game.rig; this.attached = false; this.possTimer = 0; this.lastTap = 0;
    this.fns = {};
    canvas.tabIndex = 0; canvas.style.touchAction = 'none'; canvas.style.outline = 'none';
    this._h = {
      pd: (e) => this._pointerDown(e), pm: (e) => this._pointerMove(e), pu: (e) => this._pointerUp(e), pc: (e) => this._pointerUp(e), wh: (e) => this._wheel(e), ctx: (e) => e.preventDefault(),
      kd: (e) => this._keyDown(e), ku: (e) => this._keyUp(e), blur: () => { this.down.clear(); },
    };
  }
  code(action) { const k = this.settings.get('keys') || {}; return k[action] || DEFAULT_KEYS[action]; }
  attach() {
    if (this.attached) return; this.attached = true; const c = this.c, h = this._h;
    c.addEventListener('pointerdown', h.pd); c.addEventListener('pointermove', h.pm); window.addEventListener('pointerup', h.pu); c.addEventListener('pointercancel', h.pc);
    c.addEventListener('wheel', h.wh, { passive: false }); c.addEventListener('contextmenu', h.ctx);
    window.addEventListener('keydown', h.kd); window.addEventListener('keyup', h.ku); window.addEventListener('blur', h.blur);
  }
  detach() { if (!this.attached) return; this.attached = false; const c = this.c, h = this._h; c.removeEventListener('pointerdown', h.pd); c.removeEventListener('pointermove', h.pm); window.removeEventListener('pointerup', h.pu); c.removeEventListener('pointercancel', h.pc); c.removeEventListener('wheel', h.wh); c.removeEventListener('contextmenu', h.ctx); window.removeEventListener('keydown', h.kd); window.removeEventListener('keyup', h.ku); window.removeEventListener('blur', h.blur); }
  on(name, fn) { this.fns[name] = fn; }
  _fire(name, a) { const f = this.fns[name]; if (f) f(a); }

  // -------------------------------------------------------------- pointer
  _pointerDown(e) {
    this.c.focus({ preventScroll: true });
    try { this.c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), button: e.button, type: e.pointerType });
    if (this.pointers.size === 2) { this.pinch = this._pinchState(); this.drag = null; return; }
    const g = this.game;
    this.drag = { id: e.pointerId, button: e.button, moved: false, x: e.clientX, y: e.clientY, mode: null, touch: e.pointerType === 'touch' };
    if (e.pointerType === 'mouse') {
      if (e.button === 0) { g.pointerDown(e.clientX, e.clientY, 0); this.drag.mode = 'tool'; }
      else if (e.button === 2) this.drag.mode = 'orbit';
      else if (e.button === 1) { this.drag.mode = 'pan'; e.preventDefault(); }
    } else { this.drag.mode = 'pending'; }
  }
  _pointerMove(e) {
    const p = this.pointers.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    const g = this.game;
    if (this.pinch && this.pointers.size >= 2) { this._pinchMove(); return; }
    const d = this.drag;
    if (!d || d.id !== e.pointerId) { if (e.pointerType === 'mouse') g.pointerMove(e.clientX, e.clientY); return; }
    const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
    const sens = (this.settings.get('camSens') || 1);
    if (d.mode === 'pending') { if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 8) d.mode = 'orbit'; else return; }
    if (d.mode === 'orbit') { this.rig.rotate(-dx * 0.006 * sens, dy * 0.005 * sens); d.moved = true; }
    else if (d.mode === 'pan') { this.rig.pan(-dx * 0.25, dy * 0.25, 1 / 60 * 6); d.moved = true; }
    else if (d.mode === 'tool') g.pointerMove(e.clientX, e.clientY);
  }
  _pointerUp(e) {
    const p = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    const d = this.drag; if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    if (d.mode === 'pending' && p) { // a tap: place / select
      this.game.pointerMove(p.x, p.y); this.game.pointerDown(p.x, p.y, 0); this.game.pointerUp();
    } else if (d.mode === 'tool') this.game.pointerUp();
  }
  _pinchState() { const a = Array.from(this.pointers.values()); const dx = a[0].x - a[1].x, dy = a[0].y - a[1].y; return { dist: Math.hypot(dx, dy), cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2 }; }
  _pinchMove() { const s = this._pinchState(), p = this.pinch; if (p.dist > 1) this.rig.zoom(p.dist / Math.max(1, s.dist)); this.rig.pan(-(s.cx - p.cx) * 0.2, (s.cy - p.cy) * 0.2, 0.1); this.pinch = s; }
  _wheel(e) { e.preventDefault(); const k = Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0012); this.rig.zoom(k); }

  // -------------------------------------------------------------- keyboard
  _ctx() { const s = this.game.state; return s === 'placement' ? 'placement' : s === 'ended' ? 'results' : (s === 'running' || s === 'countdown') ? (this.game.possessId ? 'command' : 'battle') : 'menu'; }
  _keyDown(e) {
    const tg = e.target; if (tg && (EDITABLE.test(tg.tagName) || tg.isContentEditable)) return;
    const code = e.code; this.down.add(code);
    const ctx = this._ctx(), g = this.game, is = (a) => code === this.code(a);
    if ((e.ctrlKey || e.metaKey) && code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) g.tools.redo(); else g.tools.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && code === 'KeyY') { e.preventDefault(); g.tools.redo(); return; }
    if (code === 'Escape') { this._fire('escape'); return; }
    if (this.fns.key && this.fns.key(e, ctx) === true) return;
    if (ctx === 'battle' || ctx === 'command') {
      if (is('pause')) { e.preventDefault(); g.pause(!g.isPaused()); }
      else if (is('slower')) { const sp = [0.25, 0.5, 1, 2, 4], i = sp.indexOf(g.getSpeed()); g.setSpeed(sp[Math.max(0, i - 1)]); }
      else if (is('faster')) { const sp = [0.25, 0.5, 1, 2, 4], i = sp.indexOf(g.getSpeed()); g.setSpeed(sp[Math.min(sp.length - 1, i + 1)]); }
      else if (is('follow')) g.camera.setMode('follow'); else if (is('topdown')) g.camera.setMode(this.rig.mode === 'topdown' ? 'orbit' : 'topdown'); else if (is('cinematic')) g.camera.setMode(this.rig.mode === 'cinematic' ? 'orbit' : 'cinematic'); else if (is('photo')) g.camera.setMode('photo');
      else if (is('hide_hud')) { e.preventDefault(); this._fire('toggleHud'); } else if (is('help')) this._fire('help');
      else if (is('command') && ctx === 'battle') g.camera.setMode('command');
      else if (/^Digit[1-6]$/.test(code) && ctx === 'battle') this._fire('power', +code.slice(5) - 1);
      else if (is('order_advance')) this._fire('order', 'advance'); else if (is('order_hold')) this._fire('order', 'hold');
      else if (code === 'Escape') this._fire('escape');
    } else if (ctx === 'placement') {
      if (is('erase')) g.tools.setBrush({ mode: 'erase' }); else if (is('brush')) { const m = ['single', 'line', 'block', 'scatter', 'erase']; const i = m.indexOf(g.brushState.mode); g.tools.setBrush({ mode: m[(i + 1) % m.length] }); }
      else if (code === 'KeyQ') g.rig.rotate(0.2, 0); else if (code === 'KeyE') g.rig.rotate(-0.2, 0); else if (is('help')) this._fire('help');
    } else if (ctx === 'results') {
      if (is('rematch')) this._fire('rematch'); else if (is('killcam')) this._fire('killcam'); else if (is('tweak')) this._fire('tweak');
    }
  }
  _keyUp(e) { this.down.delete(e.code); }

  /** Per-frame continuous input (camera pan/rotate, possession). */
  update(dt) {
    const g = this.game, rig = this.rig, ctx = this._ctx(), k = (a) => this.down.has(this.code(a));
    const fast = this.down.has('ShiftLeft') || this.down.has('ShiftRight') ? 2.2 : 1;
    if (ctx === 'command') {
      // Take Command: WASD = move (camera-relative), sent at 30 Hz as tick-stamped input
      let mx = 0, mz = 0; if (k('pan_up')) mz += 1; if (k('pan_down')) mz -= 1; if (k('pan_right')) mx += 1; if (k('pan_left')) mx -= 1;
      const yaw = rig.syaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      this.possTimer -= dt;
      if (this.possTimer <= 0) { this.possTimer = 1 / 30; const wx = fx * mz + rx * mx, wz = fz * mz + rz * mx; g.sendPossess && g.sendPossess(wx, wz, this.down.has('Mouse0') || this.down.has('KeyJ'), this._ability()); }
      return;
    }
    if (ctx === 'menu') return;
    let r = 0, f = 0; if (k('pan_right')) r += 1; if (k('pan_left')) r -= 1; if (k('pan_up')) f += 1; if (k('pan_down')) f -= 1;
    if (this.down.has('ArrowRight')) r += 1; if (this.down.has('ArrowLeft')) r -= 1; if (this.down.has('ArrowUp')) f += 1; if (this.down.has('ArrowDown')) f -= 1;   // arrows always pan too
    if (r || f) rig.pan(r * fast, f * fast, dt);
    if (k('rot_left')) rig.rotate(1.6 * dt, 0); if (k('rot_right')) rig.rotate(-1.6 * dt, 0);
    if (k('tilt_up')) rig.rotate(0, 1.0 * dt); if (k('tilt_down')) rig.rotate(0, -1.0 * dt);
    // edge scroll (desktop only, opt-in)
    if (this.settings.get('edgeScroll') && this.edge) { rig.pan(this.edge.x, -this.edge.y, dt); }
  }
  _ability() { for (let i = 1; i <= 3; i++) if (this.down.has('Digit' + i)) return i; return 0; }
}
